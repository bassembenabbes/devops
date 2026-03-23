import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { ProductService } from '../../../core/services/product.service';
import { Product, ProductPage } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatPaginatorModule, ProductCardComponent
  ],
  template: `
    <div class="product-list-page">

      <!-- Hero -->
      <header class="page-hero">
        <div class="hero-content">
          <p class="hero-eyebrow">Découvrez notre sélection</p>
          <h1 class="hero-title">Catalogue<br><span class="text-accent">Produits</span></h1>
          <p class="hero-subtitle">{{ totalElements() }} produits disponibles</p>
        </div>
        <div class="hero-decoration">◈</div>
      </header>

      <div class="page-body">
        <!-- Filters -->
        <aside class="filters-panel">
          <h3 class="filters-title">Filtres</h3>

          <div class="search-box">
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Rechercher</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input matInput [(ngModel)]="searchQuery" (ngModelChange)="onSearchChange()" placeholder="iPhone, Sony...">
              @if (searchQuery) {
                <button matSuffix mat-icon-button (click)="clearSearch()">
                  <mat-icon>close</mat-icon>
                </button>
              }
            </mat-form-field>
          </div>

          <div class="category-filter">
            <p class="filter-label">Catégories</p>
            <div class="category-chips">
              <button
                class="category-chip"
                [class.active]="!selectedCategory()"
                (click)="setCategory(null)">
                Tous
              </button>
              @for (cat of categories(); track cat) {
                <button
                  class="category-chip"
                  [class.active]="selectedCategory() === cat"
                  (click)="setCategory(cat)">
                  {{ cat }}
                </button>
              }
            </div>
          </div>

          <div class="sort-filter">
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Trier par</mat-label>
              <mat-select [(ngModel)]="sortBy" (ngModelChange)="loadProducts()">
                <mat-option value="name">Nom A→Z</mat-option>
                <mat-option value="price">Prix ↑</mat-option>
                <mat-option value="createdAt">Plus récents</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </aside>

        <!-- Grid -->
        <section class="products-section">
          @if (loading()) {
            <div class="app-spinner">
              <mat-spinner diameter="48"></mat-spinner>
            </div>
          } @else if (products().length === 0) {
            <div class="empty-state">
              <p class="empty-icon">🔍</p>
              <h3>Aucun produit trouvé</h3>
              <button mat-stroked-button (click)="resetFilters()">Réinitialiser les filtres</button>
            </div>
          } @else {
            <div class="products-grid">
              @for (product of products(); track product.id; let i = $index) {
                <div class="grid-item" [style.animation-delay]="i * 50 + 'ms'" class="animate-fadeInUp">
                  <app-product-card [product]="product" />
                </div>
              }
            </div>
            <mat-paginator
              [length]="totalElements()"
              [pageSize]="pageSize"
              [pageSizeOptions]="[12, 24, 48]"
              [pageIndex]="currentPage()"
              (page)="onPageChange($event)"
              class="paginator">
            </mat-paginator>
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    .product-list-page { min-height: 100vh; }

    .page-hero {
      position: relative; overflow: hidden;
      padding: 80px var(--content-padding) 60px;
      background: linear-gradient(135deg, var(--color-bg) 0%, var(--color-bg-card) 100%);
      border-bottom: 1px solid var(--color-border);
    }
    .hero-content { max-width: 600px; }
    .hero-eyebrow { font-size: 0.8rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.2em; color: var(--color-accent); margin-bottom: 12px; }
    .hero-title { font-family: var(--font-display); font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 800; line-height: 1.05; margin-bottom: 16px; }
    .hero-subtitle { font-size: 1rem; color: var(--color-text-secondary); }
    .hero-decoration {
      position: absolute; right: 10%; top: 50%; transform: translateY(-50%);
      font-size: clamp(100px, 15vw, 200px); color: var(--color-accent);
      opacity: 0.05; font-weight: 900; pointer-events: none; user-select: none;
    }

    .page-body {
      display: flex; max-width: 1400px; margin: 0 auto;
      padding: 32px 24px; gap: 32px;
    }

    .filters-panel {
      width: 240px; flex-shrink: 0;
      position: sticky; top: 80px; align-self: flex-start;
      display: flex; flex-direction: column; gap: 24px;
    }
    .filters-title { font-family: var(--font-display); font-size: 0.9rem;
      font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
      color: var(--color-text-muted); }
    .filter-label { font-size: 0.8rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--color-text-muted); margin-bottom: 10px; }
    .category-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .category-chip {
      padding: 5px 12px; border-radius: 100px;
      font-size: 0.8rem; font-weight: 500; cursor: pointer;
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border);
      color: var(--color-text-secondary);
      transition: all var(--transition);
      &:hover { border-color: var(--color-accent); color: var(--color-accent); }
      &.active {
        background: var(--color-accent-glow);
        border-color: var(--color-accent);
        color: var(--color-accent);
        font-weight: 700;
      }
    }
    .full-width { width: 100%; }

    .products-section { flex: 1; min-width: 0; }
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 20px;
    }
    .grid-item { animation: fadeInUp 0.4s ease both; }
    .paginator { margin-top: 32px; background: transparent !important; }

    .empty-state {
      text-align: center; padding: 80px 32px;
      .empty-icon { font-size: 64px; margin-bottom: 16px; }
      h3 { font-family: var(--font-display); font-size: 1.25rem; margin-bottom: 16px; }
    }

    @media (max-width: 768px) {
      .page-body { flex-direction: column; padding: 20px 16px; }
      .filters-panel { width: 100%; position: static; }
    }
  `]
})
export class ProductListComponent implements OnInit {
  private productService = inject(ProductService);

  products      = signal<Product[]>([]);
  categories    = signal<string[]>([]);
  loading       = signal(false);
  totalElements = signal(0);
  currentPage   = signal(0);
  selectedCategory = signal<string | null>(null);

  searchQuery = '';
  sortBy      = 'name';
  pageSize    = 12;

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading.set(true);
    this.productService.getProducts({
      category: this.selectedCategory() ?? undefined,
      search:   this.searchQuery || undefined,
      page:     this.currentPage(),
      size:     this.pageSize,
      sort:     this.sortBy,
    }).subscribe({
      next: (page) => {
        this.products.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadCategories(): void {
    this.productService.getCategories().subscribe(cats => this.categories.set(cats));
  }

  setCategory(cat: string | null): void {
    this.selectedCategory.set(cat);
    this.currentPage.set(0);
    this.loadProducts();
  }

  onSearchChange(): void {
    this.currentPage.set(0);
    this.loadProducts();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.onSearchChange();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize = event.pageSize;
    this.loadProducts();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedCategory.set(null);
    this.currentPage.set(0);
    this.sortBy = 'name';
    this.loadProducts();
  }
}
