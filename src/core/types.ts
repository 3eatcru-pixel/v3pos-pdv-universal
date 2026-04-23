/**
 * Core Types for Modular POS
 * Shared across all industry modules (Restaurant, Retail, Market, etc.)
 */

export type BusinessMode = 'restaurant' | 'construction' | 'retail' | 'market' | 'generic' | 'service';
export type DeviceRole = 'host' | 'client';
export type DeviceMode = 'cashier' | 'salesperson' | 'stock' | 'admin' | 'logistics' | 'retail_sales' | 'retail_cashier' | 'market_pos' | 'market_scanner' | 'central_server';
export type UserRole = 'dev' | 'owner' | 'manager' | 'staff' | 'operator' | 'waiter' | 'chef' | 'admin' | 'regional_manager' | (string & {});
export type SyncMode = 'p2p' | 'host_server' | 'cloud';

export interface Enterprise {
  id: string;
  name: string;
  ownerId: string;
  businessType: BusinessMode;
  ownerEmail: string;
  ownerPhone?: string;
  ownerName?: string;
  accessCode: string;
  status: 'active' | 'inactive' | 'maintenance';
  isPaused?: boolean;
  createdAt: number;
  lockedModules?: string[];
  enabledModules?: string[];
  lastDevAccess?: number;
  owners?: string[];
  regions?: string[];
}

export type Company = Enterprise;

export interface Shop {
  id: string;
  enterpriseId: string;
  companyId?: string;
  name: string;
  regionId: string;
  address?: string;
  cnpj?: string;
  settings: any;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  pin?: string;
  companyId?: string;
  photo?: string;
}

export interface Staff extends User {
  active: boolean;
  assignedShopIds: string[];
  companyId?: string;
  enterpriseId?: string;
  phone?: string;
  salary?: number;
  contractType?: 'clt' | 'pj' | 'freelancer' | 'intern';
  performanceScore?: number;
}

export interface CoreProduct {
  id: string;
  enterpriseId: string;
  shopId: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  active: boolean;
  updatedAt?: number | string;
  sku?: string;
  barcode?: string;
}

export interface CoreSaleItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CoreSale {
  id: string;
  enterpriseId: string;
  shopId: string;
  staffId: string;
  items: CoreSaleItem[];
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  paymentMethod: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'info' | 'warning' | 'error' | 'maintenance' | 'order_ready_bar' | 'order_ready_kitchen';
  companyId: string;
  shopId?: string;
}

export interface SyncEvent {
  id: string;
  type: string;
  payload: any;
  sourceDevice: string;
  companyId: string;
  timestamp: number;
}

export interface SystemLog {
  timestamp: number;
  origin: BusinessMode | 'system' | 'core';
  action: string;
  data?: any;
  userId?: string;
  companyId?: string;
}

export interface ServerNode {
  id: string;
  companyId: string;
  connectedDevices: string[];
  status: 'online' | 'offline' | 'syncing';
  uptime: number;
  lastBackup: number;
}

export interface BackupMetadata {
  id: string;
  timestamp: number;
  size: number;
  entityCount: number;
  type: 'auto' | 'manual';
}

export interface SupportMessage {
  id: string;
  companyId: string;
  message: string;
  timestamp: number;
  status: 'open' | 'resolved';
}
