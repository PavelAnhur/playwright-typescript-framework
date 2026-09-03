export interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface Order {
  reference: string;
  items: OrderItem[];
  totalCents: number;
  status: 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}
