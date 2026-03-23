import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { CartService } from '../../core/services/cart.service';
import { OrderService, CreateOrderRequest } from '../../core/services/order.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/auth/auth.service';

type Step = 'recap' | 'address' | 'payment' | 'confirmation';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, CurrencyPipe,
    MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule,
    MatRadioModule
  ],
  template: `
    <div class="checkout-page">
      <div class="checkout-container">

        <!-- Stepper header -->
        <div class="stepper-header">
          @for (st of steps; track st.key; let i = $index) {
            <div class="step" [class.active]="currentStep() === st.key" [class.done]="isStepDone(st.key)">
              <div class="step-circle">
                @if (isStepDone(st.key)) { <mat-icon>check</mat-icon> }
                @else { {{ i + 1 }} }
              </div>
              <span class="step-label">{{ st.label }}</span>
            </div>
            @if (i < steps.length - 1) {
              <div class="step-connector" [class.done]="isStepDone(st.key)"></div>
            }
          }
        </div>

        <!-- ÉTAPE 1 : Récap panier -->
        @if (currentStep() === 'recap') {
          <div class="step-content">
            <h2 class="step-title">Récapitulatif</h2>

            @if (cart.items().length === 0) {
              <div class="empty-state">
                <mat-icon>shopping_cart</mat-icon>
                <p>Votre panier est vide</p>
                <button mat-raised-button routerLink="/products">Voir les produits</button>
              </div>
            } @else {
              <div class="recap-items">
                @for (item of cart.items(); track item.product.id) {
                  <div class="recap-item">
                    <img [src]="item.product.imageUrls?.[0] || 'assets/images/product-placeholder.svg'"
                         [alt]="item.product.name"
                         (error)="$any($event.target).src='assets/images/product-placeholder.svg'">
                    <div class="recap-info">
                      <span class="recap-name">{{ item.product.name }}</span>
                      <span class="recap-qty text-muted">x{{ item.quantity }}</span>
                    </div>
                    <span class="recap-price">{{ item.product.price * item.quantity | currency:'EUR' }}</span>
                  </div>
                }
              </div>

              <div class="step-total">
                <span>Total commande</span>
                <span class="price price--large">{{ cart.total() | currency:'EUR' }}</span>
              </div>

              <div class="step-actions">
                <button mat-stroked-button routerLink="/cart">
                  <mat-icon>edit</mat-icon> Modifier le panier
                </button>
                <button mat-raised-button color="primary" (click)="currentStep.set('address')">
                  Continuer <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            }
          </div>
        }

        <!-- ÉTAPE 2 : Adresse livraison -->
        @if (currentStep() === 'address') {
          <div class="step-content">
            <h2 class="step-title">Adresse de livraison</h2>
            <div class="address-form">
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Rue</mat-label>
                  <input matInput [(ngModel)]="address.street" placeholder="12 rue de la Paix" required>
                </mat-form-field>
              </div>
              <div class="form-row form-row--2">
                <mat-form-field appearance="outline">
                  <mat-label>Ville</mat-label>
                  <input matInput [(ngModel)]="address.city" placeholder="Paris" required>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Code postal</mat-label>
                  <input matInput [(ngModel)]="address.postalCode" placeholder="75001" required>
                </mat-form-field>
              </div>
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Pays</mat-label>
                  <mat-select [(ngModel)]="address.country">
                    @for (c of countries; track c.code) {
                      <mat-option [value]="c.code">{{ c.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
            </div>

            <div class="step-actions">
              <button mat-stroked-button (click)="currentStep.set('recap')">
                <mat-icon>arrow_back</mat-icon> Retour
              </button>
              <button mat-raised-button color="primary"
                [disabled]="!addressValid()"
                (click)="currentStep.set('payment')">
                Continuer <mat-icon>arrow_forward</mat-icon>
              </button>
            </div>
          </div>
        }

        <!-- ÉTAPE 3 : Paiement -->
        @if (currentStep() === 'payment') {
          <div class="step-content">
            <h2 class="step-title">Paiement</h2>

            <div class="payment-methods">
              <label class="payment-method" [class.selected]="paymentMethod === 'CARD'">
                <input type="radio" name="pm" value="CARD" [(ngModel)]="paymentMethod">
                <mat-icon>credit_card</mat-icon>
                <span>Carte bancaire</span>
              </label>
              <label class="payment-method" [class.selected]="paymentMethod === 'PAYPAL'">
                <input type="radio" name="pm" value="PAYPAL" [(ngModel)]="paymentMethod">
                <span class="paypal-logo">Pay<b>Pal</b></span>
              </label>
              <label class="payment-method" [class.selected]="paymentMethod === 'VIREMENT'">
                <input type="radio" name="pm" value="VIREMENT" [(ngModel)]="paymentMethod">
                <mat-icon>account_balance</mat-icon>
                <span>Virement bancaire</span>
              </label>
            </div>

            @if (paymentMethod === 'CARD') {
              <div class="card-form">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Numéro de carte</mat-label>
                  <input matInput [(ngModel)]="card.number" placeholder="4242 4242 4242 4242"
                    maxlength="19" (input)="formatCardNumber($event)">
                  <mat-icon matSuffix>credit_card</mat-icon>
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Titulaire</mat-label>
                  <input matInput [(ngModel)]="card.holder" placeholder="Jean Dupont">
                </mat-form-field>
                <div class="form-row--2">
                  <mat-form-field appearance="outline">
                    <mat-label>Date d'expiration</mat-label>
                    <input matInput [(ngModel)]="card.expiry" placeholder="MM/AA" maxlength="5">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>CVV</mat-label>
                    <input matInput [(ngModel)]="card.cvv" placeholder="123" maxlength="3" type="password">
                  </mat-form-field>
                </div>
                <div class="secure-badge">
                  <mat-icon>lock</mat-icon>
                  <span>Paiement 100% sécurisé — Simulation (aucune donnée transmise)</span>
                </div>
              </div>
            }

            @if (paymentMethod === 'PAYPAL') {
              <div class="paypal-info card">
                <p>Vous serez redirigé vers PayPal pour finaliser le paiement.</p>
                <p class="text-muted text-small">Simulation — aucune redirection réelle</p>
              </div>
            }

            @if (paymentMethod === 'VIREMENT') {
              <div class="virement-info card">
                <h4>Coordonnées bancaires</h4>
                <p><strong>IBAN :</strong> FR76 3000 6000 0112 3456 7890 189</p>
                <p><strong>BIC :</strong> BNPAFRPPXXX</p>
                <p><strong>Référence :</strong> CMD-{{ orderRef }}</p>
                <p class="text-muted text-small">Simulation — délai de traitement : 2-5 jours</p>
              </div>
            }

            <div class="order-mini-total">
              <span>Total à payer :</span>
              <span class="price price--large">{{ cart.total() | currency:'EUR' }}</span>
            </div>

            <div class="step-actions">
              <button mat-stroked-button (click)="currentStep.set('address')">
                <mat-icon>arrow_back</mat-icon> Retour
              </button>
              <button mat-raised-button color="primary"
                [disabled]="isProcessing()"
                (click)="placeOrder()">
                @if (isProcessing()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <mat-icon>check_circle</mat-icon>
                }
                Confirmer la commande
              </button>
            </div>
          </div>
        }

        <!-- ÉTAPE 4 : Confirmation -->
        @if (currentStep() === 'confirmation') {
          <div class="step-content confirmation">
            <div class="success-icon">
              <mat-icon>check_circle</mat-icon>
            </div>
            <h2 class="confirm-title">Commande confirmée !</h2>
            <p class="confirm-subtitle">
              Merci pour votre commande. Vous recevrez une confirmation par email.
            </p>

            <div class="confirm-card card">
              <div class="confirm-row">
                <span>Référence</span>
                <strong>{{ confirmedOrderId() }}</strong>
              </div>
              <div class="confirm-row">
                <span>Montant total</span>
                <strong class="price">{{ confirmedTotal() | currency:'EUR' }}</strong>
              </div>
              <div class="confirm-row">
                <span>Adresse de livraison</span>
                <span>{{ address.street }}, {{ address.city }} {{ address.postalCode }}, {{ address.country }}</span>
              </div>
              <div class="confirm-row">
                <span>Mode de paiement</span>
                <span>{{ paymentMethodLabel() }}</span>
              </div>
            </div>

            <div class="confirm-actions">
              <button mat-raised-button color="primary" routerLink="/orders">
                <mat-icon>receipt_long</mat-icon> Voir mes commandes
              </button>
              <button mat-stroked-button routerLink="/products">
                <mat-icon>storefront</mat-icon> Continuer mes achats
              </button>
            </div>
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    .checkout-page { padding: 40px var(--content-padding); min-height: 80vh; }
    .checkout-container { max-width: 760px; margin: 0 auto; }

    /* Stepper */
    .stepper-header {
      display: flex; align-items: center; margin-bottom: 40px;
      padding: 24px; background: var(--color-bg-card); border-radius: var(--border-radius);
      border: 1px solid var(--color-border);
    }
    .step { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .step-circle {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid var(--color-border);
      font-weight: 700; font-size: 0.9rem;
      color: var(--color-text-muted);
      mat-icon { font-size: 18px !important; width: 18px !important; height: 18px !important; }
    }
    .step.active .step-circle {
      border-color: var(--color-accent); color: var(--color-accent);
      box-shadow: 0 0 0 3px rgba(245,158,11,0.2);
    }
    .step.done .step-circle {
      background: var(--color-accent); border-color: var(--color-accent); color: #000;
    }
    .step-label { font-size: 0.75rem; color: var(--color-text-muted); white-space: nowrap; }
    .step.active .step-label { color: var(--color-accent); font-weight: 600; }
    .step.done .step-label  { color: var(--color-text-secondary); }
    .step-connector {
      flex: 1; height: 2px; background: var(--color-border); margin: 0 8px; margin-bottom: 20px;
      &.done { background: var(--color-accent); }
    }

    /* Content */
    .step-content {
      background: var(--color-bg-card); border: 1px solid var(--color-border);
      border-radius: var(--border-radius); padding: 32px;
    }
    .step-title { font-family: var(--font-display); font-size: 1.4rem; font-weight: 800; margin-bottom: 24px; }

    /* Recap */
    .recap-items { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
    .recap-item {
      display: flex; align-items: center; gap: 16px; padding: 12px;
      background: var(--color-bg-elevated); border-radius: 8px;
      img { width: 60px; height: 60px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
    }
    .recap-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .recap-name { font-weight: 600; font-size: 0.9rem; }
    .recap-qty  { font-size: 0.8rem; }
    .recap-price { font-family: var(--font-display); font-weight: 700; color: var(--color-accent); }

    .step-total {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 0; border-top: 2px solid var(--color-border);
      font-weight: 700; font-size: 1.1rem;
    }

    /* Address */
    .address-form { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    .form-row { width: 100%; }
    .form-row mat-form-field { width: 100%; }
    .form-row--2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-row--2 mat-form-field { width: 100%; }
    .full-width { width: 100%; }

    /* Payment */
    .payment-methods {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;
    }
    .payment-method {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 16px 12px; border: 2px solid var(--color-border); border-radius: 12px;
      cursor: pointer; transition: all 0.2s; text-align: center; font-size: 0.85rem;
      input[type=radio] { display: none; }
      mat-icon { font-size: 28px !important; width: 28px !important; height: 28px !important; color: var(--color-text-muted); }
      &:hover { border-color: var(--color-border-hover); }
      &.selected { border-color: var(--color-accent); background: rgba(245,158,11,0.08); }
      &.selected mat-icon { color: var(--color-accent); }
    }
    .paypal-logo { font-size: 1.2rem; color: #003087; letter-spacing: -0.03em; }

    .card-form { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
    .secure-badge {
      display: flex; align-items: center; gap: 8px;
      font-size: 0.78rem; color: var(--color-text-muted);
      mat-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; color: var(--color-success, #10b981); }
    }
    .paypal-info, .virement-info {
      padding: 20px; margin-bottom: 20px;
      h4 { font-weight: 700; margin-bottom: 12px; }
      p { margin: 6px 0; font-size: 0.9rem; line-height: 1.6; }
    }
    .order-mini-total {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px; background: var(--color-bg-elevated); border-radius: 8px;
      font-weight: 700; margin-bottom: 24px;
    }

    /* Actions */
    .step-actions {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 24px; border-top: 1px solid var(--color-border); gap: 12px;
      button { min-width: 140px; }
      button:last-child { margin-left: auto; }
    }

    /* Confirmation */
    .confirmation {
      text-align: center;
      .success-icon {
        margin: 0 auto 24px;
        mat-icon {
          font-size: 80px !important; width: 80px !important; height: 80px !important;
          color: var(--color-success, #10b981);
        }
      }
    }
    .confirm-title { font-family: var(--font-display); font-size: 2rem; font-weight: 800; }
    .confirm-subtitle { color: var(--color-text-secondary); margin-bottom: 32px; }
    .confirm-card {
      text-align: left; padding: 20px; margin: 24px 0;
      background: var(--color-bg-elevated);
    }
    .confirm-row {
      display: flex; justify-content: space-between; gap: 16px;
      padding: 10px 0; border-bottom: 1px solid var(--color-border); font-size: 0.9rem;
      &:last-child { border-bottom: none; }
      span:first-child { color: var(--color-text-muted); flex-shrink: 0; }
    }
    .confirm-actions {
      display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; margin-top: 24px;
    }

    .empty-state {
      text-align: center; padding: 40px;
      display: flex; flex-direction: column; align-items: center; gap: 16px;
      mat-icon { font-size: 60px !important; width: 60px !important; height: 60px !important; opacity: 0.2; }
    }
    .text-small { font-size: 0.78rem; }
  `]
})
export class CheckoutComponent {
  cart    = inject(CartService);
  private orderSvc = inject(OrderService);
  private notify   = inject(NotificationService);
  private router   = inject(Router);
  auth    = inject(AuthService);

constructor() {
    // Attendre que Keycloak soit prêt puis vérifier auth
    effect(() => {
      if (!this.auth.isReady()) return;          // attendre init
      if (!this.auth.isLoggedIn()) {
        this.auth.login('/checkout');            // login → revient ici
      }
    });
  }

