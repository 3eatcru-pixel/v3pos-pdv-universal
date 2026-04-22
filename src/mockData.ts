import { Product, Table, InventoryItem, Staff, Shift, RolePermissions, Printer, Shop, Region, Enterprise, BusinessConfig, StaffSchedule } from './types';

export const MOCK_BUSINESS_CONFIG: BusinessConfig[] = [
  {
    id: 'cfg-ent-1',
    enterpriseId: 'ent-1',
    enabledModules: ['restaurant', 'market', 'construction'],
    roles: [
      { id: 'role-mgr', enterpriseId: 'ent-1', name: 'Gerente Geral', permissions: ['all'], views: ['dashboard', 'reports', 'settings', 'customization'] },
      { id: 'role-sal', enterpriseId: 'ent-1', name: 'Vendedor Sênior', permissions: ['create_sale', 'view_customers'], views: ['orders', 'history'] }
    ],
    workflows: {
      'restaurant': [{ id: 'wf1', name: 'Auto-print kitchen', condition: 'order_confirmed', action: 'print_kitchen', active: true }]
    },
    customFields: [
      { id: 'cf1', enterpriseId: 'ent-1', module: 'restaurant', targetEntity: 'Table', name: 'preferred_customer', label: 'Prato Preferido', type: 'string', required: false }
    ],
    updatedAt: Date.now()
  }
];

export const MOCK_SCHEDULES: StaffSchedule[] = [
  {
    id: 'sch-1',
    enterpriseId: 'ent-1',
    shopId: 'shop-1',
    staffId: 'u2',
    role: 'waiter',
    startTime: Date.now(),
    endTime: Date.now() + 8 * 3600000,
    module: 'restaurant',
    status: 'confirmed'
  }
];

export const MOCK_ENTERPRISES: Enterprise[] = [
  {
    id: 'ent-1',
    name: 'Grupo RestManager',
    ownerId: 'u1',
    businessType: 'restaurant',
    ownerEmail: 'owner@ent1.com',
    ownerName: 'Ricardo Dono',
    accessCode: 'ENT1-1234',
    status: 'active',
    owners: ['u1'],
    createdAt: Date.now(),
    enabledModules: ['restaurant', 'market', 'retail'],
    lockedModules: [],
    regions: []
  },
  {
    id: 'ent-2',
    name: 'Varejo Tech',
    ownerId: 'u2',
    businessType: 'retail',
    ownerEmail: 'retail@tech.com',
    ownerName: 'Admin Tech',
    accessCode: 'TECH-8888',
    status: 'active',
    owners: ['u2', 'u1'],
    createdAt: Date.now(),
    enabledModules: ['retail', 'market'],
    lockedModules: [],
    regions: []
  }
];

export const MOCK_ENTERPRISE: Enterprise = MOCK_ENTERPRISES[0];

