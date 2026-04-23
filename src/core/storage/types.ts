export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Sale {
  id: string;
  createdAt: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  synced: boolean;
  items: SaleItem[];
  kind?: 'sale' | 'return' | 'exchange';
  originalSaleId?: string;
  reason?: string;
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  price?: number;
  stock: number;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  points?: number;
  totalSpent?: number;
  updatedAt: string;
}

