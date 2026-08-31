export interface Product {
  id: number;
  sellerId: number;
  sellerName: string;
  name: string;
  description: string;
  category?: string;
  priceCents: number;
  effectiveCents?: number;
  onSale?: boolean;
  discount: Discount | null;
  stock?: number;
  inStock?: boolean;
  published?: boolean;
  images?: string[];
  image: string;
}

export interface Discount {
  type: 'percentage' | 'fixed';
  value: number;
}

export interface CartItem {
  itemId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitCents: number;
  totalCents: number;
}

export interface Cart {
  items: CartItem[];
  subtotalCents: number;
  count: number;
}

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
