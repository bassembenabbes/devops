#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
#  04-build-and-deploy.sh
#  Build images Docker → Kind load → Helm upgrade --install
#  TOUT le déploiement passe par Helm (infrastructure + apps)
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
RED='\033[0;31m'; CYAN='\033[0;36m'; N='\033[0m'

ok()   { echo -e "${GREEN}  ✓ $*${N}"; }
err()  { echo -e "${RED}  ✗ $*${N}"; exit 1; }
warn() { echo -e "${YELLOW}  ⚠ $*${N}"; }
s()    { echo -e "\n${CYAN}${BOLD}▶ $*${N}"; }
h()    { echo -e "\n${BOLD}═══ $* ═══${N}"; }

CLUSTER="ecommerce-local"
NS="ecommerce"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Auto-repair kubeconfig ─────────────────────────────────────────────
if ! kubectl cluster-info --request-timeout=3s &>/dev/null; then
    warn "kubeconfig invalide — tentative auto-repair..."
    kind export kubeconfig --name "$CLUSTER" 2>/dev/null && ok "kubeconfig réparé" \
        || err "Impossible de contacter le cluster. Lancez d'abord 02-create-cluster.sh"
fi

cd "$ROOT"

# ════════════════════════════════════════════════════════════════
# BUILD FRONTEND ANGULAR
# ════════════════════════════════════════════════════════════════
h "Frontend Angular"
s "Build Docker (Node 20 multi-stage)..."
docker build -t localhost/ecommerce/frontend:local frontend/ \
    && ok "frontend:local buildé" \
    || err "Build frontend échoué"

s "Kind load → frontend..."
kind load docker-image localhost/ecommerce/frontend:local \
    --name "$CLUSTER" 2>/dev/null \
    && ok "frontend chargé dans Kind" \
    || err "kind load frontend échoué"

# ════════════════════════════════════════════════════════════════
# DETECT JAVA
# ════════════════════════════════════════════════════════════════
h "Détection Java"
JAVA_VER=$(java -version 2>&1 | awk -F'"' '/version/{print $2}' | cut -d. -f1)
echo "  Java détecté: $JAVA_VER"
if [ "$JAVA_VER" != "17" ]; then
    warn "Java $JAVA_VER détecté — patch pom.xml source/target → $JAVA_VER"
    for POM in backend/api-gateway/pom.xml backend/product-service/pom.xml; do
        sed -i "s|<java.version>17</java.version>|<java.version>$JAVA_VER</java.version>|g" "$POM" 2>/dev/null || true
        sed -i "s|<release>17</release>|<release>$JAVA_VER</release>|g" "$POM" 2>/dev/null || true
    done
    ok "pom.xml patchés pour Java $JAVA_VER"
fi

# ════════════════════════════════════════════════════════════════
# BUILD API-GATEWAY
# ════════════════════════════════════════════════════════════════
h "API Gateway"
s "Build Docker (Maven + JRE alpine)..."
docker build -t localhost/ecommerce/api-gateway:local backend/api-gateway/ \
    && ok "api-gateway:local buildé" \
    || err "Build api-gateway échoué"

s "Kind load → api-gateway..."
kind load docker-image localhost/ecommerce/api-gateway:local \
    --name "$CLUSTER" 2>/dev/null \
    && ok "api-gateway chargé dans Kind" \
    || err "kind load api-gateway échoué"

# ════════════════════════════════════════════════════════════════
# BUILD PRODUCT-SERVICE
# ════════════════════════════════════════════════════════════════
h "Product Service"
s "Build Docker (Maven + JRE alpine)..."
docker build -t localhost/ecommerce/product-service:local backend/product-service/ \
    && ok "product-service:local buildé" \
    || err "Build product-service échoué"

s "Kind load → product-service..."
kind load docker-image localhost/ecommerce/product-service:local \
    --name "$CLUSTER" 2>/dev/null \
    && ok "product-service chargé dans Kind" \
    || err "kind load product-service échoué"

# ════════════════════════════════════════════════════════════════
# BUILD ORDER-SERVICE
# ════════════════════════════════════════════════════════════════
h "Order Service"
s "Build Docker..."
docker build -t localhost/ecommerce/order-service:local backend/order-service/ \
    && ok "order-service:local buildé" \
    || err "Build order-service échoué"

s "Kind load → order-service..."
kind load docker-image localhost/ecommerce/order-service:local \
    --name "$CLUSTER" 2>/dev/null \
    && ok "order-service chargé dans Kind" \
    || err "kind load order-service échoué"

# ════════════════════════════════════════════════════════════════
# HELM — DEPLOY TOUT (infra + apps)
# ════════════════════════════════════════════════════════════════
h "Helm Deploy — Infrastructure + Applications"

s "Validation du chart..."
helm lint helm/ecommerce-chart -f helm/ecommerce-chart/values.yaml \
    && ok "Chart valide" || warn "Lint warnings (non bloquant)"

s "helm upgrade --install ecommerce-platform..."
echo "  → Namespaces: ecommerce, keycloak, monitoring"
echo "  → Infrastructure: PostgreSQL, MongoDB, Redis, Keycloak, Prometheus, Grafana"
echo "  → Applications: api-gateway, product-service, frontend"
echo "  → Timeout: 15min (JVM + Keycloak lents)"


helm upgrade --install ecommerce-platform \
    helm/ecommerce-chart \
    --create-namespace \
    --namespace "$NS" \
    -f helm/ecommerce-chart/values.yaml \
    --set global.imagePullPolicy=Never \
    --timeout 15m \
    --atomic \
    --cleanup-on-fail \
    2>&1 | grep -v "^$" \
    && ok "Helm deploy réussi ✓" \
    || {
        warn "Helm deploy en cours (timeout ou erreur) — diagnostic..."
        echo ""
        kubectl get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded 2>/dev/null | head -20
        warn "Relancez: helm status ecommerce-platform"
        warn "Logs:     kubectl logs -n ecommerce -l app=api-gateway --tail=30"
    }

# ════════════════════════════════════════════════════════════════
# STATUS FINAL
# ════════════════════════════════════════════════════════════════
h "Status Final"

echo -e "\n${BOLD}Pods ecommerce:${N}"
kubectl get pods -n ecommerce -o wide 2>/dev/null

echo -e "\n${BOLD}Pods keycloak:${N}"
kubectl get pods -n keycloak -o wide 2>/dev/null

echo -e "\n${BOLD}Pods monitoring:${N}"
kubectl get pods -n monitoring -o wide 2>/dev/null

echo -e "\n${BOLD}Services NodePort:${N}"
kubectl get svc -A --field-selector spec.type=NodePort 2>/dev/null

echo -e "\n${BOLD}Helm releases:${N}"
helm list -A

echo -e "\n${GREEN}${BOLD}"
echo "══════════════════════════════════════════"
echo "  URLs d'accès:"
echo "  🌐 Frontend  → http://localhost:30080"
echo "  🔌 API       → http://localhost:30081/api/v1/products"
echo "  🔐 Keycloak  → http://localhost:30082  (admin/Admin2024)"
echo "  📊 Grafana   → http://localhost:30083  (admin/Grafana2024)"
echo "  🔍 Kibana    → http://localhost:30084  (Pas de login/mot de passe par défaut, sécurité désactivée)"
echo "  🔑 Vault     → http://localhost:30085  (Pas de login/mot de passe par défaut, doit être initialisé)"
echo "══════════════════════════════════════════"
echo -e "${N}"
