/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Enterprise, 
  Shop, 
  Staff as CoreStaff, 
  User as CoreUser, 
  CoreProduct, 
  CoreSale,
  BusinessMode,
  UserRole as CoreUserRole,
  AppNotification as CoreNotification,
  CustomFieldDefinition
} from './core/types';

export type { Enterprise, Shop, BusinessMode, CustomFieldDefinition };
export type { CoreProduct as Product, CoreSale as Sale }; // Exportando Product e Sale do core

export type SystemMode = 'restaurant' | 'distributor' | 'service';
export type TableStatus = 'free' | 'occupied' | 'reserved' | 'closed';
export type UserRole = CoreUserRole | string;

export interface Permission {
  id: string;
  action: string;
  module: string;
  description?: string;
}

export interface CustomRole {
  id: string;
  enterpriseId: string;
  name: string;
  permissions: string[]; // List of permission IDs
  views: View[];
  isSystem?: boolean; // Protect system roles
}

export interface WorkflowRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  active: boolean;
}

export interface BusinessConfig {
  id: string;
  enterpriseId: string;
  enabledModules: string[]; // ['restaurant', 'market', 'construction', 'retail']
  roles: CustomRole[];
  workflows: Record<string, WorkflowRule[]>;
  customFields: CustomFieldDefinition[];
  updatedAt: number;
}

export interface StaffSchedule {
  id: string;
  enterpriseId: string;
  shopId: string;
  staffId: string;
  role: string;
  startTime: number;
  endTime: number;
  module: string;
  notes?: string;
  status: 'planned' | 'confirmed' | 'missing' | 'completed';
}

export interface User extends CoreUser {
  createdAt: number;
  providerData?: {
    providerId: string;
    displayName: string | null;
    email: string | null;
  }[];
}

export interface InviteCode {
  id: string; // inv_xxx
  code: string; // AB12-CD34
  companyId: string;
  storeId: string;
  role: string;
  expiresAt: number;
  used: boolean;
  usedBy?: string; // usr_xxx
}

export interface Enterprise { // Consolidando Enterprise para incluir branding e configs
  id: string;
  name: string;
  owners?: string[];
  branding?: {
    logo?: string;
    customName?: string;
    themeMode?: 'standard' | 'festive' | 'dark_neon';
  };
  googleDriveBackupEnabled?: boolean;
  backupIntervalMinutes?: number;
}
export type Company = Enterprise; // Company é um alias para Enterprise
export interface Region {
  id: string;
  name: string;
  enterpriseId: string;
  managerIds: string[]; // List of user IDs (regional managers)
  shops: Shop[];
}

export interface RolePermissions {
  role: string;
  label: string;
  enterpriseId?: string;
  views: View[]; // What screens they can see
  actions: {
    canVoid: boolean;
    canDiscount: boolean;
    canViewSales: boolean;
    canManageStaff: boolean;
    canManageInventory: boolean;
    canEditMenu: boolean;
    canReopenTable: boolean;
    canManageSchedule: boolean;
  };
}

export type View = 'holding' | 'dashboard' | 'tables' | 'orders' | 'kitchen' | 'bar' | 'inventory' | 'reports' | 'history' | 'staff_mgmt' | 'menu_mgmt' | 'schedule' | 'safety' | 'settings' | 'customization' | 'finance_mgmt' | 'supplier_mgmt' | 'service_mgmt' | 'company_mgmt' | 'pending_orders' | 'staff_pnl' | 'third_party_orders' | 'purchasing_forecast';

export type PrinterType = 'kitchen' | 'receipt' | 'report' | 'bar';

export interface Printer {
  id: string;
  enterpriseId: string;
  shopId: string;
  name: string;
  type: PrinterType;
  ipAddress?: string; // For network printers
  port?: number;
  connectionType: 'network' | 'usb' | 'system_default';
  status: 'online' | 'offline' | 'error';
  isDefault: boolean;
}

export interface PrintJob {
  id: string;
  printerId: string;
  timestamp: number;
  content: string;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  error?: string;
}

export interface Reservation { // Exportando Reservation
  id: string;
  enterpriseId: string;
  shopId: string;
  customerName: string;
  customerPhone: string;
  tableNumber: number;
  guestsCount: number;
  dateTime: number;
  notes?: string;
  status: 'pending' | 'confirmed' | 'arrived' | 'cancelled';
}

