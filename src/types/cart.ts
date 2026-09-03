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
