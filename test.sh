#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  TEST.SH — Tests rapides des endpoints après déploiement
# ═══════════════════════════════════════════════════════════════════════════

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

pass() { echo -e "${GREEN}✔${NC} $1"; }
fail() { echo -e "${RED}✘${NC} $1"; }
info() { echo -e "${YELLOW}ℹ${NC} $1"; }

API="http://localhost:30081"
KC="http://localhost:30082"

echo ""
echo -e "${BOLD}${CYAN}═══ E-COMMERCE API TESTS ═══${NC}"
echo ""

# ── Frontend ─────────────────────────────────────────────────────────────
echo -e "${BOLD}FRONTEND:${NC}"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:30080" 2>/dev/null)
[[ "$HTTP" == "200" ]] && pass "GET / → HTTP $HTTP" || fail "GET / → HTTP $HTTP"

# ── API Gateway ───────────────────────────────────────────────────────────
echo -e "\n${BOLD}API GATEWAY:${NC}"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$API/actuator/health" 2>/dev/null)
[[ "$HTTP" == "200" ]] && pass "GET /actuator/health → HTTP $HTTP" || fail "GET /actuator/health → HTTP $HTTP"

# ── Products (public) ─────────────────────────────────────────────────────
echo -e "\n${BOLD}PRODUCTS API (public):${NC}"
RESP=$(curl -s --max-time 10 "$API/api/v1/products" 2>/dev/null)
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$API/api/v1/products" 2>/dev/null)
[[ "$HTTP" == "200" ]] && pass "GET /api/v1/products → HTTP $HTTP" || fail "GET /api/v1/products → HTTP $HTTP"

COUNT=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalElements',len(d.get('content',[]))))" 2>/dev/null || echo "?")
info "Nombre de produits: $COUNT"

# ── Keycloak Auth ─────────────────────────────────────────────────────────
echo -e "\n${BOLD}KEYCLOAK AUTHENTICATION:${NC}"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$KC/auth/health/ready" 2>/dev/null)
[[ "$HTTP" == "200" ]] && pass "Keycloak Health → HTTP $HTTP" || fail "Keycloak Health → HTTP $HTTP (peut être encore en démarrage)"

# Obtenir un token JWT
TOKEN_JSON=$(curl -s --max-time 10 \
    -X POST "$KC/auth/realms/ecommerce/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=password&client_id=ecommerce-frontend&username=alice&password=Alice%232024%21&scope=openid" \
    2>/dev/null)

if echo "$TOKEN_JSON" | grep -q "access_token"; then
    TOKEN=$(echo "$TOKEN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
    pass "Token JWT obtenu pour alice"

    # Decode JWT
    PAYLOAD=$(echo "$TOKEN" | cut -d'.' -f2 | base64 --decode 2>/dev/null || echo "$TOKEN" | cut -d'.' -f2 | python3 -c "import sys,base64; d=sys.stdin.read().strip(); print(base64.b64decode(d+'==').decode())" 2>/dev/null)
    ROLES=$(echo "$PAYLOAD" | python3 -c "import sys,json; d=json.loads(sys.stdin.read()); print(', '.join(d.get('realm_access',{}).get('roles',[])))" 2>/dev/null || echo "?")
    info "Rôles JWT: $ROLES"
    info "Sub: $(echo "$PAYLOAD" | python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('preferred_username','?'))" 2>/dev/null)"

    # Test endpoint protégé avec token
    echo -e "\n${BOLD}ENDPOINTS PROTÉGÉS (avec JWT):${NC}"
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
        -H "Authorization: Bearer $TOKEN" \
        "$API/api/v1/orders" 2>/dev/null)
    [[ "$HTTP" == "200" || "$HTTP" == "204" ]] && pass "GET /api/v1/orders (auth) → HTTP $HTTP" || fail "GET /api/v1/orders (auth) → HTTP $HTTP"

    # Test accès refusé sans token
    HTTP_UNAUTH=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$API/api/v1/orders" 2>/dev/null)
    [[ "$HTTP_UNAUTH" == "401" || "$HTTP_UNAUTH" == "403" ]] && pass "GET /api/v1/orders (sans auth) → HTTP $HTTP_UNAUTH (accès refusé ✓)" || info "GET /api/v1/orders (sans auth) → HTTP $HTTP_UNAUTH"

    # Test admin endpoint avec compte non-admin
    HTTP_ADMIN=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
        -H "Authorization: Bearer $TOKEN" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"name":"test","price":1}' \
        "$API/api/v1/products" 2>/dev/null)
    [[ "$HTTP_ADMIN" == "403" ]] && pass "POST /api/v1/products (alice=USER) → HTTP $HTTP_ADMIN (accès refusé ✓)" || info "POST /api/v1/products → HTTP $HTTP_ADMIN"

    # Test admin avec compte admin
    ADMIN_TOKEN_JSON=$(curl -s --max-time 10 \
        -X POST "$KC/auth/realms/ecommerce/protocol/openid-connect/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "grant_type=password&client_id=ecommerce-frontend&username=admin&password=Admin%232024%21&scope=openid" \
        2>/dev/null)

    if echo "$ADMIN_TOKEN_JSON" | grep -q "access_token"; then
        ADMIN_TOKEN=$(echo "$ADMIN_TOKEN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
        HTTP_ADMIN2=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -X POST \
            -H "Content-Type: application/json" \
            -d '{"name":"Test Prod","description":"Test","price":9.99,"stockQuantity":10,"category":"Test","active":true}' \
            "$API/api/v1/products" 2>/dev/null)
        [[ "$HTTP_ADMIN2" == "201" ]] && pass "POST /api/v1/products (admin) → HTTP $HTTP_ADMIN2 (créé ✓)" || info "POST /api/v1/products (admin) → HTTP $HTTP_ADMIN2"
    fi
else
    fail "Token Keycloak non disponible (Keycloak encore en démarrage?)"
    info "Réessayez dans 2-3 minutes: ./test.sh"
fi

# ── Grafana ───────────────────────────────────────────────────────────────
echo -e "\n${BOLD}MONITORING:${NC}"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:30083/api/health" 2>/dev/null)
[[ "$HTTP" == "200" ]] && pass "Grafana → HTTP $HTTP" || info "Grafana → HTTP $HTTP"

# ── K8s Status ────────────────────────────────────────────────────────────
echo -e "\n${BOLD}KUBERNETES STATUS:${NC}"
PODS_RUNNING=$(kubectl get pods -n ecommerce --no-headers 2>/dev/null | grep -c "Running" || echo "0")
PODS_TOTAL=$(kubectl get pods -n ecommerce --no-headers 2>/dev/null | wc -l | tr -d ' ' || echo "0")
pass "Pods ecommerce: $PODS_RUNNING/$PODS_TOTAL Running"

HELM_STATUS=$(helm status ecommerce-platform -n ecommerce 2>/dev/null | grep "STATUS:" | awk '{print $2}')
[[ "$HELM_STATUS" == "deployed" ]] && pass "Helm release: $HELM_STATUS" || info "Helm release: $HELM_STATUS"

echo ""
echo -e "${BOLD}${CYAN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}Tests terminés !${NC}"
echo ""
echo -e "🌐 Frontend: ${CYAN}http://localhost:30080${NC}"
echo -e "🔐 Keycloak: ${CYAN}http://localhost:30082/auth/admin${NC}  (admin / Ecom#Admin2024!)"
echo -e "📊 Grafana:  ${CYAN}http://localhost:30083${NC}  (admin / Grafana#2024!)"
echo ""