export const MOCK_SHOPS: Shop[] = [
  { 
    id: 'shop-1', 
    name: 'Matriz - Centro', 
    enterpriseId: 'ent-1',
    regionId: 'reg-sp-centro', 
    settings: { name: 'Matriz RestManager', cnpj: '12.345.678/0001-90', address: 'Av. Paulista, 1000' } 
  },
  { 
    id: 'shop-2', 
    name: 'Filial - Jardins', 
    enterpriseId: 'ent-1',
    regionId: 'reg-sp-centro', 
    settings: { name: 'Filial RestManager', cnpj: '12.345.678/0002-15', address: 'Rua Augusta, 500' } 
  },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: '1', enterpriseId: 'ent-1', shopId: 'shop-1', name: 'Burger Clássico', price: 25.00, category: 'Hambúrgueres', stock: 50, active: true, ingredients: { 'i1': 0.150, 'i2': 1, 'i4': 0.02 }, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=500&fit=crop' },
  { id: '2', enterpriseId: 'ent-1', shopId: 'shop-1', name: 'Burger Duplo', price: 35.00, category: 'Hambúrgueres', stock: 30, active: true, ingredients: { 'i1': 0.300, 'i2': 1, 'i4': 0.04 }, image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500&h=500&fit=crop' },
  { id: '3', enterpriseId: 'ent-1', shopId: 'shop-1', name: 'Batata Frita', price: 15.00, category: 'Acompanhamentos', stock: 100, active: true, ingredients: { 'i3': 0.200 }, image: 'https://images.unsplash.com/photo-1573016608244-7d5f0d3b7a38?w=500&h=500&fit=crop' },
  { id: '4', enterpriseId: 'ent-1', shopId: 'shop-1', name: 'Refrigerante 350ml', price: 7.00, category: 'Bebidas', stock: 200, active: true, ingredients: { 'i5': 1 }, image: 'https://images.unsplash.com/photo-1622483767028-3f66f344507c?w=500&h=500&fit=crop' },
  { id: '5', enterpriseId: 'ent-1', shopId: 'shop-1', name: 'Suco Natural', price: 10.00, category: 'Bebidas', stock: 50, active: true, image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=500&h=500&fit=crop' },
  { id: '6', enterpriseId: 'ent-1', shopId: 'shop-1', name: 'Cerveja Artesanal', price: 18.00, category: 'Bebidas', stock: 80, active: true, ingredients: { 'i6': 1 }, image: 'https://images.unsplash.com/photo-1584225065152-4a1454aa3d4e?w=500&h=500&fit=crop' },
  { id: '7', enterpriseId: 'ent-1', shopId: 'shop-1', name: 'Pudim de Leite', price: 12.00, category: 'Sobremesas', stock: 20, active: true, image: 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=500&h=500&fit=crop' },
  { id: '8', enterpriseId: 'ent-1', shopId: 'shop-1', name: 'Combo Casal', price: 65.00, category: 'Combos', stock: 15, active: true, ingredients: { 'i1': 0.300, 'i2': 2, 'i3': 0.400 }, image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500&h=500&fit=crop' },
  { id: '9', enterpriseId: 'ent-1', shopId: 'shop-1', name: 'Milkshake Chocolate', price: 22.00, category: 'Sobremesas', stock: 40, active: true, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&h=500&fit=crop' },
  { id: '10', enterpriseId: 'ent-1', shopId: 'shop-1', name: 'Salada Caesar', price: 28.00, category: 'Saladas', stock: 25, active: true, image: 'https://images.unsplash.com/photo-1550317144-b38c5f61732b?w=500&h=500&fit=crop' },
];

export const MOCK_TABLES: Table[] = [
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `t${i + 1}`,
    enterpriseId: 'ent-1',
    shopId: 'shop-1',
    number: i + 1,
    status: 'free' as const,
    capacity: i < 8 ? 2 : 4,
    position: { x: (i % 5) * 160 + 80, y: Math.floor(i / 5) * 140 + 80 },
    area: 'Salão Principal'
  })),
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `t${i + 21}`,
    enterpriseId: 'ent-1',
    shopId: 'shop-1',
    number: i + 21,
    status: 'free' as const,
    capacity: 2,
    position: { x: (i % 5) * 160 + 80, y: Math.floor(i / 5) * 140 + 80 },
    area: 'Varanda Gourmet'
  }))
];

