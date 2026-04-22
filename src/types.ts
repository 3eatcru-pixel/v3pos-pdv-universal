/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SystemMode = 'restaurant' | 'distributor' | 'service';
export type BusinessMode = 'restaurant' | 'construction' | 'retail' | 'market' | 'generic' | 'service';

export type TableStatus = 'free' | 'occupied' | 'reserved' | 'closed';

export type UserRole = string;

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

export interface CustomFieldDefinition {
  id: string;
  enterpriseId: string;
  module: string; // e.g., 'restaurant', 'construction'
  targetEntity: string; // e.g., 'Table', 'Staff', 'Product'
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'date';
  options?: string[]; // for 'select' type
  required: boolean;
  defaultValue?: any;
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

export interface User {
  id: string; // usr_xxx
  email: string;
  name: string;
  photo?: string;
  createdAt: number;
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

export type Company = Enterprise;

export interface Enterprise {
  id: string; // cmp_xxx
  name: string;
  ownerId: string; // usr_xxx
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
  regions: Region[];
  owners?: string[];
}

export interface Region {
  id: string;
  name: string;
  enterpriseId: string;
  managerIds: string[]; // List of user IDs (regional managers)
  shops: Shop[];
}

export interface Shop {
  id: string; // str_xxx
  name: string;
  enterpriseId: string;
  companyId?: string; // Kept for compat
  regionId: string;
  address?: string;
  cnpj?: string;
  settings: CompanySettings;
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

export type View = 'holding' | 'dashboard' | 'tables' | 'orders' | 'kitchen' | 'bar' | 'inventory' | 'reports' | 'history' | 'staff_mgmt' | 'menu_mgmt' | 'schedule' | 'reservations' | 'printer_mgmt' | 'safety' | 'settings' | 'customization' | 'finance_mgmt' | 'supplier_mgmt' | 'service_mgmt' | 'company_mgmt' | 'pending_orders' | 'staff_pnl';

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

export interface Reservation {
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

export interface Shift {
  id: string;
  shopId: string;
  staffId: string;
  startTime: number; // timestamp
  endTime: number; // timestamp
  area: 'FOH' | 'BOH';
}

export interface Product {
  id: string;
  enterpriseId: string;
  shopId: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  stock?: number;
  barcode?: string;
  unit?: 'un' | 'kg' | 'lt' | 'g';
  expiration?: number;
  ingredients?: Record<string, number>;
  wastageMargin?: number;
  active: boolean;
  type?: 'product' | 'service'; // Added to distinguish in POS
}

export interface ServiceItem {
  id: string;
  enterpriseId: string;
  name: string;
  price: number;
  duration: number; // in minutes
  category: string;
  description?: string;
  requiresApproval: boolean;
  active: boolean;
  commissionRate?: number; // Specific rate for this service
}

export interface ServiceResource {
  id: string;
  enterpriseId: string;
  shopId: string;
  name: string;
  type: string; // e.g., 'chair', 'room', 'machine'
  active: boolean;
}

export interface Appointment {
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
  paymentStatus: 'pending' | 'paid';
}

export type ItemStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'voided';

export type ModifierType = 'extra' | 'remove' | 'allergy';

export interface ItemModifier {
  id: string;
  type: ModifierType;
  name: string;
  price?: number;
}

export interface OrderItem {
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
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface Staff {
  id: string; // emp_xxx
  enterpriseId: string;
  companyId?: string; // Kept for compat
  storeId?: string; // Optional if not assigned to specific store
  name: string;
  role: UserRole;
  active: boolean;
  cpf?: string;
  pix?: string;
  phone?: string;
  photo?: string;
  pin?: string;
  userId?: string; // Reference to the User ID (for identity)
  assignedShopIds: string[];
  assignedTableIds?: string[];
  salary?: number;
  contractType?: 'clt' | 'pj' | 'freelancer' | 'intern';
  admissionDate?: number;
  bankInfo?: {
    bankName: string;
    agency: string;
    account: string;
  };
  documents?: { name: string; url: string; uploadDate: number }[];
  performanceScore?: number;
  skills?: string[]; // For Service Business
  commissionRate?: number; // Base rate for the professional
  schedule?: {
    day: number; // 0-6
    start: string; // "09:00"
    end: string;   // "18:00"
  }[];
}

export interface PerformanceEvent {
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

export interface Order {
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
  pricePerPerson?: number; // Helpful for split tracking
  notes?: string;
  paymentMethod?: 'cash' | 'card' | 'pix' | 'split';
  payments?: { method: 'cash' | 'card' | 'pix', amount: number, change?: number }[];
  orderType?: 'table' | 'takeaway';
  takeawayNumber?: number;
  deliveryEstimate?: string;
}

export interface Transaction {
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
  module: 'restaurant' | 'market' | 'retail' | 'construction' | 'service';
  staffId: string;
  staffName: string;
  change?: number; // Change given if cash
}

export interface Supplier {
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

export interface SupplierContract {
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

export interface Table {
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

export interface RecountRequest {
  id: string;
  shopId: string;
  itemId: string;
  itemName: string;
  previousStock: number;
  newStock: number;
  comment: string;
  date: number;
  status: 'pending' | 'applied' | 'rejected';
}

export interface InventoryItem {
  id: string;
  enterpriseId: string;
  shopId: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  minStock: number;
  costPerUnit: number;
  location: InventoryLocation;
  lastRecountDate?: number;
  batch?: string;
  expirationDate?: number;
}

export interface DailyStats {
  totalSales: number;
  activeTables: number;
  pendingOrders: number;
  alerts: string[];
}

export type IncidentType = 'error' | 'broken' | 'risk' | 'action';

export interface IncidentReport {
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

export interface AppNotification {
  id: string;
  shopId: string;
  message: string;
  type: 'order_ready_kitchen' | 'order_ready_bar' | 'new_order_kitchen' | 'new_order_bar' | 'low_stock' | 'system';
  tableId?: string;
  timestamp: number;
  read: boolean;
}

export interface CompanySettings {
  name: string;
  cnpj?: string;
  address?: string;
  logo?: string;
}

export interface DeviceLink {
  id: string;
  name: string;
  linkedAt: number;
  lastUsedAt: number;
  status: 'active' | 'revoked';
}

export interface MasterKey {
  id: string;
  key: string;
  createdAt: number;
  used: boolean;
  usedBy?: string; // ownerId
  enterpriseId?: string;
}
