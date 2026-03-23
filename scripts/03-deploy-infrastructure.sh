#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
#  03-deploy-infrastructure.sh
#  ⚠  Ce script est maintenant un alias vers 04-build-and-deploy.sh
#     L'infrastructure est déployée intégralement via Helm.
#     Toute la configuration est dans helm/ecommerce-chart/
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "ℹ  L'infrastructure est désormais gérée à 100% par Helm."
echo "   Ce script délègue à 04-build-and-deploy.sh"
echo ""

exec "$SCRIPT_DIR/04-build-and-deploy.sh" "$@"
