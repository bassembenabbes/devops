import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { OrderService } from '../../core/services/order.service';
import { Order, OrderStatus } from '../../core/models/order.model';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule, RouterLink, CurrencyPipe, DatePipe,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatChipsModule
  ],
  template: `
    <div class="orders-page">
      <div class="orders-container">

        <div class="page-header">
          <h1 class="page-title">Mes Commandes</h1>
          <button mat-stroked-button routerLink="/products">
            <mat-icon>storefront</mat-icon> Continuer mes achats
          </button>
        </div>

        @if (loading()) {
          <div class="loading-state">
            <mat-spinner diameter="48"></mat-spinner>
            <p>Chargement de vos commandes...</p>
          </div>
        } @else if (orders().length === 0) {
          <div class="empty-state card">
            <mat-icon class="big-icon">receipt_long</mat-icon>
            <h2>Aucune commande</h2>
            <p class="text-secondary">Vous n'avez pas encore passé de commande.</p>
            <button mat-raised-button color="primary" routerLink="/products">
              <mat-icon>storefront</mat-icon> Commencer mes achats
            </button>
          </div>
        } @else {
          <div class="orders-list">
            @for (order of orders(); track order.id) {
              <div class="order-card card">
                <div class="order-header">
                  <div class="order-meta">
                    <span class="order-id">
                      <mat-icon>receipt</mat-icon>
                      {{ order.id | slice:0:12 }}...
                    </span>
                    <span class="order-date text-muted">
                      {{ order.createdAt | date:'dd/MM/yyyy à HH:mm' }}
                    </span>
                  </div>
                  <div class="order-header-right">
                    <span class="order-status" [class]="'status-' + order.status.toLowerCase()">
                      <mat-icon>{{ statusIcon(order.status) }}</mat-icon>
                      {{ statusLabel(order.status) }}
                    </span>
                    <span class="order-total price">{{ order.total | currency:'EUR' }}</span>
                  </div>
                </div>

                <div class="order-items">
                  @for (item of order.items; track item.productId) {
                    <div class="order-item">
                      <span class="item-name">{{ item.productName }}</span>
                      <span class="item-qty text-muted">x{{ item.quantity }}</span>
                      <span class="item-price">{{ item.price * item.quantity | currency:'EUR' }}</span>
                    </div>
                  }
                </div>

                <div class="order-footer">
                  <div class="delivery-info">
                    <mat-icon>local_shipping</mat-icon>
                    <span class="text-muted text-small">
                      {{ order.shippingAddress.street }},
                      {{ order.shippingAddress.city }}
                      {{ order.shippingAddress.postalCode }}
                    </span>
                  </div>
                  <div class="order-actions">
                    @if (order.status === 'PENDING' || order.status === 'CONFIRMED') {
                      <button mat-stroked-button color="warn" (click)="cancelOrder(order)">
                        <mat-icon>cancel</mat-icon> Annuler
                      </button>
                    }
                    @if (order.status === 'DELIVERED') {
                      <button mat-stroked-button color="primary">
                        <mat-icon>replay</mat-icon> Recommander
                      </button>
                    }
                  </div>
                </div>

                <!-- Timeline statut -->
                <div class="order-timeline">
                  @for (step of orderTimeline; track step.status) {
                    <div class="timeline-step"
                      [class.done]="isStatusDone(order.status, step.status)"
                      [class.active]="order.status === step.status"
                      [class.cancelled]="order.status === 'CANCELLED'">
                      <div class="timeline-dot">
                        <mat-icon>{{ step.icon }}</mat-icon>
                      </div>
                      <span class="timeline-label">{{ step.label }}</span>
                    </div>
                  }
                </div>

              </div>
            }
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    .orders-page { padding: 40px var(--content-padding); }
    .orders-container { max-width: 900px; margin: 0 auto; }
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 32px; flex-wrap: wrap; gap: 16px;
    }
    .page-title { font-family: var(--font-display); font-size: 2rem; font-weight: 800; }

    .loading-state {
      display: flex; flex-direction: column; align-items: center; gap: 20px;
      padding: 80px; color: var(--color-text-muted);
    }
    .empty-state {
      text-align: center; padding: 64px 32px;
      display: flex; flex-direction: column; align-items: center; gap: 16px;
      .big-icon { font-size: 80px !important; width: 80px !important; height: 80px !important; opacity: 0.15; }
      h2 { font-family: var(--font-display); font-size: 1.5rem; }
    }

    .orders-list { display: flex; flex-direction: column; gap: 20px; }

    .order-card { padding: 0; overflow: hidden; }
    .order-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 20px; border-bottom: 1px solid var(--color-border);
      flex-wrap: wrap; gap: 12px;
      background: var(--color-bg-elevated);
    }
    .order-meta { display: flex; flex-direction: column; gap: 4px; }
    .order-id {
      display: flex; align-items: center; gap: 6px;
      font-family: var(--font-mono, monospace); font-size: 0.85rem; font-weight: 600;
      mat-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; }
    }
    .order-date { font-size: 0.8rem; }
    .order-header-right { display: flex; align-items: center; gap: 16px; }
    .order-total { font-size: 1.1rem; font-family: var(--font-display); font-weight: 700; }

    .order-status {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 20px;
      font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      mat-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; }
      &.status-pending   { background: rgba(234,179,8,0.15);  color: #eab308; }
      &.status-confirmed { background: rgba(59,130,246,0.15); color: #3b82f6; }
      &.status-shipped   { background: rgba(139,92,246,0.15); color: #8b5cf6; }
      &.status-delivered { background: rgba(16,185,129,0.15); color: #10b981; }
      &.status-cancelled { background: rgba(239,68,68,0.15);  color: #ef4444; }
    }

    .order-items {
      padding: 16px 20px; display: flex; flex-direction: column; gap: 8px;
    }
    .order-item {
      display: flex; align-items: center; gap: 12px; font-size: 0.875rem;
      padding: 6px 0; border-bottom: 1px solid var(--color-border);
      &:last-child { border-bottom: none; }
    }
    .item-name { flex: 1; font-weight: 500; }
    .item-qty  { font-size: 0.8rem; }
    .item-price { font-weight: 600; color: var(--color-text-secondary); }

    .order-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 20px; border-top: 1px solid var(--color-border);
      flex-wrap: wrap; gap: 12px; background: var(--color-bg-elevated);
    }
    .delivery-info {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.8rem;
      mat-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; color: var(--color-text-muted); }
    }
    .order-actions { display: flex; gap: 8px; }

    /* Timeline */
    .order-timeline {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 24px; border-top: 1px solid var(--color-border);
    }
    .timeline-step {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      flex: 1; position: relative;
      &:not(:last-child)::after {
        content: ''; position: absolute;
        top: 14px; left: calc(50% + 14px);
        width: calc(100% - 28px); height: 2px;
        background: var(--color-border);
      }
      &.done:not(:last-child)::after { background: var(--color-accent); }
      &.cancelled:not(:last-child)::after { background: #ef4444; }
    }
    .timeline-dot {
      width: 28px; height: 28px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid var(--color-border);
      background: var(--color-bg-elevated); z-index: 1;
      mat-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; color: var(--color-text-muted); }
    }
    .timeline-step.done .timeline-dot {
      background: var(--color-accent); border-color: var(--color-accent);
      mat-icon { color: #000; }
    }
    .timeline-step.active .timeline-dot {
      border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(245,158,11,0.2);
      mat-icon { color: var(--color-accent); }
    }
    .timeline-step.cancelled .timeline-dot {
      border-color: #ef4444;
      mat-icon { color: #ef4444; }
    }
    .timeline-label {
      font-size: 0.68rem; color: var(--color-text-muted);
      white-space: nowrap; text-align: center;
    }
    .timeline-step.done .timeline-label   { color: var(--color-accent); }
    .timeline-step.active .timeline-label { color: var(--color-accent); font-weight: 600; }
  `]
})
export class OrdersComponent implements OnInit {
  private orderSvc = inject(OrderService);
  private notify   = inject(NotificationService);

