#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  🚀 LAUNCH.SH — Script principal de lancement
#  Exécute toutes les phases en séquence
#  Usage: ./launch.sh [--skip-install] [--skip-cluster] [--skip-build]
# ═══════════════════════════════════════════════════════════════════════════

set -uo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()    { echo -e "${GREEN}[✔]${NC} $1"; }
error()  { echo -e "${RED}[✘]${NC} $1"; exit 1; }
header() { echo -e "\n${BOLD}${CYAN}╔═══════════════════════════════════════╗${NC}"; echo -e "${BOLD}${CYAN}║  $1${NC}"; echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════╝${NC}\n"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKIP_INSTALL=false
SKIP_CLUSTER=false
SKIP_INFRA=false
SKIP_BUILD=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --skip-install) SKIP_INSTALL=true ;;
        --skip-cluster) SKIP_CLUSTER=true ;;
        --skip-infra)   SKIP_INFRA=true ;;
        --skip-build)   SKIP_BUILD=true ;;
        --help)
            echo "Usage: ./launch.sh [options]"
            echo "  --skip-install  Ne pas réinstaller les outils"
            echo "  --skip-cluster  Ne pas recréer le cluster Kind"
            echo "  --skip-infra    Ne pas redéployer infrastructure (DB, KC, Kafka)"
            echo "  --skip-build    Ne pas rebuilder les images Docker"
            exit 0 ;;
    esac
done

clear
echo ""
echo -e "${BOLD}${CYAN}"
cat << 'EOF'
  ███████╗ ██████╗ ██████╗ ███╗   ███╗███╗   ███╗███████╗██████╗  ██████╗███████╗
  ██╔════╝██╔════╝██╔═══██╗████╗ ████║████╗ ████║██╔════╝██╔══██╗██╔════╝██╔════╝
  █████╗  ██║     ██║   ██║██╔████╔██║██╔████╔██║█████╗  ██████╔╝██║     █████╗
  ██╔══╝  ██║     ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██╔══╝  ██╔══██╗██║     ██╔══╝
  ███████╗╚██████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║███████╗██║  ██║╚██████╗███████╗
  ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝╚══════╝
EOF
echo -e "${NC}"
echo -e "${BOLD}  Angular 17 + Spring Boot 3 + Keycloak + Kubernetes + Helm${NC}"
echo -e "${BOLD}  Architecture Microservices — Déploiement Local Complet${NC}"
echo ""

START_TIME=$SECONDS

# ─────────────────────────────────────────────────────────────────────────
#  VÉRIFICATIONS PRÉALABLES
# ─────────────────────────────────────────────────────────────────────────
header "Vérifications système"

# OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
else
    error "OS non supporté: $OSTYPE"
fi

log "OS: $OS"

# Mémoire disponible
if [[ "$OS" == "linux" ]]; then
    MEM_GB=$(awk '/MemAvailable/ {printf "%.0f", $2/1024/1024}' /proc/meminfo)
else
    MEM_GB=$(( $(vm_stat | awk '/Pages free/ {print $3}' | tr -d '.') * 4096 / 1024 / 1024 / 1024 ))
fi

if [[ $MEM_GB -lt 6 ]]; then
    echo -e "${YELLOW}⚠ Mémoire disponible: ${MEM_GB}GB (recommandé: 8GB+)${NC}"
    echo "Certains services pourraient ne pas démarrer. Continuer quand même ?"
    read -p "(o/N) " -n 1 -r; echo
    [[ $REPLY =~ ^[OoYy]$ ]] || exit 0
else
    log "Mémoire disponible: ${MEM_GB}GB ✓"
fi

# Docker
if ! command -v docker &>/dev/null; then
    error "Docker non installé. Exécutez d'abord: ./scripts/01-install-tools.sh"
fi
log "Docker: $(docker --version | awk '{print $3}' | tr -d ',')"

# Docker running
if ! docker info &>/dev/null; then
    error "Docker daemon n'est pas démarré. Démarrez Docker Desktop ou: sudo systemctl start docker"
fi
log "Docker daemon: Running"

# Kind
if ! command -v kind &>/dev/null; then
    error "Kind non installé. Exécutez: ./scripts/01-install-tools.sh"
fi
log "Kind: $(kind version | awk '{print $2}')"

# Helm
if ! command -v helm &>/dev/null; then
    error "Helm non installé. Exécutez: ./scripts/01-install-tools.sh"
fi
log "Helm: $(helm version --short)"

