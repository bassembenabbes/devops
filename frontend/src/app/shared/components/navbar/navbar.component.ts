import { Component, output, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from '../../../core/auth/auth.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule, MatMenuModule, MatBadgeModule],
  template: `
    <nav class="navbar">
      <div class="navbar__inner">

        <a routerLink="/" class="navbar__brand">
          <span class="brand-icon">◈</span>
          <span class="brand-name">NEXUS<span class="brand-accent">STORE</span></span>
        </a>

        <div class="navbar__links">
          <a routerLink="/products" routerLinkActive="active" class="nav-link">Produits</a>
          @if (auth.isLoggedIn()) {
            <a routerLink="/orders" routerLinkActive="active" class="nav-link">Commandes</a>
          }
          @if (auth.isAdmin()) {
            <a routerLink="/admin" routerLinkActive="active" class="nav-link nav-link--admin">Admin</a>
          }
        </div>

        <div class="navbar__actions">
          <!-- Cart -->
          <button mat-icon-button class="action-btn" (click)="cartToggle.emit()">
            <mat-icon [matBadge]="cartCount() || null" matBadgeColor="warn" matBadgeSize="small">
              shopping_cart
            </mat-icon>
          </button>

          <!-- Auth -->
          @if (auth.isLoggedIn()) {
            <button mat-button [matMenuTriggerFor]="userMenu" class="user-btn">
              <mat-icon>account_circle</mat-icon>
              <span class="user-name">{{ auth.displayName() }}</span>
              <mat-icon class="chevron">expand_more</mat-icon>
            </button>
            <mat-menu #userMenu="matMenu" class="user-menu">
              <div class="user-menu__header">
                <strong>{{ auth.displayName() }}</strong>
                <span class="text-muted" style="font-size:0.8rem">{{ auth.user()?.email }}</span>
                @for (role of auth.user()?.roles; track role) {
                  <span class="badge badge--accent" style="margin-top:4px">{{ role }}</span>
                }
              </div>
              <button mat-menu-item routerLink="/orders">
                <mat-icon>receipt_long</mat-icon> Mes commandes
              </button>
              <button mat-menu-item (click)="auth.logout()">
                <mat-icon>logout</mat-icon> Déconnexion
              </button>
            </mat-menu>
          } @else {
            <button mat-raised-button color="primary" (click)="auth.login()" class="login-btn">
              <mat-icon>login</mat-icon> Connexion
            </button>
          }
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
      height: 64px;
      background: rgba(10,10,15,0.92);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--color-border);
    }
    .navbar__inner {
      max-width: 1400px; margin: 0 auto;
      height: 100%; padding: 0 24px;
      display: flex; align-items: center; gap: 32px;
    }
    .navbar__brand {
      display: flex; align-items: center; gap: 10px;
      text-decoration: none; flex-shrink: 0;
    }
    .brand-icon { font-size: 1.5rem; color: var(--color-accent); }
    .brand-name {
      font-family: var(--font-display); font-size: 1.1rem; font-weight: 800;
      letter-spacing: 0.08em; color: var(--color-text-primary);
    }
    .brand-accent { color: var(--color-accent); }
    .navbar__links { display: flex; gap: 4px; }
    .nav-link {
      padding: 6px 14px; border-radius: 6px;
      font-size: 0.9rem; font-weight: 500;
      color: var(--color-text-secondary);
      text-decoration: none;
      transition: all var(--transition);
      &:hover, &.active { color: var(--color-text-primary); background: var(--color-bg-elevated); }
      &.active { color: var(--color-accent); }
      &--admin { color: var(--color-warning) !important; }
    }
    .navbar__actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
    .action-btn { color: var(--color-text-secondary) !important; }
    .user-btn { display: flex; align-items: center; gap: 6px; color: var(--color-text-primary) !important; }
    .user-name { font-family: var(--font-body); font-size: 0.9rem; }
    .chevron { font-size: 18px !important; width: 18px !important; height: 18px !important; }
    .login-btn { font-family: var(--font-display) !important; font-weight: 700 !important; }
    .user-menu__header {
      padding: 12px 16px; border-bottom: 1px solid var(--color-border);
      display: flex; flex-direction: column; gap: 4px;
      pointer-events: none;
    }
  `]
})
export class NavbarComponent {
  cartToggle = output<void>();
  auth = inject(AuthService);
  private cart = inject(CartService);
  cartCount = this.cart.itemCount;
}