export const MOCK_ORDERS: any[] = [
  {
    id: 'ord-101',
    enterpriseId: 'ent-1',
    shopId: 'shop-1',
    tableId: 't1',
    staffId: 'w1',
    items: [
      { id: 'item-1', productId: '1', name: 'Burger Clássico', price: 25.00, quantity: 2, status: 'delivered' }
    ],
    status: 'delivered',
    startTime: Date.now() - 3600000,
    closedAt: Date.now() - 1800000,
    subtotal: 50.00,
    discount: 0,
    total: 50.00,
    paymentMethod: 'pix'
  },
  {
    id: 'ord-102',
    enterpriseId: 'ent-1',
    shopId: 'shop-1',
    tableId: 't2',
    staffId: 'w2',
    items: [
      { id: 'item-2', productId: '2', name: 'Burger Duplo', price: 35.00, quantity: 1, status: 'delivered' },
      { id: 'item-3', productId: '3', name: 'Batata Frita', price: 15.00, quantity: 1, status: 'delivered' }
    ],
    status: 'delivered',
    startTime: Date.now() - 7200000,
    closedAt: Date.now() - 5400000,
    subtotal: 50.00,
    discount: 5.00,
    total: 45.00,
    paymentMethod: 'card'
  }
];

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: 'i1', enterpriseId: 'ent-1', shopId: 'shop-1', name: 'Carne Bovina', category: 'Carnes', currentStock: 2.5, unit: 'kg', minStock: 5, costPerUnit: 35.00, location: 'BOH' },
  { id: 'i2', enterpriseId: 'ent-1', shopId: 'shop-1', name: 'Pão de Hambúrguer', category: 'Panificados', currentStock: 45, unit: 'unid', minStock: 20, costPerUnit: 1.50, location: 'BOH' },
  { id: 'i3', enterpriseId: 'ent-1', shopId: 'shop-1', name: 'Batata Congelada', category: 'Vegetais', currentStock: 10, unit: 'kg', minStock: 5, costPerUnit: 12.00, location: 'BOH' },
  { id: 'i4', enterpriseId: 'ent-1', shopId: 'shop-1', name: 'Queijo Cheddar', category: 'Laticínios', currentStock: 1.2, unit: 'kg', minStock: 2, costPerUnit: 48.00, location: 'BOH' },
  { id: 'i5', enterpriseId: 'ent-1', shopId: 'shop-1', name: 'Refrigerante 350ml', category: 'Bebidas', currentStock: 120, unit: 'unid', minStock: 48, costPerUnit: 2.50, location: 'FOH', batch: 'BEB-2023', expirationDate: Date.now() + 1000 * 60 * 60 * 24 * 30 },
  { id: 'i6', enterpriseId: 'ent-1', shopId: 'shop-1', name: 'Cerveja Lata', category: 'Bebidas', currentStock: 96, unit: 'unid', minStock: 24, costPerUnit: 4.20, location: 'FOH', batch: 'BEV-X9', expirationDate: Date.now() + 1000 * 60 * 60 * 24 * 60 },
];

export const MOCK_STAFF: Staff[] = [
  { id: 'u1', enterpriseId: 'ent-1', name: 'Ricardo Dono', role: 'owner', active: true, pin: '1234', assignedShopIds: ['shop-1', 'shop-2'] },
  { id: 'ghost-k', enterpriseId: 'ent-1', name: 'Display Cozinha', role: 'chef', active: true, pin: '9999', assignedShopIds: ['shop-1'] },
  { id: 'ghost-b', enterpriseId: 'ent-1', name: 'Display Bar', role: 'waiter', active: true, pin: '9998', assignedShopIds: ['shop-1'] },
];

const now = new Date();
const startOfCurrentWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))); // Monday
startOfCurrentWeek.setHours(0, 0, 0, 0);

export const MOCK_SHIFTS: Shift[] = [
  // Monday
  { id: 's1', shopId: 'shop-1', staffId: 'w1', startTime: new Date(startOfCurrentWeek).setHours(8, 0), endTime: new Date(startOfCurrentWeek).setHours(16, 0), area: 'FOH' },
  { id: 's2', shopId: 'shop-1', staffId: 'k1', startTime: new Date(startOfCurrentWeek).setHours(10, 0), endTime: new Date(startOfCurrentWeek).setHours(18, 0), area: 'BOH' },
  // Tuesday
  { id: 's3', shopId: 'shop-2', staffId: 'w1', startTime: new Date(startOfCurrentWeek.getTime() + 86400000).setHours(8, 0), endTime: new Date(startOfCurrentWeek.getTime() + 86400000).setHours(16, 0), area: 'FOH' },
  { id: 's4', shopId: 'shop-1', staffId: 'm2', startTime: new Date(startOfCurrentWeek.getTime() + 86400000).setHours(9, 0), endTime: new Date(startOfCurrentWeek.getTime() + 86400000).setHours(17, 0), area: 'BOH' },
];

