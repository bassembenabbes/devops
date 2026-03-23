# E-Commerce Frontend — Angular 17

Application Angular 17 standalone complète avec Material Design dark theme.

## Stack
- **Angular 17** — Standalone components, signals, lazy loading
- **Angular Material** — Thème dark personnalisé (amber)
- **Keycloak JS** — Auth OIDC/PKCE
- **RxJS 7** — Services réactifs
- **SCSS** — Variables CSS custom

## Structure
```
src/app/
├── core/
│   ├── auth/           AuthService (Keycloak signals)
│   ├── guards/         authGuard, adminGuard
│   ├── interceptors/   authInterceptor (Bearer token)
│   ├── models/         Product, Cart, Order, User
│   └── services/       ProductService, CartService, NotificationService
├── features/
│   ├── products/
│   │   └── pages/      ProductListComponent, ProductDetailComponent
│   ├── cart/           CartComponent
│   ├── orders/         OrdersComponent
│   └── admin/          AdminComponent (CRUD produits)
├── shared/
│   └── components/
│       ├── navbar/     NavbarComponent
│       ├── product-card/ ProductCardComponent
│       └── cart-drawer/  CartDrawerComponent (slide-in)
└── layout/             ShellComponent
```

## Dev local (sans Kubernetes)
```bash
npm install --legacy-peer-deps
npm start        # http://localhost:4200
```

## Build production (pour Kind/K8s)
```bash
docker build -t localhost/ecommerce/frontend:local .
kind load docker-image localhost/ecommerce/frontend:local --name ecommerce-local
```

## Comptes de test
| Username | Password   | Roles       |
|----------|------------|-------------|
| admin    | Admin2024  | USER, ADMIN |
| alice    | Alice2024  | USER        |
| bob      | Bob2024    | USER,SELLER |