# kubectl
if ! command -v kubectl &>/dev/null; then
    error "kubectl non installé. Exécutez: ./scripts/01-install-tools.sh"
fi
log "kubectl: $(kubectl version --client --short 2>/dev/null | awk '{print $3}')"

# Java
if ! command -v java &>/dev/null; then
    error "Java 21 non installé. Exécutez: ./scripts/01-install-tools.sh"
fi
JAVA_VER=$(java -version 2>&1 | head -1 | awk -F '"' '{print $2}')
log "Java: $JAVA_VER"

# Maven
if ! command -v mvn &>/dev/null; then
    error "Maven non installé. Exécutez: ./scripts/01-install-tools.sh"
fi
log "Maven: $(mvn -version 2>/dev/null | head -1 | awk '{print $3}')"

echo ""
log "Toutes les vérifications passées ✓"

# ─────────────────────────────────────────────────────────────────────────
#  PHASE 1 — Cluster Kind
# ─────────────────────────────────────────────────────────────────────────
if [[ "$SKIP_CLUSTER" == false ]]; then
    header "Phase 1/5 — Cluster Kubernetes (Kind)"
    chmod +x "$SCRIPT_DIR/scripts/02-create-cluster.sh"
    "$SCRIPT_DIR/scripts/02-create-cluster.sh"
else
    log "Phase 1 ignorée (--skip-cluster)"
    kubectl config use-context kind-ecommerce-local || error "Cluster 'ecommerce-local' introuvable. Retirez --skip-cluster"
fi

# ─────────────────────────────────────────────────────────────────────────
#  PHASE 2 — Infrastructure
# ─────────────────────────────────────────────────────────────────────────
if [[ "$SKIP_INFRA" == false ]]; then
    header "Phase 2/5 — Infrastructure (DBs + Keycloak + Kafka + Monitoring)"
    # Infrastructure + Applications déployées en une seule commande Helm
else
    log "Phase 2 ignorée (--skip-infra)"
fi

# ─────────────────────────────────────────────────────────────────────────
#  PHASE 3 — Build & Deploy Apps
# ─────────────────────────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" == false ]]; then
    header "Phase 3/5 — Build + Déploiement Applications"
    chmod +x "$SCRIPT_DIR/scripts/04-build-and-deploy.sh"
    "$SCRIPT_DIR/scripts/04-build-and-deploy.sh"
else
    log "Phase 3 ignorée (--skip-build)"
fi

# ─────────────────────────────────────────────────────────────────────────
#  PHASE 4 — Configuration + Tests
# ─────────────────────────────────────────────────────────────────────────
header "Phase 4/5 — Configuration + Tests"
chmod +x "$SCRIPT_DIR/scripts/05-configure-hosts.sh"
"$SCRIPT_DIR/scripts/05-configure-hosts.sh"

# ─────────────────────────────────────────────────────────────────────────
#  RÉSUMÉ
# ─────────────────────────────────────────────────────────────────────────
ELAPSED=$(( SECONDS - START_TIME ))
MINUTES=$(( ELAPSED / 60 ))
SECS=$(( ELAPSED % 60 ))

header "🎉 Déploiement terminé!"
echo -e "Durée totale: ${BOLD}${MINUTES}m ${SECS}s${NC}"
echo ""
echo -e "${BOLD}${GREEN}Ouvrez votre navigateur:${NC}"
echo -e "  → ${CYAN}http://localhost:30080${NC}   (Frontend E-Commerce)"
echo -e "  → ${CYAN}http://localhost:30082/auth/admin${NC}   (Keycloak Admin)"
echo -e "  → ${CYAN}http://localhost:30083${NC}   (Grafana Monitoring)"
echo ""
echo -e "${BOLD}Comptes de test:${NC}"
echo -e "  admin / Admin#2024! — ${YELLOW}ADMIN${NC}"
echo -e "  alice / Alice#2024! — USER"
echo -e "  bob   / Bob#2024!   — SELLER"
echo ""
echo -e "${BOLD}Commandes utiles:${NC}"
echo "  kubectl get pods -A                           # voir tous les pods"
echo "  kubectl logs -f -n ecommerce api-gateway-xxx  # logs API Gateway"
echo "  helm list -n ecommerce                        # releases Helm"
echo "  helm upgrade --install ... (redéployer)        # mise à jour"
echo "  kind delete cluster --name ecommerce-local    # supprimer cluster"
echo ""