  readonly steps = [
    { key: 'recap'        as Step, label: 'Panier'    },
    { key: 'address'      as Step, label: 'Livraison' },
    { key: 'payment'      as Step, label: 'Paiement'  },
    { key: 'confirmation' as Step, label: 'Confirmé'  },
  ];
  readonly stepOrder: Step[] = ['recap', 'address', 'payment', 'confirmation'];

  currentStep   = signal<Step>('recap');
  isProcessing  = signal(false);
  confirmedOrderId = signal('');
  confirmedTotal   = signal(0);

  orderRef = Math.random().toString(36).substring(2, 9).toUpperCase();

  address = { street: '', city: '', postalCode: '', country: 'FR' };
  paymentMethod: 'CARD' | 'PAYPAL' | 'VIREMENT' = 'CARD';
  card = { number: '', holder: '', expiry: '', cvv: '' };

  readonly countries = [
    { code: 'FR', name: 'France' },
    { code: 'TN', name: 'Tunisie' },
    { code: 'BE', name: 'Belgique' },
    { code: 'CH', name: 'Suisse' },
    { code: 'MA', name: 'Maroc' },
    { code: 'DZ', name: 'Algérie' },
    { code: 'DE', name: 'Allemagne' },
    { code: 'ES', name: 'Espagne' },
    { code: 'IT', name: 'Italie' },
    { code: 'GB', name: 'Royaume-Uni' },
  ];

