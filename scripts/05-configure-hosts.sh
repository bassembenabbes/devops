#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  PHASE 5 — Configuration /etc/hosts + Tests de connectivité
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RED='\033[0;31m'; NC='\033[0m'
log()    { echo -e "${GREEN}[✔]${NC} $1"; }
warn()   { echo -e "${YELLOW}[⚠]${NC} $1"; }
step()   { echo -e "${BLUE}[→]${NC} $1"; }
header() { echo -e "\n${BOLD}${CYAN}═══ $1 ═══${NC}\n"; }
check()  { echo -e "${GREEN}✔${NC} $1"; }
fail()   { echo -e "${RED}✘${NC} $1"; }

header "PHASE 5 — Configuration DNS local + Tests"

# ── Ajouter entrée hosts ──────────────────────────────────────────────────
step "Configuration /etc/hosts..."
HOSTS_ENTRY="127.0.0.1 ecommerce.local keycloak.local grafana.local jaeger.local"

if grep -q "ecommerce.local" /etc/hosts 2>/dev/null; then
    log "Entrée hosts déjà présente"
else
    echo "$HOSTS_ENTRY" | sudo tee -a /etc/hosts
    log "Entrée ajoutée: $HOSTS_ENTRY"
fi

# ── Attendre que les pods soient prêts ───────────────────────────────────
header "Attente démarrage des services"

step "Attente frontend..."
kubectl wait --namespace ecommerce \
    --for=condition=ready pod \
    --selector=app=frontend \
    --timeout=120s 2>/dev/null && log "Frontend prêt" || warn "Frontend pas encore prêt"

step "Attente API Gateway..."
kubectl wait --namespace ecommerce \
    --for=condition=ready pod \
    --selector=app=api-gateway \
    --timeout=180s 2>/dev/null && log "API Gateway prêt" || warn "API Gateway pas encore prêt"

step "Attente Product Service..."
kubectl wait --namespace ecommerce \
    --for=condition=ready pod \
    --selector=app=product-service \
    --timeout=180s 2>/dev/null && log "Product Service prêt" || warn "Product Service pas encore prêt"

# ── Tests de connectivité ─────────────────────────────────────────────────
header "Tests de connectivité"

test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"

    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time 5 \
        --connect-timeout 3 \
        "$url" 2>/dev/null || echo "000")

    if [[ "$http_code" == "$expected_code" ]] || [[ "$http_code" == "301" ]] || [[ "$http_code" == "302" ]]; then
        check "$name — HTTP $http_code"
        return 0
    else
        fail "$name — HTTP $http_code (attendu: $expected_code)"
        return 1
    fi
}

echo ""
echo -e "${BOLD}Services locaux (NodePort):${NC}"
sleep 3
test_endpoint "Frontend Angular"        "http://localhost:30080" "200"
test_endpoint "API Gateway Health"      "http://localhost:30081/actuator/health" "200"
test_endpoint "Products API (public)"   "http://localhost:30081/api/v1/products" "200"
test_endpoint "Keycloak Health"         "http://localhost:30082/auth/health/ready" "200"
test_endpoint "Grafana"                 "http://localhost:30083" "200"

# ── Test API Products ─────────────────────────────────────────────────────
header "Test API Products"

echo -e "${BOLD}GET /api/v1/products${NC}"
PRODUCTS=$(curl -s --max-time 10 "http://localhost:30081/api/v1/products" 2>/dev/null)
if echo "$PRODUCTS" | grep -q "content\|name\|\[\]" 2>/dev/null; then
    PRODUCT_COUNT=$(echo "$PRODUCTS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('content',d) if isinstance(d,dict) else d))" 2>/dev/null || echo "?")
    log "API Products répond — $PRODUCT_COUNT produits"
else
    warn "API Products ne répond pas encore (service en démarrage)"
fi

# ── Test Keycloak Auth ────────────────────────────────────────────────────
header "Test Keycloak Authentication"

echo -e "${BOLD}Obtention token Keycloak (alice / Alice#2024!)${NC}"
TOKEN_RESPONSE=$(curl -s --max-time 10 \
    -X POST "http://localhost:30082/auth/realms/ecommerce/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=password&client_id=ecommerce-frontend&username=alice&password=Alice%232024%21&scope=openid" \
    2>/dev/null)

if echo "$TOKEN_RESPONSE" | grep -q "access_token"; then
    ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'][:60])" 2>/dev/null)
    log "Token Keycloak obtenu: ${ACCESS_TOKEN}..."

    # Test endpoint protégé
    echo -e "${BOLD}GET /api/v1/orders (avec token JWT)${NC}"
    ORDERS_RESP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        "http://localhost:30081/api/v1/orders" 2>/dev/null)
    log "Endpoint protégé /orders — HTTP $ORDERS_RESP"
else
    warn "Keycloak pas encore prêt (démarrage lent normal: 2-3 minutes)"
fi

# ══════════════════════════════════════════════════════════════════════════
header "🎉 RÉSUMÉ — URLs d'accès"
echo ""
echo -e "${BOLD}┌──────────────────────────────────────────────────────────┐${NC}"
echo -e "${BOLD}│         🛒 E-COMMERCE PLATFORM — ACCÈS LOCAL             │${NC}"
echo -e "${BOLD}├──────────────────────────────────────────────────────────┤${NC}"
echo -e "${BOLD}│${NC} Frontend Angular    ${CYAN}http://localhost:30080${NC}"
echo -e "${BOLD}│${NC} API Gateway        ${CYAN}http://localhost:30081${NC}"
echo -e "${BOLD}│${NC} Products API       ${CYAN}http://localhost:30081/api/v1/products${NC}"
echo -e "${BOLD}│${NC} Keycloak Admin     ${CYAN}http://localhost:30082/auth/admin${NC}"
echo -e "${BOLD}│${NC} Grafana            ${CYAN}http://localhost:30083${NC}"
echo -e "${BOLD}│${NC} Jaeger Tracing     ${CYAN}http://localhost:30084${NC}"
echo -e "${BOLD}├──────────────────────────────────────────────────────────┤${NC}"
echo -e "${BOLD}│${NC} 🔑 Comptes de test:"
echo -e "${BOLD}│${NC}   admin  / Admin#2024!   (rôle ADMIN)"
echo -e "${BOLD}│${NC}   alice  / Alice#2024!   (rôle USER)"
echo -e "${BOLD}│${NC}   bob    / Bob#2024!     (rôle SELLER)"
echo -e "${BOLD}│${NC}"
echo -e "${BOLD}│${NC} 🔧 Keycloak Admin: admin / Ecom#Admin2024!"
echo -e "${BOLD}│${NC} 📊 Grafana:        admin / Grafana#2024!"
echo -e "${BOLD}└──────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "${GREEN}Pour voir tous les logs:${NC} kubectl logs -f -n ecommerce -l app=api-gateway"
echo -e "${GREEN}Pour voir les métriques:${NC} kubectl top pods -n ecommerce"
echo -e "${GREEN}Helm status:${NC}             helm status ecommerce-platform -n ecommerce"
echo ""
