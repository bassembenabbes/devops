#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  PHASE 2 — Création du cluster Kubernetes local avec Kind
# ═══════════════════════════════════════════════════════════════════════════
set -uo pipefail
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
log()    { echo -e "${GREEN}[✔]${NC} $1"; }
warn()   { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()    { echo -e "${RED}[✘]${NC} $1"; exit 1; }
header() { echo -e "\n${BOLD}${CYAN}=== $1 ===${NC}\n"; }
step()   { echo -e "${BLUE}[->]${NC} $1"; }

CLUSTER_NAME="ecommerce-local"

# ── Détecter RAM ──────────────────────────────────────────────────────────
MEM_GB=$(awk '/MemAvailable/ {printf "%.0f", $2/1024/1024}' /proc/meminfo 2>/dev/null || echo "4")
if [[ $MEM_GB -lt 5 ]]; then
    warn "RAM disponible: ${MEM_GB}GB -> cluster 1 node"
    NODES=1
else
    log "RAM disponible: ${MEM_GB}GB -> cluster 3 nodes"
    NODES=3
fi

header "PHASE 2 — Création du cluster Kind ($NODES node(s))"

# ── Générer le Kind config YAML proprement ────────────────────────────────
# (NE PAS utiliser cat >> pour ajouter des workers — ça casse l'indentation YAML)
CONFIG_FILE="/tmp/kind-config-${CLUSTER_NAME}.yaml"

if [[ $NODES -eq 1 ]]; then
    cat > "$CONFIG_FILE" << KINDEOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: ${CLUSTER_NAME}
nodes:
  - role: control-plane
    image: kindest/node:v1.28.0
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - containerPort: 30080
        hostPort: 30080
        protocol: TCP
      - containerPort: 30081
        hostPort: 30081
        protocol: TCP
      - containerPort: 30082
        hostPort: 30082
        protocol: TCP
      - containerPort: 30083
        hostPort: 30083
        protocol: TCP
      - containerPort: 30084
        hostPort: 30084
        protocol: TCP
networking:
  apiServerAddress: "127.0.0.1"
  apiServerPort: 6443
KINDEOF
else
    # 3 nodes — tout dans un seul heredoc, pas de cat >>
    cat > "$CONFIG_FILE" << KINDEOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: ${CLUSTER_NAME}
nodes:
  - role: control-plane
    image: kindest/node:v1.28.0
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - containerPort: 30080
        hostPort: 30080
        protocol: TCP
      - containerPort: 30081
        hostPort: 30081
        protocol: TCP
      - containerPort: 30082
        hostPort: 30082
        protocol: TCP
      - containerPort: 30083
        hostPort: 30083
        protocol: TCP
      - containerPort: 30084
        hostPort: 30084
        protocol: TCP
  - role: worker
    image: kindest/node:v1.28.0
  - role: worker
    image: kindest/node:v1.28.0
networking:
  apiServerAddress: "127.0.0.1"
  apiServerPort: 6443
KINDEOF
fi

# Valider le YAML avant de l'utiliser
step "Validation du config Kind..."
python3 -c "import yaml; yaml.safe_load(open('$CONFIG_FILE'))" 2>/dev/null \
    && log "Config YAML valide" \
    || { cat "$CONFIG_FILE"; err "Config YAML invalide — vérifiez ci-dessus"; }

# ── Supprimer cluster existant si demandé ─────────────────────────────────
if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
    warn "Cluster '$CLUSTER_NAME' existe déjà"
    [[ "${1:-}" == "--auto" ]] && REPLY="o" \
        || { read -p "Supprimer et recréer ? (o/N) " -n 1 -r; echo; }
    if [[ ${REPLY:-n} =~ ^[OoYy]$ ]]; then
        step "Suppression cluster existant..."
        kind delete cluster --name "$CLUSTER_NAME"
    else
        log "Utilisation du cluster existant"
        kind export kubeconfig --name "$CLUSTER_NAME"
        kubectl config use-context "kind-$CLUSTER_NAME"
        exit 0
    fi
fi

# ── Créer le cluster ──────────────────────────────────────────────────────
step "Création du cluster Kind (3-5 min)..."
kind create cluster --config "$CONFIG_FILE" --wait 5m \
    || err "Kind create échoué — vérifiez Docker (docker ps)"

# ── Exporter kubeconfig immédiatement ────────────────────────────────────
step "Export kubeconfig..."
kind export kubeconfig --name "$CLUSTER_NAME" \
    || err "Impossible d'exporter le kubeconfig"

kubectl config use-context "kind-$CLUSTER_NAME" \
    || err "Contexte kind-$CLUSTER_NAME introuvable"

# ── Vérifier que l'API server répond ─────────────────────────────────────
step "Test API server..."
for i in 1 2 3 4 5; do
    kubectl get nodes &>/dev/null && break
    warn "API server pas encore prêt ($i/5)..."
    sleep 5
done
kubectl get nodes || err "API server inaccessible après 25s"
log "Cluster opérationnel ✓"

# ── Namespaces ─────────────Retire complètement la création des namespaces du script 02-create-cluster.sh et laisse Helm les créer lui-même via --create-namespace ou 00-namespaces.yaml───────────────────────────────────────────────
# step "Création des namespaces..."
# for ns in ecommerce keycloak monitoring; do
#    kubectl create namespace "$ns" --dry-run=client -o yaml | kubectl apply -f -
#    log "Namespace '$ns' prêt"
# done

# ── NGINX Ingress (non-bloquant) ──────────────────────────────────────────
step "Installation NGINX Ingress Controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml 2>/dev/null \
    || warn "Ingress Controller: erreur réseau, on continue quand même"

step "Attente Ingress Controller (60s max, non-bloquant)..."
kubectl wait --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=60s 2>/dev/null \
    && log "NGINX Ingress prêt" \
    || warn "NGINX Ingress pas encore prêt — démarrera en arrière-plan (normal)"

# ── Helm repos ────────────────────────────────────────────────────────────
step "Ajout des repos Helm..."
helm repo add bitnami https://charts.bitnami.com/bitnami 2>/dev/null || true
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
helm repo update 2>/dev/null | tail -3
log "Repos Helm configurés"

# ── Status ────────────────────────────────────────────────────────────────
echo ""
header "Status du Cluster"
kubectl get nodes -o wide
echo ""

log "Phase 2 terminée — Cluster Kind opérationnel"
echo ""
echo -e "${YELLOW}Continuez avec: ./03-deploy-infrastructure.sh${NC}"
