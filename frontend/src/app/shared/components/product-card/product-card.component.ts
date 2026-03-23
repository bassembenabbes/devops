import { Component, input, output, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Product } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, CurrencyPipe],
  template: `
    <article class="product-card" [class.out-of-stock]="product().stockQuantity === 0">
      <a [routerLink]="['/products', product().id]" class="card-image-link">
        <div class="card-image">
          <img
            [src]="imgSrc"
            [alt]="product().name"
            loading="lazy"
            (error)="onImgError()"
          >
          @if (product().stockQuantity === 0) {
            <div class="out-of-stock-overlay">Rupture de stock</div>
          }
          <span class="card-category">{{ product().category }}</span>
        </div>
      </a>

      <div class="card-body">
        <a [routerLink]="['/products', product().id]" class="card-title">{{ product().name }}</a>
        <p class="card-desc">{{ product().description | slice:0:80 }}...</p>

        <div class="card-footer">
          <span class="price price--medium">{{ product().price | currency:'EUR':'symbol':'1.2-2' }}</span>
          <button
            mat-mini-fab
            class="add-to-cart-btn"
            [disabled]="product().stockQuantity === 0"
            (click)="addToCart(); $event.stopPropagation()"
            title="Ajouter au panier">
            <mat-icon>add_shopping_cart</mat-icon>
          </button>
        </div>

        @if (product().stockQuantity > 0 && product().stockQuantity <= 5) {
          <p class="low-stock">⚡ Plus que {{ product().stockQuantity }} en stock</p>
        }
      </div>
    </article>
  `,
  styles: [`
    .product-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--border-radius);
      overflow: hidden;
      transition: all var(--transition);
      display: flex; flex-direction: column;
      height: 100%;
      &:hover {
        border-color: var(--color-border-hover);
        transform: translateY(-2px);
        box-shadow: var(--shadow-card);
      }
      &.out-of-stock { opacity: 0.6; }
    }
    .card-image-link { display: block; }
    .card-image {
      position: relative; aspect-ratio: 4/3; overflow: hidden;
      background: var(--color-bg-elevated);
      img {
        width: 100%; height: 100%; object-fit: cover;
        transition: transform 0.4s ease;
        background: var(--color-bg-elevated);
      }
    }
    .product-card:hover .card-image img { transform: scale(1.05); }
    .card-category {
      position: absolute; top: 10px; left: 10px;
      background: rgba(0,0,0,0.7); backdrop-filter: blur(10px);
      color: var(--color-accent); font-size: 0.7rem;
      font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
      padding: 3px 8px; border-radius: 4px;
      border: 1px solid rgba(245,158,11,0.3);
    }
    .out-of-stock-overlay {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      color: white; font-family: var(--font-display); font-weight: 700;
    }
    .card-body {
      padding: 16px; flex: 1;
      display: flex; flex-direction: column; gap: 8px;
    }
    .card-title {
      font-family: var(--font-display); font-size: 0.95rem; font-weight: 700;
      color: var(--color-text-primary); text-decoration: none; line-height: 1.3;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      overflow: hidden;
      &:hover { color: var(--color-accent); }
    }
    .card-desc {
      font-size: 0.82rem; color: var(--color-text-muted); flex: 1; line-height: 1.5;
    }
    .card-footer {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: auto; padding-top: 12px;
      border-top: 1px solid var(--color-border);
    }
    .add-to-cart-btn {
      background: var(--color-accent) !important;
      color: #000 !important;
      width: 36px !important; height: 36px !important;
      &:hover:not(:disabled) { background: var(--color-accent-light) !important; }
    }
    .low-stock { font-size: 0.75rem; color: var(--color-warning); font-weight: 600; }
  `]
})
export class ProductCardComponent {
  product = input.required<Product>();
  private cart   = inject(CartService);
  private notify = inject(NotificationService);

  readonly fallbackImg = 'assets/images/product-placeholder.svg';
  imgSrc = '';

  ngOnInit(): void {
    this.imgSrc = this.product().imageUrls?.[0] || this.fallbackImg;
  }

  onImgError(): void {
    this.imgSrc = this.fallbackImg;
  }

  addToCart(): void {
    this.cart.addToCart(this.product());
    this.notify.success(`${this.product().name} ajouté au panier`);
  }
}
