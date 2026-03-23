import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order } from '../models/order.model';

export interface CreateOrderRequest {
  items: { productId: string; productName: string; price: number; quantity: number }[];
  shippingAddress: { street: string; city: string; postalCode: string; country: string };
  paymentMethod: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/orders`;

  private _orders = signal<Order[]>([]);
  readonly orders = this._orders.asReadonly();

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.base).pipe(
      tap(orders => this._orders.set(orders)),
      catchError(() => of(this.getMockOrders()))  // fallback mock si backend absent
    );
  }

  getOrder(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.base}/${id}`);
  }

  createOrder(req: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>(this.base, req).pipe(
      tap(order => this._orders.update(list => [order, ...list]))
    );
  }

  cancelOrder(id: string): Observable<Order> {
    return this.http.patch<Order>(`${this.base}/${id}/cancel`, {}).pipe(
      tap(updated => this._orders.update(list =>
        list.map(o => o.id === id ? updated : o)
      ))
    );
  }

  simulatePayment(req: { orderId: string; method: string }): Observable<{ success: boolean; transactionId: string }> {
    return new Observable(obs => {
      setTimeout(() => {
        obs.next({ success: true, transactionId: `TXN-${Date.now()}` });
        obs.complete();
      }, 1200);
    });
  }

  private getMockOrders(): Order[] {
    return [
      {
        id: 'cmd-demo-001',
        userId: 'user-1',
        items: [
          { productId: '1', productName: 'iPhone 15 Pro', price: 1199.99, quantity: 1 },
          { productId: '7', productName: 'AirPods Pro 2', price: 279.99, quantity: 1 },
        ],
        total: 1479.98,
        status: 'SHIPPED',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        shippingAddress: { street: '12 rue de la Paix', city: 'Paris', postalCode: '75001', country: 'FR' }
      },
      {
        id: 'cmd-demo-002',
        userId: 'user-1',
        items: [{ productId: '3', productName: 'MacBook Pro 14" M3', price: 2199.99, quantity: 1 }],
        total: 2199.99,
        status: 'DELIVERED',
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        shippingAddress: { street: '12 rue de la Paix', city: 'Paris', postalCode: '75001', country: 'FR' }
      },
    ];
  }
}
