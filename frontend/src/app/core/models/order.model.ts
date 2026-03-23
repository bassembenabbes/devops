export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export interface Address { street: string; city: string; postalCode: string; country: string; }
export interface OrderItem { productId: string; productName: string; price: number; quantity: number; }
export interface Order {
  id: string; userId: string; items: OrderItem[];
  total: number; status: OrderStatus;
  createdAt: string; updatedAt: string;
  shippingAddress: Address;
}
