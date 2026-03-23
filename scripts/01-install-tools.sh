#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  🚀 E-COMMERCE PLATFORM — SCRIPT D'INSTALLATION COMPLET
#  Installe: Docker, kubectl, Helm, Kind, puis déploie toute l'architecture
#  Compatible: Ubuntu/Debian/macOS
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Couleurs ──────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()     { echo -e "${GREEN}[✔]${NC} $1"; }
warn()    { echo -e "${YELLOW}[⚠]${NC} $1"; }
error()   { echo -e "${RED}[✘]${NC} $1"; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}═══ $1 ═══${NC}\n"; }
step()    { echo -e "${BLUE}[→]${NC} $1"; }

# ── Détection OS ──────────────────────────────────────────────────────────
OS=""
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    DISTRO=$(lsb_release -si 2>/dev/null || echo "Unknown")
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
else
    error "OS non supporté: $OSTYPE. Utilisez Linux ou macOS."
fi

log "OS détecté: $OS ($DISTRO)"

header "🛒 E-Commerce Platform — Installation Complète"

echo -e "${BOLD}Ce script va installer et configurer:${NC}"
echo "  • Docker Desktop / Docker Engine"
echo "  • kubectl (client Kubernetes)"
echo "  • Helm 3 (gestionnaire de packages K8s)"
echo "  • Kind (Kubernetes IN Docker - cluster local)"
echo "  • Node.js 20 + Angular CLI (frontend)"
echo "  • Java 21 + Maven (backend)"
echo "  • Toute l'architecture e-commerce"
echo ""
echo -e "${YELLOW}Prérequis: 8GB RAM minimum, 20GB espace disque${NC}"
echo ""
read -p "Continuer ? (o/N) " -n 1 -r
echo
[[ $REPLY =~ ^[OoYy]$ ]] || exit 0

# ═══════════════════════════════════════════════════════════════════════════
#  PHASE 1 — INSTALLATION DES OUTILS
# ═══════════════════════════════════════════════════════════════════════════

header "PHASE 1 — Installation des outils"

install_docker_linux() {
    if command -v docker &>/dev/null; then
        log "Docker déjà installé: $(docker --version)"
        return
    fi
    step "Installation Docker..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
    sudo systemctl enable --now docker
    log "Docker installé"
    warn "IMPORTANT: Déconnectez-vous/reconnectez-vous pour que le groupe docker soit actif"
    warn "Ou exécutez: newgrp docker"
}

install_docker_mac() {
    if command -v docker &>/dev/null; then
        log "Docker déjà installé"
        return
    fi
    if command -v brew &>/dev/null; then
        step "Installation Docker Desktop via Homebrew..."
        brew install --cask docker
        open /Applications/Docker.app
        echo "Attendez que Docker Desktop démarre..."
        sleep 15
    else
        error "Homebrew requis sur macOS. Installez depuis: https://brew.sh"
    fi
}

install_kubectl() {
    if command -v kubectl &>/dev/null; then
        log "kubectl déjà installé: $(kubectl version --client --short 2>/dev/null)"
        return
    fi
    step "Installation kubectl..."
    if [[ "$OS" == "linux" ]]; then
        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
        sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
        rm kubectl
    else
        brew install kubectl
    fi
    log "kubectl installé: $(kubectl version --client --short 2>/dev/null)"
}

install_helm() {
    if command -v helm &>/dev/null; then
        log "Helm déjà installé: $(helm version --short)"
        return
    fi
    step "Installation Helm..."
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    log "Helm installé: $(helm version --short)"
}

install_kind() {
    if command -v kind &>/dev/null; then
        log "Kind déjà installé: $(kind version)"
        return
    fi
    step "Installation Kind..."
    if [[ "$OS" == "linux" ]]; then
        curl -Lo ./kind "https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64"
        sudo install -o root -g root -m 0755 kind /usr/local/bin/kind
        rm kind
    else
        brew install kind
    fi
    log "Kind installé: $(kind version)"
}

install_java() {
    if java -version &>/dev/null 2>&1; then
        VER=$(java -version 2>&1 | head -1)
        log "Java déjà installé: $VER"
        return
    fi
    step "Installation Java 21..."
    if [[ "$OS" == "linux" ]]; then
        sudo apt-get update -q
        sudo apt-get install -y temurin-21-jdk || {
            # Fallback: OpenJDK
            sudo apt-get install -y openjdk-21-jdk
        }
    else
        brew install --cask temurin@21
    fi
    log "Java installé"
}

install_maven() {
    if command -v mvn &>/dev/null; then
        log "Maven déjà installé: $(mvn -version | head -1)"
        return
    fi
    step "Installation Maven..."
    if [[ "$OS" == "linux" ]]; then
        sudo apt-get install -y maven
    else
        brew install maven
    fi
    log "Maven installé"
}

install_node() {
    if command -v node &>/dev/null; then
        log "Node.js déjà installé: $(node --version)"
        return
    fi
    step "Installation Node.js 20..."
    if [[ "$OS" == "linux" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        brew install node@20
    fi
    log "Node.js installé: $(node --version)"
}

# Exécution des installations
if [[ "$OS" == "linux" ]]; then
    install_docker_linux
else
    install_docker_mac
fi

install_kubectl
install_helm
install_kind
install_java
install_maven
install_node

# Vérification finale
step "Vérification de l'installation..."
for tool in docker kubectl helm kind java mvn node npm; do
    if command -v $tool &>/dev/null; then
        log "$tool ✓"
    else
        warn "$tool non disponible — certaines fonctionnalités peuvent être limitées"
    fi
done

echo ""
log "Phase 1 terminée — tous les outils sont installés"
echo ""
echo -e "${YELLOW}Continuez avec: ./02-create-cluster.sh${NC}"
