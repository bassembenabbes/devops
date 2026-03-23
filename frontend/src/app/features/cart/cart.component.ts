import { Component, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, CurrencyPipe],
  template: `
    <div class="cart-page">
      <div class="cart-container">
        <h1 class="page-title">Mon Panier</h1>

        @if (cart.items().length === 0) {
          <div class="empty-cart">
            <div class="empty-icon">🛒</div>
            <h2>Votre panier est vide</h2>
            <p class="text-secondary">Découvrez notre sélection de produits</p>
            <button mat-raised-button color="primary" routerLink="/products">
              <mat-icon>storefront</mat-icon> Voir les produits
            </button>
          </div>
        } @else {
          <div class="cart-layout">
            <div class="cart-items">
              @for (item of cart.items(); track item.product.id) {
                <div class="cart-item card">
                  <img [src]="item.product.imageUrls?.[0] || 'assets/images/product-placeholder.svg'"
                       [alt]="item.product.name" class="item-image"
                       (error)="$any($event.target).src='assets/images/product-placeholder.svg'">
                  <div class="item-details">
                    <a [routerLink]="['/products', item.product.id]" class="item-name">{{ item.product.name }}</a>
                    <p class="item-category text-muted">{{ item.product.category }}</p>
                    <p class="item-unit-price">{{ item.product.price | currency:'EUR' }} / unité</p>
                  </div>
                  <div class="item-controls">
                    <div class="qty-row">
                      <button mat-icon-button (click)="cart.updateQuantity(item.product.id, item.quantity - 1)">
                        <mat-icon>remove</mat-icon>
                      </button>
                      <span class="qty">{{ item.quantity }}</span>
                      <button mat-icon-button (click)="cart.updateQuantity(item.product.id, item.quantity + 1)">
                        <mat-icon>add</mat-icon>
                      </button>
                    </div>
                    <div class="item-total">{{ item.product.price * item.quantity | currency:'EUR' }}</div>
                    <button mat-icon-button color="warn" (click)="cart.removeFromCart(item.product.id)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
              }
              <button mat-stroked-button (click)="cart.clear()" class="clear-btn">
                <mat-icon>delete_sweep</mat-icon> Vider le panier
              </button>
            </div>

            <aside class="order-summary card">
              <h2 class="summary-title">Récapitulatif</h2>
              <div class="summary-rows">
                @for (item of cart.items(); track item.product.id) {
                  <div class="summary-row">
                    <span>{{ item.product.name }} x{{ item.quantity }}</span>
                    <span>{{ item.product.price * item.quantity | currency:'EUR' }}</span>
                  </div>
                }
              </div>
              <div class="summary-divider"></div>
              <div class="summary-total">
                <span>Total</span>
                <span class="price price--large">{{ cart.total() | currency:'EUR' }}</span>
              </div>
              @if (auth.isLoggedIn()) {
                <button mat-raised-button color="primary" class="checkout-btn" routerLink="/checkout">
                  <mat-icon>payment</mat-icon> Passer la commande
                </button>
              } @else {
                <button mat-raised-button color="primary" class="checkout-btn" (click)="auth.login('/checkout')">
                  <mat-icon>login</mat-icon> Connectez-vous pour commander
                </button>
              }
            </aside>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .cart-page { padding: 40px var(--content-padding); }
    .cart-container { max-width: 1100px; margin: 0 auto; }
    .page-title { font-family: var(--font-display); font-size: 2rem; font-weight: 800; margin-bottom: 32px; }
    .empty-cart {
      text-align: center; padding: 80px 32px;
      display: flex; flex-direction: column; align-items: center; gap: 16px;
      .empty-icon { font-size: 80px; }
      h2 { font-family: var(--font-display); font-size: 1.5rem; }
    }
    .cart-layout { display: grid; grid-template-columns: 1fr 320px; gap: 32px;
      @media (max-width: 900px) { grid-template-columns: 1fr; } }
    .cart-items { display: flex; flex-direction: column; gap: 12px; }
    .cart-item {
      display: flex; gap: 16px; align-items: center; padding: 16px;
    }
    .item-image { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
    .item-details { flex: 1; min-width: 0; }
    .item-name { font-weight: 600; text-decoration: none; color: var(--color-text-primary);
      &:hover { color: var(--color-accent); } }
    .item-category { font-size: 0.8rem; margin: 4px 0; }
    .item-unit-price { font-size: 0.875rem; color: var(--color-text-secondary); }
    .item-controls { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
    .qty-row { display: flex; align-items: center; gap: 4px;
      .qty { font-family: var(--font-display); font-weight: 700; min-width: 28px; text-align: center; } }
    .item-total { font-family: var(--font-display); font-weight: 700; color: var(--color-accent); }
    .clear-btn { align-self: flex-start; color: var(--color-text-muted) !important; }
    .order-summary { padding: 24px; height: fit-content; position: sticky; top: 80px; }
    .summary-title { font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; margin-bottom: 20px; }
    .summary-rows { display: flex; flex-direction: column; gap: 10px; }
    .summary-row { display: flex; justify-content: space-between; font-size: 0.875rem;
      color: var(--color-text-secondary);
      span:first-child { flex: 1; margin-right: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } }
    .summary-divider { border: none; border-top: 1px solid var(--color-border); margin: 16px 0; }
    .summary-total { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-weight: 700; }
    .checkout-btn { width: 100%; height: 48px; }
  `]
})
export class CartComponent {
  cart   = inject(CartService);
  auth   = inject(AuthService);
  router = inject(Router);
}
