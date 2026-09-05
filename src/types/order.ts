export interface OrderItem {
  productId?: number;
  name: string;
  quantity: number;
  unitCents: number;
  totalCents?: number;
}

export interface Order {
  reference: string;
  items: OrderItem[];
  totalCents: number;
  status: 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  shipping: ShippingInfo;
}

export interface ShippingInfo {
  name: string;
  address: string;
  city: string;
  postalCode: string;
}
