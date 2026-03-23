import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { ProductService } from '../../core/services/product.service';
import { OrderService } from '../../core/services/order.service';
import { NotificationService } from '../../core/services/notification.service';
import { Product } from '../../core/models/product.model';
import { Order } from '../../core/models/order.model';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, CurrencyPipe, DatePipe,
    MatTableModule, MatButtonModule, MatIconModule, MatInputModule,
    MatSelectModule, MatDialogModule, MatProgressSpinnerModule, MatTabsModule
  ],
  template: `
    <div class="admin-page">
      <div class="admin-container">
        <header class="admin-header">
          <div>
            <h1 class="page-title">Administration</h1>
            <p class="text-secondary">Gestion du catalogue produits</p>
          </div>
          <button mat-raised-button color="primary" (click)="openForm()">
            <mat-icon>add</mat-icon> Nouveau produit
          </button>
        </header>

        <mat-tab-group class="admin-tabs">
          <!-- Produits -->
          <mat-tab label="Produits ({{ products().length }})">
            @if (loading()) {
              <div class="app-spinner"><mat-spinner diameter="48"></mat-spinner></div>
            } @else {
              <div class="table-wrapper">
                <table mat-table [dataSource]="products()" class="products-table">
                  <ng-container matColumnDef="image">
                    <th mat-header-cell *matHeaderCellDef>Image</th>
                    <td mat-cell *matCellDef="let p">
                      <img [src]="p.imageUrls[0]" [alt]="p.name" class="table-img">
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Nom</th>
                    <td mat-cell *matCellDef="let p">{{ p.name }}</td>
                  </ng-container>
                  <ng-container matColumnDef="category">
                    <th mat-header-cell *matHeaderCellDef>Catégorie</th>
                    <td mat-cell *matCellDef="let p">
                      <span class="badge badge--accent">{{ p.category }}</span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="price">
                    <th mat-header-cell *matHeaderCellDef>Prix</th>
                    <td mat-cell *matCellDef="let p">
                      <span class="text-accent font-display">{{ p.price | currency:'EUR' }}</span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="stock">
                    <th mat-header-cell *matHeaderCellDef>Stock</th>
                    <td mat-cell *matCellDef="let p">
                      <span [class.text-error]="p.stockQuantity === 0" [class.text-success]="p.stockQuantity > 0">
                        {{ p.stockQuantity }}
                      </span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                    <td mat-cell *matCellDef="let p">
                      <button mat-icon-button (click)="openForm(p)" title="Modifier">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button color="warn" (click)="deleteProduct(p)" title="Supprimer">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
                </table>
              </div>
            }
          </mat-tab>

          <!-- Commandes admin -->
          <mat-tab label="Commandes">
            <div class="tab-content">
              @if (ordersLoading()) {
                <div class="app-spinner"><mat-spinner diameter="40"></mat-spinner></div>
              } @else {
                <table mat-table [dataSource]="adminOrders()" class="orders-admin-table">
                  <ng-container matColumnDef="id">
                    <th mat-header-cell *matHeaderCellDef>Réf.</th>
                    <td mat-cell *matCellDef="let o">{{ o.id | slice:0:10 }}...</td>
                  </ng-container>
                  <ng-container matColumnDef="user">
                    <th mat-header-cell *matHeaderCellDef>User ID</th>
                    <td mat-cell *matCellDef="let o">{{ o.userId | slice:0:12 }}...</td>
                  </ng-container>
                  <ng-container matColumnDef="total">
                    <th mat-header-cell *matHeaderCellDef>Total</th>
                    <td mat-cell *matCellDef="let o">{{ o.total | currency:'EUR' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Statut</th>
                    <td mat-cell *matCellDef="let o">
                      <span class="badge" [class]="'status-' + o.status.toLowerCase()">{{ o.status }}</span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="date">
                    <th mat-header-cell *matHeaderCellDef>Date</th>
                    <td mat-cell *matCellDef="let o">{{ o.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="orderColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: orderColumns;"></tr>
                </table>
              }
            </div>
          </mat-tab>

        </mat-tab-group>

        <!-- Inline Form Panel -->
        @if (showForm()) {
          <div class="form-overlay" (click)="closeForm()"></div>
          <aside class="form-panel card">
            <div class="form-header">
              <h2>{{ editingProduct() ? 'Modifier' : 'Nouveau' }} produit</h2>
              <button mat-icon-button (click)="closeForm()"><mat-icon>close</mat-icon></button>
            </div>
            <form [formGroup]="productForm" (ngSubmit)="saveProduct()" class="product-form">
              <mat-form-field appearance="fill">
                <mat-label>Nom du produit</mat-label>
                <input matInput formControlName="name">
                <mat-error>Nom requis (min. 2 caractères)</mat-error>
              </mat-form-field>
              <mat-form-field appearance="fill">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="3"></textarea>
              </mat-form-field>
              <div class="form-row">
                <mat-form-field appearance="fill">
                  <mat-label>Prix (€)</mat-label>
                  <input matInput type="number" formControlName="price" min="0.01" step="0.01">
                </mat-form-field>
                <mat-form-field appearance="fill">
                  <mat-label>Stock</mat-label>
                  <input matInput type="number" formControlName="stockQuantity" min="0">
                </mat-form-field>
              </div>
              <mat-form-field appearance="fill">
                <mat-label>Catégorie</mat-label>
                <input matInput formControlName="category">
              </mat-form-field>
              <mat-form-field appearance="fill">
                <mat-label>URL image</mat-label>
                <input matInput formControlName="imageUrl" placeholder="https://...">
              </mat-form-field>
              <div class="form-actions">
                <button type="button" mat-stroked-button (click)="closeForm()">Annuler</button>
                <button type="submit" mat-raised-button color="primary" [disabled]="productForm.invalid || saving()">
                  @if (saving()) { <mat-spinner diameter="20"></mat-spinner> }
                  @else { {{ editingProduct() ? 'Enregistrer' : 'Créer' }} }
                </button>
              </div>
            </form>
          </aside>
        }
      </div>
    </div>
  `,
  styles: [`
    .admin-page { padding: 40px var(--content-padding); }
    .admin-container { max-width: 1200px; margin: 0 auto; position: relative; }
    .admin-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .page-title { font-family: var(--font-display); font-size: 2rem; font-weight: 800; }
    .table-wrapper { overflow-x: auto; margin-top: 16px; }
    .products-table { width: 100%; background: transparent !important; }
    .table-img { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; }
    .table-row:hover { background: var(--color-bg-elevated); }
    .form-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200;
      backdrop-filter: blur(4px);
    }
    .form-panel {
      position: fixed; top: 64px; right: 0; bottom: 0; width: 440px; max-width: 100vw;
      z-index: 201; overflow-y: auto; padding: 24px;
      display: flex; flex-direction: column; gap: 16px;
    }
    .form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
      h2 { font-family: var(--font-display); font-size: 1.25rem; font-weight: 700; } }
    .product-form { display: flex; flex-direction: column; gap: 12px;
      mat-form-field { width: 100%; } }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px; }
  `]
})
export class AdminComponent implements OnInit {
  private productService = inject(ProductService);
  private notify = inject(NotificationService);
  private fb = inject(FormBuilder);
  private orderSvc = inject(OrderService); // Inject OrderService