export interface Shift { // Exportando Shift
  id: string;
  shopId: string;
  enterpriseId?: string;
  staffId: string;
  startTime: number; // timestamp
  endTime: number; // timestamp
  area: string;
  module?: 'restaurant' | 'market' | 'construction' | 'retail' | 'service' | string;
  status?: 'planned' | 'confirmed' | 'missing' | 'completed';
}

export interface Product extends CoreProduct { // Estendendo CoreProduct
  image?: string;
  photo?: string;
  unit?: 'un' | 'kg' | 'lt' | 'g';
  unitType?: 'un' | 'kg' | 'lt' | 'g';
  expiration?: number;
  ingredients?: Record<string, number>;
  composition?: { productId: string; quantity: number }[]; // For combos/kits
  wastageMargin?: number;
  type?: 'product' | 'service';
}

export interface ServiceItem {
  id: string;
  enterpriseId: string;
  name: string;
  price: number;
  duration: number; // in minutes
  category: string;
  description?: string;
  customCommissionRate?: number; // Auditoria: Taxa específica por serviço
  requiresApproval: boolean;
  active: boolean;
  commissionRate?: number; // Specific rate for this service
}

// Auditoria: Interface para Definição de Serviço (Unificada) - Exportando ServiceDefinition
export interface ServiceDefinition extends ServiceItem {
  enterpriseId: string;
  shopId?: string;
  customCommissionRate?: number;
}

export interface Category {
  id: string;
  enterpriseId: string;
  shopId?: string;
  name: string;
  color?: string;
  active?: boolean;
}

export interface ServiceResource { // Exportando ServiceResource
  id: string;
  enterpriseId: string;
  shopId: string;
  name: string;
  type: string; // e.g., 'chair', 'room', 'machine'
  active: boolean;
}

export interface ServiceAppointment { // Exportando ServiceAppointment
  id: string;
  enterpriseId: string;
  shopId: string;
  clientId: string;
  serviceId: string;
  employeeId: string;
  resourceId?: string;
  startTime: number;
  endTime: number;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  customPrice?: number;
  customDuration?: number;
  notes?: string;
  paymentStatus: 'pending' | 'paid' | 'cancelled';
}

export type ItemStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'voided';

export type ModifierType = 'extra' | 'remove' | 'allergy';

export interface ItemModifier {
  id: string;
  type: ModifierType;
  name: string;
  price?: number;
  inventoryItemId?: string; // Link to inventory for COGS and deduction
}