export const MOCK_PERMISSIONS: RolePermissions[] = [
  {
    role: 'owner',
    label: 'Proprietário / Admin',
    views: ['dashboard', 'tables', 'pending_orders', 'orders', 'kitchen', 'bar', 'inventory', 'reports', 'history', 'staff_mgmt', 'menu_mgmt', 'schedule', 'reservations', 'printer_mgmt', 'safety', 'settings', 'service_mgmt', 'staff_pnl'],
    actions: { canVoid: true, canDiscount: true, canViewSales: true, canManageStaff: true, canManageInventory: true, canEditMenu: true, canReopenTable: true, canManageSchedule: true }
  },
  {
    role: 'regional_manager',
    label: 'Gerente Regional',
    views: ['dashboard', 'reports', 'history', 'staff_mgmt', 'schedule', 'safety', 'staff_pnl'],
    actions: { canVoid: false, canDiscount: false, canViewSales: true, canManageStaff: true, canManageInventory: false, canEditMenu: false, canReopenTable: false, canManageSchedule: true }
  },
  {
    role: 'manager_foh',
    label: 'Gerente (Salão/FOH)',
    views: ['dashboard', 'tables', 'pending_orders', 'orders', 'bar', 'history', 'staff_mgmt', 'reports', 'reservations', 'printer_mgmt', 'safety', 'staff_pnl'],
    actions: { canVoid: true, canDiscount: true, canViewSales: true, canManageStaff: true, canManageInventory: false, canEditMenu: false, canReopenTable: true, canManageSchedule: true }
  },
  {
    role: 'manager_boh',
    label: 'Gerente (Cozinha/BOH)',
    views: ['dashboard', 'kitchen', 'pending_orders', 'inventory', 'menu_mgmt', 'safety', 'staff_mgmt', 'schedule', 'staff_pnl'],
    actions: { canVoid: false, canDiscount: false, canViewSales: false, canManageStaff: true, canManageInventory: true, canEditMenu: true, canReopenTable: false, canManageSchedule: true }
  },
  {
    role: 'sub_manager',
    label: 'Sub-Gerente',
    views: ['dashboard', 'tables', 'pending_orders', 'orders', 'kitchen', 'bar', 'inventory', 'history', 'staff_pnl'],
    actions: { canVoid: true, canDiscount: true, canViewSales: false, canManageStaff: false, canManageInventory: false, canEditMenu: false, canReopenTable: true, canManageSchedule: false }
  },
  {
    role: 'waiter',
    label: 'Garçom',
    views: ['tables', 'pending_orders', 'orders', 'bar', 'history', 'staff_pnl'],
    actions: { canVoid: false, canDiscount: false, canViewSales: false, canManageStaff: false, canManageInventory: false, canEditMenu: false, canReopenTable: false, canManageSchedule: false }
  },
  {
    role: 'chef',
    label: 'Cozinheiro / Chef',
    views: ['kitchen', 'inventory', 'staff_pnl'],
    actions: { canVoid: false, canDiscount: false, canViewSales: false, canManageStaff: false, canManageInventory: false, canEditMenu: false, canReopenTable: false, canManageSchedule: false }
  }
];

export const MOCK_PRINTERS: Printer[] = [
  {
    id: 'p1',
    enterpriseId: 'ent-1',
    shopId: 'shop-1',
    name: 'Cozinha Central',
    type: 'kitchen',
    connectionType: 'network',
    ipAddress: '192.168.1.50',
    port: 9100,
    status: 'online',
    isDefault: true
  },
  {
    id: 'p2',
    enterpriseId: 'ent-1',
    shopId: 'shop-1',
    name: 'Balcão Principal',
    type: 'receipt',
    connectionType: 'usb',
    status: 'online',
    isDefault: true
  },
  {
    id: 'p3',
    enterpriseId: 'ent-1',
    shopId: 'shop-1',
    name: 'Bar de Bebidas',
    type: 'bar',
    connectionType: 'network',
    ipAddress: '192.168.1.51',
    port: 9100,
    status: 'online',
    isDefault: true
  },
  {
    id: 'p4',
    enterpriseId: 'ent-1',
    shopId: 'shop-1',
    name: 'Escritório (Relatórios)',
    type: 'report',
    connectionType: 'system_default',
    status: 'online',
    isDefault: true
  }
];
