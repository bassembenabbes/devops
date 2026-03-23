import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../shared/components/navbar/navbar.component';
import { CartDrawerComponent } from '../shared/components/cart-drawer/cart-drawer.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, CartDrawerComponent],
  template: `
    <app-navbar (cartToggle)="cartOpen.set(!cartOpen())" />
    <main class="main-content">
      <router-outlet />
    </main>
    <app-cart-drawer [open]="cartOpen()" (close)="cartOpen.set(false)" />
  `,
  styles: [`
    .main-content {
      margin-top: 64px;
      min-height: calc(100vh - 64px);
    }
  `]
})
export class ShellComponent {
  cartOpen = signal(false);
}