export interface OrderItem { // Exportando OrderItem
  id: string; // Unique ID for this item instance in the order
  productId: string;
  name: string;
  category: string;
  price: number;
  cost?: number; // Snapshot of the cost at the time of order
  quantity: number;
  notes?: string;
  status: ItemStatus;
  voidReason?: string;
  sentToKitchen?: boolean;
  modifiers?: ItemModifier[];
  voidedAt?: number;
  voidedBy?: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'voided';

export type ThirdPartyProvider =
  | 'ifood'
  | 'uber_eats'
  | 'google_ordering'
  | 'rappi'
  | 'deliveroo'
  | 'doordash'
  | 'other';

export type ThirdPartyOrderStatus = 'received' | 'accepted' | 'rejected' | 'failed';

export interface ThirdPartyProviderConfig {
  id: string;
  enterpriseId: string;
  shopId: string;
  userId: string;
  provider: ThirdPartyProvider;
  enabled: boolean;
  merchantId?: string;
  storeId?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  apiBaseUrl?: string;
  webhookSecret?: string;
  pollingEnabled?: boolean;
  pricingMode?: 'base' | 'markup_percent' | 'fixed_price';
  markupPercent?: number;
  fixedPriceMultiplier?: number;
  minimumExternalPrice?: number;
  autoCatalogSyncEnabled?: boolean;
  autoCatalogSyncMinutes?: number;
  endpointOverrides?: {
    acceptPath?: string;
    rejectPath?: string;
    menuSyncPath?: string;
    stockSyncPath?: string;
  };
  notes?: string;
  updatedAt: number;
}

export interface ThirdPartyOrderItem {
  id: string;
  externalItemId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface ThirdPartyOrder {
  id: string;
  enterpriseId: string;
  shopId: string;
  userId: string;
  provider: ThirdPartyProvider;
  externalOrderId: string;
  status: ThirdPartyOrderStatus;
  customerName?: string;
  customerPhone?: string;
  sourceCreatedAt?: number;
  receivedAt: number;
  acceptedAt?: number;
  rejectedAt?: number;
  acceptedByStaffId?: string;
  rejectedByStaffId?: string;
  rejectReason?: string;
  items: ThirdPartyOrderItem[];
  subtotal: number;
  deliveryFee?: number;
  total: number;
  rawPayload: string;
  internalOrderId?: string;
}

export interface ThirdPartySyncJob {
  id: string;
  enterpriseId: string;
  shopId: string;
  userId: string;
  provider: ThirdPartyProvider;
  thirdPartyOrderId: string;
  externalOrderId: string;
  action: 'accept' | 'reject';
  status: 'pending' | 'success' | 'failed';
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: number;
  lastAttemptAt?: number;
  lastError?: string;
  reason?: string;
  createdAt: number;
  completedAt?: number;
}

export interface ThirdPartyCatalogSyncJob {
  id: string;
  enterpriseId: string;
  shopId: string;
  userId: string;
  provider: ThirdPartyProvider;
  type: 'menu' | 'stock';
  status: 'pending' | 'success' | 'failed';
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: number;
  lastAttemptAt?: number;
  lastError?: string;
  payload: string;
  createdAt: number;
  completedAt?: number;
}

export interface ThirdPartyProductMapping {
  id: string;
  enterpriseId: string;
  shopId: string;
  userId: string;
  provider: ThirdPartyProvider;
  productId: string;
  externalSku: string;
  externalName?: string;
  active: boolean;
  updatedAt: number;
}

export interface Staff extends CoreStaff { // Estendendo CoreStaff
  companyId?: string; // Kept for compat
  storeId?: string; // Optional if not assigned to specific store
  cpf?: string;
  pix?: string;
  photo?: string;
  userId?: string; // Reference to the User ID (for identity)
  assignedTableIds?: string[];
  admissionDate?: number;
  bankInfo?: {
    bankName: string;
    agency: string;
    account: string;
  };
  serviceConfig?: {
    rentalFee?: number;
    serviceRate?: number;
    productRate?: number;
  };
  businessModel?: 'commission' | 'rental' | 'hybrid' | 'freelancer';
  documents?: { name: string; url: string; uploadDate: number }[];
  skills?: string[]; // For Service Business
  commissionRate?: number; // Base rate for the professional
  schedule?: {
    day: number; // 0-6
    start: string; // "09:00"
    end: string;   // "18:00"
  }[];
}

export interface PerformanceEvent { // Exportando PerformanceEvent
  id: string;
  staffId: string;
  enterpriseId: string;
  type: 'praise' | 'reprimand' | 'error' | 'training';
  title: string;
  description: string;
  points: number;
  timestamp: number;
  createdBy: string;
}

export interface InternalMessage { // Exportando InternalMessage
  id: string;
  userId: string;
  enterpriseId: string;
  type: 'info' | 'warning' | 'critical';
  timestamp: number;
  read: boolean;
  content: string;
}

export interface Order extends CoreSale { // Estendendo CoreSale para Order
  id: string;
  enterpriseId: string;
  shopId: string;
  tableId: string;
  staffId?: string; // Waiter assigned
  items: OrderItem[];
  status: OrderStatus;
  startTime: number;
  closedAt?: number;
  discount: number;
  subtotal: number;
  serviceFee?: number;
  tax?: number;
  total: number;
  totalCost?: number; // Snapshot of sum(item.cost * quantity)
  pricePerPerson?: number; // Helpful for split tracking
  notes?: string;
  paymentMethod?: 'cash' | 'card' | 'pix' | 'split';
  payments?: { method: 'cash' | 'card' | 'pix' | 'other', amount: number, change?: number, transactionId?: string, cardBrand?: string }[];
  orderType?: 'table' | 'takeaway' | 'delivery';
  takeawayNumber?: number;
  deliveryEstimate?: string;
  sourceProvider?: ThirdPartyProvider;
  sourceExternalOrderId?: string;
  acceptedByStaffId?: string;
  allergyConfirmation?: {
    waiterConfirmed?: boolean;
    kitchenConfirmed?: boolean;
    barConfirmed?: boolean;
    waiterConfirmedAt?: number;
    kitchenConfirmedAt?: number;
    barConfirmedAt?: number;
  };
}

export interface Transaction { // Exportando Transaction
  id: string;
  enterpriseId: string;
  shopId?: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'cancelled';
  paymentMethod: 'cash' | 'card' | 'pix' | 'other';
  referenceId?: string; // Order ID
  module: BusinessMode;
  staffId: string;
  staffName: string;
  change?: number; // Change given if cash
}

export interface Supplier { // Exportando Supplier
  id: string;
  enterpriseId: string;
  name: string;
  contactName?: string;
  email: string;
  phone: string;
  cnpj?: string;
  category: string;
  rating?: number;
  active: boolean;
  address?: string;
}

export interface SupplierContract { // Exportando SupplierContract
  id: string;
  supplierId: string;
  enterpriseId: string;
  title: string;
  startDate: number;
  endDate?: number;
  terms: string;
  value?: number;
  status: 'active' | 'expired' | 'pending';
  documents?: { name: string; url: string; uploadDate: number }[];
}

export interface Table { // Exportando Table
  id: string;
  enterpriseId: string;
  shopId: string;
  number: number;
  status: TableStatus;
  capacity: number;
  currentOrderId?: string;
  position: { x: number; y: number };
  hasReadyItems?: boolean;
  area?: string;
  waiterId?: string;
}

export type InventoryLocation = 'FOH' | 'BOH';

export interface RecountRequest { // Exportando RecountRequest
  id: string;
  shopId: string;
  itemId: string;
  itemName: string;
  itemSourceType?: 'inventory' | 'product';
  previousStock: number;
  newStock: number;
  adjustmentPercent?: number;
  approvalRequired?: boolean;
  approvedById?: string;
  approvedByName?: string;
  staffId?: string;
  staffName?: string;
  sessionId?: string;
  costPerUnit?: number;
  varianceValue?: number;
  comment: string;
  date: number;
  status: 'pending' | 'applied' | 'rejected';
}

export interface StockCountSession { // Exportando StockCountSession
  id: string;
  enterpriseId: string;
  shopId: string;
  module: 'restaurant' | 'market' | 'construction' | 'retail';
  mode: 'blind';
  status: 'open' | 'closed';
  openedAt: number;
  openedById: string;
  openedByName: string;
  openSignature: string;
  closedAt?: number;
  closedById?: string;
  closedByName?: string;
  closeSignature?: string;
}

export interface InventoryItem { // Exportando InventoryItem
  id: string;
  enterpriseId: string;
  shopId: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  minStock: number;
  costPerUnit: number;
  yieldFactor?: number; // 1g raw -> Xg prepared. Default 1.
  location: InventoryLocation;
  lastRecountDate?: number;
  batch?: string;
  batches?: { id: string; batchNumber: string; expiryDate: number; quantity: number; receivedAt: number }[];
  expirationDate?: number;
  substituteId?: string;
}

export interface DailyStats { // Exportando DailyStats
  totalSales: number;
  activeTables: number;
  pendingOrders: number;
  alerts: string[];
}

export type IncidentType = 'error' | 'broken' | 'risk' | 'action';

export interface IncidentReport { // Exportando IncidentReport
  id: string;
  shopId: string;
  type: IncidentType;
  title: string;
  description: string;
  reporterId: string;
  reporterName: string;
  status: 'open' | 'resolved' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  location?: string;
}

export interface AppNotification extends CoreNotification { // Estendendo CoreNotification
  tableId?: string;
}

export interface CompanySettings {
  name: string;
  cnpj?: string;
  nif?: string;
  address?: string;
  logo?: string;
  requireAllergyDoubleConfirmation?: boolean;
}

export interface DeviceLink { // Exportando DeviceLink
  id: string;
  name: string;
  linkedAt: number;
  lastUsedAt: number;
  status: 'active' | 'revoked';
}

export interface MasterKey { // Exportando MasterKey
  id: string;
  key: string;
  createdAt: number;
  used: boolean;
  usedBy?: string; // ownerId
  enterpriseId?: string;
}