  products = signal<Product[]>([]);
  loading  = signal(false);
  saving   = signal(false);
  showForm = signal(false);
  editingProduct = signal<Product | null>(null);

  ordersLoading = signal(false); // Declare ordersLoading signal
  adminOrders = signal<Order[]>([]); // Declare adminOrders signal
  orderColumns = ['id', 'user', 'total', 'status', 'date']; // Declare orderColumns

  displayedColumns = ['image', 'name', 'category', 'price', 'stock', 'actions'];

  productForm: FormGroup = this.fb.group({
    name:          ['', [Validators.required, Validators.minLength(2)]],
    description:   ['', Validators.required],
    price:         [null, [Validators.required, Validators.min(0.01)]],
    stockQuantity: [0,   [Validators.required, Validators.min(0)]],
    category:      ['', Validators.required],
    imageUrl:      [''],
  });

  ngOnInit(): void {
    this.loadProducts();
    this.loadOrders(); // Call loadOrders on init
  }

  loadProducts(): void {
    this.loading.set(true);
    this.productService.getProducts({ page: 0, size: 100, sort: 'name' }).subscribe({
      next: (p) => { this.products.set(p.content); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm(product?: Product): void {
    this.editingProduct.set(product ?? null);
    if (product) {
      this.productForm.patchValue({ ...product, imageUrl: product.imageUrls[0] ?? '' });
    } else {
      this.productForm.reset({ stockQuantity: 0 });
    }
    this.showForm.set(true);
  }

  closeForm(): void { this.showForm.set(false); this.editingProduct.set(null); }

  saveProduct(): void {
    if (this.productForm.invalid) return;
    const value = this.productForm.value;
    const payload: Partial<Product> = {
      ...value,
      imageUrls: value.imageUrl ? [value.imageUrl] : [],
    };
    this.saving.set(true);
    const op = this.editingProduct()
      ? this.productService.updateProduct(this.editingProduct()!.id, payload)
      : this.productService.createProduct(payload);

    op.subscribe({
      next: () => {
        this.notify.success(this.editingProduct() ? 'Produit mis à jour' : 'Produit créé');
        this.closeForm();
        this.loadProducts();
        this.saving.set(false);
      },
      error: () => { this.notify.error('Erreur lors de la sauvegarde'); this.saving.set(false); }
    });
  }

  deleteProduct(product: Product): void {
    if (!confirm(`Supprimer "${product.name}" ?`)) return;
    this.productService.deleteProduct(product.id).subscribe({
      next: () => { this.notify.success('Produit supprimé'); this.loadProducts(); },
      error: () => this.notify.error('Erreur lors de la suppression'),
    });
  }

  loadOrders(): void {
    this.ordersLoading.set(true);
    this.orderSvc.getOrders().subscribe({
      next: orders => { this.adminOrders.set(orders); this.ordersLoading.set(false); },
      error: () => this.ordersLoading.set(false)
    });
  }
}
