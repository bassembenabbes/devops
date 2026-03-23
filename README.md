# 🛒 E-Commerce Platform — Déploiement Local Complet

## Architecture déployée

```
┌─────────────────────────────────────────────────────────────────┐
│  Votre PC (localhost)                                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Kind Cluster "ecommerce-local" (3 nodes)                │   │
│  │                                                          │   │
│  │  Namespace: ecommerce                                    │   │
│  │  ├── frontend (nginx + Angular) ←── :30080              │   │
│  │  ├── api-gateway (Spring Cloud Gateway) ←── :30081      │   │
│  │  ├── product-service (Spring Boot + MongoDB)             │   │
│  │  ├── user-service (Spring Boot + PostgreSQL)             │   │
│  │  ├── order-service (Spring Boot + PostgreSQL)            │   │
│  │  ├── postgresql                                          │   │
│  │  ├── mongodb                                             │   │
│  │  ├── redis                                               │   │
│  │  └── kafka                                               │   │
│  │                                                          │   │
│  │  Namespace: keycloak                                     │   │
│  │  └── keycloak ←── :30082                                │   │
│  │                                                          │   │
│  │  Namespace: monitoring                                   │   │
│  │  ├── prometheus                                          │   │
│  │  ├── grafana ←── :30083                                 │   │
│  │  └── jaeger ←── :30084                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Prérequis

| Outil | Version min | Installation |
|-------|------------|--------------|
| Docker | 24+ | [docker.com](https://docker.com) |
| kubectl | 1.28+ | auto via script |
| Helm | 3.13+ | auto via script |
| Kind | 0.20+ | auto via script |
| Java JDK | 21 | auto via script |
| Maven | 3.9+ | auto via script |
| RAM | 8 GB+ | — |
| Disque | 20 GB+ | — |

## 🚀 Démarrage rapide (1 commande)

```bash
# Rendre les scripts exécutables
chmod +x launch.sh scripts/*.sh test.sh

# Lancer tout (installation + cluster + infrastructure + apps)
./launch.sh
```

**Durée**: 20-40 minutes (première fois, selon votre connexion)

## Étapes manuelles (si problème)

```bash
# 1. Installer les outils (Docker, kubectl, Helm, Kind, Java, Maven)
./scripts/01-install-tools.sh

# 2. Créer le cluster Kind (Kubernetes local)
./scripts/02-create-cluster.sh

# 3. Déployer l'infrastructure via Helm (PostgreSQL, MongoDB, Redis, Kafka, Keycloak, Monitoring)
./scripts/03-deploy-infrastructure.sh

# 4. Builder les images Docker + déployer les apps via Helm
./scripts/04-build-and-deploy.sh

# 5. Configurer /etc/hosts + tester les endpoints
./scripts/05-configure-hosts.sh
```

## 🌐 URLs d'accès

| Service | URL | Identifiants |
|---------|-----|--------------|
| Frontend Angular | http://localhost:30080 | — |
| API Gateway | http://localhost:30081 | — |
| Products API | http://localhost:30081/api/v1/products | — |
| Keycloak Admin | http://localhost:30082/auth/admin | admin / Ecom#Admin2024! |
| Grafana | http://localhost:30083 | admin / Grafana#2024! |
| Jaeger UI | http://localhost:30084 | — |

## 🔑 Comptes de test

| Username | Password | Rôles |
|----------|----------|-------|
| admin | Admin#2024! | ADMIN, USER |
| alice | Alice#2024! | USER |
| bob | Bob#2024! | USER, SELLER |

## 🧪 Tests

```bash
# Tests automatisés de tous les endpoints
./test.sh

# Test manuel API
curl http://localhost:30081/api/v1/products

# Obtenir un JWT Keycloak
curl -X POST "http://localhost:30082/auth/realms/ecommerce/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=ecommerce-frontend&username=alice&password=Alice#2024!&scope=openid"

# Accès endpoint protégé
curl -H "Authorization: Bearer <TOKEN>" http://localhost:30081/api/v1/orders
```

## 🔧 Commandes Kubernetes

```bash
# Voir tous les pods
kubectl get pods -A

# Voir les pods ecommerce
kubectl get pods -n ecommerce -o wide

# Logs API Gateway
kubectl logs -f -n ecommerce -l app=api-gateway

# Logs Product Service
kubectl logs -f -n ecommerce -l app=product-service

# Voir les services exposés
kubectl get svc -n ecommerce
kubectl get svc -n keycloak

# Port-forward manuel (si NodePort ne marche pas)
kubectl port-forward -n ecommerce svc/api-gateway 8081:8080
kubectl port-forward -n keycloak svc/keycloak 8082:80

# Métriques
kubectl top pods -n ecommerce

# Describe un pod
kubectl describe pod -n ecommerce <pod-name>
```

## ⎈ Commandes Helm

```bash
# Voir les releases
helm list -n ecommerce

# Status de la release
helm status ecommerce-platform -n ecommerce

# Mettre à jour après modification du code
helm upgrade ecommerce-platform ./helm/ecommerce-chart -n ecommerce

# Rollback vers version précédente
helm rollback ecommerce-platform -n ecommerce

# Valeurs actuelles
helm get values ecommerce-platform -n ecommerce

# Supprimer les apps (garde les DBs)
helm uninstall ecommerce-platform -n ecommerce

# Supprimer tout l'infrastructure
helm uninstall postgresql mongodb redis kafka -n ecommerce
helm uninstall keycloak -n keycloak
```

## ♻️ Redéploiement rapide (après modifications code)

```bash
# Rebuilder seulement les apps (pas les DBs/Keycloak)
./launch.sh --skip-infra

# Rebuilder seulement le frontend
docker build -t localhost/ecommerce/frontend:local -f frontend/Dockerfile.simple frontend/
kind load docker-image localhost/ecommerce/frontend:local --name ecommerce-local
kubectl rollout restart deployment/frontend -n ecommerce

# Rebuilder product-service
cd backend/product-service && mvn package -DskipTests -q && cd ../..
docker build -t localhost/ecommerce/product-service:local -f backend/Dockerfile backend/product-service
kind load docker-image localhost/ecommerce/product-service:local --name ecommerce-local
kubectl rollout restart deployment/product-service -n ecommerce
```

## 🗑️ Nettoyer tout

```bash
# Supprimer le cluster Kind (supprime tout)
kind delete cluster --name ecommerce-local

# Supprimer les images Docker locales
docker rmi localhost/ecommerce/frontend:local
docker rmi localhost/ecommerce/api-gateway:local
docker rmi localhost/ecommerce/product-service:local
```

## 🐛 Dépannage

### Pod en état "Pending"
```bash
kubectl describe pod -n ecommerce <pod-name>
# Souvent: pas assez de ressources → réduire les requests dans values.yaml
```

### Pod en "CrashLoopBackOff"
```bash
kubectl logs -n ecommerce <pod-name> --previous
```

### Keycloak ne démarre pas
```bash
# Keycloak peut prendre 3-5 minutes au premier démarrage
kubectl logs -n keycloak -l app.kubernetes.io/name=keycloak -f
```

### Image non trouvée
```bash
# Vérifier que l'image est bien chargée dans Kind
docker exec ecommerce-local-control-plane crictl images | grep ecommerce
```

### API non joignable
```bash
# Vérifier le NodePort
kubectl get svc -n ecommerce
# Port-forward de secours
kubectl port-forward -n ecommerce svc/api-gateway 30081:8080 &
```
