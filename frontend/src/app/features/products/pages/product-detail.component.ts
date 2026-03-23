import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, CurrencyPipe],
  template: `
    <div class="detail-page">
      @if (loading()) {
        <div class="app-spinner" style="height:60vh"><mat-spinner diameter="48"></mat-spinner></div>
      } @else if (product()) {
        <div class="detail-content">

          <a routerLink="/products" class="back-link">
            <mat-icon>arrow_back</mat-icon> Retour au catalogue
          </a>

          <div class="detail-grid">
            <!-- Image -->
            <div class="image-section">
              <div class="main-image">
                <img [src]="selectedImage()" [alt]="product()!.name"
                  (error)="selectedImage.set('assets/images/product-placeholder.svg')">
              </div>
              @if (product()!.imageUrls.length > 1) {
                <div class="image-thumbs">
                  @for (img of product()!.imageUrls; track img) {
                    <button class="thumb" [class.active]="selectedImage() === img" (click)="selectedImage.set(img)">
                      <img [src]="img" [alt]="product()!.name">
                    </button>
                  }
                </div>
              }
            </div>

            <!-- Info -->
            <div class="info-section">
              <span class="product-category badge badge--accent">{{ product()!.category }}</span>
              <h1 class="product-title">{{ product()!.name }}</h1>
              <p class="product-desc">{{ product()!.description }}</p>

              <div class="price-row">
                <span class="price price--large">{{ product()!.price | currency:'EUR':'symbol':'1.2-2' }}</span>
                @if (product()!.stockQuantity > 0) {
                  <span class="stock-badge in-stock">✓ En stock ({{ product()!.stockQuantity }})</span>
                } @else {
                  <span class="stock-badge out-stock">✗ Rupture de stock</span>
                }
              </div>

              <!-- Attributes -->
              @if (product()!.attributes && objectKeys(product()!.attributes).length > 0) {
                <div class="attributes">
                  <h3 class="attr-title">Caractéristiques</h3>
                  <dl class="attr-list">
                    @for (key of objectKeys(product()!.attributes); track key) {
                      <div class="attr-row">
                        <dt>{{ key }}</dt>
                        <dd>{{ product()!.attributes[key] }}</dd>
                      </div>
                    }
                  </dl>
                </div>
              }

              <!-- Actions -->
              <div class="actions">
                <div class="qty-selector">
                  <button mat-icon-button (click)="decreaseQty()"><mat-icon>remove</mat-icon></button>
                  <span class="qty-value">{{ qty }}</span>
                  <button mat-icon-button (click)="increaseQty()"><mat-icon>add</mat-icon></button>
                </div>
                <button
                  mat-raised-button color="primary"
                  class="add-btn"
                  [disabled]="product()!.stockQuantity === 0"
                  (click)="addToCart()">
                  <mat-icon>add_shopping_cart</mat-icon>
                  Ajouter au panier
                </button>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <div class="not-found">
          <h2>Produit introuvable</h2>
          <a routerLink="/products" mat-raised-button color="primary">Retour au catalogue</a>
        </div>
      }
    </div>
  `,
  styles: [`
    .detail-page { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
    .back-link {
      display: inline-flex; align-items: center; gap: 6px;
      color: var(--color-text-muted); font-size: 0.875rem;
      text-decoration: none; margin-bottom: 32px;
      transition: color var(--transition);
      &:hover { color: var(--color-accent); }
    }
    .detail-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 48px;
      @media (max-width: 768px) { grid-template-columns: 1fr; }
    }
    .main-image {
      aspect-ratio: 1; border-radius: var(--border-radius);
      overflow: hidden; background: var(--color-bg-elevated);
      border: 1px solid var(--color-border);
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .image-thumbs { display: flex; gap: 8px; margin-top: 12px; }
    .thumb {
      width: 64px; height: 64px; border-radius: 8px; overflow: hidden;
      border: 2px solid var(--color-border); cursor: pointer; padding: 0;
      &.active { border-color: var(--color-accent); }
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .info-section { display: flex; flex-direction: column; gap: 20px; }
    .product-category { align-self: flex-start; }
    .product-title { font-family: var(--font-display); font-size: clamp(1.5rem, 3vw, 2.25rem); font-weight: 800; }
    .product-desc { color: var(--color-text-secondary); line-height: 1.7; }
    .price-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .stock-badge {
      font-size: 0.8rem; font-weight: 600; padding: 4px 10px; border-radius: 100px;
      &.in-stock  { background: rgba(16,185,129,0.1); color: var(--color-success); border: 1px solid rgba(16,185,129,0.3); }
      &.out-stock { background: rgba(239,68,68,0.1);  color: var(--color-error);   border: 1px solid rgba(239,68,68,0.3); }
    }
    .attributes { background: var(--color-bg-elevated); border-radius: var(--border-radius-sm); padding: 16px; border: 1px solid var(--color-border); }
    .attr-title { font-family: var(--font-display); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); margin-bottom: 12px; }
    .attr-list { display: flex; flex-direction: column; gap: 8px; }
    .attr-row { display: flex; gap: 16px; font-size: 0.875rem;
      dt { color: var(--color-text-muted); min-width: 120px; }
      dd { color: var(--color-text-primary); font-weight: 500; }
    }
    .actions { display: flex; gap: 16px; align-items: center; }
    .qty-selector {
      display: flex; align-items: center; gap: 8px;
      background: var(--color-bg-elevated); border: 1px solid var(--color-border);
      border-radius: var(--border-radius-sm); padding: 4px;
    }
    .qty-value { font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; min-width: 32px; text-align: center; }
    .add-btn { height: 48px; flex: 1; font-size: 1rem !important; }
    .not-found { text-align: center; padding: 80px 32px; }
  `]
})
export class ProductDetailComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private productService = inject(ProductService);
  private cart    = inject(CartService);
  private notify  = inject(NotificationService);

  product       = signal<Product | null>(null);
  loading       = signal(true);
  selectedImage = signal<string>('');
  qty = 1;

  readonly objectKeys = Object.keys;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.productService.getProduct(id).subscribe({
      next: (p) => {
        this.product.set(p);
        this.selectedImage.set(p.imageUrls?.[0] || 'assets/images/product-placeholder.svg');
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/products']);
      }
    });
  }

  increaseQty(): void { this.qty++; }
  decreaseQty(): void { if (this.qty > 1) this.qty--; }

  addToCart(): void {
    const p = this.product();
    if (!p) return;
    this.cart.addToCart(p, this.qty);
    this.notify.success(`${p.name} (x${this.qty}) ajouté au panier`);
  }
}
