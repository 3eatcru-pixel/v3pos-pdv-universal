/**
 * Core Types for Modular POS
 */

export type BusinessMode = 'restaurant' | 'construction' | 'retail' | 'market' | 'generic' | 'service';
export type DeviceRole = 'host' | 'client';
export type DeviceMode = 'cashier' | 'salesperson' | 'stock' | 'admin' | 'logistics' | 'retail_sales' | 'retail_cashier' | 'market_pos' | 'market_scanner' | 'central_server';
export type UserRole = 'dev' | 'owner' | 'manager' | 'staff' | 'operator';
export type SyncMode = 'p2p' | 'host_server' | 'cloud';

export interface ServerNode {
  id: string;
  companyId: string;
  connectedDevices: string[];
  status: 'online' | 'offline' | 'fallback';
  lastBackup?: number;
  uptime: number;
}

export interface BackupMetadata {
  id: string;
  timestamp: number;
  size: number;
  entityCount: number;
  type: 'auto' | 'manual';
}

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
}

export type Company = Enterprise;

export interface Shop {
  id: string;
  enterpriseId: string;
  name: string;
  regionId: string;
  settings: any;
}

export interface Staff {
  id: string;
  enterpriseId: string;
  name: string;
  role: UserRole;
  active: boolean;
  pin: string;
  assignedShopIds: string[];
  email?: string;
  phone?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'info' | 'warning' | 'error' | 'maintenance';
  companyId: string;
}

export interface Employee {
  id: string;
  name: string;
  role: 'manager' | 'staff' | 'operator';
  companyId: string;
  deviceId?: string;
  joinedAt: number;
}

export interface SupportMessage {
  id: string;
  companyId: string;
  message: string;
  timestamp: number;
  status: 'open' | 'resolved';
}

export interface SyncEvent {
  id: string;
  type: string;
  payload: any;
  sourceDevice: string;
  companyId: string; // Critical for isolation
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  pin?: string;
  companyId: string;
}

export interface CoreProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  active: boolean;
  enterpriseId: string;
  updateAt: number;
}

export interface CoreSale {
  id: string;
  total: number;
  timestamp: number;
  status: 'pending' | 'completed' | 'cancelled';
  paymentMethod?: string;
  enterpriseId: string;
}

export interface ModuleInfo {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
}

export interface SystemLog {
  timestamp: number;
  origin: 'core' | 'restaurant' | 'construction' | 'retail' | 'market' | 'system';
  action: string;
  data?: any;
  userId?: string;
}
