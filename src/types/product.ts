import type { CsvValue } from "./csv";


export interface Product {
  id: number;
  sellerId?: number;
  sellerName: string;
  name: string;
  description?: string;
  category?: string;
  priceCents?: number;
  effectiveCents?: number;
  onSale?: boolean;
  discount: Discount | null;
  stock?: number;
  inStock?: boolean;
  published?: boolean;
  images?: string[];
  image?: string;
}

export interface Discount {
  type: 'percentage' | 'fixed';
  value: number;
}

export type ProductCsvRow = {
  id: number;
  name: string;
  sellerName: string;
  category: string;
  discount: Discount | null;
  effectiveCents: number;
} & Record<string, CsvValue>;