  isStepDone(step: Step): boolean {
    const curr = this.stepOrder.indexOf(this.currentStep());
    const idx  = this.stepOrder.indexOf(step);
    return idx < curr;
  }

  addressValid(): boolean {
    return !!(this.address.street && this.address.city &&
              this.address.postalCode && this.address.country);
  }

  paymentMethodLabel(): string {
    return { CARD: 'Carte bancaire', PAYPAL: 'PayPal', VIREMENT: 'Virement bancaire' }[this.paymentMethod];
  }

  formatCardNumber(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    let v = input.value.replace(/\D/g, '').substring(0, 16);
    this.card.number = v.replace(/(.{4})/g, '$1 ').trim();
  }

  placeOrder(): void {
    this.isProcessing.set(true);
    const total = this.cart.total();
    const req: CreateOrderRequest = {
      items: this.cart.items().map(i => ({
        productId:   i.product.id,
        productName: i.product.name,
        price:       i.product.price,
        quantity:    i.quantity,
      })),
      shippingAddress: { ...this.address },
      paymentMethod: this.paymentMethod,
    };

    // Simuler paiement (1.2s) puis créer la commande en backend
    this.orderSvc.simulatePayment({ orderId: this.orderRef, method: this.paymentMethod })
      .subscribe({
        next: (payment) => {
          const createReq = {
            items: req.items,
            shippingAddress: req.shippingAddress,
            paymentMethod: this.paymentMethod,
          };
          this.orderSvc.createOrder(createReq).subscribe({
            next: (order) => {
              this.confirmedTotal.set(total);
              this.confirmedOrderId.set(order.id ?? `CMD-\${this.orderRef}`);
              this.cart.clear();
              this.isProcessing.set(false);
              this.currentStep.set('confirmation');
              this.notify.success('Commande confirmée avec succès !');
            },
            error: () => {
              // Fallback: confirmer quand même si backend absent (mode démo)
              this.confirmedTotal.set(total);
              this.confirmedOrderId.set(`CMD-\${this.orderRef}`);
              this.cart.clear();
              this.isProcessing.set(false);
              this.currentStep.set('confirmation');
              this.notify.success('Commande confirmée (mode démo) !');
            }
          });
        },
        error: () => {
          this.isProcessing.set(false);
          this.notify.error('Erreur lors du paiement. Veuillez réessayer.');
        }
      });
  }
}
