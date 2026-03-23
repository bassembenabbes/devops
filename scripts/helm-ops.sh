#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
#  helm-ops.sh — Opérations Helm courantes
#  Usage: ./scripts/helm-ops.sh [status|restart|logs|uninstall|upgrade]
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
RED='\033[0;31m'; CYAN='\033[0;36m'; N='\033[0m'

CMD="${1:-status}"
RELEASE="ecommerce-platform"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

case "$CMD" in

  status)
    echo -e "\n${BOLD}Helm Release:${N}"
    helm status "$RELEASE" -n ecommerce 2>/dev/null || echo "  (non installé)"

    echo -e "\n${BOLD}Pods ecommerce:${N}"
    kubectl get pods -n ecommerce -o wide

    echo -e "\n${BOLD}Pods keycloak:${N}"
    kubectl get pods -n keycloak -o wide

    echo -e "\n${BOLD}Pods monitoring:${N}"
    kubectl get pods -n monitoring -o wide

    echo -e "\n${BOLD}NodePorts:${N}"
    kubectl get svc -A --field-selector spec.type=NodePort
    ;;

  restart)
    SVC="${2:-all}"
    if [ "$SVC" = "all" ]; then
        echo -e "${CYAN}Restart tous les déploiements ecommerce...${N}"
        kubectl rollout restart deployment -n ecommerce
        kubectl rollout restart deployment -n keycloak
        kubectl rollout restart deployment -n monitoring
    else
        echo -e "${CYAN}Restart $SVC...${N}"
        NS=$(kubectl get deployment "$SVC" -A -o jsonpath='{.items[0].metadata.namespace}' 2>/dev/null || echo "ecommerce")
        kubectl rollout restart deployment/"$SVC" -n "$NS"
    fi
    ;;

  logs)
    APP="${2:-api-gateway}"
    NS="${3:-ecommerce}"
    echo -e "${CYAN}Logs $APP (namespace $NS)...${N}"
    kubectl logs -n "$NS" -l "app=$APP" -f --tail=50
    ;;

  upgrade)
    echo -e "${CYAN}Helm upgrade (sans rebuild images)...${N}"
    cd "$ROOT"
    helm upgrade "$RELEASE" helm/ecommerce-chart \
        --namespace ecommerce \
        -f helm/ecommerce-chart/values.yaml \
        --set global.imagePullPolicy=Never \
        --timeout 10m \
        && echo -e "${GREEN}Upgrade réussi ✓${N}"
    ;;

  uninstall)
    echo -e "${YELLOW}Désinstallation de $RELEASE...${N}"
    helm uninstall "$RELEASE" -n ecommerce 2>/dev/null || true
    kubectl delete namespace ecommerce keycloak monitoring \
        --ignore-not-found=true
    echo -e "${GREEN}Désinstallé ✓${N}"
    ;;

  diff)
    echo -e "${CYAN}Helm diff (changes en attente)...${N}"
    cd "$ROOT"
    helm diff upgrade "$RELEASE" helm/ecommerce-chart \
        --namespace ecommerce \
        -f helm/ecommerce-chart/values.yaml 2>/dev/null \
        || echo "(helm-diff plugin non installé: helm plugin install https://github.com/databus23/helm-diff)"
    ;;

  *)
    echo "Usage: $0 [status|restart [app]|logs [app] [ns]|upgrade|uninstall|diff]"
    exit 1
    ;;
esac