  loading = signal(false);
  orders  = signal<Order[]>([]);

  readonly orderTimeline = [
    { status: 'PENDING'   as OrderStatus, label: 'Reçue',    icon: 'schedule'        },
    { status: 'CONFIRMED' as OrderStatus, label: 'Confirmée',icon: 'check_circle'    },
    { status: 'SHIPPED'   as OrderStatus, label: 'Expédiée', icon: 'local_shipping'  },
    { status: 'DELIVERED' as OrderStatus, label: 'Livrée',   icon: 'home'            },
  ];

  private statusOrder: OrderStatus[] = ['PENDING','CONFIRMED','SHIPPED','DELIVERED'];

  ngOnInit(): void {
    this.loading.set(true);
    this.orderSvc.getOrders().subscribe({
      next: orders => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  statusLabel(s: OrderStatus): string {
    return { PENDING:'En attente', CONFIRMED:'Confirmée', SHIPPED:'Expédiée', DELIVERED:'Livrée', CANCELLED:'Annulée' }[s];
  }

  statusIcon(s: OrderStatus): string {
    return { PENDING:'schedule', CONFIRMED:'check_circle', SHIPPED:'local_shipping', DELIVERED:'home', CANCELLED:'cancel' }[s];
  }

  isStatusDone(current: OrderStatus, step: OrderStatus): boolean {
    if (current === 'CANCELLED') return false;
    return this.statusOrder.indexOf(current) >= this.statusOrder.indexOf(step);
  }

  cancelOrder(order: Order): void {
    this.orders.update(list =>
      list.map(o => o.id === order.id ? { ...o, status: 'CANCELLED' as OrderStatus } : o)
    );
    this.notify.success('Commande annulée');
  }


}
