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

# Débloquer Helm si une opération est en cours
PENDING=$(kubectl get secret -n "$NS" -l owner=helm \
  -o jsonpath='{.items[?(@.metadata.labels.status=="pending-upgrade")].metadata.name}' 2>/dev/null || true)
if [[ -n "$PENDING" ]]; then
    warn "Opération Helm bloquée détectée — nettoyage..."
    kubectl delete secret -n "$NS" $PENDING 2>/dev/null || true
    ok "Secret pending supprimé"
fi

PENDING_INSTALL=$(kubectl get secret -n "$NS" -l owner=helm \
  -o jsonpath='{.items[?(@.metadata.labels.status=="pending-install")].metadata.name}' 2>/dev/null || true)
if [[ -n "$PENDING_INSTALL" ]]; then
    warn "Installation Helm bloquée détectée — nettoyage..."
    kubectl delete secret -n "$NS" $PENDING_INSTALL 2>/dev/null || true
    ok "Secret pending-install supprimé"
fi

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
# VAULT — OPTIONNEL (selon values.yaml)
# ════════════════════════════════════════════════════════════════
VAULT_ENABLED=$(helm get values ecommerce-platform -n "$NS" --all -o json 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('vault',{}).get('enabled',False)).lower())" \
    2>/dev/null || echo "false")

if [[ "$VAULT_ENABLED" == "true" ]]; then
    h "Vault — Initialisation et Déverrouillage"

    s "Attente de la disponibilité du pod Vault..."
    kubectl wait --for=condition=ready pod -l app=vault -n monitoring --timeout=300s \
        && ok "Pod Vault prêt" \
        || { warn "Le pod Vault n'est pas prêt à temps — skip configuration"; VAULT_ENABLED="false"; }

    if [[ "$VAULT_ENABLED" == "true" ]]; then
        VAULT_POD_NAME=$(kubectl get pods -n monitoring -l app=vault -o jsonpath='{.items[0].metadata.name}')

        s "Initialisation de Vault..."
        INIT_OUTPUT=$(kubectl exec -n monitoring "$VAULT_POD_NAME" -- vault operator init \
            -key-shares=1 -key-threshold=1 -format=json 2>/dev/null) \
            && ok "Vault initialisé." \
            || { warn "Vault déjà initialisé ou erreur — skip init"; INIT_OUTPUT=""; }

        if [[ -n "$INIT_OUTPUT" ]]; then
            UNSEAL_KEY=$(echo "$INIT_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['unseal_keys_b64'][0])")
            ROOT_TOKEN=$(echo "$INIT_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['root_token'])")

            s "Déverrouillage de Vault..."
            kubectl exec -n monitoring "$VAULT_POD_NAME" -- vault operator unseal "$UNSEAL_KEY" \
                && ok "Vault déverrouillé."

            echo -e "\n${BOLD}Jeton racine Vault:${N}"
            echo "$ROOT_TOKEN"

            h "Vault — Configuration"

            s "Connexion à Vault avec le jeton racine..."
            kubectl exec -n monitoring "$VAULT_POD_NAME" -- vault login "$ROOT_TOKEN" \
                && ok "Connecté à Vault."

            s "Activation du moteur de secrets KV v2..."
            kubectl exec -n monitoring "$VAULT_POD_NAME" -- vault secrets enable -version=2 kv \
                && ok "Moteur de secrets KV v2 activé." || warn "KV déjà activé"

            s "Création de la politique Vault pour les applications..."
            kubectl exec -n monitoring "$VAULT_POD_NAME" -- vault policy write ecommerce-app - <<EOF
path "kv/data/ecommerce/*" {
  capabilities = ["read"]
}
EOF
            ok "Politique 'ecommerce-app' créée."

            s "Configuration de l'authentification Kubernetes pour Vault..."
            kubectl exec -n monitoring "$VAULT_POD_NAME" -- vault auth enable kubernetes \
                && ok "Authentification Kubernetes activée." || warn "Auth kubernetes déjà activée"

            KUBERNETES_HOST=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
            KUBERNETES_CACERT=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')

            kubectl exec -n monitoring "$VAULT_POD_NAME" -- vault write auth/kubernetes/config \
                kubernetes_host="$KUBERNETES_HOST" \
                kubernetes_ca_cert="$KUBERNETES_CACERT" \
                && ok "Configuration de l'authentification Kubernetes terminée."

            s "Création du rôle Kubernetes 'ecommerce-app' dans Vault..."
            kubectl exec -n monitoring "$VAULT_POD_NAME" -- vault write auth/kubernetes/role/ecommerce-app \
                bound_service_account_names="api-gateway,product-service,order-service,user-service" \
                bound_service_account_namespaces="ecommerce" \
                policies="ecommerce-app" \
                ttl="1h" \
                && ok "Rôle Kubernetes 'ecommerce-app' créé."

            s "Ajout des secrets de base à Vault..."
            kubectl exec -n monitoring "$VAULT_POD_NAME" -- vault kv put kv/ecommerce/database \
                postgresql_username="ecom_user" \
                postgresql_password="Ecom2024" \
                mongodb_root_username="root" \
                mongodb_root_password="Ecom2024" \
                redis_password="Ecom2024" \
                && ok "Secrets de base ajoutés à Vault."
        fi
    fi
else
    h "Vault — Désactivé (skip)"
    ok "Vault désactivé dans values.yaml ✓"
fi

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
echo "  🔍 Kibana    → http://localhost:30084"
echo "  🔑 Vault     → http://localhost:30085  (si activé)"
echo "══════════════════════════════════════════"
echo -e "${N}"