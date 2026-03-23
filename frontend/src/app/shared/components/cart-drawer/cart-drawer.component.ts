import { Component, input, output, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, CurrencyPipe],
  template: `
    <!-- Overlay -->
    @if (open()) {
      <div class="overlay" (click)="close.emit()"></div>
    }

    <!-- Drawer -->
    <aside class="cart-drawer" [class.open]="open()">
      <div class="drawer-header">
        <h2>Mon Panier <span class="badge badge--accent">{{ cart.itemCount() }}</span></h2>
        <button mat-icon-button (click)="close.emit()"><mat-icon>close</mat-icon></button>
      </div>

      <div class="drawer-body">
        @if (cart.items().length === 0) {
          <div class="empty-cart">
            <mat-icon class="empty-icon">shopping_cart</mat-icon>
            <p>Votre panier est vide</p>
            <button mat-stroked-button routerLink="/products" (click)="close.emit()">
              Voir les produits
            </button>
          </div>
        } @else {
          <ul class="cart-list">
            @for (item of cart.items(); track item.product.id) {
              <li class="cart-item">
                <img [src]="item.product.imageUrls?.[0] || 'assets/images/product-placeholder.svg'"
                     [alt]="item.product.name" class="item-img"
                     (error)="$any($event.target).src='assets/images/product-placeholder.svg'">
                <div class="item-info">
                  <p class="item-name">{{ item.product.name }}</p>
                  <p class="item-price">{{ item.product.price | currency:'EUR' }}</p>
                  <div class="qty-controls">
                    <button mat-icon-button (click)="cart.updateQuantity(item.product.id, item.quantity - 1)">
                      <mat-icon>remove</mat-icon>
                    </button>
                    <span>{{ item.quantity }}</span>
                    <button mat-icon-button (click)="cart.updateQuantity(item.product.id, item.quantity + 1)">
                      <mat-icon>add</mat-icon>
                    </button>
                  </div>
                </div>
                <div class="item-actions">
                  <p class="item-subtotal">{{ item.product.price * item.quantity | currency:'EUR' }}</p>
                  <button mat-icon-button (click)="cart.removeFromCart(item.product.id)">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              </li>
            }
          </ul>
        }
      </div>

      @if (cart.items().length > 0) {
        <div class="drawer-footer">
          <div class="total-row">
            <span>Total</span>
            <span class="price price--large">{{ cart.total() | currency:'EUR' }}</span>
          </div>
          <button mat-raised-button color="primary" class="checkout-btn" (click)="goCheckout()">
            <mat-icon>payment</mat-icon> Commander
          </button>
          <button mat-stroked-button class="clear-btn" (click)="cart.clear()">
            Vider le panier
          </button>
        </div>
      }
    </aside>
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0; z-index: 1100;
      background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
    }
    .cart-drawer {
      position: fixed; top: 0; right: 0; bottom: 0; z-index: 1101;
      width: 420px; max-width: 100vw;
      background: var(--color-bg-card);
      border-left: 1px solid var(--color-border);
      display: flex; flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: var(--shadow-modal);
      &.open { transform: translateX(0); }
    }
    .drawer-header {
      padding: 20px 24px; border-bottom: 1px solid var(--color-border);
      display: flex; align-items: center; justify-content: space-between;
      h2 { font-family: var(--font-display); font-size: 1.25rem; display: flex; align-items: center; gap: 10px; }
    }
    .drawer-body { flex: 1; overflow-y: auto; padding: 16px 24px; }
    .empty-cart {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 300px; gap: 16px; color: var(--color-text-muted);
      .empty-icon { font-size: 64px !important; width: 64px !important; height: 64px !important; opacity: 0.3; }
    }
    .cart-list { list-style: none; display: flex; flex-direction: column; gap: 16px; }
    .cart-item {
      display: flex; gap: 12px; padding: 12px;
      background: var(--color-bg-elevated); border-radius: var(--border-radius-sm);
      border: 1px solid var(--color-border);
    }
    .item-img {
      width: 64px; height: 64px; object-fit: cover;
      border-radius: 6px; flex-shrink: 0;
    }
    .item-info { flex: 1; min-width: 0; }
    .item-name { font-weight: 600; font-size: 0.875rem; line-height: 1.3; margin-bottom: 4px; }
    .item-price { color: var(--color-text-muted); font-size: 0.8rem; margin-bottom: 8px; }
    .qty-controls {
      display: flex; align-items: center; gap: 4px;
      span { min-width: 24px; text-align: center; font-weight: 700; }
      button { width: 28px !important; height: 28px !important; line-height: 28px !important; }
      mat-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; }
    }
    .item-actions { display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; }
    .item-subtotal { font-family: var(--font-display); font-weight: 700; color: var(--color-accent); font-size: 0.95rem; }
    .drawer-footer {
      padding: 20px 24px; border-top: 1px solid var(--color-border);
      display: flex; flex-direction: column; gap: 12px;
    }
    .total-row {
      display: flex; align-items: center; justify-content: space-between;
      font-family: var(--font-display); font-weight: 700; font-size: 1.1rem;
    }
    .checkout-btn { width: 100%; height: 48px; font-size: 1rem !important; }
    .clear-btn { width: 100%; color: var(--color-text-muted) !important; }
  `]
})
export class CartDrawerComponent {
  open   = input.required<boolean>();
  close  = output<void>();
  cart   = inject(CartService);
  private router = inject(Router);

  goCheckout(): void {
    this.close.emit();
    this.router.navigate(['/checkout']);
  }
}
