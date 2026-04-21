export type AppPermission = 
  | 'view_products' 
  | 'create_products' 
  | 'edit_products' 
  | 'excluir_products' 
  | 'stock_movement' 
  | 'view_reports' 
  | 'manage_users'
  | 'delete_sale';

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'user';
  permissions: AppPermission[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  sku?: string;
  description?: string;
  createdAt: string;
}

export interface Variation {
  id: string;
  productId: string;
  color: string;
  size: string;
  quantity: number;
}

export interface Movement {
  id: string;
  productId: string;
  variationId: string;
  type: 'entry' | 'exit';
  quantity: number;
  date: string;
  reason?: string;
  variationInfo?: string;
}

export interface Sale {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  productId: string;
  productName: string;
  variationId: string;
  variationInfo: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  observation?: string;
}

export type Category = 'Vestido' | 'Blusa' | 'Calça' | 'Saia' | 'Casaco' | 'Acessório' | 'Outros';
export const CATEGORIES: Category[] = ['Vestido', 'Blusa', 'Calça', 'Saia', 'Casaco', 'Acessório', 'Outros'];
