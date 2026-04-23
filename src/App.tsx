import { StaffScheduleView } from './core/views/StaffScheduleView';
import { GeneralStaffView } from './core/views/GeneralStaffView';
import { RestaurantEmployees } from './modules/restaurant/views/RestaurantEmployees';
import { FinanceManagementView } from './core/views/FinanceManagementView';
import { SupplierManagementView } from './core/views/SupplierManagementView';
import { CompanyManagement } from './core/views/CompanyManagement';
import { ServiceLayout } from './modules/service/views/ServiceLayout';
import { DashboardView } from './core/views/DashboardView';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, cloneElement } from 'react';
import { 
  LayoutDashboard, 
  Layout,
  Table as TableIcon, 
  UtensilsCrossed, 
  ClipboardList, 
  Package, 
  BarChart3, 
  Settings, 
  LogOut,
  Bell,
  AlertTriangle,
  Plus,
  Minus,
  X,
  ChevronRight,
  Search,
  ShoppingCart,
  CheckCircle2,
  Clock,
  User,
  History,
  Trash2,
  Edit,
  Save,
  ChevronLeft,
  Printer as PrinterIcon,
  Users,
  Beer,
  Wallet,
  CreditCard,
  Smartphone,
  Banknote,
  ArrowLeftRight,
  Calendar,
  Image as ImageIcon,
  Cloud,
  ShieldCheck,
  Thermometer,
  Waves,
  Zap,
  Wind,
  Droplets,
  HardHat,
  Flame,
  FileText,
  Wrench,
  Shield,
  Monitor,
  Link2,
  Copy,
  Building2,
  ChevronDown,
  Key,
  Terminal,
  GripHorizontal,
  Check,
  MousePointer2,
  Settings2,
  ShoppingBag,
  Hammer,
  Tag,
  Utensils,
  PanelLeftClose,
  PanelLeft,
  Truck,
  Briefcase,
  TrendingUp,
  PieChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { format, startOfWeek, addDays, isSameDay, eachDayOfInterval, endOfWeek, parseISO, startOfDay, endOfDay, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';
import { generateId, generateInviteCode, validateId, belongsToCompany } from './lib/idUtils';
import { doc, onSnapshot } from 'firebase/firestore';
import * as XLSX from 'xlsx';

import { 
  Product, 
  Table, 
  Order, 
  OrderItem, 
  InventoryItem, 
  TableStatus,
  OrderStatus,
  ItemStatus,
  ItemModifier,
  ModifierType,
  UserRole,
  RecountRequest,
  InventoryLocation,
  AppNotification,
  Staff,
  View,
  Shift,
  RolePermissions,
  Reservation,
  Printer,
  PrinterType,
  IncidentReport,
  IncidentType,
  CompanySettings,
  DeviceLink,
  Shop,
  Region,
  Enterprise,
  SystemMode,
  BusinessConfig,
  StaffSchedule,
  CustomRole,
  CustomFieldDefinition
} from './types';
import { MOCK_PRODUCTS, MOCK_TABLES, MOCK_INVENTORY, MOCK_STAFF, MOCK_SHIFTS, MOCK_PERMISSIONS, MOCK_PRINTERS, MOCK_SHOPS, MOCK_ENTERPRISE, MOCK_ENTERPRISES, MOCK_ORDERS, MOCK_BUSINESS_CONFIG, MOCK_SCHEDULES } from './mockData';
import { cn, formatCurrency } from './lib/utils';
import { printerService } from './services/printerService';
import { firebaseService } from './services/firebaseService';
import { paymentService } from './services/paymentService';
import { InventoryEngine } from './core/services/InventoryEngine';
import { OrderEngine } from './core/services/OrderEngine';
import { calculateOrderTotals } from './core/utils/OrderCalculator';
import { StatCard, NavItem } from './core/components/CommonUI';
import { db } from './firebase';
import { ensureFirebaseSession } from './services/authSession';
import { useCollection } from './hooks/useCollection';
import { accountService } from './core/services/accountService';
import { LoginView } from './core/views/LoginView';

import { HoldingDashboard } from './core/views/HoldingDashboard';
import { StaffDashboard } from './core/views/StaffDashboard';

// --- State Management ---

import { meshNetwork } from './services/p2pSync';
import { dbLocal } from './services/db';

export default function App() {
  const [enterpriseId, setEnterpriseId] = useState<string | null>(() => {
    return accountService.getCurrentCompanyId();
  });
  const [systemMode, setSystemMode] = useState<SystemMode>(() => {
    return (localStorage.getItem('rm_system_mode') as SystemMode) || 'restaurant';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('pos_restaurant_sidebar_collapsed') === 'true';
  });
  const { data: enterprises, setData: setEnterprises } = useCollection<Enterprise>('enterprises', { enterpriseId: null, shopId: null });
  const { data: shops, setData: setShops } = useCollection<Shop>('shops');

  const [selectedShopId, setSelectedShopId] = useState<string | null>(() => {
    return localStorage.getItem('rm_selected_shop_id');
  });

  const [currentUser, setCurrentUser] = useState<Staff | null>(() => {
    const globalUser = accountService.getCurrentUser();
    if (!globalUser) return null;

    const mappedRole =
      globalUser.role === 'owner'
        ? 'owner'
        : globalUser.role === 'manager'
          ? 'manager_foh'
          : globalUser.role === 'dev'
            ? 'admin'
            : 'waiter';

    return {
      id: globalUser.id,
      enterpriseId: globalUser.companyId,
      companyId: globalUser.companyId,
      name: globalUser.name,
      role: mappedRole,
      active: true,
      pin: globalUser.pin || '0000',
      assignedShopIds: [],
      email: globalUser.email,
    } as Staff;
  });
  const [currentView, setCurrentView] = useState<View>(() => {
    const saved = localStorage.getItem('rm_current_view') as View;
    if (saved && saved !== 'holding') return saved;
    return 'dashboard';
  });
  const [holdingActive, setHoldingActive] = useState<boolean>(() => {
    // If we have a user but no enterprise selected yet, show holding
    const hasUser = !!accountService.getCurrentUser();
    const hasEnterprise = !!accountService.getCurrentCompanyId();
    return hasUser && !hasEnterprise;
  });
  const [selectedArea, setSelectedArea] = useState<string>('Salão Principal');
  
  const { data: tables, setData: setTables } = useCollection<Table>('tables');
  const { data: products, setData: setProducts } = useCollection<Product>('products');
  const { data: orders, setData: setOrders } = useCollection<Order>('orders');
  const { data: inventory, setData: setInventory } = useCollection<InventoryItem>('inventory');
  const { data: staff, setData: setStaff } = useCollection<Staff>('staff');
  const { data: shifts, setData: setShifts } = useCollection<Shift>('shifts');
  const { data: reservations, setData: setReservations } = useCollection<Reservation>('reservations');
  const { data: printers, setData: setPrinters } = useCollection<Printer>('printers');
  const { data: incidentReports, setData: setIncidentReports } = useCollection<IncidentReport>('incidentReports');
  const { data: notifications, setData: setNotifications } = useCollection<AppNotification>('notifications');
  const { data: rolePermissions, setData: setRolePermissions } = useCollection<RolePermissions>('rolePermissions');
  const { data: businessConfigs, setData: setBusinessConfigs } = useCollection<BusinessConfig>('businessConfigs');
  const { data: staffSchedules, setData: setStaffSchedules } = useCollection<StaffSchedule>('staffSchedules');
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [customizationTab, setCustomizationTab] = useState<'modules' | 'roles' | 'workflows' | 'fields' | 'schedule'>('modules');
  
  const currentBusinessConfig = useMemo(() => businessConfigs.find(c => c.enterpriseId === enterpriseId), [businessConfigs, enterpriseId]);
  const isModuleEnabled = (modId: string) => {
    if (!currentBusinessConfig) return modId === 'restaurant'; // Default only restaurant if no config
    if (modId === 'service') return true; // Force enable for now or check config
    return currentBusinessConfig.enabledModules.includes(modId);
  };
  
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [modalStaffRole, setModalStaffRole] = useState<UserRole>('waiter');

  // --- Data Provider Switch ---
  
  useEffect(() => {
    let mounted = true;
    ensureFirebaseSession()
      .then(() => {
        if (!mounted) return;
        setAuthReady(true);
        setAuthError(null);
      })
      .catch((error) => {
        if (!mounted) return;
        console.error('Falha ao iniciar sessão Firebase', error);
        setAuthReady(false);
        setAuthError('Não foi possível autenticar no Firebase para modo Cloud.');
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleCashRegister = (e: any) => {
      const { amount, change } = e.detail;
      // In a real device, this would invoke the hardware bridge
      // For the UI, we show a confirmation.
      alert(`GAVETA DE DINHEIRO ABERTA\nValor: ${formatCurrency(amount)}\nTroco: ${formatCurrency(change)}`);
    };

    window.addEventListener('cash-register-open', handleCashRegister);
    return () => window.removeEventListener('cash-register-open', handleCashRegister);
  }, []);

  useEffect(() => {
    if (!currentUser?.enterpriseId) return;
    if (enterpriseId === currentUser.enterpriseId) return;
    setEnterpriseId(currentUser.enterpriseId);
  }, [currentUser, enterpriseId]);

  // Data is now managed by useCollection hooks

  // Seeding Logic (Run once if empty)
  useEffect(() => {
    if (staff.length === 0 && shops.length === 0 && enterprises.length === 0) {
       // Avoid multiple seeds if called in parallel
       console.log("Seeding initial data...");
       firebaseService.seedData({
         enterprises: MOCK_ENTERPRISES,
         shops: MOCK_SHOPS,
         staff: MOCK_STAFF,
         products: MOCK_PRODUCTS,
         tables: MOCK_TABLES,
         orders: MOCK_ORDERS,
         inventory: MOCK_INVENTORY,
         permissions: MOCK_PERMISSIONS,
         printers: MOCK_PRINTERS,
         businessConfigs: MOCK_BUSINESS_CONFIG,
         staffSchedules: MOCK_SCHEDULES
       });
    }
  }, [staff, shops, enterprises]);

  useEffect(() => {
    if (!enterpriseId || staff.length === 0) return;
    try {
      accountService.migrateRestaurantUsers(
        enterpriseId,
        staff.map((member) => ({
          id: member.id,
          name: member.name,
          role: String(member.role || ''),
          pin: member.pin,
          email: member.email,
        }))
      );
    } catch (error) {
      console.warn('Falha ao migrar staff legado para auth global', error);
    }
  }, [enterpriseId, staff]);

  useEffect(() => {
    localStorage.setItem('rm_current_view', currentView);
  }, [currentView]);

  const handleSelectEnterprise = (id: string) => {
    setEnterpriseId(id);
    setHoldingActive(false);
  };

  useEffect(() => {
    if (selectedShopId) localStorage.setItem('rm_selected_shop_id', selectedShopId);
    else if (shops.length > 0 && !selectedShopId) setSelectedShopId(shops[0].id);
  }, [selectedShopId, shops]);

  const handleHardReset = async () => {
    if (!enterpriseId) return;
    if (!confirm(`⚠️ ATENÇÃO: Isso apagará TODOS os dados da empresa "${enterpriseId}" (pedidos, funcionários, produtos, mesas) e reiniciará com os dados padrão. Deseja continuar?`)) return;
    
    try {
      const collections = [
        'staff', 'shops', 'products', 'tables', 'orders', 'inventory', 
        'rolePermissions', 'printers', 'incidentReports', 'reservations', 'notifications'
      ];
      
      for (const coll of collections) {
        const snapshot = await firebaseService.getAllDocs(coll, enterpriseId);
        for (const doc of snapshot) {
          await firebaseService.deleteItem(coll, doc.id);
        }
      }
      
      await firebaseService.seedData({
        shops: MOCK_SHOPS.map(s => ({ ...s, id: `${enterpriseId}-${s.id}`, enterpriseId })),
        staff: MOCK_STAFF.map(s => ({ ...s, id: `${enterpriseId}-${s.id}`, enterpriseId })),
        products: MOCK_PRODUCTS.map(p => ({ ...p, id: `${enterpriseId}-${p.id}`, enterpriseId })),
        tables: MOCK_TABLES.map(t => ({ ...t, id: `${enterpriseId}-${t.id}`, enterpriseId })),
        orders: MOCK_ORDERS.map(o => ({ ...o, id: `${enterpriseId}-${o.id}`, enterpriseId })),
        inventory: MOCK_INVENTORY.map(i => ({ ...i, id: `${enterpriseId}-${i.id}`, enterpriseId })),
        permissions: MOCK_PERMISSIONS,
        printers: MOCK_PRINTERS.map(p => ({ ...p, id: `${enterpriseId}-${p.id}`, enterpriseId }))
      });
      
      alert("Operação concluída com sucesso!");
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Erro ao processar reset.");
    }
  };

  const handleSeedTablesForCurrentShop = async () => {
    if (!selectedShopId) return;
    const areas = ['Salão Principal', 'Varanda Gourmet'];
    for (const area of areas) {
      const prefix = area === 'Salão Principal' ? 'p' : 'v';
      for (let i = 1; i <= 20; i++) {
        const tableId = `t-${selectedShopId}-${prefix}${i}`;
        const x = ((i - 1) % 5) * 160 + 80;
        const y = Math.floor((i - 1) / 5) * 140 + 80;
        
        await firebaseService.saveItem('tables', tableId, {
          id: tableId,
          shopId: selectedShopId,
          number: area === 'Salão Principal' ? i : i + 20,
          status: 'free',
          capacity: i <= 8 ? 2 : 4,
          position: { x, y },
          area: area
        });
      }
    }
    alert("40 mesas geradas com sucesso (20 por área)!");
  };

  const currentShop = useMemo(() => shops.find(s => s.id === selectedShopId), [shops, selectedShopId]);

  const filteredTables = useMemo(() => {
    let result = tables.filter(t => t.shopId === (selectedShopId || 'shop-1'));
    if (currentUser?.role === 'waiter') {
      result = result.filter(t => t.waiterId === currentUser.id);
    }
    return result;
  }, [tables, selectedShopId, currentUser]);
  const filteredProducts = useMemo(() => products.filter(p => p.shopId === (selectedShopId || 'shop-1')), [products, selectedShopId]);
  const filteredOrders = useMemo(() => {
    let result = orders.filter(o => o.shopId === (selectedShopId || 'shop-1'));
    if (currentUser?.role === 'waiter') {
      const myTableIds = tables.filter(t => t.waiterId === currentUser.id).map(t => t.id);
      result = result.filter(o => o.staffId === currentUser.id || (o.tableId && myTableIds.includes(o.tableId)));
    }
    return result;
  }, [orders, selectedShopId, currentUser, tables]);
  const filteredInventory = useMemo(() => inventory.filter(i => i.shopId === (selectedShopId || 'shop-1')), [inventory, selectedShopId]);
  const filteredShifts = useMemo(() => shifts.filter(s => s.shopId === (selectedShopId || 'shop-1')), [shifts, selectedShopId]);
  const filteredReservations = useMemo(() => reservations.filter(r => r.shopId === (selectedShopId || 'shop-1')), [reservations, selectedShopId]);
  const filteredIncidentReports = useMemo(() => incidentReports.filter(i => i.shopId === (selectedShopId || 'shop-1')), [incidentReports, selectedShopId]);
  const filteredPrinters = useMemo(() => printers.filter(p => p.shopId === (selectedShopId || 'shop-1')), [printers, selectedShopId]);

  const [isTableListView, setIsTableListView] = useState(false);
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [reportsStartDate, setReportsStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [reportsEndDate, setReportsEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportsTab, setReportsTab] = useState<'overview' | 'sales' | 'products' | 'hourly'>('overview');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'delivered' | 'cancelled'>('all');
  const [pendingOrderFilter, setPendingOrderFilter] = useState<'all' | 'table' | 'takeaway'>('all');
  const [pendingOrderSort, setPendingOrderSort] = useState<'newest' | 'oldest' | 'value'>('newest');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showDevTools, setShowDevTools] = useState(currentUser?.role === 'admin');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [appScale, setAppScale] = useState(1);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      // Suporte para celulares pequenos e médios para evitar quebras de layout
      if (width < 430) {
        setAppScale(Math.max(0.82, width / 430));
      } else {
        setAppScale(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const filteredTablesBySearch = useMemo(() => {
    return filteredTables.filter(t => 
      t.number.toString().includes(tableSearchQuery) || 
      (t.area || '').toLowerCase().includes(tableSearchQuery.toLowerCase())
    );
  }, [filteredTables, tableSearchQuery]);

  const dashboardStats = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();
    const yesterdayStart = startOfDay(addDays(new Date(), -1)).getTime();
    const yesterdayEnd = endOfDay(addDays(new Date(), -1)).getTime();

    const isRegionalView = currentUser?.role === 'owner' || currentUser?.role === 'regional_manager';
    const relevantOrders = (isRegionalView && !selectedShopId) ? orders : orders.filter(o => o.shopId === selectedShopId);
    
    const closedOrdersToday = relevantOrders.filter(o => o.status === 'delivered' && o.closedAt && o.closedAt >= todayStart);
    const totalSalesToday = closedOrdersToday.reduce((acc, o) => acc + o.total, 0);
    const totalCostToday = closedOrdersToday.reduce((acc, o) => {
      return acc + (o.items || []).reduce((itemAcc, item) => {
        // Even if voided, if it was sent to kitchen, it counts towards COGS (wastage)
        const shouldCountCost = item.status !== 'voided' || item.sentToKitchen;
        return itemAcc + (shouldCountCost ? (item.cost || 0) * item.quantity : 0);
      }, 0);
    }, 0);

    const closedOrdersYesterday = relevantOrders.filter(o => o.status === 'delivered' && o.closedAt && o.closedAt >= yesterdayStart && o.closedAt <= yesterdayEnd);
    const totalSalesYesterday = closedOrdersYesterday.reduce((acc, o) => acc + o.total, 0);

    const trend = totalSalesYesterday > 0 
      ? ((totalSalesToday - totalSalesYesterday) / totalSalesYesterday) * 100 
      : 0;

    const avgTicket = closedOrdersToday.length > 0 ? totalSalesToday / closedOrdersToday.length : 0;
    const profitMargin = totalSalesToday > 0 ? ((totalSalesToday - totalCostToday) / totalSalesToday) * 100 : 0;

    return {
      totalSalesToday,
      trend,
      closedOrdersTodayCount: closedOrdersToday.length,
      activeTablesCount: (isRegionalView && !selectedShopId ? tables : tables.filter(t => t.shopId === selectedShopId)).filter(t => t.status === 'occupied').length,
      avgTicket,
      profitMargin
    };
  }, [orders, tables, selectedShopId, currentUser]);


  const handleLogout = () => {
    accountService.logout();
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  const handleAddArea = () => {
    const name = prompt("Nome do novo ambiente (Ex: Rooftop, Deck, Vip):");
    if (name && name.trim()) {
      const areaName = name.trim();
      setSelectedArea(areaName);
      alert(`Ambiente "${areaName}" criado! Agora você pode adicionar mesas nesta área.`);
    }
  };

  const accessibleShopIds = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'owner') return shops.map(s => s.id);
    if (currentUser.role === 'regional_manager') return currentUser.assignedShopIds;
    return currentUser.assignedShopIds || [];
  }, [currentUser, shops]);

  useEffect(() => {
    if (accessibleShopIds.length > 0 && (!selectedShopId || !accessibleShopIds.includes(selectedShopId))) {
      setSelectedShopId(accessibleShopIds[0]);
    }
  }, [accessibleShopIds, selectedShopId]);

  const currentPermissions = useMemo(() => 
    rolePermissions.find(p => p.role === currentUser?.role) || MOCK_PERMISSIONS.find(p => p.role === 'waiter')!
  , [currentUser, rolePermissions]);

  const canAccessView = (view: View) => currentPermissions.views.includes(view);
  const [serviceChargePercentage, setServiceChargePercentage] = useState<number>(10);
  const [taxPercentage, setTaxPercentage] = useState<number>(0);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inventoryLocation, setInventoryLocation] = useState<'FOH' | 'BOH'>('BOH');
  const [recountRequests, setRecountRequests] = useState<RecountRequest[]>([]);
  const [isRecountModalOpen, setIsRecountModalOpen] = useState(false);
  const [activeRecountItem, setActiveRecountItem] = useState<InventoryItem | null>(null);

  // Categories & Table Mgmt
  const [productCategories, setProductCategories] = useState(['Burgers', 'Bebidas', 'Acompanhamentos', 'Sobremesas']);
  const [inventoryCategories, setInventoryCategories] = useState(['Carnes', 'Panificados', 'Vegetais', 'Laticínios', 'Bebidas', 'Secos']);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isTableManagementMode, setIsTableManagementMode] = useState(false);
  const [isEditTableModalOpen, setIsEditTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  // Menu Management State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Inventory Modal State
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [editingInventoryItem, setEditingInventoryItem] = useState<InventoryItem | null>(null);


  const [isNotificationPaneOpen, setIsNotificationPaneOpen] = useState(false);

  // Company & Device Linking
  const [companySettings, setCompanySettings] = useState<CompanySettings>({ name: 'RestManager POS', cnpj: '', address: '' });
  const [isDeviceLinked, setIsDeviceLinked] = useState<boolean>(() => {
    return !!localStorage.getItem('rm_device_linked');
  });
  const [linkedDevices, setLinkedDevices] = useState<DeviceLink[]>([
    { id: 'dev-main', name: 'Painel Principal (Owner)', linkedAt: Date.now(), lastUsedAt: Date.now(), status: 'active' }
  ]);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkToken] = useState('RM-XYZ-99'); // Simulated company token

  useEffect(() => {
    // Mesh Network Listener
    meshNetwork.setOnSync((data) => {
      const { type, payload } = data;
      switch (type) {
        case 'table:update':
          setTables(prev => prev.map(t => t.id === payload.id ? { ...t, ...payload } : t));
          break;
        case 'order:update':
          setOrders(prev => {
            const exists = prev.find(o => o.id === payload.id);
            if (exists) return prev.map(o => o.id === payload.id ? { ...o, ...payload } : o);
            return [...prev, payload];
          });
          break;
        case 'inventory:update':
          setInventory(prev => prev.map(i => i.id === payload.id ? { ...i, ...payload } : i));
          break;
        case 'notification:new':
          setNotifications(prev => [payload, ...prev]);
          break;
      }
    });
  }, []);

  // Sync state to IndexedDB when it changes - Disabled for Firebase mode
  useEffect(() => {
    // Legacy offline mode sync removed
  }, [orders, tables, inventory]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('linkToken');
    if (token === linkToken) {
      setIsDeviceLinked(true);
      localStorage.setItem('rm_device_linked', 'true');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [linkToken]);

  const handleLinkDevice = (token: string) => {
    if (token === linkToken) {
      setIsDeviceLinked(true);
      localStorage.setItem('rm_device_linked', 'true');
      return true;
    }
    return false;
  };
  // Reservations State
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  // Staff Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  // Permission Modal State
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [editingRolePermissions, setEditingRolePermissions] = useState<RolePermissions | null>(null);
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  // Schedule State
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(new Date());
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  
  // Custom colors for areas (default)
  const [areaColors, setAreaColors] = useState({
    FOH: '#3b82f6', // Blue
    BOH: '#f59e0b'  // Amber/Yellow
  });

  // Incident Reports State
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [newIncident, setNewIncident] = useState<Partial<IncidentReport>>({
    type: 'error',
    priority: 'medium',
    status: 'open'
  });

  // Modifiers State
  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);
  const [editingOrderItem, setEditingOrderItem] = useState<OrderItem | null>(null);
  const [modCustomName, setModCustomName] = useState('');
  const [modCustomPrice, setModCustomPrice] = useState('');
  const [modCustomRemove, setModCustomRemove] = useState('');

  const STANDARD_ALLERGIES = [
    'Amendoim', 'Glúten', 'Lactose', 'Frutos do Mar', 'Ovo', 'Soja', 'Nozes', 'Peixe', 'Trigo', 'Leite', 'Castanhas'
  ];

  // Safety Checklist State
  const [safetyLogs, setSafetyLogs] = useState<Record<string, Record<string, boolean>>>({}); // dateStr -> itemId -> status
  const [safetyTemplate, setSafetyTemplate] = useState([
    { id: 'boh_temp', category: 'boh', section: 'Segurança Alimentar', label: 'Controle de Temperatura', description: 'Registrar geladeiras/freezers (2x/dia) e cozimento (> 74°C).', enabled: true },
    { id: 'boh_cross', category: 'boh', section: 'Segurança Alimentar', label: 'Contaminação Cruzada', description: 'Tábuas coloridas para carnes, vegetais e cozidos.', enabled: true },
    { id: 'boh_fifo', category: 'boh', section: 'Segurança Alimentar', label: 'FIFO (PEPS)', description: 'Rotular e organizar por data de validade.', enabled: true },
    { id: 'boh_labels', category: 'boh', section: 'Segurança Alimentar', label: 'Etiquetagem de Fracionados', description: 'Garantir data de abertura e nova validade.', enabled: true },
    { id: 'boh_thaw', category: 'boh', section: 'Segurança Alimentar', label: 'Descongelamento Seguro', description: 'Apenas em refrigeração ou micro-ondas.', enabled: true },
    { id: 'boh_epi', category: 'boh', section: 'Segurança do Trabalho', label: 'EPIs Obrigatórios', description: 'Calçados antiderrapantes, aventais e toucas.', enabled: true },
    { id: 'boh_tools', category: 'boh', section: 'Segurança do Trabalho', label: 'Ferramentas', description: 'Faca afiadas e proteção térmica para fornos/fritadeiras.', enabled: true },
    { id: 'boh_electric', category: 'boh', section: 'Segurança do Trabalho', label: 'Segurança Elétrica', description: 'Evitar sobrecarga e desligar após uso.', enabled: true },
    { id: 'boh_gas', category: 'boh', section: 'Segurança do Trabalho', label: 'Vazamentos de Gás', description: 'Conferir conexões e fechar válvulas mestras.', enabled: true },
    { id: 'boh_floor', category: 'boh', section: 'Limpeza & Resíduos', label: 'Pisos e Placas', description: 'Limpeza constante com desengordurante e avisos.', enabled: true },
    { id: 'boh_maint', category: 'boh', section: 'Limpeza & Resíduos', label: 'Equipamentos', description: 'Limpeza diária de coifas, fogões e grelhas.', enabled: true },
    { id: 'boh_trash', category: 'boh', section: 'Limpeza & Resíduos', label: 'Gestão de Resíduos', description: 'Lixeiras com fechamento e pedal.', enabled: true },
    { id: 'boh_trap', category: 'boh', section: 'Limpeza & Resíduos', label: 'Caixa de Gordura', description: 'Verificar nível e limpeza periódica.', enabled: true },
    { id: 'foh_tables', category: 'foh', section: 'Higiene', label: 'Mobiliário', description: 'Sanitizar mesas e cadeiras entre clientes.', enabled: true },
    { id: 'foh_touch', category: 'foh', section: 'Higiene', label: 'Áreas de Alto Toque', description: 'Maçanetas, cardápios e máquinas de cartão.', enabled: true },
    { id: 'foh_wc', category: 'foh', section: 'Higiene', label: 'Banheiros', description: 'Limpeza e sanitização frequente (várias vezes/turno).', enabled: true },
    { id: 'foh_condiment', category: 'foh', section: 'Higiene', label: 'Galheteiros e Saleiros', description: 'Limpeza externa e reposição higiênica.', enabled: true },
    { id: 'foh_allergen', category: 'foh', section: 'Segurança', label: 'Gestão de Alergênicos', description: 'Treinar equipe para informar sobre ingredientes.', enabled: true },
    { id: 'foh_spills', category: 'foh', section: 'Segurança', label: 'Piso e Derramamentos', description: 'Limpeza imediata para evitar quedas.', enabled: true },
    { id: 'foh_fire', category: 'foh', section: 'Segurança', label: 'Saídas de Emergência', description: 'Desobstruídas e equipe treinada em extintores.', enabled: true },
    { id: 'foh_lighting', category: 'foh', section: 'Segurança', label: 'Iluminação', description: 'Garantir áreas de passagem bem iluminadas.', enabled: true },
    { id: 'open_temp', category: 'checklists', section: 'Abertura', label: 'Geladeiras e Freezers', description: 'Verificar temperatura de todos os equipamentos de frio.', enabled: true },
    { id: 'open_hygiene', category: 'checklists', section: 'Abertura', label: 'Equipe e Uniforme', description: 'Lavar as mãos na chegada e vestir uniforme limpo.', enabled: true },
    { id: 'open_pests', category: 'checklists', section: 'Abertura', label: 'Pragas', description: 'Conferir sinais de roedores ou insetos em áreas críticas.', enabled: true },
    { id: 'open_gas_valves', category: 'checklists', section: 'Abertura', label: 'Válvulas de Gás', description: 'Abrir registros e checar cheiro de gás.', enabled: true },
    { id: 'open_equip', category: 'checklists', section: 'Abertura', label: 'Ativação', description: 'Ligar equipamentos (fornos, pass, máquinas).', enabled: true },
    { id: 'open_stock_check', category: 'checklists', section: 'Abertura', label: 'Conferência de Estoque', description: 'Verificar itens críticos para o turno.', enabled: true },
    { id: 'close_food', category: 'checklists', section: 'Fechamento', label: 'Proteção de Alimentos', description: 'Guardar alimentos em recipientes fechados e etiquetados.', enabled: true },
    { id: 'close_cleaning', category: 'checklists', section: 'Fechamento', label: 'Cocção e Bancadas', description: 'Limpar e desengordurar fogões, grelhas e bancadas.', enabled: true },
    { id: 'close_dish', category: 'checklists', section: 'Fechamento', label: 'Dish Pit', description: 'Lavar e sanitizar a área da lava-louças.', enabled: true },
    { id: 'close_bins', category: 'checklists', section: 'Fechamento', label: 'Retirada de Lixo', description: 'Esvaziar todas as lixeiras e levar ao depósito externo.', enabled: true },
    { id: 'close_security', category: 'checklists', section: 'Fechamento', label: 'Segurança Patrimonial', description: 'Trancar portas, janelas e conferir alarmes.', enabled: true },
  ]);
  const [activeSafetyTab, setActiveSafetyTab] = useState<'boh' | 'foh' | 'checklists' | 'incidents' | 'config'>('boh');
  const [safetySelectedDate, setSafetySelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Undo Stack for Admin


  // Printer Management State
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [isQuickStockOpen, setIsQuickStockOpen] = useState(false);
  const [quickStockSector, setQuickStockSector] = useState<'kitchen' | 'bar' | null>(null);

  useEffect(() => {
    printerService.updatePrinters(printers);
  }, [printers]);

  // --- Handlers ---

  const handleOpenTable = async (table: Table) => {
    if (table.status === 'free' || table.status === 'reserved') {
      const waiterId = currentUser?.id || 'a1';
      const orderId = `ord-${Math.random().toString(36).substr(2, 9)}`;
      
      const orderData: Order = {
        id: orderId,
        enterpriseId: enterpriseId || 'local-ent',
        shopId: (selectedShopId || 'shop-1'),
        tableId: table.id,
        staffId: waiterId,
        items: [],
        status: 'pending',
        startTime: Date.now(),
        discount: 0,
        subtotal: 0,
        total: 0,
        orderType: 'table'
      };

      await firebaseService.saveItem('orders', orderId, orderData);
      await firebaseService.updateTableStatus(table.id, 'occupied', orderId);
      
      setSelectedTable({ ...table, status: 'occupied', currentOrderId: orderId });
      setCart([]);
      setCurrentView('orders');
    } else {
      setSelectedTable(table);
      const existingOrder = orders.find(o => o.tableId === table.id && o.status !== 'delivered');
      setCart(existingOrder ? existingOrder.items : []);
      setCurrentView('orders');
    }
  };

  const handlePrintToPrinter = async (type: Printer['type'], content: string) => {
    // Priority: 1. Local storage preference, 2. Global default
    const localPreferredId = localStorage.getItem(`rm_printer_${type}`);
    let printer = printers.find(p => p.id === localPreferredId);
    
    if (!printer) {
      printer = printerService.getDefaultPrinter(type);
    }

    if (!printer) {
      alert(`Nenhuma impressora configurada para: ${type}`);
      return;
    }

    setIsPrinting(true);
    try {
      const success = await printerService.print(printer.id, content);
      if (!success) alert(`Falha ao imprimir em: ${printer.name}`);
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar para impressora.");
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintReceipt = (order: Order) => {
    const table = tables.find(t => t.id === order.tableId);
    const staffMember = staff.find(s => s.id === order.staffId);
    const receiptContent = `
======= RestManager POS =======
Mesa: 0${table?.number || '??'}
Garçom: ${staffMember?.name || 'Sistema'}
Data: ${format(order.startTime, 'dd/MM/yyyy HH:mm')}
-------------------------------
${order.items.filter(i => i.status !== 'voided').map(i => `${i.quantity}x ${i.name}\n${formatCurrency((i.price + (i.modifiers || []).reduce((acc, m) => acc + (m.price || 0), 0)) * i.quantity)}`).join('\n')}
-------------------------------
Subtotal: \t${formatCurrency(order.subtotal)}
Serviço (10%): \t${formatCurrency(order.serviceFee || 0)}
Desconto: \t-${formatCurrency(order.discount)}
TOTAL: \t\t${formatCurrency(order.total)}
===============================
Obrigado pela preferência!
    `;
    handlePrintToPrinter('receipt', receiptContent);
  };

  const handleExportSalesToExcel = () => {
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    if (deliveredOrders.length === 0) {
      alert("Não há vendas finalizadas para exportar.");
      return;
    }

    const data = deliveredOrders.map(order => ({
      'ID Pedido': order.id.toUpperCase(),
      'Data': format(order.closedAt || order.startTime, 'dd/MM/yyyy HH:mm:ss'),
      'Mesa': tables.find(t => t.id === order.tableId)?.number || '??',
      'Atendente': staff.find(s => s.id === order.staffId)?.name || 'Sistema',
      'Itens': order.items.filter(i => i.status !== 'voided').map(i => `${i.quantity}x ${i.name}`).join(', '),
      'Subtotal': order.subtotal,
      'Serviço': order.serviceFee || 0,
      'Desconto': order.discount,
      'Total': order.total,
      'Método Pagamento': order.paymentMethod || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");

    // Generate buffer
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    
    // File name
    const fileName = `Relatorio_Vendas_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;

    // Sharing logic
    if (navigator.share) {
      const file = new File([blob], fileName, { type: blob.type });
      navigator.share({
        title: 'Relatório de Vendas RestManager',
        text: 'Segue em anexo o relatório de vendas em formato Excel.',
        files: [file],
      }).catch(console.error);
    } else {
      // Fallback to download
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const adjustInventory = async (items: OrderItem[], multiplier: number) => {
    try {
      await InventoryEngine.adjustStockRecursive(
        items.map(i => ({ ...i, id: i.productId })), // Engine expects product ID
        multiplier,
        enterpriseId || 'local-ent',
        selectedShopId || 'shop-1',
        inventory
      );
    } catch (error) {
      console.error("Failed to adjust inventory:", error);
      alert("Erro ao atualizar estoque. Verifique a conexão.");
    }
  };

  const handleAddToCart = (product: Product) => {

    const itemCost = calculateProductCost(product.id);
    const newItem: OrderItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      cost: itemCost,
      quantity: 1,
      status: 'pending',
      modifiers: []
    };
    setCart(prev => [...prev, newItem]);
    // Optional: open modifiers automatically for certain categories like Burger
    if (['Hambúrgueres', 'Burgers', 'Pratos Principais'].includes(product.category)) {
      setEditingOrderItem(newItem);
      setIsModifierModalOpen(true);
    }
  };

  const handleUpdateItemModifiers = (itemId: string, modifiers: ItemModifier[]) => {
    setCart(prev => prev.map(item => {
      if (item.id !== itemId) return item;

      const baseCost = calculateProductCost(item.productId);
      const modifierCostDelta = modifiers.reduce((acc, m) => {
        const invItem = inventory.find(i => 
          i.id === m.inventoryItemId || 
          i.name.toLowerCase().includes(m.name.toLowerCase()) || 
          m.name.toLowerCase().includes(i.name.toLowerCase())
        );
        if (!invItem) return acc;
        
        // Cost delta for modifiers
        const itemUsage = (products.find(p => p.id === item.productId)?.ingredients as any)?.[invItem.id] || 1;
        const costValue = (invItem.costPerUnit as number || 0) * itemUsage;

        if (m.type === 'extra') return acc + costValue;
        if (m.type === 'remove') return acc - costValue;
        return acc;
      }, 0);

      const newCost = Math.max(0, baseCost + modifierCostDelta);

      return { ...item, modifiers, cost: newCost };
    }));
  };

  const handleVoidOrderItem = async (orderId: string, itemId: string, reason: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const itemIndex = order.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;

    try {
      const updatedOrder = await OrderEngine.voidItem(
        order,
        itemIndex,
        reason,
        { id: currentUser?.id || 'sys', name: currentUser?.name || 'Sistema' },
        { enterpriseId: enterpriseId || 'local-ent', shopId: selectedShopId || 'shop-1', inventory }
      );

      // Update local cart if it's the active table
      if (selectedTable && order.tableId === selectedTable.id) {
        setCart(updatedOrder.items);
      }
    } catch (err) {
      console.error('Failed to void item:', err);
      alert('Erro ao cancelar item. Tente novamente.');
    }
  };

  const handleRemoveFromCart = async (itemId: string) => {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;

    if (item.status !== 'pending') {
      if (!currentPermissions.actions.canVoid) {
        alert("Você não tem permissão para cancelar itens já enviados.");
        return;
      }
      
      const activeOrder = orders.find(o => o.tableId === selectedTable?.id && o.status !== 'delivered');
      if (!activeOrder) return;

      const reason = prompt("Motivo do cancelamento (Void):");
      if (!reason) return;

      await handleVoidOrderItem(activeOrder.id, itemId, reason);
    } else {
      setCart(prev => prev.filter(i => i.id !== itemId));
    }
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        if (item.status !== 'pending') return item; // Cannot change quantity once sent
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    const newItems = cart.filter(i => i.status === 'pending');
    if (newItems.length === 0) return;

    const waiterId = currentUser?.id || 'a1';
    const isTakeaway = !selectedTable;
    
    let orderId: string;
    let existingOrder: Order | undefined;
    let nextTakeawayNumber = 0;

    if (isTakeaway) {
      const today = startOfDay(new Date()).getTime();
      const todayTakeaways = orders.filter(o => o.orderType === 'takeaway' && o.startTime >= today);
      nextTakeawayNumber = todayTakeaways.length + 1;
      orderId = `take-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    } else {
      existingOrder = orders.find(o => (o.tableId === selectedTable.id || o.tableId === selectedTable.number.toString()) && o.status !== 'delivered' && o.status !== 'cancelled');
      orderId = existingOrder?.id || `ord-${Math.random().toString(36).substr(2, 9)}`;
    }

    const updatedCart = cart.map(i => i.status === 'pending' ? { 
      ...i, 
      status: (systemMode === 'distributor' ? 'delivered' : 'preparing') as ItemStatus, 
      sentToKitchen: true 
    } : i);

    const { subtotal, serviceFee, tax, discount, total: finalTotal, totalCost } = calculateOrderTotals(updatedCart, existingOrder?.discount || 0, isTakeaway, { serviceCharge: serviceChargePercentage, taxRate: taxPercentage });

    const orderData: Order = {
      id: orderId,
      enterpriseId: enterpriseId || 'local-ent',
      shopId: (selectedShopId || 'shop-1'),
      tableId: isTakeaway ? 'takeaway' : selectedTable.id,
      staffId: waiterId,
      items: updatedCart,
      status: (systemMode === 'distributor' ? 'delivered' : 'preparing') as OrderStatus,
      startTime: existingOrder?.startTime || Date.now(),
      closedAt: systemMode === 'distributor' ? Date.now() : undefined,
      discount,
      subtotal,
      serviceFee,
      tax,
      total: finalTotal,
      totalCost,
      orderType: isTakeaway ? 'takeaway' : 'table',
      takeawayNumber: isTakeaway ? nextTakeawayNumber : undefined
    };

    await firebaseService.saveItem('orders', orderId, orderData);
    if (!isTakeaway) {
      await firebaseService.updateTableStatus(selectedTable.id, 'occupied', orderId);
    }

    // Update Inventory Stock based on ingredients and modifiers
    await adjustInventory(newItems, -1);

    // Notifications
    const barCategories = ['Bebidas', 'Bar', 'FOH'];
    const tableIdVal = isTakeaway ? 'takeaway' : selectedTable?.id;
    const tableNumDisplay = isTakeaway ? `Takeaway #${nextTakeawayNumber}` : `Mesa 0${selectedTable?.number}`;
    
    if (newItems.some(i => !barCategories.includes(i.category))) {
      await firebaseService.addItem('notifications', {
        shopId: (selectedShopId || 'shop-1'),
        message: `🍗 Cozinha: Novo Pedido ${tableNumDisplay}`,
        type: 'new_order_kitchen',
        tableId: tableIdVal,
        timestamp: Date.now(),
        read: false
      });
    }
    if (newItems.some(i => barCategories.includes(i.category))) {
      await firebaseService.addItem('notifications', {
        shopId: (selectedShopId || 'shop-1'),
        message: `🍹 Bar: Novo Pedido ${tableNumDisplay}`,
        type: 'new_order_bar',
        tableId: tableIdVal,
        timestamp: Date.now(),
        read: false
      });
    }

    if (isTakeaway) {
       alert(`Pedido Takeaway #${nextTakeawayNumber} enviado para a cozinha!`);
       setCart([]); 
    } else {
       setCart(updatedCart);
       setCurrentView('tables');
       setSelectedTable(null);
    }
  };

  const handleApplyDiscount = async (amount: number) => {
    if (!selectedTable || !currentPermissions.actions.canDiscount) return;
    const order = orders.find(o => o.tableId === selectedTable.id && o.status !== 'delivered' && o.status !== 'cancelled');
    if (!order) return;
    
    const { subtotal, serviceFee, tax, discount, total, totalCost } = calculateOrderTotals(order.items, amount, order.orderType === 'takeaway', { serviceCharge: serviceChargePercentage, taxRate: taxPercentage });
    await firebaseService.updateItem('orders', order.id, { subtotal, serviceFee, tax, discount, total, totalCost });
  };

  const handleReopenTable = async (orderId: string) => {
    if (!currentPermissions.actions.canReopenTable) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    await firebaseService.updateItem('orders', orderId, { status: 'preparing', closedAt: null });
    await firebaseService.updateItem('tables', order.tableId, { status: 'occupied', currentOrderId: orderId });
    setCurrentView('tables');
  };

  const handleFinishTable = (tableId: string) => {
    const order = orders.find(o => o.tableId === tableId && o.status !== 'delivered');
    if (!order) return;

    paymentService.requestPaymentUI({
      total: order.total,
      orderId: order.id,
      title: `Mesa ${tables.find(t => t.id === tableId)?.number || ''}`,
      itemsSummary: `${order.items.length} itens`,
      module: 'restaurant',
      onSuccess: async (payments) => {
        const isDistributor = systemMode === 'distributor';
        const shouldSendToKitchen = order.orderType === 'takeaway' && order.status === 'pending' && !isDistributor;
        
        const updatedItems = order.items.map(item => {
          if (isDistributor) return { ...item, status: 'delivered' as ItemStatus, sentToKitchen: true };
          if (shouldSendToKitchen && item.status === 'pending') {
            return { ...item, status: 'preparing' as ItemStatus, sentToKitchen: true };
          }
          return item;
        });

        const currentPayments = order.payments || [];
        const allPayments = [...currentPayments, ...payments];
        const totalPaidSoFar = allPayments.reduce((sum, p) => sum + (p.amount - (p.change || 0)), 0);
        const isFullyPaid = totalPaidSoFar >= (order.total - 0.01);

        const { totalCost: updatedTotalCost } = calculateOrderTotals(updatedItems, order.discount, order.orderType === 'takeaway', { serviceCharge: serviceChargePercentage, taxRate: taxPercentage });

        const updates = {
          items: updatedItems,
          status: (isFullyPaid ? (isDistributor ? 'delivered' : (shouldSendToKitchen ? 'preparing' : 'delivered')) : order.status) as OrderStatus,
          closedAt: isFullyPaid ? Date.now() : undefined,
          paymentMethod: (allPayments.length > 1 ? 'split' : allPayments[0].method) as any,
          payments: allPayments,
          totalCost: updatedTotalCost
        };

        await firebaseService.updateItem('orders', order.id, updates);
        if (isFullyPaid && order.tableId && order.tableId !== 'takeaway') {
          await firebaseService.updateTableStatus(order.tableId, 'free');
        }

        const tableNum = order.orderType === 'takeaway' ? `Takeaway #${order.takeawayNumber}` : tables.find(t => t.id === order.tableId)?.number || '';
        const openedStaff = staff.find(s => s.id === order.staffId)?.name || 'Sistema';

        for (const p of payments) {
          await paymentService.processPayment({
            orderId: order.id,
            amount: p.amount,
            method: p.method as any,
            module: 'restaurant',
            shopId: order.shopId,
            change: p.change,
            tableNumber: tableNum,
            openedBy: openedStaff
          });
        }
        
        if (isFullyPaid) {
          setSelectedTable(null);
          setCart([]);
        } else {
          alert(`Pagamento Parcial Registrado! Faltam ${formatCurrency(order.total - totalPaidSoFar)}`);
        }
      }
    });
  };

  const handleCancelTable = async (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    const order = orders.find(o => o.tableId === tableId && o.status !== 'delivered' && o.status !== 'cancelled');
    
    if (!table) return;

    const hasSentItems = (order?.items || []).some(i => i.sentToKitchen && i.status !== 'voided');

    if (!hasSentItems) {
      // "se vc ainda nao mandou o pedido a mesa simplesmente apaga os pedido e volta para a tela de mesas"
      if (order) {
        await firebaseService.updateItem('orders', order.id, { status: 'cancelled' });
      }
      await firebaseService.updateTableStatus(tableId, 'free', null);
      setSelectedTable(null);
      setCart([]);
      setCurrentView('tables');
      return;
    }

    // "se o cliente desistiu cancelar mesa com 2 confirmação"
    if (confirm("⚠️ Esta mesa já possui itens enviados para a cozinha. Deseja realmente CANCELAR toda a conta?")) {
      if (confirm("❗ CONFIRMAÇÃO FINAL: Todos os itens serão invalidados e a mesa será liberada. Deseja prosseguir?")) {
        const voidReason = "Cancelamento Total (Desistência)";
        const itemsToVoid = (order?.items || []).filter(i => i.status !== 'voided');
        
        const updatedItems = (order?.items || []).map(item => ({
          ...item,
          status: 'voided' as ItemStatus,
          voidReason
        }));

        if (order) {
          // Return stock for all items that were deducted (sentToKitchen)
          const deductedItems = itemsToVoid.filter(i => i.sentToKitchen);
          if (deductedItems.length > 0) {
            await adjustInventory(deductedItems, 1);
          }

          await firebaseService.updateItem('orders', order.id, { status: 'cancelled', items: updatedItems });
          await firebaseService.updateTableStatus(tableId, 'free', null);

          await firebaseService.addAuditLog({
            enterpriseId: enterpriseId || 'local-ent',
            shopId: (selectedShopId || 'shop-1'),
            staffId: currentUser?.id || 'sys',
            staffName: currentUser?.name || 'Sistema',
            action: 'CANCEL_TABLE',
            details: `Mesa ${table.number} cancelada totalmente. Itens invalidados: ${itemsToVoid.length}`,
            referenceId: order.id
          });
        }
        setSelectedTable(null);
        setCart([]);
        setCurrentView('tables');
      }
    }

  };

  const handleQuickCheckout = async () => {
    if (cart.length === 0) return;
    
    const waiterId = currentUser?.id || 'a1';
    const orderId = `take-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    const today = startOfDay(new Date()).getTime();
    const todayTakeaways = orders.filter(o => o.orderType === 'takeaway' && o.startTime >= today);
    const nextNumber = todayTakeaways.length + 1;

    const { subtotal, serviceFee, tax, discount, total, totalCost } = calculateOrderTotals(cart, 0, true, { serviceCharge: serviceChargePercentage, taxRate: taxPercentage });

    // Initial status 'pending' - hidden from kitchen until pay
    const newOrder: Order = {
      id: orderId,
      enterpriseId: enterpriseId || 'local-ent',
      shopId: (selectedShopId || 'shop-1'),
      tableId: 'takeaway',
      staffId: waiterId,
      items: cart.map(i => ({ ...i, status: 'pending', sentToKitchen: false })),
      status: 'pending',
      startTime: Date.now(),
      discount,
      subtotal,
      serviceFee,
      tax,
      total,
      totalCost,
      orderType: 'takeaway',
      takeawayNumber: nextNumber
    };

    await firebaseService.saveItem('orders', orderId, newOrder);
    
    paymentService.requestPaymentUI({
      total: total,
      orderId: orderId,
      title: `Takeaway #${nextNumber}`,
      itemsSummary: `${cart.length} itens`,
      module: 'restaurant',
      onSuccess: async (payments) => {
        // Reuse the same finalization logic
        const isDistributor = systemMode === 'distributor';
        const shouldSendToKitchen = !isDistributor; // Takeaway always needs kitchen if not distributor
        
        const updatedItems = newOrder.items.map(item => {
          if (isDistributor) return { ...item, status: 'delivered' as ItemStatus, sentToKitchen: true };
          if (shouldSendToKitchen && item.status === 'pending') {
            return { ...item, status: 'preparing' as ItemStatus, sentToKitchen: true };
          }
          return item;
        });

        const allPayments = payments;
        const totalPaidSoFar = allPayments.reduce((sum, p) => sum + (p.amount - (p.change || 0)), 0);
        const isFullyPaid = totalPaidSoFar >= (total - 0.01);

        const { totalCost: updatedTotalCost } = calculateOrderTotals(updatedItems, discount, true, { serviceCharge: serviceChargePercentage, taxRate: taxPercentage });

        const updates = {
          items: updatedItems,
          status: (isFullyPaid ? (isDistributor ? 'delivered' : (shouldSendToKitchen ? 'preparing' : 'delivered')) : newOrder.status) as OrderStatus,
          closedAt: isFullyPaid ? Date.now() : undefined,
          paymentMethod: (allPayments.length > 1 ? 'split' : allPayments[0].method) as any,
          payments: allPayments,
          totalCost: updatedTotalCost
        };

        await firebaseService.updateItem('orders', orderId, updates);

        // Deduct stock for takeaway items once paid/confirmed
        if (isFullyPaid || shouldSendToKitchen) {
          await adjustInventory(cart, -1);
        }

        const tableNum = `Takeaway #${nextNumber}`;
        const openedStaff = currentUser?.name || 'Sistema';

        for (const p of payments) {
          await paymentService.processPayment({
            orderId: orderId,
            amount: p.amount,
            method: p.method as any,
            module: 'restaurant',
            shopId: newOrder.shopId,
            change: p.change,
            tableNumber: tableNum,
            openedBy: openedStaff
          });
        }
        
        if (isFullyPaid) {
          setSelectedTable(null);
          setCart([]);
        } else {
          alert(`Pagamento Parcial Registrado! Faltam ${formatCurrency(total - totalPaidSoFar)}`);
        }
      }
    });
  };

  const handleOpenPaymentModal = (order: Order) => {
    paymentService.requestPaymentUI({
      total: order.total,
      orderId: order.id,
      title: order.orderType === 'takeaway' ? `Takeaway #${order.takeawayNumber}` : `Mesa ${tables.find(t => t.id === order.tableId)?.number || ''}`,
      itemsSummary: `${order.items.length} itens`,
      module: 'restaurant',
      onSuccess: async (payments) => {
        const isDistributor = systemMode === 'distributor';
        const shouldSendToKitchen = order.orderType === 'takeaway' && order.status === 'pending' && !isDistributor;
        
        const updatedItems = order.items.map(item => {
          if (isDistributor) return { ...item, status: 'delivered' as ItemStatus, sentToKitchen: true };
          if (shouldSendToKitchen && item.status === 'pending') {
            return { ...item, status: 'preparing' as ItemStatus, sentToKitchen: true };
          }
          return item;
        });

        const currentPayments = order.payments || [];
        const allPayments = [...currentPayments, ...payments];
        const totalPaidSoFar = allPayments.reduce((sum, p) => sum + (p.amount - (p.change || 0)), 0);
        const isFullyPaid = totalPaidSoFar >= (order.total - 0.01);

        const { totalCost: updatedTotalCost } = calculateOrderTotals(updatedItems, order.discount, order.orderType === 'takeaway', { serviceCharge: serviceChargePercentage, taxRate: taxPercentage });

        const updates = {
          items: updatedItems,
          status: (isFullyPaid ? (isDistributor ? 'delivered' : (shouldSendToKitchen ? 'preparing' : 'delivered')) : order.status) as OrderStatus,
          closedAt: isFullyPaid ? Date.now() : undefined,
          paymentMethod: (allPayments.length > 1 ? 'split' : allPayments[0].method) as any,
          payments: allPayments,
          totalCost: updatedTotalCost
        };

        await firebaseService.updateItem('orders', order.id, updates);

        // Deduct stock if this is a takeaway transitioning from pending
        if (order.orderType === 'takeaway' && order.status === 'pending' && (isFullyPaid || shouldSendToKitchen)) {
          await adjustInventory(order.items, -1);
        }

        if (isFullyPaid && order.tableId && order.tableId !== 'takeaway') {
          await firebaseService.updateTableStatus(order.tableId, 'free');
        }

        const tableNum = order.orderType === 'takeaway' ? `Takeaway #${order.takeawayNumber}` : tables.find(t => t.id === order.tableId)?.number || '';
        const openedStaff = staff.find(s => s.id === order.staffId)?.name || 'Sistema';

        for (const p of payments) {
          await paymentService.processPayment({
            orderId: order.id,
            amount: p.amount,
            method: p.method as any,
            module: 'restaurant',
            shopId: order.shopId,
            change: p.change,
            tableNumber: tableNum,
            openedBy: openedStaff
          });
        }
        
        if (isFullyPaid) {
          setSelectedTable(null);
          setCart([]);
        } else {
          alert(`Pagamento Parcial Registrado! Faltam ${formatCurrency(order.total - totalPaidSoFar)}`);
        }
      }
    });
  };

  const handleRoleCycle = () => {
    handleLogout();
  };
  const handleSaveProduct = async (product: Partial<Product>) => {
    if (editingProduct) {
      await firebaseService.updateItem('products', editingProduct.id, product);
    } else {
      const id = Math.random().toString(36).substr(2, 9);
      const newProduct: Product = {
        id,
        enterpriseId: enterpriseId!,
        shopId: (selectedShopId || 'shop-1'),
        name: product.name || '',
        price: product.price || 0,
        category: product.category || 'Geral',
        active: true,
        ...product
      } as Product;
      await firebaseService.saveItem('products', id, newProduct);
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleSaveInventory = async (item: Partial<InventoryItem>) => {
    if (editingInventoryItem) {
      await firebaseService.updateItem('inventory', editingInventoryItem.id, item);
    } else {
      const id = Math.random().toString(36).substr(2, 9);
      const newItem: InventoryItem = {
        id,
        enterpriseId: enterpriseId!,
        shopId: (selectedShopId || 'shop-1'),
        name: item.name || '',
        category: item.category || 'Geral',
        unit: item.unit || 'unid',
        currentStock: item.currentStock || 0,
        minStock: item.minStock || 0,
        ...item
      } as InventoryItem;
      await firebaseService.saveItem('inventory', id, newItem);
    }
    setIsInventoryModalOpen(false);
    setEditingInventoryItem(null);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Remover este produto permanentemente?")) {
      await firebaseService.deleteItem('products', id);
    }
  };

  const handleRecountSubmit = async (itemId: string, itemName: string, prevStock: number, newStock: number, comment: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newRequest: RecountRequest = {
      id,
      shopId: (selectedShopId || 'shop-1'),
      itemId,
      itemName,
      previousStock: prevStock,
      newStock,
      comment,
      date: Date.now(),
      status: 'pending'
    };
    await firebaseService.saveItem('recountRequests', id, newRequest);
    setIsRecountModalOpen(false);
    setActiveRecountItem(null);
  };

  const calculateProductCost = (productId: string): number => {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    
    let baseCost = 0;

    // 1. Ingredients Cost
    if (product.ingredients) {
      baseCost += Object.entries(product.ingredients).reduce((acc: number, [ingredientId, usage]: [string, number]) => {
        const ingredient = inventory.find(i => i.id === ingredientId);
        if (!ingredient) return acc;
        const effectiveUsage = (usage as number) / (ingredient.yieldFactor || 1);
        return acc + (ingredient.costPerUnit || 0) * effectiveUsage;
      }, 0);
    }

    // 2. Composition Cost (Recursive)
    if (product.composition) {
      baseCost += product.composition.reduce((acc, comp) => {
        return acc + (calculateProductCost(comp.productId) * comp.quantity);
      }, 0);
    }

    const wastage = product.wastageMargin || 0;
    return baseCost * (1 + wastage / 100);
  };

  const handleAddTable = async (capacity: number) => {
    const id = `t${Date.now()}`;
    const tablesInThisArea = tables.filter(t => (t.area || 'Salão Principal') === selectedArea && t.shopId === (selectedShopId || 'shop-1'));
    
    // Grid: 5 columns
    const x = (tablesInThisArea.length % 5) * 160 + 80;
    const y = Math.floor(tablesInThisArea.length / 5) * 140 + 80;

    const newTable: Table = {
      id,
      enterpriseId: enterpriseId || 'local-ent',
      shopId: (selectedShopId || 'shop-1'),
      number: tables.filter(t => t.shopId === (selectedShopId || 'shop-1')).length + 1,
      status: 'free',
      capacity,
      position: { x, y },
      area: selectedArea
    };

    await firebaseService.saveItem('tables', id, newTable);
  };

  const handleRemoveTable = async (id: string) => {
    if (orders.find(o => o.tableId === id && o.status !== 'delivered')) {
      alert("Não é possível remover uma mesa com pedidos ativos.");
      return;
    }
    await firebaseService.deleteItem('tables', id);
  };

  const handleSaveReservation = async (res: Partial<Reservation>) => {
    if (editingReservation) {
      await firebaseService.updateItem('reservations', editingReservation.id, res);
    } else {
      const id = `res${Date.now()}`;
      const newRes: Reservation = {
        ...res,
        id,
        enterpriseId: enterpriseId!,
        shopId: (selectedShopId || 'shop-1'),
        status: res.status || 'pending'
      } as Reservation;
      await firebaseService.saveItem('reservations', id, newRes);
    }
    setIsReservationModalOpen(false);
    setEditingReservation(null);
  };

  const handleCreateIncident = async () => {
    if (!newIncident.title || !newIncident.description) return;
    
    const report: IncidentReport = {
      id: 'inc-' + Date.now(),
      shopId: (selectedShopId || 'shop-1'),
      type: (newIncident.type as IncidentType) || 'error',
      title: newIncident.title,
      description: newIncident.description,
      reporterId: currentUser?.id || 'guest',
      reporterName: currentUser?.name || 'Sistema',
      status: 'open',
      priority: newIncident.priority || 'medium',
      timestamp: Date.now(),
      location: newIncident.location,
      enterpriseId: enterpriseId!
    } as any;

    await firebaseService.saveItem('incidentReports', report.id, report);
    setIsIncidentModalOpen(false);
    setNewIncident({ type: 'error', priority: 'medium', status: 'open' });
  };

  const handleDeleteReservation = async (id: string) => {
    if (confirm("Cancelar esta reserva?")) {
      await firebaseService.updateItem('reservations', id, { status: 'cancelled' });
    }
  };

  const handleSaveStaff = async (staffData: Partial<Staff>) => {
    let staffId = editingStaff?.id;
    if (editingStaff) {
      await firebaseService.updateItem('staff', editingStaff.id, { ...staffData, enterpriseId });
    } else {
      staffId = `u${Math.random().toString(36).substr(2, 9)}`;
      const newStaff: Staff = {
        id: staffId,
        enterpriseId: enterpriseId!,
        active: true,
        assignedShopIds: staffData.assignedShopIds || [(selectedShopId || 'shop-1')],
        ...staffData
      } as Staff;
      await firebaseService.saveItem('staff', staffId, newStaff);
    }

    // Sync tables if it's a waiter
    const finalStaffId = staffId || editingStaff?.id;
    if (finalStaffId && staffData.role === 'waiter' && staffData.assignedTableIds) {
      // Clear old assignments for this staff
      const oldTables = tables.filter(t => t.waiterId === finalStaffId);
      for (const t of oldTables) {
        if (!staffData.assignedTableIds.includes(t.id)) {
          await firebaseService.updateItem('tables', t.id, { waiterId: null });
        }
      }
      // Set new assignments
      for (const tid of staffData.assignedTableIds) {
        await firebaseService.updateItem('tables', tid, { waiterId: finalStaffId });
      }
    } else if (finalStaffId && staffData.role !== 'waiter') {
      // Clear all assignments if role changed from waiter
      const oldTables = tables.filter(t => t.waiterId === finalStaffId);
      for (const t of oldTables) {
        await firebaseService.updateItem('tables', t.id, { waiterId: null });
      }
    }

    setIsStaffModalOpen(false);
    setEditingStaff(null);
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (confirm("Tem certeza que deseja remover este funcionário?")) {
      // Clear table assignments first
      const assignedTables = tables.filter(t => t.waiterId === staffId);
      for (const t of assignedTables) {
         await firebaseService.updateItem('tables', t.id, { waiterId: null });
      }
      await firebaseService.deleteItem('staff', staffId);
    }
  };

  const handleUpdatePermissions = async (updatedPerm: RolePermissions) => {
    await firebaseService.saveItem('rolePermissions', updatedPerm.role, updatedPerm);
  };

  const handleSaveShift = async (shiftData: Partial<Shift>) => {
    if (editingShift) {
      await firebaseService.updateItem('shifts', editingShift.id, shiftData);
    } else {
      const id = `s${Date.now()}`;
      const newShift: Shift = {
        id,
        shopId: (selectedShopId || 'shop-1'),
        ...shiftData
      } as Shift;
      await firebaseService.saveItem('shifts', id, newShift);
    }
    setIsShiftModalOpen(false);
    setEditingShift(null);
  };

  const handleDeleteShift = async (id: string) => {
    if (confirm("Remover escala?")) {
      await firebaseService.deleteItem('shifts', id);
    }
  };

  const handleAddCategory = (type: 'product' | 'inventory', category: string) => {
    if (type === 'product') setProductCategories(prev => [...new Set([...prev, category])]);
    else setInventoryCategories(prev => [...new Set([...prev, category])]);
  };



  const handleOrderStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = newStatus === 'ready' 
      ? order.items.map(i => ({ ...i, status: 'ready' as ItemStatus }))
      : order.items;

    await firebaseService.updateItem('orders', orderId, { 
      status: newStatus, 
      items: updatedItems 
    });
    
    if (newStatus === 'ready') {
      const table = tables.find(t => t.id === order.tableId);
      if (table) {
        await firebaseService.updateItem('tables', table.id, { hasReadyItems: true });
        await firebaseService.addItem('notifications', {
          shopId: (selectedShopId || 'shop-1'),
          message: `🔔 Pedido pronto para a Mesa 0${table.number}`,
          type: 'order_ready_kitchen',
          tableId: table.id,
          timestamp: Date.now(),
          read: false
        });
      }
    }

    if (newStatus === 'delivered') {
      await firebaseService.updateItem('tables', order.tableId, { hasReadyItems: false });
    }
  };

  const handleAcceptItems = async (orderId: string, isBar: boolean) => {
    const barCategories = ['Bebidas', 'Bar', 'FOH'];
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = order.items.map(item => {
      const isItemBar = barCategories.includes(item.category);
      if (((isBar && isItemBar) || (!isBar && !isItemBar)) && item.status === 'pending') {
        return { ...item, status: 'preparing' as ItemStatus };
      }
      return item;
    });

    await firebaseService.updateItem('orders', orderId, { 
      items: updatedItems, 
      status: 'preparing' 
    });
  };

  const handleMarkItemsReady = async (orderId: string, isBar: boolean) => {
    const barCategories = ['Bebidas', 'Bar', 'FOH'];
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = order.items.map(item => {
      const isItemBar = barCategories.includes(item.category);
      if (((isBar && isItemBar) || (!isBar && !isItemBar)) && item.status === 'preparing') {
        return { ...item, status: 'ready' as ItemStatus };
      }
      return item;
    });

    const anyReady = updatedItems.some(i => i.status === 'ready');
    const allGlobalReady = updatedItems.every(i => i.status === 'ready' || i.status === 'delivered' || i.status === 'voided');

    // If it's already paid (takeaway mostly), mark as delivered once ready
    let targetStatus: OrderStatus = order.status;
    if (allGlobalReady) {
       targetStatus = order.closedAt ? 'delivered' : 'ready';
    }

    await firebaseService.updateItem('orders', orderId, { 
      items: updatedItems, 
      status: targetStatus 
    });

    const table = tables.find(t => t.id === order.tableId);
    if (anyReady && order.tableId !== 'takeaway') {
      await firebaseService.updateItem('tables', order.tableId, { hasReadyItems: true });
    }

    await firebaseService.addItem('notifications', {
      shopId: (selectedShopId || 'shop-1'),
      message: `${isBar ? '🍹 Drink' : '🍳 Prato'} pronto: ${order.orderType === 'takeaway' ? `Takeaway #${order.takeawayNumber}` : `Mesa 0${table?.number}`}`,
      type: isBar ? 'order_ready_bar' : 'order_ready_kitchen',
      tableId: order.tableId,
      timestamp: Date.now(),
      read: false
    });
  };



  const handleDeliverItem = async (orderId: string, itemId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = order.items.map(i => i.id === itemId ? { ...i, status: 'delivered' as ItemStatus } : i);
    const allDelivered = updatedItems.every(i => i.status === 'delivered' || i.status === 'voided');

    await firebaseService.updateItem('orders', orderId, {
      items: updatedItems,
      status: allDelivered ? 'delivered' : order.status
    });

    if (allDelivered && order.tableId !== 'takeaway') {
      // We only clear the ready flag. The table remains occupied until payment.
      await firebaseService.updateItem('tables', order.tableId, { hasReadyItems: false });
    }
  };
  const handleDeliverOrder = (orderId: string) => {
    handleOrderStatusChange(orderId, 'delivered');
  };

  const markNotificationAsRead = async (id: string) => {
    // Optimistic local update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    // Persist to Firebase
    await firebaseService.updateItem('notifications', id, { read: true });
  };

  const handleClearNotifications = async () => {
    const toDelete = [...notifications];
    setNotifications([]); // Optimistic clear
    for (const notif of toDelete) {
      await firebaseService.deleteItem('notifications', notif.id);
    }
  };

  // --- Sub-views ---


  const handleUpdateTable = async (tableId: string, updates: Partial<Table>) => {
    await firebaseService.updateItem('tables', tableId, updates);
  };

  const renderTableEditModal = () => {
    if (!editingTable) return null;

    return (
      <AnimatePresence>
        {isEditTableModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                      <TableIcon className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Editar Mesa {editingTable.number}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configurações e Localização</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsEditTableModalOpen(false)} 
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Fechar Modal"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edit-table-number" className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Número da Mesa</label>
                      <input
                        id="edit-table-number"
                        type="number"
                        value={editingTable.number}
                        onChange={(e) => setEditingTable({ ...editingTable, number: parseInt(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        title="Número da Mesa"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-table-capacity" className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Capacidade (Pessoas)</label>
                      <input
                        id="edit-table-capacity"
                        type="number"
                        value={editingTable.capacity}
                        onChange={(e) => setEditingTable({ ...editingTable, capacity: parseInt(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        title="Capacidade da Mesa"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="edit-table-area" className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Área / Ambiente</label>
                    <select
                      id="edit-table-area"
                      value={editingTable.area || 'Salão Principal'}
                      onChange={(e) => setEditingTable({ ...editingTable, area: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none"
                      title="Área da Mesa"
                    >
                      {Array.from(new Set(tables.map(t => t.area || 'Salão Principal'))).map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={async () => {
                        await handleUpdateTable(editingTable.id, {
                          number: editingTable.number,
                          capacity: editingTable.capacity,
                          area: editingTable.area
                        });
                        setIsEditTableModalOpen(false);
                      }}
                      className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-500 transition-all shadow-xl shadow-slate-900/20"
                    >
                      Salvar Alterações
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir a mesa ${editingTable.number}?`)) {
                          handleRemoveTable(editingTable.id);
                          setIsEditTableModalOpen(false);
                        }
                      }}
                      className="w-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                      title="Excluir Mesa"
                      aria-label="Excluir"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  const handleAssignTable = async (table: Table) => {
    if (table.status === 'occupied') {
       const existingOrder = orders.find(o => o.tableId === table.id && o.status !== 'delivered');
       if (existingOrder) {
          if (cart.length > 0 && confirm("Esta mesa já tem um pedido ativo. Deseja mesclar seu carrinho atual com o pedido da mesa?")) {
             const mergedItems = [...existingOrder.items, ...cart.map(i => ({ ...i, sentToKitchen: false }))];
             await firebaseService.updateItem('orders', existingOrder.id, { items: mergedItems });
             setCart(mergedItems);
          } else {
             setCart(existingOrder.items);
          }
       }
    } else {
       // Create order for free table
       const waiterId = currentUser?.id || 'a1';
       const orderId = `ord-${Math.random().toString(36).substr(2, 9)}`;
       const newOrder: Order = {
         id: orderId,
         enterpriseId: enterpriseId!,
         shopId: (selectedShopId || 'shop-1'),
         tableId: table.id,
         staffId: waiterId,
         items: cart,
         status: 'pending',
         startTime: Date.now(),
         discount: 0,
         subtotal: 0,
         total: 0
       };
       await firebaseService.saveItem('orders', orderId, newOrder);
       await firebaseService.updateTableStatus(table.id, 'occupied', orderId);
    }
    setSelectedTable(table);
  };

      </div>
    );
  };

  const renderInventory = () => {
    const filteredInventory = inventory.filter(i => 
      i.location === inventoryLocation && 
      (searchQuery ? (i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.category.toLowerCase().includes(searchQuery.toLowerCase())) : true)
    );

    return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Controle de Estoque</h2>
          <p className="text-sm text-slate-500">Monitoramento em tempo real de insumos</p>
        </div>
        <div className="flex-1 max-w-xs mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input 
              type="text"
              placeholder="Filtrar por nome ou categoria..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm mr-4">
          <button 
            onClick={() => setInventoryLocation('BOH')}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-all",
              inventoryLocation === 'BOH' ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-600"
            )}
          >
            BOH (Cozinha)
          </button>
          <button 
            onClick={() => setInventoryLocation('FOH')}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-all",
              inventoryLocation === 'FOH' ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-600"
            )}
          >
            FOH (Salão)
          </button>
        </div>
        {currentUser?.role === 'admin' && (
          <button 
            onClick={() => { setEditingInventoryItem(null); setIsInventoryModalOpen(true); }}
            className="bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Insumo
          </button>
        )}
      </div>

      <div className="sleek-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-left border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Insumo</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Atual</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Custo Ref.</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Vlr. Total</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredInventory.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                   <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px]",
                      item.location === 'BOH' ? "bg-blue-50 text-blue-500" : "bg-amber-50 text-amber-500"
                    )}>{item.location}</div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm leading-tight">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{item.category}</p>
                    </div>
                   </div>
                </td>
                <td className="px-6 py-4">
                  {item.currentStock < item.minStock ? (
                    <span className="status-tag bg-red-50 text-red-500 border-red-100">Estoque Baixo</span>
                  ) : (
                    <span className="status-tag status-occupied">Em Dia</span>
                  )}
                </td>
                <td className="px-6 py-4 font-mono font-black text-xs text-slate-700 tracking-tighter">{item.currentStock} {item.unit}</td>
                <td className="px-6 py-4 font-mono text-xs text-slate-400 tracking-tighter">{formatCurrency(item.costPerUnit)} / {item.unit}</td>
                <td className="px-6 py-4 font-mono font-black text-xs text-emerald-600 tracking-tighter">{formatCurrency(item.currentStock * item.costPerUnit)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {currentUser?.role === 'admin' && (
                      <button 
                        onClick={() => { setEditingInventoryItem(item); setIsInventoryModalOpen(true); }}
                        className="text-slate-400 hover:text-emerald-600 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => { setActiveRecountItem(item); setIsRecountModalOpen(true); }}
                      className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 group"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase hidden group-hover:inline">Reportar Erro</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {recountRequests.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-100">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
             <History className="w-4 h-4" />
             Solicitações de Recontagem
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {recountRequests.map(req => (
               <div key={req.id} className="sleek-card p-4 bg-white/50 border-slate-100 flex flex-col gap-2 relative group">
                 <div className="flex items-center justify-between">
                   <p className="text-xs font-bold text-slate-800">{req.itemName}</p>
                   <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 uppercase">Pendente</span>
                 </div>
                 <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                   <div className="line-through">{req.previousStock} un.</div>
                   <div className="text-emerald-600 font-black">→ {req.newStock} un.</div>
                 </div>
                 <p className="text-[10px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">"{req.comment}"</p>
                 <div className="text-[8px] text-slate-400 mt-auto">{format(req.date, 'dd/MM HH:mm', { locale: ptBR })}</div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* Recount Modal */}
      <AnimatePresence>
        {isRecountModalOpen && activeRecountItem && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                 <div>
                   <h3 className="text-lg font-bold text-slate-800">Solicitar Recontagem</h3>
                   <p className="text-xs text-slate-500 font-medium">Item: {activeRecountItem.name}</p>
                 </div>
                 <button onClick={() => setIsRecountModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleRecountSubmit(
                    activeRecountItem.id,
                    activeRecountItem.name,
                    activeRecountItem.currentStock,
                    parseFloat(formData.get('newStock') as string),
                    formData.get('comment') as string
                  );
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label htmlFor="recount-stock" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Estoque Físico Atual</label>
                  <div className="flex items-center gap-3">
                    <input id="recount-stock" name="newStock" type="number" step="0.01" required placeholder="Ex: 12.5" className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono" title="Novo Estoque" />
                    <span className="text-xs font-bold text-slate-400 px-3 bg-slate-100 py-3 rounded-xl border border-slate-200">{activeRecountItem.unit}</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="recount-comment" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Comentário / Motivo do Erro</label>
                  <textarea id="recount-comment" name="comment" required placeholder="Ex: Desperdício na produção ou erro de entrada..." className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm resize-none" title="Comentário" />
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 leading-relaxed font-medium">A recontagem será enviada para auditoria do gerente antes de ser aplicada ao estoque real.</p>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mt-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Enviar Solicitação
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inventory Item Modal */}
      <AnimatePresence>
        {isInventoryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-lg font-bold text-slate-800">{editingInventoryItem ? 'Editar Insumo' : 'Novo Insumo'}</h3>
                 <button onClick={() => setIsInventoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleSaveInventory({
                    name: formData.get('name') as string,
                    category: formData.get('category') as string,
                    unit: formData.get('unit') as string,
                    currentStock: parseFloat(formData.get('currentStock') as string),
                    minStock: parseFloat(formData.get('minStock') as string),
                    costPerUnit: parseFloat(formData.get('costPerUnit') as string),
                    location: formData.get('location') as InventoryLocation
                  });
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label htmlFor="inv-name" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Nome do Insumo</label>
                  <input id="inv-name" name="name" defaultValue={editingInventoryItem?.name} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" title="Nome do Insumo" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="inv-category" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Categoria</label>
                    <div className="flex gap-2">
                      <select id="inv-category" name="category" defaultValue={editingInventoryItem?.category} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none font-medium text-slate-600" title="Categoria do Insumo">
                        {inventoryCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <button 
                        type="button" 
                        onClick={() => {
                          const newCat = prompt("Nova categoria de insumo:");
                          if (newCat) handleAddCategory('inventory', newCat);
                        }}
                        className="bg-slate-100 p-3 rounded-xl text-slate-400 hover:text-emerald-500 transition-colors border border-slate-200 shadow-sm"
                        title="Adicionar Categoria"
                        aria-label="Adicionar Categoria"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="inv-location" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Localização</label>
                    <select id="inv-location" name="location" defaultValue={editingInventoryItem?.location || 'BOH'} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none" title="Localização do Insumo">
                      <option value="BOH">BOH (Cozinha)</option>
                      <option value="FOH">FOH (Salão)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label htmlFor="inv-unit" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Unidade</label>
                    <input id="inv-unit" name="unit" placeholder="kg, un, L..." defaultValue={editingInventoryItem?.unit} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" title="Unidade de Medida" />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="inv-cost" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Custo por Unid (R$)</label>
                    <input id="inv-cost" name="costPerUnit" type="number" step="0.01" defaultValue={editingInventoryItem?.costPerUnit} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" title="Custo" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="inv-stock" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Estoque Inicial</label>
                    <input id="inv-stock" name="currentStock" type="number" step="0.1" defaultValue={editingInventoryItem?.currentStock} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" title="Estoque Atual" />
                  </div>
                  <div>
                    <label htmlFor="inv-min" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Mínimo Crítico</label>
                    <input id="inv-min" name="minStock" type="number" step="0.1" defaultValue={editingInventoryItem?.minStock} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" title="Mínimo Crítico" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-emerald-500 text-white font-bold py-4 rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 mt-4">
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )

  const renderReports = () => {
    // Data range filtering
    const startRange = startOfDay(parseISO(reportsStartDate)).getTime();
    const endRange = endOfDay(parseISO(reportsEndDate)).getTime();

    // Data aggregation for reports
    const deliveredOrders = orders.filter(o => 
      o.status === 'delivered' && 
      o.closedAt && 
      o.closedAt >= startRange && 
      o.closedAt <= endRange
    );

    const totalRevenue = deliveredOrders.reduce((acc, o) => acc + o.total, 0);
    const avgTicket = deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;

    // Sales by Day of Week
    const daysData = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day, idx) => {
      const dayOrders = deliveredOrders.filter(o => o.closedAt && new Date(o.closedAt).getDay() === idx);
      return {
        name: day,
        sales: dayOrders.reduce((acc, o) => acc + o.total, 0),
        count: dayOrders.length
      };
    });

    // Top Products
    const productStats: Record<string, { name: string, count: number, total: number }> = {};
    deliveredOrders.forEach(order => {
      order.items.forEach(item => {
        if (!item.voided) {
          if (!productStats[item.id]) {
            productStats[item.id] = { name: item.name, count: 0, total: 0 };
          }
          productStats[item.id].count += item.quantity;
          productStats[item.id].total += item.price * item.quantity;
        }
      });
    });

    const sortedProducts = Object.values(productStats).sort((a, b) => b.total - a.total).slice(0, 5);
    const maxProductCount = Math.max(...sortedProducts.map(p => p.count), 1);

    // Financial Analysis Aggregation
    const financeStats = deliveredOrders.reduce((acc, o) => {
      const orderWastage = o.items.reduce((sum, item) => {
        return sum + (item.status === 'voided' && item.sentToKitchen ? (item.cost || 0) * item.quantity : 0);
      }, 0);
      
      const orderSalesCost = (o.totalCost || 0) - orderWastage;

      return {
        revenue: acc.revenue + o.total,
        cogs: acc.cogs + orderSalesCost,
        wastage: acc.wastage + orderWastage,
        discount: acc.discount + (o.discount || 0)
      };
    }, { revenue: 0, cogs: 0, wastage: 0, discount: 0 });

    const netProfit = financeStats.revenue - (financeStats.cogs + financeStats.wastage);
    const profitMargin = financeStats.revenue > 0 ? (netProfit / financeStats.revenue) * 100 : 0;

    return (
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
               <BarChart3 className="w-6 h-6 text-white" />
             </div>
             <div>
               <h2 className="text-2xl font-black text-slate-800 tracking-tight">Relatórios de Desempenho</h2>
               <p className="text-sm text-slate-500 font-medium tracking-tight">Análise detalhada de vendas e produtividade</p>
             </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center sleek-card px-4 py-2 bg-white border-slate-100 gap-3 shadow-sm">
               <Calendar className="w-4 h-4 text-slate-400" />
               <input 
                 type="date" 
                 value={reportsStartDate} 
                 onChange={e => setReportsStartDate(e.target.value)}
                 className="text-[10px] font-bold text-slate-700 outline-none bg-transparent"
               />
               <span className="text-slate-300">|</span>
               <input 
                 type="date" 
                 value={reportsEndDate} 
                 onChange={e => setReportsEndDate(e.target.value)}
                 className="text-[10px] font-bold text-slate-700 outline-none bg-transparent"
               />
            </div>

            <button 
              onClick={handleExportSalesToExcel}
              className="px-5 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-xl shadow-slate-900/10"
            >
              <FileText className="w-3.5 h-3.5" />
              Relatório Geral
            </button>
            <div className="flex bg-slate-100 rounded-2xl p-1 border border-slate-200">
              <button 
                onClick={() => setReportsTab('summary')}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  reportsTab === 'summary' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
                )}
              >
                Resumo
              </button>
              <button 
                onClick={() => setReportsTab('sales')}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  reportsTab === 'sales' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
                )}
              >
                Vendas
              </button>
              <button 
                onClick={() => setReportsTab('products')}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  reportsTab === 'products' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
                )}
              >
                Produtos
              </button>
              <button 
                onClick={() => setReportsTab('staff')}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  reportsTab === 'staff' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
                )}
              >
                Horas Equipe
              </button>
              <button 
                onClick={() => setReportsTab('finance')}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  reportsTab === 'finance' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
                )}
              >
                Financeiro
              </button>
            </div>
          </div>
        </div>

        {reportsTab === 'summary' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="sleek-card p-6 bg-emerald-500 text-white">
                  <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Faturamento Bruto Total</p>
                  <p className="text-3xl font-black">{formatCurrency(totalRevenue)}</p>
                  <p className="text-[10px] mt-4 font-bold opacity-80 uppercase tracking-tight">Acumulado desde o início</p>
               </div>
               <div className="sleek-card p-6">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Ticket Médio Geral</p>
                  <p className="text-3xl font-black text-slate-800">{formatCurrency(avgTicket)}</p>
                  <div className="mt-4 flex items-center gap-1">
                    <span className="text-[10px] font-bold text-emerald-600">{deliveredOrders.length}</span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">Pedidos Finalizados</span>
                  </div>
               </div>
               <div className="sleek-card p-6">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Melhor Dia (Média)</p>
                  <p className="text-3xl font-black text-slate-800">
                    {daysData.length > 0 ? daysData.reduce((prev, curr) => (prev.sales > curr.sales) ? prev : curr).name : '--'}
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-[10px]">
                    <Clock className="w-3 h-3 text-slate-300" />
                    <span className="font-medium text-slate-400">Baseado no histórico de vendas</span>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="sleek-card p-8">
                <h3 className="text-sm font-black uppercase tracking-widest mb-8 text-slate-400 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                  Média de Vendas por Dia
                </h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={daysData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}} />
                      <Tooltip 
                        cursor={{fill: '#f1f5f9'}} 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: number) => [formatCurrency(val), 'Faturamento']}
                      />
                      <Bar dataKey="sales" radius={[6, 6, 0, 0]} fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="sleek-card p-8">
                <h3 className="text-sm font-black uppercase tracking-widest mb-8 text-slate-400 flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-500" />
                  Top 5 Produtos em Valor
                </h3>
                <div className="space-y-6">
                  {sortedProducts.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg font-black text-slate-400 text-xs flex-shrink-0">{idx+1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{item.name}</p>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                           <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${(item.count/maxProductCount)*100}%` }}></div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-emerald-600 text-sm tracking-tighter">{formatCurrency(item.total)}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase">{item.count} un.</p>
                      </div>
                    </div>
                  ))}
                  {sortedProducts.length === 0 && (
                    <div className="py-12 text-center text-slate-300">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma venda registrada</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {reportsTab === 'sales' && (
          <div className="sleek-card overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">Diário de Vendas Detalhado</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data/Hora</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mesa</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Método</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {deliveredOrders.slice().reverse().map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-800">{format(order.closedAt!, 'dd/MM/yy')}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{format(order.closedAt!, 'HH:mm:ss')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-black text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                          0{tables.find(t => t.id === order.tableId)?.number || '--'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-600 max-w-xs truncate">
                          {order.items.filter(i => !i.voided).map(i => i.name).join(', ')}
                        </p>
                        <p className="text-[9px] text-slate-400 font-black uppercase mt-1">{order.items.length} itens no total</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-black text-emerald-600 leading-none">{formatCurrency(order.total)}</p>
                        {order.discount > 0 && <p className="text-[9px] text-red-400 font-bold mt-1 line-through">{formatCurrency(order.total + order.discount)}</p>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
                          {order.paymentMethod || 'Pago'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {deliveredOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center opacity-30">
                        <FileText className="w-12 h-12 mx-auto mb-3" />
                        <p className="text-xs font-black uppercase tracking-widest">Nenhuma venda encontrada no histórico</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportsTab === 'products' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.values(productStats).sort((a, b) => b.count - a.count).map((item, idx) => (
              <div key={idx} className="sleek-card p-6 flex flex-col justify-between">
                <div>
                   <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-4 border border-slate-100">
                     <Package className="w-5 h-5 text-slate-400" />
                   </div>
                   <h4 className="font-bold text-slate-800 leading-tight mb-2 pr-6">{item.name}</h4>
                   <div className="flex gap-4">
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Volume</p>
                        <p className="text-lg font-black text-slate-600">{item.count} <span className="text-[10px]">un.</span></p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Faturamento</p>
                        <p className="text-lg font-black text-emerald-600">{formatCurrency(item.total)}</p>
                      </div>
                   </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                   <p className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">Destaque de Venda</p>
                   <span className="text-[9px] font-bold text-slate-300">#{idx + 1} Ranking</span>
                </div>
              </div>
            ))}
            {Object.keys(productStats).length === 0 && (
              <div className="col-span-full py-20 text-center opacity-30">
                 <Package className="w-12 h-12 mx-auto mb-3" />
                 <p className="text-xs font-black uppercase tracking-widest tracking-widest">Nenhum produto vendido ainda</p>
              </div>
            )}
          </div>
        )}

        {reportsTab === 'staff' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {staff.map(member => {
                const memberShifts = shifts.filter(s => 
                  s.staffId === member.id && 
                  s.startTime >= startRange && 
                  s.startTime <= endRange
                );
                
                const totalMs = memberShifts.reduce((acc, s) => {
                  const end = s.endTime || Date.now();
                  return acc + (end - s.startTime);
                }, 0);

                const hours = Math.floor(totalMs / (1000 * 60 * 60));
                const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));

                return (
                  <div key={member.id} className="sleek-card p-6 flex flex-col">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-sm shadow-xl shrink-0">
                        {member.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                         <h4 className="font-bold text-slate-800 truncate">{member.name}</h4>
                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                           {rolePermissions.find(rp => rp.role === member.role)?.label || member.role}
                         </p>
                      </div>
                    </div>
                    
                    <div className="mt-auto space-y-3">
                       <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-slate-400">Total de Horas</span>
                          <span className="text-lg font-black text-emerald-600 tracking-tighter">{hours}h {minutes}m</span>
                       </div>
                       <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (totalMs / (40 * 3600000)) * 100)}%` }}
                            className="h-full bg-emerald-500 rounded-full"
                          />
                       </div>
                       <div className="flex justify-between text-[8px] font-black uppercase text-slate-300">
                          <span>0h</span>
                          <span>Meta (40h)</span>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {staff.length === 0 && (
              <div className="py-20 text-center opacity-30">
                 <Users className="w-12 h-12 mx-auto mb-3" />
                 <p className="text-xs font-black uppercase tracking-widest">Nenhum funcionário encontrado</p>
              </div>
            )}
          </div>
        )}

        {reportsTab === 'finance' && (
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FinanceCard 
                  title="Lucro Líquido" 
                  value={formatCurrency(netProfit)} 
                  percentage={profitMargin.toFixed(1) + '%'} 
                  color="bg-emerald-500" 
                  icon={<TrendingUp className="w-5 h-5" />}
                />
                <FinanceCard 
                  title="Custo de Venda (CMV)" 
                  value={formatCurrency(financeStats.cogs)} 
                  percentage={financeStats.revenue > 0 ? ((financeStats.cogs / financeStats.revenue) * 100).toFixed(1) + '%' : '0%'} 
                  color="bg-slate-800" 
                  icon={<Package className="w-5 h-5" />}
                />
                <FinanceCard 
                  title="Desperdício (Void/Waste)" 
                  value={formatCurrency(financeStats.wastage)} 
                  percentage={financeStats.revenue > 0 ? ((financeStats.wastage / financeStats.revenue) * 100).toFixed(1) + '%' : '0%'} 
                  color="bg-red-500" 
                  icon={<Trash2 className="w-5 h-5" />}
                />
                <FinanceCard 
                  title="Descontos Aplicados" 
                  value={formatCurrency(financeStats.discount)} 
                  percentage={financeStats.revenue > 0 ? ((financeStats.discount / financeStats.revenue) * 100).toFixed(1) + '%' : '0%'} 
                  color="bg-amber-500" 
                  icon={<Tag className="w-5 h-5" />}
                />
             </div>

             <div className="sleek-card p-8 bg-white border-slate-100">
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest mb-6 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-500" />
                  Distribuição de Custos
                </h3>
                <div className="space-y-6">
                   <CostBar label="Lucro Líquido" value={netProfit} total={financeStats.revenue} color="bg-emerald-500" />
                   <CostBar label="Custos Operacionais (Insumos)" value={financeStats.cogs} total={financeStats.revenue} color="bg-slate-700" />
                   <CostBar label="Perda por Desperdício" value={financeStats.wastage} total={financeStats.revenue} color="bg-red-500" />
                   <CostBar label="Descontos e Promoções" value={financeStats.discount} total={financeStats.revenue} color="bg-amber-500" />
                </div>
             </div>
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => {
    const filteredOrders = orders.filter(o => {
      if (historyFilter === 'open') return o.status !== 'delivered';
      if (historyFilter === 'closed') return o.status === 'delivered';
      return true;
    }).sort((a, b) => (b.closedAt || b.startTime) - (a.closedAt || a.startTime));

    const totalOpen = orders.filter(o => o.status !== 'delivered').reduce((sum, o) => sum + o.total, 0);
    const totalClosed = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total, 0);

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Histórico de Vendas</h2>
            <p className="text-sm text-slate-500 font-medium">Relatório detalhado de todas as transações</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button 
              onClick={handleExportSalesToExcel}
              className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Compartilhar Planilha
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block" />
            {[
              { id: 'all', label: 'Todos' },
              { id: 'open', label: 'Em Aberto' },
              { id: 'closed', label: 'Finalizados' },
            ].map(f => (
              <button 
                key={f.id}
                onClick={() => setHistoryFilter(f.id as any)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  historyFilter === f.id ? "bg-slate-800 text-white shadow-lg" : "bg-white text-slate-400 hover:bg-slate-50 border border-slate-100"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <div className="sleek-card p-6 border-l-4 border-emerald-500">
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Vendas Finalizadas</p>
             <p className="text-2xl font-black text-slate-800">{formatCurrency(totalClosed)}</p>
           </div>
           <div className="sleek-card p-6 border-l-4 border-amber-500">
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total em Aberto (Mesas)</p>
             <p className="text-2xl font-black text-slate-800">{formatCurrency(totalOpen)}</p>
           </div>
           <div className="sleek-card p-6 border-l-4 border-slate-800">
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Volume Total Processado</p>
             <p className="text-2xl font-black text-slate-800">{formatCurrency(totalOpen + totalClosed)}</p>
           </div>
        </div>

        <div className="sleek-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">ID / Data</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Mesa</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Financeiro</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Pagamento</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono font-black text-slate-400 group-hover:text-slate-600 transition-colors">#{order.id.toUpperCase()}</span>
                        <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tight">{format(order.closedAt || order.startTime, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {order.orderType === 'takeaway' ? (
                        <span className="font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-lg text-xs flex items-center gap-1 w-fit">
                          <ShoppingBag className="w-3 h-3" /> TKW #{order.takeawayNumber}
                        </span>
                      ) : (
                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg text-xs">
                          Mesa 0{tables.find(t => t.id === order.tableId)?.number || '??'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-emerald-600 text-sm">{formatCurrency(order.total)}</span>
                        {order.discount > 0 && <span className="text-[8px] text-red-500 font-bold uppercase tracking-tighter">Desconto: -{formatCurrency(order.discount)}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {order.status === 'delivered' ? (
                          <div className="flex items-center gap-1">
                             <div className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 text-slate-400">
                               {order.paymentMethod === 'card' ? <CreditCard className="w-3 h-3" /> : order.paymentMethod === 'pix' ? <Smartphone className="w-3 h-3" /> : order.paymentMethod === 'split' ? <ArrowLeftRight className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                             </div>
                             <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{order.paymentMethod || 'Sistema'}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] italic text-slate-300">Pendente</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                        order.status === 'delivered' ? "bg-slate-100 text-slate-400" : "bg-amber-100 text-amber-600 shadow-sm shadow-amber-200"
                      )}>
                        {order.status === 'delivered' ? 'Finalizado' : 'Mesa em Aberto'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {currentPermissions.actions.canReopenTable && (
                        <div className="flex justify-end gap-2 text-[8px] font-bold">

                          {order.status === 'delivered' ? (
                            <button 
                              onClick={() => handleReopenTable(order.id)}
                              className="text-[10px] font-black uppercase text-amber-600 hover:text-white hover:bg-amber-500 border border-amber-200 px-3 py-1.5 rounded-xl transition-all shadow-sm"
                            >
                              Reabrir Mesa (Gerente)
                            </button>
                          ) : (
                            <button 
                              onClick={() => { setSelectedTable(tables.find(t => t.id === order.tableId) || null); setCurrentView('orders'); }}
                              className="text-[10px] font-black uppercase text-emerald-600 hover:text-white hover:bg-emerald-500 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all shadow-sm"
                            >
                              Gerenciar Pedido
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center opacity-20">
                        <History className="w-16 h-16 border-2 border-slate-900 rounded-full p-3 mb-4" />
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Histórico Vazio</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderIncidentModal = () => {
    if (!isIncidentModalOpen) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Reportar Incidente</h2>
            <button onClick={() => setIsIncidentModalOpen(false)} className="text-slate-400"><X /></button>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <span className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Tipo</span>
                 <div className="grid grid-cols-1 gap-2">
                   {[
                     { id: 'error', label: 'Erro', icon: <AlertTriangle className="w-4 h-4" /> },
                     { id: 'broken', label: 'Quebra', icon: <Wrench className="w-4 h-4" /> },
                     { id: 'risk', label: 'Risco', icon: <Zap className="w-4 h-4" /> },
                     { id: 'action', label: 'Ação', icon: <Shield className="w-4 h-4" /> },
                   ].map(type => (
                     <button
                       key={type.id}
                       type="button"
                       onClick={() => setNewIncident({...newIncident, type: type.id as any})}
                       className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-xs font-bold",
                        newIncident.type === type.id ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-400"
                       )}
                       aria-label={`Tipo: ${type.label}`}
                     >
                       {type.icon}
                       {type.label}
                     </button>
                   ))}
                 </div>
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Prioridade</label>
                  <div className="grid grid-cols-1 gap-2">
                   {['low', 'medium', 'high', 'critical'].map(p => (
                     <button
                       key={p}
                       type="button"
                       onClick={() => setNewIncident({...newIncident, priority: p as any})}
                       className={cn(
                        "p-3 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-widest",
                        newIncident.priority === p ? "border-slate-800 bg-slate-800 text-white" : "border-slate-100 text-slate-400"
                       )}
                     >
                       {p}
                     </button>
                   ))}
                 </div>
               </div>
            </div>

            <div>
              <label htmlFor="incident-title" className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Título da Ocorrência</label>
              <input 
                id="incident-title"
                type="text" 
                value={newIncident.title || ''}
                onChange={e => setNewIncident({...newIncident, title: e.target.value})}
                className="w-full bg-slate-50 border-slate-100 rounded-xl p-3 font-bold text-slate-800"
                placeholder="Ex: Forno parou de aquecer"
              />
            </div>

            <div>
              <label htmlFor="incident-desc" className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Descrição Detalhada</label>
              <textarea 
                id="incident-desc"
                value={newIncident.description || ''}
                onChange={e => setNewIncident({...newIncident, description: e.target.value})}
                rows={4}
                className="w-full bg-slate-50 border-slate-100 rounded-xl p-3 font-bold text-slate-800 text-sm"
                placeholder="Descreva o que aconteceu, consequências e possíveis ações imediatas necessárias."
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Local / Setor</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={newIncident.location || ''}
                  onChange={e => setNewIncident({...newIncident, location: e.target.value})}
                  className="w-full bg-slate-50 border-slate-100 rounded-xl p-3 pr-10 font-bold text-slate-800"
                  placeholder="Ex: Cozinha Quente, Mesa 12"
                />
                <button 
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        setNewIncident({...newIncident, location: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`});
                      }, (err) => alert("Erro ao obter localização: " + err.message));
                    }
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-emerald-500 transition-colors"
                  title="Usar localização do dispositivo"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button 
              onClick={handleCreateIncident}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl mt-4"
            >
              Registrar Ocorrência
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderDeviceLinking = () => {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-[200] p-4 text-white">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 text-slate-800"
        >
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-500/20 mb-6">
              <Link2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-black tracking-tight leading-tight mb-2">Vincular Dispositivo</h2>
            <p className="text-sm text-slate-500 font-medium px-4">Escaneie o QR Code no painel do administrador ou digite o token de acesso.</p>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="link-token" className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest text-center">Token da Empresa</label>
              <input 
                id="link-token"
                type="text" 
                placeholder="RM-XXX-00"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-center font-black text-xl tracking-widest text-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all uppercase"
                onChange={(e) => {
                  if (e.target.value.toUpperCase() === linkToken) {
                    handleLinkDevice(e.target.value.toUpperCase());
                  }
                }}
              />
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button 
                onClick={() => {
                  setIsDeviceLinked(true);
                  localStorage.setItem('rm_device_linked', 'true');
                }}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
              >
                Ativar como Demo
              </button>
              <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest px-8">
                Ao vincular, este dispositivo terá acesso sincronizado ao estoque, pedidos e relatórios da empresa.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderSafety = () => {
    const isManagerOrOwner = currentUser?.role === 'owner' || currentUser?.role === 'manager_foh' || currentUser?.role === 'manager_boh';
    const dayLogs = safetyLogs[safetySelectedDate] || {};

    const toggleCheck = (id: string) => {
      setSafetyLogs(prev => ({
        ...prev,
        [safetySelectedDate]: {
          ...(prev[safetySelectedDate] || {}),
          [id]: !(prev[safetySelectedDate]?.[id])
        }
      }));
    };

    const toggleTemplateItem = (id: string) => {
      setSafetyTemplate(prev => prev.map(item => 
        item.id === id ? { ...item, enabled: !item.enabled } : item
      ));
    };

    const renderCheckItem = (item: typeof safetyTemplate[0]) => {
      if (!item.enabled && activeSafetyTab !== 'config') return null;

      return (
        <div 
          key={item.id}
          onClick={() => activeSafetyTab === 'config' ? toggleTemplateItem(item.id) : toggleCheck(item.id)}
          className={cn(
            "flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer",
            activeSafetyTab === 'config' 
              ? (item.enabled ? "bg-white border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm" : "bg-slate-50 border-slate-200 opacity-50 grayscale")
              : (dayLogs[item.id] ? "bg-emerald-50 border-emerald-100 shadow-sm" : "bg-white border-slate-100 hover:border-slate-200")
          )}
        >
          {activeSafetyTab === 'config' ? (
            <div className={cn(
              "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all mt-0.5 shrink-0",
              item.enabled ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 text-slate-200"
            )}>
              <Settings className="w-4 h-4" />
            </div>
          ) : (
            <div className={cn(
              "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all mt-0.5 shrink-0",
              dayLogs[item.id] ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 text-transparent"
            )}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className={cn("text-sm font-bold", 
                activeSafetyTab === 'config' ? (item.enabled ? "text-slate-800" : "text-slate-400") :
                (dayLogs[item.id] ? "text-emerald-900" : "text-slate-800")
              )}>{item.label}</p>
              {activeSafetyTab === 'config' && (
                <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded", 
                  item.enabled ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400"
                )}>
                  {item.enabled ? 'Ativo' : 'Inativo'}
                </span>
              )}
            </div>
            {item.description && <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-medium">{item.description}</p>}
          </div>
        </div>
      );
    };

    const renderSection = (category: string, sectionName: string, icon: any, bgColor: string, textColor: string) => {
      const items = safetyTemplate.filter(i => i.category === category && i.section === sectionName);
      if (items.length === 0 || (activeSafetyTab !== 'config' && items.every(i => !i.enabled))) return null;

      return (
        <div key={sectionName} className="sleek-card p-6 border-slate-100">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", bgColor, textColor)}>
            {icon}
          </div>
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">{sectionName}</h3>
          <div className="space-y-4">
            {items.map(renderCheckItem)}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-8 pb-32">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
               <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Saúde e Segurança</h2>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Conformidade sanirátia e segurança operacional</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
             {activeSafetyTab !== 'config' && (
               <div className="flex items-center sleek-card px-4 py-2.5 bg-white border-slate-100 gap-4 shadow-sm">
                  <button onClick={() => setSafetySelectedDate(format(addDays(parseISO(safetySelectedDate), -1), 'yyyy-MM-dd'))} className="p-1 text-slate-400 hover:text-emerald-500 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex flex-col items-center min-w-[100px]">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Relatório de</span>
                    <span className="text-xs font-bold text-slate-800">{isSameDay(parseISO(safetySelectedDate), new Date()) ? 'Hoje' : format(parseISO(safetySelectedDate), "dd 'de' MMM", { locale: ptBR })}</span>
                  </div>
                  <button onClick={() => setSafetySelectedDate(format(addDays(parseISO(safetySelectedDate), 1), 'yyyy-MM-dd'))} className="p-1 text-slate-400 hover:text-emerald-500 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
               </div>
             )}

             <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar">
                {[
                  { id: 'boh', label: 'Cozinha', icon: <UtensilsCrossed className="w-4 h-4" /> },
                  { id: 'foh', label: 'Salão', icon: <Users className="w-4 h-4" /> },
                  { id: 'checklists', label: 'Daily', icon: <ClipboardList className="w-4 h-4" /> },
                  { id: 'incidents', label: 'Reportes', icon: <AlertTriangle className="w-4 h-4" /> },
                  { id: 'pops', label: 'Normas', icon: <FileText className="w-4 h-4" /> },
                  ...(isManagerOrOwner ? [{ id: 'config', label: 'Config', icon: <Settings className="w-4 h-4" /> }] : []),
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSafetyTab(tab.id as any)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap",
                      activeSafetyTab === tab.id ? "bg-white text-slate-900 shadow-xl" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
             </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSafetyTab + safetySelectedDate}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 gap-8"
          >
            {activeSafetyTab === 'config' && (
              <div className="space-y-8">
                 <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4">
                    <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0">
                       <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                       <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest">Modo de Configuração do Template</h4>
                       <p className="text-xs text-amber-700 font-medium mt-1">Habilite ou desabilite os itens que fazem sentido para a operação do seu restaurante. Itens desabilitados não aparecerão nos checklists diários da equipe.</p>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {['boh', 'foh', 'checklists'].map(cat => (
                      <div key={cat} className="space-y-4">
                         <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-2">{cat.toUpperCase()}</h3>
                         <div className="space-y-3">
                            {safetyTemplate.filter(i => i.category === cat).map(renderCheckItem)}
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {activeSafetyTab === 'boh' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {renderSection('boh', 'Segurança Alimentar', <Thermometer className="w-5 h-5" />, 'bg-amber-100', 'text-amber-600')}
                {renderSection('boh', 'Segurança do Trabalho', <HardHat className="w-5 h-5" />, 'bg-blue-100', 'text-blue-600')}
                {renderSection('boh', 'Limpeza & Resíduos', <Waves className="w-5 h-5" />, 'bg-emerald-100', 'text-emerald-600')}
              </div>
            )}

            {activeSafetyTab === 'foh' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderSection('foh', 'Higiene', <Droplets className="w-5 h-5" />, 'bg-indigo-100', 'text-indigo-600')}
                  {renderSection('foh', 'Segurança', <Flame className="w-5 h-5" />, 'bg-rose-100', 'text-rose-600')}
                </div>
              </div>
            )}

            {activeSafetyTab === 'checklists' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                       <Clock className="w-5 h-5 text-emerald-500" />
                       <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">Abertura</h3>
                    </div>
                    <div className="space-y-3">
                      {safetyTemplate.filter(i => i.category === 'checklists' && i.section === 'Abertura').map(renderCheckItem)}
                    </div>
                 </div>
                 <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                       <LogOut className="w-5 h-5 text-indigo-500" />
                       <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">Fechamento</h3>
                    </div>
                    <div className="space-y-3">
                      {safetyTemplate.filter(i => i.category === 'checklists' && i.section === 'Fechamento').map(renderCheckItem)}
                    </div>
                 </div>
              </div>
            )}

            {activeSafetyTab === 'pops' && (
              <div className="sleek-card border-slate-100 overflow-hidden">
                <div className="p-8 bg-slate-900 text-white">
                    <h3 className="text-lg font-black uppercase tracking-[0.2em]">POPs Obrigatórios (ANVISA)</h3>
                    <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest max-w-2xl">Procedimentos Operacionais Padronizados necessários para conformidade com a RDC 216/2004.</p>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                    {[
                      'Higienização de instalações, equipamentos e móveis',
                      'Controle de potabilidade da água',
                      'Higiene e saúde dos manipuladores',
                      'Manejo de resíduos',
                      'Limpeza do reservatório de água',
                      'Controle integrado de pragas',
                      'Manutenção preventiva e calibração de equipamentos',
                      'Seleção de fornecedores'
                    ].map((pop, idx) => (
                      <div key={idx} className="flex items-start gap-4 py-6 border-b border-slate-50 last:border-0 group cursor-default">
                         <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-sm font-black text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0">
                           {idx + 1}
                         </div>
                         <div>
                           <p className="text-sm font-bold text-slate-700 tracking-tight">{pop}</p>
                           <p className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-widest font-black group-hover:text-emerald-500 transition-colors">Norma RDC 216/2004</p>
                         </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {activeSafetyTab === 'incidents' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest leading-none">Central de Incidentes</h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">Gestão de riscos, quebras e ocorrências</p>
                  </div>
                  <button 
                    onClick={() => {
                      setNewIncident({ type: 'error', priority: 'medium', status: 'open' });
                      setIsIncidentModalOpen(true);
                    }}
                    className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Reportar Novo
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'Erros', type: 'error', color: 'bg-rose-50 text-rose-600', icon: <AlertTriangle className="w-4 h-4" /> },
                    { label: 'Quebras', type: 'broken', color: 'bg-amber-50 text-amber-600', icon: <Wrench className="w-4 h-4" /> },
                    { label: 'Riscos', type: 'risk', color: 'bg-orange-50 text-orange-600', icon: <Zap className="w-4 h-4" /> },
                    { label: 'Ações', type: 'action', color: 'bg-blue-50 text-blue-600', icon: <Shield className="w-4 h-4" /> },
                  ].map(stat => (
                    <div key={stat.type} className={cn("p-4 rounded-2xl flex items-center justify-between shadow-sm", stat.color)}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white/50">{stat.icon}</div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{stat.label}</span>
                      </div>
                      <span className="text-xl font-black">{incidentReports.filter(r => r.type === stat.type && r.status === 'open').length}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {incidentReports.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <ClipboardList className="w-8 h-8" />
                      </div>
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhuma ocorrência registrada</p>
                    </div>
                  ) : (
                    incidentReports.map(report => (
                      <div key={report.id} className="sleek-card p-5 border-slate-100 flex items-start justify-between group">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                            report.type === 'error' ? "bg-rose-100 text-rose-500" :
                            report.type === 'broken' ? "bg-amber-100 text-amber-500" :
                            report.type === 'risk' ? "bg-orange-100 text-orange-500" :
                            "bg-blue-100 text-blue-500"
                          )}>
                            {report.type === 'error' && <AlertTriangle className="w-6 h-6" />}
                            {report.type === 'broken' && <Wrench className="w-6 h-6" />}
                            {report.type === 'risk' && <Zap className="w-6 h-6" />}
                            {report.type === 'action' && <Shield className="w-6 h-6" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                                report.priority === 'high' || report.priority === 'critical' ? "bg-red-500 text-white" : "bg-slate-200 text-slate-500"
                              )}>{report.priority}</span>
                              <h4 className="font-bold text-slate-800 tracking-tight">{report.title}</h4>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-xl">{report.description}</p>
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-1.5 focus-mode-element">
                                <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400">
                                  {report.reporterName[0]}
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{report.reporterName}</span>
                              </div>
                              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">•</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{format(report.timestamp, 'HH:mm - dd/MM')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setIncidentReports(prev => prev.map(r => r.id === report.id ? { ...r, status: r.status === 'open' ? 'resolved' : 'open' } : r))}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-[0.15em] transition-all",
                              report.status === 'open' ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20" : "bg-slate-100 text-slate-400"
                            )}
                          >
                            {report.status === 'open' ? 'Marcar Resolvido' : 'Reabrir'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  const renderSchedule = () => {
    const weekStart = startOfWeek(selectedScheduleDate, { weekStartsOn: 1 }); // Monday
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, 6)
    });

    // Filter staff by shop
    const isRegionalView = currentUser?.role === 'owner' || currentUser?.role === 'regional_manager';
    const displayStaff = selectedShopId 
      ? staff.filter(s => s.assignedShopIds?.includes(selectedShopId))
      : staff;

    const getShiftsForStaffOnDay = (staffId: string, day: Date) => {
      const relevantShifts = selectedShopId ? shifts.filter(s => s.shopId === selectedShopId) : shifts;
      return relevantShifts.filter(s => s.staffId === staffId && isSameDay(new Date(s.startTime), day));
    };

    return (
      <div className="space-y-8 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Escala Semanal</h2>
            <p className="text-sm text-slate-500 font-medium">
              {selectedShopId ? `Visualizando escala de: ${currentShop?.name}` : 'Visualizando escala de toda a rede'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             {isRegionalView && (
               <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200">
                 {shops.filter(s => accessibleShopIds.includes(s.id)).map(s => (
                   <button 
                     key={s.id}
                     onClick={() => setSelectedShopId(s.id)}
                     className={cn(
                       "px-3 py-1.5 text-[9px] font-black uppercase tracking-tight rounded-lg transition-all",
                       selectedShopId === s.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
                     )}
                   >
                     {s.name}
                   </button>
                 ))}
                 <button 
                    onClick={() => setSelectedShopId(null)}
                    className={cn(
                      "px-3 py-1.5 text-[9px] font-black uppercase tracking-tight rounded-lg transition-all",
                      !selectedShopId ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
                    )}
                  >Rede</button>
               </div>
             )}
             <div className="flex items-center sleek-card px-4 py-2 bg-white gap-4 border-slate-100">
                <button 
                  onClick={() => setSelectedScheduleDate(addDays(selectedScheduleDate, -7))}
                  className="p-1 hover:text-emerald-500 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center min-w-[140px]">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Semana de</span>
                  <span className="text-xs font-bold text-slate-800">{format(weekStart, "dd 'de' MMM", { locale: ptBR })} - {format(addDays(weekStart, 6), "dd 'de' MMM", { locale: ptBR })}</span>
                </div>
                <button 
                  onClick={() => setSelectedScheduleDate(addDays(selectedScheduleDate, 7))}
                  className="p-1 hover:text-emerald-500 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
             </div>
             
             {currentPermissions.actions.canManageSchedule && (
               <button 
                onClick={() => { setEditingShift(null); setIsShiftModalOpen(true); }}
                className="sleek-card px-5 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 border-none shadow-xl shadow-slate-200"
               >
                 <Plus className="w-4 h-4" /> Novo Turno
               </button>
             )}
          </div>
        </div>

        <div className="sleek-card overflow-x-auto bg-white border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="min-w-[900px] lg:min-w-full">
             {/* Header */}
             <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-slate-50 bg-slate-50/50">
                <div className="p-6 border-r border-slate-100 flex items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Funcionário</span>
                </div>
                {weekDays.map(day => (
                  <div key={day.toString()} className="p-4 text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{format(day, 'eee', { locale: ptBR })}</p>
                    <p className={cn(
                      "text-sm font-black w-8 h-8 mx-auto flex items-center justify-center rounded-full transition-all",
                      isSameDay(day, new Date()) ? "bg-emerald-500 text-white" : "text-slate-800"
                    )}>{format(day, 'dd')}</p>
                  </div>
                ))}
             </div>

             {/* Body */}
             <div className="divide-y divide-slate-50">
                {displayStaff.map(member => (
                  <div key={member.id} className="grid grid-cols-[200px_repeat(7,1fr)] hover:bg-slate-50/30 transition-colors">
                    <div className="p-4 border-r border-slate-100 flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-sm",
                        member.role === 'owner' ? "bg-slate-800" : "bg-emerald-500"
                      )}>
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 truncate">{member.name}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{member.role.replace('_', ' ')}</p>
                      </div>
                    </div>

                    {weekDays.map(day => {
                      const dayShifts = getShiftsForStaffOnDay(member.id, day);
                      return (
                        <div key={day.toString()} className="p-2 min-h-[80px] border-r border-slate-50 last:border-r-0 flex flex-col gap-2">
                           {dayShifts.map(shift => (
                             <motion.div
                               layoutId={shift.id}
                               key={shift.id}
                               onClick={() => {
                                 if (currentPermissions.actions.canManageSchedule) {
                                   setEditingShift(shift);
                                   setIsShiftModalOpen(true);
                                 }
                               }}
                               className="p-2 rounded-xl shadow-sm border border-black/5 cursor-pointer relative group overflow-hidden"
                               style={{ backgroundColor: areaColors[shift.area] + '15', borderColor: areaColors[shift.area] + '30' }}
                             >
                                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: areaColors[shift.area] }} />
                                <div className="flex flex-col">
                                   <span className="text-[9px] font-black uppercase tracking-tight" style={{ color: areaColors[shift.area] }}>{shift.area}</span>
                                   <span className="text-[10px] font-bold text-slate-700 leading-none mt-1">
                                     {format(shift.startTime, 'HH:mm')} - {format(shift.endTime, 'HH:mm')}
                                   </span>
                                </div>
                             </motion.div>
                           ))}
                           {dayShifts.length === 0 && (
                             <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="w-4 h-4 text-slate-200" />
                             </div>
                           )}
                        </div>
                      );
                    })}
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 px-4">
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: areaColors.BOH }} />
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Back of House (Cozinha)</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: areaColors.FOH }} />
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Front of House (Salão/Bar)</span>
           </div>
        </div>
      </div>
    );
  };

  const renderStaffManagement = () => {
    // Filter staff based on selected shop if not in regional view or if a specific shop is selected
    const isRegionalView = currentUser?.role === 'owner' || currentUser?.role === 'regional_manager';
    const displayStaff = selectedShopId 
      ? staff.filter(s => s.assignedShopIds?.includes(selectedShopId))
      : staff;

    return (
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Equipe & Permissões</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight">
              {selectedShopId ? `Visualizando equipe de: ${currentShop?.name}` : 'Visualizando toda a equipe da rede'}
            </p>
          </div>
          <div className="flex items-center gap-3">
             {isRegionalView && (
               <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200">
                 {shops.filter(s => accessibleShopIds.includes(s.id)).map(s => (
                   <button 
                     key={s.id}
                     onClick={() => setSelectedShopId(s.id)}
                     className={cn(
                       "px-3 py-1.5 text-[9px] font-black uppercase tracking-tight rounded-lg transition-all",
                       selectedShopId === s.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
                     )}
                   >
                     {s.name}
                   </button>
                 ))}
                 <button 
                    onClick={() => setSelectedShopId(null)}
                    className={cn(
                      "px-3 py-1.5 text-[9px] font-black uppercase tracking-tight rounded-lg transition-all",
                      !selectedShopId ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
                    )}
                  >Rede</button>
               </div>
             )}
             <button 
              onClick={() => { setEditingStaff(null); setModalStaffRole('waiter'); setIsStaffModalOpen(true); }}
              className="sleek-card px-4 py-3 bg-emerald-500 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 border-none shadow-emerald-200"
            >
              <Plus className="w-4 h-4" /> Novo Membro
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-2 px-2">Membros Ativos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayStaff.map(member => (
                <div key={member.id} className="sleek-card p-5 group hover:border-emerald-200 transition-all flex items-start gap-4">
                  {member.photo ? (
                    <img src={member.photo} alt={member.name} className="w-12 h-12 rounded-full object-cover shadow-lg" referrerPolicy="no-referrer" />
                  ) : (
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-sm font-black text-white shadow-lg shrink-0",
                      member.role === 'owner' ? "bg-slate-800" : "bg-emerald-500"
                    )}>
                      {member.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 mb-0.5">{member.name}</h4>
                    <div className="flex items-center gap-2 mb-1">
                       <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">{member.role.replace('_', ' ')}</p>
                       <p className="text-[10px] font-black text-slate-300 tracking-widest bg-slate-900 px-2 py-0.5 rounded ml-2">PIN: {member.pin}</p>
                       {member.role === 'waiter' && (
                         <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase tracking-widest ml-2">
                           {tables.filter(t => t.waiterId === member.id).length} Mesas
                         </span>
                       )}
                       {member.assignedShopIds && member.assignedShopIds.length > 1 && (
                         <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Multi-loja</span>
                       )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                       {member.assignedShopIds?.map(sid => {
                         const s = shops.find(shop => shop.id === sid);
                         return s ? <span key={sid} className="text-[8px] text-slate-400 font-bold bg-slate-50 px-1 rounded">{s.name}</span> : null;
                       })}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => { 
                        setEditingStaff(member); 
                        setModalStaffRole(member.role);
                        setIsStaffModalOpen(true); 
                      }}
                      className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {currentUser?.role === 'owner' && member.role !== 'owner' && (
                      <button 
                        onClick={() => handleDeleteStaff(member.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        <div className="space-y-6">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-2 px-2">Controle de Hierarquia</h3>
          <div className="sleek-card overflow-hidden">
             <div className="p-4 bg-slate-50 border-b border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Matriz de Permissões</p>
             </div>
             <div className="p-2 space-y-1">
                {rolePermissions.map(perm => (
                  <button 
                    key={perm.role}
                    onClick={() => {
                      if (currentUser?.role === 'owner') {
                        setEditingRolePermissions(perm);
                        setIsPermissionModalOpen(true);
                      }
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-slate-50 flex items-center justify-between group transition-all"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 tracking-tight">
                        {(rolePermissions.find(p => p.role === perm.role)?.label || perm.role.replace('_', ' ')).toUpperCase()}
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium">{perm.views.length} telas acessíveis</p>
                    </div>
                    {currentUser?.role === 'owner' && (
                      <div className="px-2 py-1 bg-slate-100 text-[8px] font-black uppercase text-slate-400 rounded group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-all">
                        Ajustar
                      </div>
                    )}
                  </button>
                ))}
             </div>
          </div>

          <div className="sleek-card p-5 bg-amber-50 border-amber-100">
            <h4 className="text-xs font-black uppercase text-amber-800 tracking-widest mb-1 flex items-center gap-2">
               <AlertTriangle className="w-3 h-3" /> Atenção
            </h4>
            <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
              As permissões aplicadas aqui afetam instantaneamente todos os membros vinculados ao cargo. Use com cautela ao elevar privilégios de Sub-Gerentes.
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isStaffModalOpen && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <h3 className="text-xl font-black text-slate-800 tracking-tight">{editingStaff ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
                 <button onClick={() => setIsStaffModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const assignedTables = Array.from(formData.getAll('assignedTables')) as string[];
                  handleSaveStaff({
                    name: formData.get('name') as string,
                    cpf: formData.get('cpf') as string,
                    pix: formData.get('pix') as string,
                    phone: formData.get('phone') as string,
                    pin: formData.get('pin') as string,
                    role: (String(formData.get('role') ?? 'staff') as unknown) as UserRole,
                    photo: formData.get('photo') as string,
                    assignedShopIds: Array.from(formData.getAll('assignedShops')) as string[],
                    assignedTableIds: assignedTables
                  });
                }}
                className="p-8 space-y-4"
              >
                <div>
                  <label htmlFor="staff-name" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Nome Completo</label>
                  <input id="staff-name" name="name" defaultValue={editingStaff?.name} required placeholder="Ex: João Silva" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700" title="Nome Completo" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="staff-phone" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Telefone</label>
                    <input id="staff-phone" name="phone" defaultValue={editingStaff?.phone} placeholder="(00) 00000-0000" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700" title="Telefone" />
                  </div>
                  <div>
                    <label htmlFor="staff-pin" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Senha PIN (4 dígitos)</label>
                    <input id="staff-pin" name="pin" maxLength={4} defaultValue={editingStaff?.pin || Math.floor(1000 + Math.random() * 9000).toString()} required className="w-full px-5 py-3.5 bg-slate-900 text-emerald-500 border border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-mono font-black" title="PIN de Acesso" />
                  </div>
                </div>
                <div>
                  <label htmlFor="staff-pix" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Chave PIX</label>
                  <input id="staff-pix" name="pix" defaultValue={editingStaff?.pix} placeholder="E-mail, CPF, Celular ou Chave Aleatória" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700" title="Chave PIX" />
                </div>
                {modalStaffRole === 'waiter' && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Mesas Designadas</label>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-2 grid grid-cols-4 max-h-40 overflow-y-auto">
                      {filteredTables.map(table => (
                        <label key={table.id} className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border border-slate-100 shadow-sm cursor-pointer hover:bg-emerald-50 transition-colors">
                          <input 
                            type="checkbox" 
                            name="assignedTables" 
                            value={table.id} 
                            defaultChecked={editingStaff?.assignedTableIds?.includes(table.id) || table.waiterId === editingStaff?.id}
                            className="w-3.5 h-3.5 rounded text-emerald-500 focus:ring-emerald-500/20"
                          />
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">M{table.number}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                   <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Lojas Designadas</label>
                   <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-2 flex flex-wrap">
                      {shops.map(shop => (
                        <label key={shop.id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm cursor-pointer hover:bg-emerald-50 transition-colors">
                          <input 
                            type="checkbox" 
                            name="assignedShops" 
                            value={shop.id} 
                            defaultChecked={editingStaff?.assignedShopIds.includes(shop.id) || (shops.length === 1)}
                            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500/20"
                          />
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{shop.name}</span>
                        </label>
                      ))}
                   </div>
                </div>
                <div>
                  <label htmlFor="staff-photo" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">URL da Foto (Opcional)</label>
                  <input id="staff-photo" name="photo" defaultValue={editingStaff?.photo} placeholder="https://..." className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700" title="Foto do Perfil" />
                </div>
                
                <button type="submit" className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/30 hover:bg-emerald-400 transition-all mt-4">
                   Salvar Funcionário
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

  const renderPermissionModal = () => {
    if (!editingRolePermissions) return null;

    const allViews: View[] = [
      'dashboard', 'tables', 'orders', 'kitchen', 'bar', 'inventory', 
      'reports', 'history', 'staff_mgmt', 'menu_mgmt', 'schedule', 
      'reservations', 'printer_mgmt'
    ];

    const allActions = [
      { id: 'canVoid', label: 'Estornar Pedidos' },
      { id: 'canDiscount', label: 'Aplicar Descontos' },
      { id: 'canViewSales', label: 'Ver Vendas Detalhadas' },
      { id: 'canManageStaff', label: 'Gerenciar Equipe' },
      { id: 'canManageInventory', label: 'Gerenciar Estoque' },
      { id: 'canEditMenu', label: 'Editar Cardápio' },
      { id: 'canReopenTable', label: 'Reabrir Mesas' },
      { id: 'canManageSchedule', label: 'Modificar Escala' }
    ];

    const toggleView = (view: View) => {
      const isOwnerRole = editingRolePermissions.role === 'owner';
      // Permissões do Owner são imutáveis para segurança se você quiser, mas vamos deixar livre
      const currentViews = editingRolePermissions.views;
      const newViews = currentViews.includes(view)
        ? currentViews.filter(v => v !== view)
        : [...currentViews, view];
      
      handleUpdatePermissions({ ...editingRolePermissions, views: newViews });
      setEditingRolePermissions({ ...editingRolePermissions, views: newViews });
    };

    const toggleAction = (actionId: string) => {
      const newActions = {
        ...editingRolePermissions.actions,
        [actionId]: !editingRolePermissions.actions[actionId as keyof typeof editingRolePermissions.actions]
      };
      handleUpdatePermissions({ ...editingRolePermissions, actions: newActions });
      setEditingRolePermissions({ ...editingRolePermissions, actions: newActions });
    };

    return (
      <AnimatePresence>
        {isPermissionModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div>
                   <h3 className="text-xl font-black text-slate-800 tracking-tight">Matriz de Permissões</h3>
                   <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">Cargo: {editingRolePermissions.role.replace('_', ' ')}</p>
                 </div>
                 <button onClick={() => setIsPermissionModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <section>
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2">
                    <LayoutDashboard className="w-3 h-3" /> Acesso às Telas (Views)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {allViews.map(view => (
                      <button
                        key={view}
                        onClick={() => toggleView(view)}
                        className={cn(
                          "px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all text-center flex items-center justify-center gap-2",
                          editingRolePermissions.views.includes(view)
                            ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20"
                            : "bg-slate-50 text-slate-400 border-slate-100 opacity-60 grayscale"
                        )}
                      >
                        {view.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3" /> Ações do Sistema
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {allActions.map(action => {
                      const isActive = editingRolePermissions.actions[action.id as keyof typeof editingRolePermissions.actions];
                      return (
                        <button
                          key={action.id}
                          onClick={() => toggleAction(action.id)}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all",
                            isActive 
                              ? "bg-white border-emerald-100 shadow-sm" 
                              : "bg-slate-50 border-slate-100 opacity-40"
                          )}
                        >
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            isActive ? "text-slate-800" : "text-slate-400"
                          )}>{action.label}</span>
                          <div className={cn(
                            "w-10 h-6 rounded-full relative transition-all",
                            isActive ? "bg-emerald-500" : "bg-slate-200"
                          )}>
                            <div className={cn(
                              "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                              isActive ? "right-1" : "left-1"
                            )} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                <button 
                  onClick={() => setIsPermissionModalOpen(false)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all"
                >
                  Confirmar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  const renderPrinterManagement = () => {
    return (
      <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gerenciamento de Impressoras</h2>
          <p className="text-sm text-slate-500 font-medium tracking-tight">Configure as impressoras para recibos, cozinha e relatórios</p>
        </div>
        <button 
          onClick={() => { setEditingPrinter(null); setIsPrinterModalOpen(true); }}
          className="sleek-card px-4 py-3 bg-emerald-500 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 border-none shadow-emerald-200"
        >
          <Plus className="w-4 h-4" /> Nova Impressora
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {printers.map(printer => (
          <div key={printer.id} className="sleek-card p-6 border-t-4" style={{ borderTopColor: printer.status === 'online' ? '#10b981' : '#f59e0b' }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-slate-800">{printer.name} {printer.isDefault && <span className="ml-2 text-[8px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">Padrão</span>}</h4>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">{printer.type.replace('_', ' ')} • {printer.connectionType}</p>
              </div>
              <div className={cn(
                "w-3 h-3 rounded-full shadow-sm",
                printer.status === 'online' ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              )} />
            </div>
            
            <div className="bg-slate-50 rounded-xl p-3 mb-6 space-y-2">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-bold uppercase">Status</span>
                <span className={cn("font-black uppercase", printer.status === 'online' ? "text-emerald-600" : "text-amber-600")}>{printer.status}</span>
              </div>
              {printer.ipAddress && (
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-bold uppercase">Endereço IP</span>
                  <span className="text-slate-700 font-mono font-bold">{printer.ipAddress}:{printer.port}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => { setEditingPrinter(printer); setIsPrinterModalOpen(true); }}
                className="flex-1 p-2 text-[10px] font-black uppercase text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all border border-slate-100"
              >
                Configurar
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem(`rm_printer_${printer.type}`, printer.id);
                  alert(`Impressora ${printer.name} definida como padrão neste dispositivo para ${printer.type}.`);
                  // Force re-render if needed, but localStorage is passive
                }}
                className={cn(
                  "flex-1 p-2 text-[10px] font-black uppercase rounded-lg transition-all border",
                  localStorage.getItem(`rm_printer_${printer.type}`) === printer.id 
                    ? "bg-blue-500 text-white border-blue-600 shadow-sm"
                    : "text-blue-500 hover:bg-blue-50 border-blue-100"
                )}
              >
                {localStorage.getItem(`rm_printer_${printer.type}`) === printer.id ? 'Preferida' : 'Fixar Local'}
              </button>
              <button 
                onClick={() => handlePrintToPrinter(printer.type, "TESTE DE IMPRESSÃO - RestManager POS\n--------------------------\nOK")}
                className="flex-1 p-2 text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all border border-emerald-100"
              >
                Teste
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isPrinterModalOpen && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <h3 className="text-xl font-black text-slate-800 tracking-tight">{editingPrinter ? 'Editar Impressora' : 'Nova Impressora'}</h3>
                 <button onClick={() => setIsPrinterModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const printerData: any = {
                    id: editingPrinter?.id || `p-${Math.random().toString(36).substr(2, 9)}`,
                    enterpriseId: enterpriseId!,
                    shopId: selectedShopId || 'shop-1',
                    name: formData.get('name') as string,
                    type: formData.get('type') as PrinterType,
                    connectionType: formData.get('connectionType') as any,
                    ipAddress: formData.get('ipAddress') as string,
                    port: parseInt(formData.get('port') as string) || 9100,
                    status: editingPrinter?.status || 'online',
                    isDefault: formData.get('isDefault') === 'on'
                  };
                  
                  if (printerData.isDefault) {
                    for (const p of printers) {
                      if (p.type === printerData.type && p.isDefault && p.id !== printerData.id) {
                        await firebaseService.updateItem('printers', p.id, { isDefault: false });
                      }
                    }
                  }
                  
                  if (editingPrinter) {
                     await firebaseService.updateItem('printers', printerData.id, printerData);
                  } else {
                     await firebaseService.saveItem('printers', printerData.id, printerData);
                  }
                  
                  setIsPrinterModalOpen(false);
                }}
                className="p-8 space-y-5"
              >
                <div className="space-y-4">
                  <div>
                    <label htmlFor="printer-name" className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nome da Impressora</label>
                    <input id="printer-name" name="name" defaultValue={editingPrinter?.name} required className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" title="Nome da Impressora" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="printer-type" className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Tipo / Destino</label>
                      <select id="printer-type" name="type" defaultValue={editingPrinter?.type} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" title="Tipo de Impressora">
                        <option value="receipt">Recibo / Conta</option>
                        <option value="kitchen">Cozinha</option>
                        <option value="bar">Bar</option>
                        <option value="report">Relatórios</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="printer-conn" className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Conexão</label>
                      <select id="printer-conn" name="connectionType" defaultValue={editingPrinter?.connectionType} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" title="Tipo de Conexão">
                        <option value="network">Rede (IP)</option>
                        <option value="usb">USB / Local</option>
                        <option value="bluetooth">Bluetooth</option>
                        <option value="system_default">Padrão do Sistema</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label htmlFor="printer-ip" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">IP (Se Rede)</label>
                    <input id="printer-ip" name="ipAddress" defaultValue={editingPrinter?.ipAddress} placeholder="192.168.1.100" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700 tracking-tight" title="Endereço IP" />
                  </div>
                  <div>
                    <label htmlFor="printer-port" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Porta</label>
                    <input id="printer-port" name="port" type="number" defaultValue={editingPrinter?.port || 9100} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700 tracking-tight" title="Porta de Conexão" />
                  </div>
                </div>

                <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input name="isDefault" type="checkbox" defaultChecked={editingPrinter?.isDefault} className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Definir como impressora padrão</span>
                </label>
                
                <button type="submit" className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/30 hover:bg-emerald-400 transition-all mt-4">
                   Salvar Configurações
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    );
  };

  const renderShiftModal = () => {
    return (
      <AnimatePresence>
        {isShiftModalOpen && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white modal-rounded w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                 <h3 className="responsive-h3 text-slate-800">{editingShift ? 'Editar Turno' : 'Novo Turno'}</h3>
                 <button onClick={() => setIsShiftModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const startTimeStr = formData.get('startTime') as string;
                  const endTimeStr = formData.get('endTime') as string;
                  const dateStr = formData.get('date') as string;
                  const start = new Date(`${dateStr}T${startTimeStr}:00`).getTime();
                  const end = new Date(`${dateStr}T${endTimeStr}:00`).getTime();
                  handleSaveShift({
                    staffId: formData.get('staffId') as string,
                    area: formData.get('area') as 'FOH' | 'BOH',
                    startTime: start,
                    endTime: end
                  });
                }}
                className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar"
              >
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Funcionário</label>
                  <select name="staffId" defaultValue={editingShift?.staffId} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700 appearance-none">
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Área</label>
                    <select name="area" defaultValue={editingShift?.area || 'FOH'} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700 appearance-none">
                      <option value="FOH">Front of House (Salão)</option>
                      <option value="BOH">Back of House (Cozinha)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Data</label>
                    <input type="date" name="date" defaultValue={editingShift ? format(editingShift.startTime, 'yyyy-MM-dd') : format(selectedScheduleDate, 'yyyy-MM-dd')} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Início</label>
                    <input type="time" name="startTime" defaultValue={editingShift ? format(editingShift.startTime, 'HH:mm') : '08:00'} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Término</label>
                    <input type="time" name="endTime" defaultValue={editingShift ? format(editingShift.endTime, 'HH:mm') : '16:00'} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700" />
                  </div>
                </div>

                {editingShift && (
                  <button 
                    type="button"
                    onClick={() => {
                      if (confirm("Remover este turno?")) {
                        handleDeleteShift(editingShift.id);
                        setIsShiftModalOpen(false);
                      }
                    }}
                    className="w-full py-2 text-xs font-black uppercase text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    Excluir Turno
                  </button>
                )}
                
                <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all">
                   Salvar Turno
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  const renderSettings = () => {
    const [activeSettingsTab, setActiveSettingsTab] = useState<'company' | 'devices' | 'permissions' | 'system' | 'backup'>('company');
    const [backups, setBackups] = useState<any[]>([]);
    const [isBackingUp, setIsBackingUp] = useState(false);

    useEffect(() => {
      if (enterpriseId) {
        return firebaseService.subscribeCollection('backups', enterpriseId, null, setBackups);
      }
    }, [enterpriseId]);

    const handleCreateBackup = async () => {
      if (!enterpriseId) return;
      const key = prompt("Defina uma senha mestre para encriptar este backup (mínimo 8 caracteres):");
      if (!key || key.length < 8) {
        alert("Senha inválida ou muito curta.");
        return;
      }

      setIsBackingUp(true);
      try {
        const fullData = {
          shops,
          products,
          tables,
          staff,
          orders: orders.slice(-100), // Only last 100 for example
          inventory,
          createdAt: Date.now()
        };

        const id = await firebaseService.saveSecureBackup(enterpriseId, fullData, key);
        alert(`Backup criado e encriptado com sucesso! \nProtocolo: ${id}`);
      } catch (error) {
        console.error(error);
        alert("Erro ao processar backup.");
      } finally {
        setIsBackingUp(false);
      }
    };

    const handleRestoreBackup = async (backupId: string) => {
      const key = prompt("Informe a senha mestre deste backup para desencriptar:");
      if (!key) return;

      try {
        const data = await firebaseService.getSecureBackup(backupId, key);
        console.log("Restored data:", data);
        if (confirm("Dados desencriptados com sucesso! Deseja sobrepor as configurações locais com este backup?")) {
          // Here we would implement the actual restoration logic
          alert("Em um cenário real, os dados seriam restaurados no Firestore agora.");
        }
      } catch (error) {
        alert("Erro ao restaurar: Senha incorreta ou dados corrompidos.");
      }
    };

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Configurações do Estabelecimento</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight">Gerencie sua empresa, dispositivos vinculados e preferências</p>
          </div>
        </div>

        <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveSettingsTab('company')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeSettingsTab === 'company' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Empresa
          </button>
          <button 
            onClick={() => setActiveSettingsTab('devices')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeSettingsTab === 'devices' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Dispositivos
          </button>
          <button 
            onClick={() => setActiveSettingsTab('permissions')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeSettingsTab === 'permissions' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Cargos & Permissões
          </button>
          <button 
            onClick={() => setActiveSettingsTab('system')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeSettingsTab === 'system' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Sistema
          </button>
          <button 
            onClick={() => setActiveSettingsTab('backup')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeSettingsTab === 'backup' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Backup & Nuvem
          </button>
        </div>

        {activeSettingsTab === 'backup' && (
          <div className="space-y-6">
            <div className="sleek-card p-10 bg-slate-900 overflow-hidden relative group">
               <div className="absolute top-0 right-0 p-8 opacity-10 transform scale-150 group-hover:scale-175 transition-transform duration-700">
                  <Shield className="w-48 h-48 text-emerald-400" />
               </div>
               
               <div className="relative z-10 max-w-2xl">
                  <h3 className="text-xl font-black text-white tracking-tight mb-4 flex items-center gap-3">
                    <Cloud className="w-6 h-6 text-emerald-400" />
                    Protocolo de Segurança em Nuvem (AES-256)
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-8">
                    Seus dados de empresa (Produtos, Vendas, Estoque) são encriptados localmente usando AES-256, comprimidos via LZ-String e enviados para a nuvem em fragmentos (chunks). Somente quem possuir a senha mestra poderá reconstruir e ler as informações.
                  </p>
                  
                  <div className="flex flex-wrap gap-4">
                     <button 
                        onClick={handleCreateBackup}
                        disabled={isBackingUp}
                        className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 transition-all flex items-center gap-3"
                     >
                        {isBackingUp ? <Zap className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        {isBackingUp ? 'Processando...' : 'Gerar Backup Encriptado'}
                     </button>
                  </div>
               </div>
            </div>

            <div className="sleek-card border-slate-100 overflow-hidden">
               <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Histórico de Backups na Nuvem</h4>
                  <span className="bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full text-[9px] font-black">{backups.length} Disponíveis</span>
               </div>
               
               <div className="divide-y divide-slate-50">
                  {backups.length === 0 ? (
                    <div className="p-12 text-center text-slate-300">
                       <History className="w-10 h-10 mx-auto mb-4 opacity-20" />
                       <p className="font-bold uppercase tracking-widest">Nenhum snapshot encontrado</p>
                    </div>
                  ) : (
                    backups.sort((a, b) => b.timestamp - a.timestamp).map(b => (
                      <div key={b.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-all group">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:shadow-lg transition-all">
                               <FileText className="w-5 h-5" />
                            </div>
                            <div>
                               <p className="font-bold text-slate-800 text-sm tracking-tight">{format(b.timestamp, "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}</p>
                               <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{b.method}</span>
                                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{b.chunkCount} Fragmentos</span>
                               </div>
                            </div>
                         </div>
                         <button 
                            onClick={() => handleRestoreBackup(b.id)}
                            className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100"
                         >
                            <ArrowLeftRight className="w-4 h-4" />
                         </button>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>
        )}
        {activeSettingsTab === 'company' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="sleek-card p-8 space-y-6">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Dados da Empresa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Nome Fantasia (Aparece no Recibo)</label>
                    <input 
                      type="text" 
                      value={companySettings.name}
                      onChange={e => setCompanySettings({...companySettings, name: e.target.value})}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">CNPJ / CPF</label>
                    <input 
                      type="text" 
                      value={companySettings.cnpj || ''}
                      onChange={e => setCompanySettings({...companySettings, cnpj: e.target.value})}
                      placeholder="00.000.000/0001-00"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Endereço Completo</label>
                  <input 
                    type="text" 
                    value={companySettings.address || ''}
                    onChange={e => setCompanySettings({...companySettings, address: e.target.value})}
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Link do Logo (PNG/SVG)</label>
                  <input 
                    type="text" 
                    value={companySettings.logo || ''}
                    onChange={e => setCompanySettings({...companySettings, logo: e.target.value})}
                    placeholder="https://sua-logo.com/logo.png"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700" 
                  />
                </div>
              </div>

              <div className="sleek-card p-8 bg-slate-900 text-white">
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                     <PrinterIcon className="w-6 h-6 text-emerald-400" />
                   </div>
                   <div>
                     <h4 className="font-bold">Prévia do Cabeçalho do Recibo</h4>
                     <p className="text-[10px] uppercase font-black text-white/40 tracking-widest">Visualização em tempo real</p>
                   </div>
                </div>
                <div className="bg-white p-6 rounded-xl text-slate-800 text-center font-mono text-xs space-y-1 shadow-inner max-w-sm mx-auto">
                   <p className="font-black text-sm uppercase">{companySettings.name}</p>
                   <p className="text-[10px] opacity-60 italic">{companySettings.address || 'Endereço não configurado'}</p>
                   {companySettings.cnpj && <p className="text-[10px] opacity-60">CNPJ: {companySettings.cnpj}</p>}
                   <div className="py-2 border-y border-dashed border-slate-200 my-2">-- CUPOM NÃO FISCAL --</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="sleek-card p-8 flex flex-col items-center text-center">
                 <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-6">Acesso p/ Funcionários</h3>
                 <div className="p-4 bg-white rounded-3xl shadow-xl border border-slate-100 mb-6">
                    <QRCodeSVG 
                      value={`${window.location.origin}${window.location.pathname}?linkToken=${linkToken}`} 
                      size={180}
                      level="H"
                      includeMargin={true}
                    />
                 </div>
                 <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                   Token: {linkToken}
                 </div>
                 <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-6">
                   Peça para o funcionário baixar o app e escanear este QR Code ou digitar o token acima para vincular o dispositivo à sua conta.
                 </p>
                 <button 
                  onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}?linkToken=${linkToken}`;
                    navigator.clipboard.writeText(url);
                    alert("Link copiado para a área de transferência!");
                  }}
                  className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                 >
                   <Copy className="w-3.5 h-3.5" /> Copiar Link de Acesso
                 </button>
              </div>
            </div>
          </div>
        )}

        {activeSettingsTab === 'devices' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {linkedDevices.map(device => (
              <div key={device.id} className="sleek-card p-6 flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3",
                    device.status === 'active' ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-slate-100 text-slate-400"
                  )}>
                    <Monitor className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 leading-tight">{device.name}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={cn("w-1.5 h-1.5 rounded-full", device.status === 'active' ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{device.status === 'active' ? 'Online agora' : 'Desconectado'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 mb-6">
                   <div className="flex justify-between text-[10px] font-bold">
                     <span className="text-slate-400 uppercase">Vinculado em</span>
                     <span className="text-slate-700">{format(device.linkedAt, 'dd/MM/yyyy HH:mm')}</span>
                   </div>
                   <div className="flex justify-between text-[10px] font-bold">
                     <span className="text-slate-400 uppercase">ID Único</span>
                     <span className="text-slate-700 font-mono">{device.id}</span>
                   </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-50">
                  <button 
                    onClick={() => {
                      if (device.id === 'dev-main') return alert("Não é possível desvincular o dispositivo principal.");
                      if (confirm("Deseja realmente desvincular este dispositivo?")) {
                        setLinkedDevices(prev => prev.filter(d => d.id !== device.id));
                      }
                    }}
                    className="w-full py-2.5 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 rounded-xl transition-all border border-red-100"
                  >
                    Desvincular Dispositivo
                  </button>
                </div>
              </div>
            ))}
            
            <div className="sleek-card border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30">
               <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-4">
                 <Link2 className="text-slate-300 w-6 h-6" />
               </div>
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-2">Aguardando novos dispositivos...</p>
               <p className="text-[9px] text-slate-400 mt-1 max-w-[150px]">Use o QR Code na aba 'Empresa' para vincular mais tablets ou celulares.</p>
            </div>
          </div>
        )}

        {activeSettingsTab === 'permissions' && (
          <div className="space-y-6">
            <div className="sleek-card p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Cargos e Níveis de Acesso</h3>
                  <p className="text-xs text-slate-500 font-medium">Defina quem pode ver o quê e quais ações podem executar</p>
                </div>
                <button 
                  onClick={() => setIsCreateRoleModalOpen(true)}
                  className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-slate-900/20 hover:scale-105 transition-all"
                >
                  <Plus className="w-4 h-4" /> Criar Novo Cargo
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rolePermissions.map(perm => (
                  <div key={perm.role} className="sleek-card p-6 bg-slate-50 border-slate-100 flex flex-col group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 text-emerald-500">
                        <Shield className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase px-2 py-1 rounded bg-white text-slate-400 border border-slate-100">
                          {perm.views.length} Telas
                        </span>
                      </div>
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg mb-1">{perm.label || perm.role.replace('_', ' ')}</h4>
                    <p className="text-[10px] font-mono text-slate-400 mb-6 uppercase tracking-tight italic">ID: {perm.role}</p>
                    
                    <div className="mt-auto flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setEditingRolePermissions(perm);
                          setIsPermissionModalOpen(true);
                        }}
                        className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-500 transition-all flex items-center justify-center gap-2"
                      >
                        <Settings className="w-3.5 h-3.5" /> Editar Permissões
                      </button>
                      {perm.role !== 'owner' && (
                        <button 
                          onClick={async () => {
                            if (confirm(`Excluir o cargo "${perm.label || perm.role}"? Isso pode afetar funcionários vinculados.`)) {
                              await firebaseService.deleteItem('rolePermissions', perm.role);
                            }
                          }}
                          className="w-12 h-11 flex items-center justify-center bg-white border border-slate-200 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex items-start gap-4">
              <div className="p-3 bg-amber-100 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900 mb-1">Dica de Segurança</h4>
                <p className="text-xs text-amber-700 leading-relaxed max-w-2xl">
                  Ao criar roles customizados, tente limitar ao máximo as ações críticas (Estornar Pedido, Ver Vendas) aos cargos de gerência. 
                  Você pode vincular múltiplos funcionários a um mesmo cargo para manter a consistência de acesso.
                </p>
              </div>
            </div>
          </div>
        )}
        {activeSettingsTab === 'system' && (
           <div className="sleek-card p-8 bg-white border border-slate-100 shadow-sm">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-6">Preferências do Sistema</h3>
              <div className="space-y-4 max-w-md">
                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="text-xs font-bold text-slate-800 tracking-tight">Taxa de Serviço (%)</p>
                      <p className="text-[9px] text-slate-400 font-medium">Aplicada no fechamento da conta</p>
                    </div>
                    <input 
                      type="number"
                      value={serviceChargePercentage}
                      onChange={e => setServiceChargePercentage(Number(e.target.value))}
                      className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-xs outline-none text-slate-700 text-center"
                    />
                 </div>
                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="text-xs font-bold text-slate-800 tracking-tight">Imposto Sobre Vendas (%)</p>
                      <p className="text-[9px] text-slate-400 font-medium">Calculado sobre o subtotal</p>
                    </div>
                    <input 
                      type="number"
                      value={taxPercentage}
                      onChange={e => setTaxPercentage(Number(e.target.value))}
                      className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-xs outline-none text-slate-700 text-center"
                    />
                 </div>
                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl opacity-50 grayscale">
                    <div>
                      <p className="text-xs font-bold text-slate-800 tracking-tight">Modo Offline (Cache Local)</p>
                      <p className="text-[9px] text-slate-400 font-medium tracking-tight">Sincronizar quando houver internet</p>
                    </div>
                    <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center text-white font-black text-[10px]">OFF</div>
                 </div>
              </div>

              <div className="mt-12 h-px bg-slate-100" />
              
              <div className="mt-12">
                 <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Modelo de Operação</h4>
                      <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-0.5">Definir fluxo de trabalho</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                    <button 
                       onClick={() => { setSystemMode('restaurant'); localStorage.setItem('rm_system_mode', 'restaurant'); }}
                       className={cn(
                         "p-6 rounded-3xl border-2 transition-all text-left flex flex-col gap-4 group relative overflow-hidden",
                         systemMode === 'restaurant' ? "border-emerald-500 bg-emerald-50/30 shadow-xl shadow-emerald-500/5" : "border-slate-100 hover:border-slate-200"
                       )}
                    >
                       <div className={cn(
                         "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                         systemMode === 'restaurant' ? "bg-emerald-500 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100 group-hover:bg-slate-50"
                       )}>
                          <UtensilsCrossed className="w-6 h-6" />
                       </div>
                       <div>
                         <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Restaurante</p>
                         <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">Gestão de mesas, comandas e fluxo completo de cozinha.</p>
                       </div>
                       {systemMode === 'restaurant' && <CheckCircle2 className="absolute top-4 right-4 w-5 h-5 text-emerald-500" />}
                    </button>

                    <button 
                       onClick={() => { setSystemMode('distributor'); localStorage.setItem('rm_system_mode', 'distributor'); }}
                       className={cn(
                         "p-6 rounded-3xl border-2 transition-all text-left flex flex-col gap-4 group relative overflow-hidden",
                         systemMode === 'distributor' ? "border-blue-500 bg-blue-50/30 shadow-xl shadow-blue-500/5" : "border-slate-100 hover:border-slate-200"
                       )}
                    >
                       <div className={cn(
                         "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                         systemMode === 'distributor' ? "bg-blue-500 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100 group-hover:bg-slate-50"
                       )}>
                          <ShoppingBag className="w-6 h-6" />
                       </div>
                       <div>
                         <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Varejo / Bar</p>
                         <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">Venda direta, balcão e integração com estoque rápido.</p>
                       </div>
                       {systemMode === 'distributor' && <CheckCircle2 className="absolute top-4 right-4 w-5 h-5 text-blue-500" />}
                    </button>

                    <button 
                       onClick={() => { setSystemMode('service'); localStorage.setItem('rm_system_mode', 'service'); }}
                       className={cn(
                         "p-6 rounded-3xl border-2 transition-all text-left flex flex-col gap-4 group relative overflow-hidden",
                         systemMode === 'service' ? "border-indigo-600 bg-indigo-50/30 shadow-xl shadow-indigo-600/5" : "border-slate-100 hover:border-slate-200"
                       )}
                    >
                       <div className={cn(
                         "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                         systemMode === 'service' ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100 group-hover:bg-slate-50"
                       )}>
                          <Briefcase className="w-6 h-6" />
                       </div>
                       <div>
                         <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Serviços</p>
                         <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">Gestão de tempo, agenda e recursos profissionais.</p>
                       </div>
                       {systemMode === 'service' && <CheckCircle2 className="absolute top-4 right-4 w-5 h-5 text-indigo-600" />}
                    </button>
                 </div>

                 <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0 animate-pulse">
                       <ArrowLeftRight className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                       <h4 className="text-lg font-black text-slate-900 tracking-tight">Trocar Módulo do Dispositivo</h4>
                       <p className="text-xs text-slate-500 font-bold leading-relaxed mt-1 uppercase tracking-tight">Isso reiniciará as configurações de inicialização deste dispositivo.</p>
                       <button 
                         onClick={() => {
                           if (confirm('🆘 ATENÇÃO: Isso reiniciará o aplicativo para a tela de seleção inicial. Deseja continuar?')) {
                            localStorage.removeItem('rm_system_mode');
                            localStorage.removeItem('rm_selected_shop_id');
                            window.location.reload();
                          }
                         }}
                         className="mt-6 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-rose-600 transition-all shadow-xl shadow-slate-900/10"
                       >
                         Reiniciar Seleção de Módulo
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </div>
    );
  };

  const handleCreateRole = async (name: string) => {
    if (!name.trim()) return;
    const roleId = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    // Check if exists
    if (rolePermissions.some(p => p.role === roleId)) {
      alert("Este cargo já existe ou possui um ID similar.");
      return;
    }

    const newPerm: RolePermissions = {
      role: roleId,
      label: name.trim(),
      views: ['dashboard'],
      actions: { 
        canVoid: false, 
        canDiscount: false, 
        canViewSales: false, 
        canManageStaff: false, 
        canManageInventory: false, 
        canEditMenu: false, 
        canReopenTable: false, 
        canManageSchedule: false 
      }
    };

    await firebaseService.saveItem('rolePermissions', roleId, newPerm);
    setIsCreateRoleModalOpen(false);
    setNewRoleName('');
  };

  const renderCreateRoleModal = () => (
    <AnimatePresence>
      {isCreateRoleModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
               <h3 className="text-lg font-bold text-slate-800 tracking-tight">Novo Cargo</h3>
               <button onClick={() => setIsCreateRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
               </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Nome do Cargo</label>
                <input 
                  autoFocus
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  placeholder="Ex: Supervisor, Sommelier, Hostess..."
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700" 
                />
              </div>
              <button 
                onClick={() => handleCreateRole(newRoleName)}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Plus className="w-4 h-4" />
                Criar Cargo
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderModifierModal = () => {
    if (!editingOrderItem) return null;

    const currentModifiers = editingOrderItem.modifiers || [];

    const toggleModifier = (name: string, type: ModifierType, price?: number, invId?: string) => {
      const exists = currentModifiers.find(m => m.name === name && m.type === type);
      let newModifiers: ItemModifier[] = [];
      if (exists) {
        newModifiers = currentModifiers.filter(m => !(m.name === name && m.type === type));
      } else {
        const inventoryItemId = invId || inventory.find(i => i.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(i.name.toLowerCase()))?.id;
        newModifiers = [...currentModifiers, { 
          id: Math.random().toString(36).substr(2, 5), 
          name, 
          type, 
          price: price || 0,
          inventoryItemId
        }];
      }
      
      const updatedItem = { ...editingOrderItem, modifiers: newModifiers };
      setEditingOrderItem(updatedItem);
      handleUpdateItemModifiers(editingOrderItem.id, newModifiers);
    };

    const addManualExtra = () => {
      if (!modCustomName) return;
      const price = parseFloat(modCustomPrice || '0');
      const invItem = inventory.find(i => i.name.toLowerCase().includes(modCustomName.toLowerCase()) || modCustomName.toLowerCase().includes(i.name.toLowerCase()));
      
      const newModifiers = [...currentModifiers, { 
        id: Math.random().toString(36).substr(2, 5), 
        name: modCustomName, 
        type: 'extra', 
        price,
        inventoryItemId: invItem?.id
      }];
      const updatedItem = { ...editingOrderItem, modifiers: newModifiers };
      setEditingOrderItem(updatedItem);
      handleUpdateItemModifiers(editingOrderItem.id, newModifiers);
      setModCustomName('');
      setModCustomPrice('');
    };

    const addManualRemove = () => {
      if (!modCustomRemove) return;
      const invItem = inventory.find(i => i.name.toLowerCase().includes(modCustomRemove.toLowerCase()) || modCustomRemove.toLowerCase().includes(i.name.toLowerCase()));
      
      const newModifiers = [...currentModifiers, { 
        id: Math.random().toString(36).substr(2, 5), 
        name: modCustomRemove, 
        type: 'remove',
        inventoryItemId: invItem?.id
      }];
      const updatedItem = { ...editingOrderItem, modifiers: newModifiers };
      setEditingOrderItem(updatedItem);
      handleUpdateItemModifiers(editingOrderItem.id, newModifiers);
      setModCustomRemove('');
    };

    return (
      <AnimatePresence>
        {isModifierModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Customizar Item</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{editingOrderItem.name}</p>
                </div>
                <button 
                  onClick={() => setIsModifierModalOpen(false)} 
                  className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100 transition-all hover:scale-110 active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                {/* Allergies - Standard Set */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Alergias (Aviso Cozinha)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {STANDARD_ALLERGIES.map(allergy => {
                      const isActive = currentModifiers.some(m => m.name === allergy && m.type === 'allergy');
                      return (
                        <button 
                          key={allergy}
                          onClick={() => toggleModifier(allergy, 'allergy')}
                          className={cn(
                            "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                            isActive ? "bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20" : "bg-white text-slate-400 border-slate-100 hover:border-amber-200"
                          )}
                        >
                          {allergy}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Remove - Customizable */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                    <Minus className="w-3.5 h-3.5 text-rose-500" />
                    Remover (SEM)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['Cebola', 'Tomate', 'Pão', 'Picles', 'Maionese', 'Alface'].map(item => {
                      const isActive = currentModifiers.some(m => m.name === item && m.type === 'remove');
                      return (
                        <button 
                          key={item}
                          onClick={() => toggleModifier(item, 'remove')}
                          className={cn(
                            "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                            isActive ? "bg-rose-500 text-white border-rose-600 shadow-lg shadow-rose-500/20" : "bg-white text-slate-400 border-slate-100 hover:border-rose-200"
                          )}
                        >
                          Sem {item}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Outro item para remover..."
                      value={modCustomRemove}
                      onChange={e => setModCustomRemove(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addManualRemove();
                      }}
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 outline-none text-[10px] font-black uppercase tracking-widest"
                    />
                    <button 
                      onClick={addManualRemove}
                      className="p-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all active:scale-90"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Extras - Customizable */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-blue-500" />
                    Adicionais (EXTRA)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[
                      { name: 'Carne', price: 8.00 },
                      { name: 'Queijo', price: 4.50 },
                      { name: 'Bacon', price: 6.00 },
                      { name: 'Ovo', price: 3.00 }
                    ].map(extra => {
                      const isActive = currentModifiers.some(m => m.name === extra.name && m.type === 'extra');
                      return (
                        <button 
                          key={extra.name}
                          onClick={() => {
                            setModCustomName(extra.name);
                            setModCustomPrice(extra.price.toString());
                          }}
                          className={cn(
                            "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                            isActive ? "bg-blue-500 text-white border-blue-600 shadow-lg shadow-blue-500/20" : "bg-white text-slate-400 border-slate-100 hover:border-blue-200"
                          )}
                        >
                          {extra.name}
                        </button>
                      );
                    })}
                  </div>
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 border-dashed">
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-4 ml-1 tracking-widest">Adicionar Customizado</p>
                    <div className="flex gap-2">
                      <input 
                        value={modCustomName}
                        onChange={e => setModCustomName(e.target.value)}
                        type="text" 
                        placeholder="Nome (ex: Bacon)"
                        className="flex-1 px-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-[10px] font-black uppercase tracking-widest"
                      />
                      <input 
                        value={modCustomPrice}
                        onChange={e => setModCustomPrice(e.target.value)}
                        type="number" 
                        placeholder="R$ 0,00"
                        className="w-24 px-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-xs font-mono font-bold"
                      />
                      <button 
                        onClick={addManualExtra}
                        className="p-3.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 active:scale-90"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Preço Final do Item</span>
                  <span className="text-2xl font-black text-white tracking-tight">
                    {formatCurrency(editingOrderItem.price + currentModifiers.reduce((acc, m) => acc + (m.price || 0), 0))}
                  </span>
                </div>
                <button 
                  onClick={() => setIsModifierModalOpen(false)}
                  className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl shadow-emerald-500/30 active:scale-95"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  const renderCustomization = () => {
    const config = businessConfigs.find(c => c.enterpriseId === enterpriseId) || {
      id: `cfg-${enterpriseId || 'local'}`,
      enterpriseId: enterpriseId || 'local',
      enabledModules: ['restaurant'],
      roles: [],
      workflows: {},
      customFields: []
    } as BusinessConfig;

    const handleSaveConfig = async (newConfig: Partial<BusinessConfig>) => {
      await firebaseService.saveItem('businessConfigs', config.id, { ...config, ...newConfig, enterpriseId });
    };

    const modules = [
      { id: 'restaurant', label: 'Restaurante', icon: <Utensils /> },
      { id: 'market', label: 'Mercado', icon: <ShoppingCart /> },
      { id: 'service', label: 'Serviços Master', icon: <Briefcase /> },
      { id: 'construction', label: 'Construção', icon: <Hammer /> },
      { id: 'retail', label: 'Varejo', icon: <Tag /> },
    ];

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Personalização Global</h2>
            <p className="text-slate-500 font-medium">Adapte a plataforma para o seu modelo de negócio</p>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            {(['modules', 'roles', 'workflows', 'fields', 'schedule'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setCustomizationTab(tab)}
                className={cn(
                  "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                  customizationTab === tab ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {tab === 'modules' && 'Módulos'}
                {tab === 'roles' && 'Cargos'}
                {tab === 'workflows' && 'Fluxos'}
                {tab === 'fields' && 'Campos'}
                {tab === 'schedule' && 'Agenda'}
              </button>
            ))}
          </div>
        </div>

        {customizationTab === 'modules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map(mod => {
              const isEnabled = config.enabledModules.includes(mod.id);
              return (
                <button
                  key={mod.id}
                  onClick={() => {
                    const next = isEnabled 
                      ? config.enabledModules.filter(m => m !== mod.id)
                      : [...config.enabledModules, mod.id];
                    handleSaveConfig({ enabledModules: next });
                  }}
                  className={cn(
                    "sleek-card p-8 flex flex-col items-center text-center gap-4 transition-all group border-2",
                    isEnabled ? "border-emerald-500 bg-emerald-50/30" : "border-slate-100 opacity-60 grayscale"
                  )}
                >
                  <div className={cn(
                    "w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-500 shadow-xl",
                    isEnabled ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-slate-100 text-slate-400"
                  )}>
                    {cloneElement(mod.icon as any, { className: "w-8 h-8" })}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tight">{mod.label}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {isEnabled ? 'Ativo' : 'Inativo'}
                    </p>
                  </div>
                  <div className={cn(
                    "w-full h-1.5 rounded-full mt-4 overflow-hidden bg-slate-100",
                  )}>
                    <motion.div 
                      initial={false}
                      animate={{ width: isEnabled ? '100%' : '0%' }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {customizationTab === 'roles' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Cargos da Empresa</h3>
                <button 
                  onClick={() => {
                    const newRole: CustomRole = {
                      id: `role-${Date.now()}`,
                      enterpriseId: enterpriseId!,
                      name: 'Novo Cargo',
                      permissions: [],
                      views: ['dashboard']
                    };
                    handleSaveConfig({ roles: [...(config.roles || []), newRole] });
                  }}
                  className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all"
                >+ Novo Cargo</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(config.roles || []).map(role => (
                  <div key={role.id} className="sleek-card p-6 flex flex-col gap-4 border-2 border-transparent hover:border-emerald-200 transition-all">
                    <div className="flex items-center justify-between">
                      <input 
                        type="text"
                        value={role.name}
                        onChange={(e) => {
                          const updated = config.roles.map(r => r.id === role.id ? { ...r, name: e.target.value } : r);
                          handleSaveConfig({ roles: updated });
                        }}
                        className="text-lg font-black text-slate-800 bg-transparent outline-none focus:text-emerald-600 w-full"
                      />
                      <button 
                        onClick={() => {
                          const updated = config.roles.filter(r => r.id !== role.id);
                          handleSaveConfig({ roles: updated });
                        }}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Acessos Recomendados</p>
                      <div className="flex flex-wrap gap-2">
                        {role.views.map(v => (
                          <span key={v} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-tight">{v}</span>
                        ))}
                        <button className="px-2 py-1 border border-slate-200 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-tight hover:bg-emerald-50 hover:text-emerald-600">Ver Todas</button>
                      </div>
                    </div>
                  </div>
                ))}
                {config.roles?.length === 0 && (
                  <div className="col-span-full py-12 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nenhum cargo personalizado criado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {customizationTab === 'fields' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Campos Personalizados (Custom Fields)</h3>
              <button 
                onClick={() => {
                  const newField: CustomFieldDefinition = {
                    id: `field-${Date.now()}`,
                    enterpriseId: enterpriseId!,
                    module: config.enabledModules[0] || 'restaurant',
                    targetEntity: 'Product',
                    name: `custom_${Date.now()}`,
                    label: 'Novo Campo',
                    type: 'string',
                    required: false
                  };
                  handleSaveConfig({ customFields: [...(config.customFields || []), newField] });
                }}
                className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
              >+ Adicionar Campo</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(config.customFields || []).map(field => (
                <div key={field.id} className="sleek-card p-6 flex flex-col gap-4 group">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[8px] font-black uppercase tracking-widest">{field.module}</span>
                    <button 
                       onClick={() => {
                        const updated = config.customFields.filter(f => f.id !== field.id);
                        handleSaveConfig({ customFields: updated });
                      }}
                       className="p-2 text-slate-300 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Nome Exibido</label>
                      <input 
                        type="text"
                        value={field.label}
                        onChange={(e) => {
                          const updated = config.customFields.map(f => f.id === field.id ? { ...f, label: e.target.value } : f);
                          handleSaveConfig({ customFields: updated });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-emerald-500/10"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Tipo</label>
                        <select 
                          value={field.type}
                          onChange={(e) => {
                            const updated = config.customFields.map(f => f.id === field.id ? { ...f, type: e.target.value as any } : f);
                            handleSaveConfig({ customFields: updated });
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-bold"
                        >
                          <option value="string">Texto</option>
                          <option value="number">Número</option>
                          <option value="boolean">Sim/Não</option>
                          <option value="date">Data</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Entidade</label>
                        <select 
                          value={field.targetEntity}
                          onChange={(e) => {
                            const updated = config.customFields.map(f => f.id === field.id ? { ...f, targetEntity: e.target.value as any } : f);
                            handleSaveConfig({ customFields: updated });
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-bold"
                        >
                          <option value="Product">Produto</option>
                          <option value="Staff">Funcionário</option>
                          <option value="Table">Mesa/Setor</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {customizationTab === 'schedule' && (
          <div className="sleek-card p-1">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Escala Global de Operação</h3>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-1">Gerencie turnos de todos os módulos em um só lugar</p>
              </div>
              <button 
                className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl shadow-slate-200"
              >+ Escalar Turno</button>
            </div>
            <div className="p-8">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-slate-100">
                      <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Colaborador</th>
                      <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Módulo</th>
                      <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Função</th>
                      <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Horário</th>
                      <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                      <th className="pb-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {staffSchedules.map(sch => (
                      <tr key={sch.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 overflow-hidden shadow-sm">
                              {staff.find(s => s.id === sch.staffId)?.photo ? (
                                <img src={staff.find(s => s.id === sch.staffId)?.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="w-full h-full flex items-center justify-center text-[10px] font-black text-white">
                                  {staff.find(s => s.id === sch.staffId)?.name.substring(0,2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-bold text-slate-700">{staff.find(s => s.id === sch.staffId)?.name || 'Removido'}</span>
                          </div>
                        </td>
                        <td className="py-4">
                           <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-tight">{sch.module}</span>
                        </td>
                        <td className="py-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sch.role}</span>
                        </td>
                        <td className="py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">08:00 - 16:00</span>
                            <span className="text-[9px] text-slate-400 font-medium tracking-tight">Terça, 22 Abr</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                            sch.status === 'confirmed' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                          )}>{sch.status === 'confirmed' ? 'Confirmado' : 'Planejado'}</span>
                        </td>
                        <td className="py-4 text-right">
                          <button className="p-2 text-slate-300 hover:text-emerald-500 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {staffSchedules.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-20 text-center">
                          <Calendar className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Sem escalas definidas para este período</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {customizationTab === 'workflows' && (
           <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.filter(m => config.enabledModules.includes(m.id)).map(m => (
                  <div key={m.id} className="sleek-card p-8 group hover:border-emerald-200 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-6 shadow-xl group-hover:bg-emerald-500 transition-colors">
                      {cloneElement(m.icon as any, { className: "w-6 h-6" })}
                    </div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Fluxos: {m.label}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium mb-6">Defina as regras automáticas de operação para {m.label.toLowerCase()}.</p>
                    <button className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[1.5rem] text-[10px] font-black uppercase text-slate-400 tracking-widest hover:border-emerald-500 hover:text-emerald-600 transition-all">
                      Configurar Regras
                    </button>
                  </div>
                ))}
             </div>
           </div>
        )}
      </div>
    );
  };

  const handleSendPendingToKitchen = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = order.items.map(item => ({
      ...item,
      sentToKitchen: true,
      status: (item.status === 'pending' ? 'preparing' : item.status) as ItemStatus
    }));

    const updates = {
      items: updatedItems,
      status: 'preparing' as OrderStatus
    };

    await firebaseService.updateItem('orders', orderId, updates);
  };

  const renderPendingOrders = () => {
    let pendingOrders = orders.filter(o => 
      o.status !== 'delivered' && o.status !== 'cancelled'
    );

    // Apply Filters
    if (pendingOrderFilter === 'to_kitchen') {
      pendingOrders = pendingOrders.filter(o => o.items.some(i => !i.sentToKitchen && i.status !== 'voided'));
    } else if (pendingOrderFilter === 'waiting_payment') {
      pendingOrders = pendingOrders.filter(o => o.items.every(i => i.status === 'ready' || i.status === 'delivered' || i.status === 'voided'));
    }

    // Apply Sorting
    pendingOrders = pendingOrders.sort((a,b) => {
      if (pendingOrderSort === 'time') return a.startTime - b.startTime; // Oldest first
      if (pendingOrderSort === 'value') return b.total - a.total;
      if (pendingOrderSort === 'table') {
        const tableA = tables.find(t => t.id === a.tableId)?.number || 0;
        const tableB = tables.find(t => t.id === b.tableId)?.number || 0;
        return tableA - tableB;
      }
      return 0;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestão de Pedidos Ativos</h2>
            <p className="text-sm text-slate-500 font-medium">Controle de pagamentos e fluxos de produção</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
                {(['all', 'to_kitchen', 'waiting_payment'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setPendingOrderFilter(f)}
                    className={cn(
                      "px-3 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all",
                      pendingOrderFilter === f ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {f === 'all' ? 'Todos' : f === 'to_kitchen' ? 'A enviar' : 'A pagar'}
                  </button>
                ))}
             </div>

             <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
                <span className="px-2 text-[8px] font-black text-slate-400 uppercase">Ordenar:</span>
                {(['time', 'value', 'table'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setPendingOrderSort(s)}
                    className={cn(
                      "px-3 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all",
                      pendingOrderSort === s ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {s === 'time' ? 'Tempo' : s === 'value' ? 'Valor' : 'Mesa'}
                  </button>
                ))}
             </div>

             <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase text-amber-600">{pendingOrders.length} Resultados</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pendingOrders.map(order => {
             const table = tables.find(t => t.id === order.tableId);
             const hasUnsentItems = order.items.some(i => !i.sentToKitchen && i.status !== 'voided');
             
             return (
               <motion.div 
                 key={order.id}
                 layout
                 className="sleek-card overflow-hidden flex flex-col group hover:border-emerald-200 transition-all shadow-xl"
               >
                 <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                    <div>
                       <div className="flex items-center gap-2 mb-1">
                          {order.orderType === 'takeaway' ? (
                            <ShoppingBag className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <TableIcon className="w-4 h-4 text-emerald-400" />
                          )}
                          <h4 className="font-black text-lg">
                            {order.orderType === 'takeaway' ? `Retirada #${order.takeawayNumber}` : `Mesa 0${table?.number || '?'}`}
                          </h4>
                       </div>
                       <p className="text-[9px] font-black opacity-40 uppercase tracking-[0.2em]">ID: {order.id.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xl font-black text-emerald-400 tracking-tighter">{formatCurrency(order.total)}</p>
                       <p className="text-[9px] font-black opacity-40 uppercase">{Math.floor((Date.now() - order.startTime) / 60000)}m Decorridos</p>
                    </div>
                 </div>

                 <div className="p-6 flex-1 space-y-4">
                    <div className="space-y-2">
                       {order.items.slice(0, 3).map((item, idx) => (
                         <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-slate-600 font-bold"><span className="text-emerald-500">{item.quantity}x</span> {item.name}</span>
                            <span className={cn(
                              "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                              item.sentToKitchen ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                            )}>
                               {item.sentToKitchen ? 'Enviado' : 'Aguardando'}
                            </span>
                         </div>
                       ))}
                       {order.items.length > 3 && (
                         <p className="text-[10px] text-slate-400 italic">+ {order.items.length - 3} outros itens...</p>
                       )}
                    </div>

                    {order.notes && (
                      <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl relative mt-2">
                         <span className="absolute -top-2 left-3 px-2 bg-amber-100 text-amber-700 text-[8px] font-black uppercase rounded shadow-sm">Observação</span>
                         <p className="text-xs text-amber-700 font-medium italic">{order.notes}</p>
                      </div>
                    )}
                 </div>

                 <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleOpenPaymentModal(order)}
                      className="col-span-2 py-4 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Wallet className="w-3.5 h-3.5" /> Marcar Pago
                    </button>
                    
                    <button 
                      onClick={() => {
                        const note = prompt("Adicionar observação ao pedido:", order.notes || "");
                        if (note !== null) {
                           const updates = { notes: note };
                           firebaseService.updateItem('orders', order.id, updates);
                        }
                      }}
                      className="py-3 bg-white text-slate-700 border border-slate-200 font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <ClipboardList className="w-3.5 h-3.5 text-slate-400" /> Notas
                    </button>

                    <button 
                      onClick={() => handleOrderStatusChange(order.id, 'cancelled')}
                      className="py-3 bg-white text-rose-600 border border-rose-100 font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-rose-50 transition-all flex items-center justify-center gap-2 shadow-sm shadow-rose-500/5 hover:border-rose-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Cancelar
                    </button>

                    {hasUnsentItems && (
                      <button 
                        onClick={() => handleSendPendingToKitchen(order.id)}
                        className="col-span-2 py-3 bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10"
                      >
                         <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" /> Enviar à Cozinha
                      </button>
                    )}
                 </div>
               </motion.div>
             );
          })}

          {pendingOrders.length === 0 && (
            <div className="col-span-full py-40 text-center">
               <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
               </div>
               <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Tudo em Ordem!</h3>
               <p className="text-slate-400 text-sm font-medium">Nenhum pedido pendente de pagamento ou envio.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView setCurrentView={setCurrentView} setSelectedShopId={setSelectedShopId} />;
      case 'tables': return renderTables();
      case 'pending_orders': return renderPendingOrders();
      case 'orders': return renderOrders();
      case 'kitchen': return renderKitchen();
      case 'bar': return renderBar();
      case 'inventory': return renderInventory();
      case 'reports': return renderReports();
      case 'history': return renderHistory();
      case 'staff_mgmt': return <GeneralStaffView module="restaurant" />;
      case 'finance_mgmt': return <FinanceManagementView module="restaurant" shopId={selectedShopId} />;
      case 'supplier_mgmt': return <SupplierManagementView module="restaurant" />;
      case 'service_mgmt': return <ServiceLayout />;
      case 'menu_mgmt': return renderMenuManagement();
      case 'reservations': return renderReservations();
      case 'printer_mgmt': return renderPrinterManagement();
      case 'schedule': return <StaffScheduleView module="restaurant" />;
      case 'safety': return renderSafety();
      case 'settings': return renderSettings();
      case 'customization': return renderCustomization();
      case 'company_mgmt': return <CompanyManagement />;
      case 'staff_pnl': return (
        <StaffDashboard 
          staff={currentUser} 
          enterprise={enterprises.find(e => e.id === enterpriseId) || null}
          shops={shops}
          schedules={staffSchedules}
        />
      );
      case 'holding': return <HoldingDashboard onSelectEnterprise={handleSelectEnterprise} onLogout={handleLogout} />;
      default: return renderDashboard();
    }
  };


  if (!currentUser) return <LoginView />;
  if (holdingActive) return <HoldingDashboard onSelectEnterprise={handleSelectEnterprise} onLogout={handleLogout} />;

  return (
    <div 
      className="min-h-screen bg-surface-bg flex flex-col lg:flex-row text-slate-900 font-sans overflow-x-hidden"
      style={{ 
        transform: appScale < 1 ? `scale(${appScale})` : 'none', 
        transformOrigin: 'top center',
        width: appScale < 1 ? `${100 / appScale}%` : '100%',
        minHeight: appScale < 1 ? `${100 / appScale}vh` : '100vh'
      }}
    >
      {renderPermissionModal()}
      {renderShiftModal()}
      {renderModifierModal()}
      {renderTableEditModal()}
      {/* Sidebar - responsive drawer */}
      <aside className={cn(
        "fixed inset-y-0 left-0 bg-sidebar-bg border-r border-slate-800 flex flex-col h-screen p-4 sm:p-6 overflow-hidden transition-all duration-500 z-[160] lg:static lg:translate-x-0 lg:flex shadow-2xl lg:shadow-none",
        isSidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 lg:opacity-100",
        isSidebarCollapsed ? "w-24" : "w-72 max-w-[85vw]"
      )}>
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 shrink-0 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/50">
                <span className="text-white font-bold text-sm">RM</span>
              </div>
              {!isSidebarCollapsed && (
                <motion.h1 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-lg font-bold tracking-tight text-white truncate"
                >
                  RestManager
                </motion.h1>
              )}
            </div>
            <button 
              onClick={() => isSidebarOpen ? setIsSidebarOpen(false) : setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 text-slate-500 hover:text-white transition-colors"
            >
              <AnimatePresence mode="wait">
                {isSidebarCollapsed ? (
                  <motion.div key="open" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }}>
                    <PanelLeft className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div key="close" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -90 }}>
                    <PanelLeftClose className="w-6 h-6 hidden lg:block" />
                    <X className="w-6 h-6 lg:hidden" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Shop Switcher */}
          {!isSidebarCollapsed && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-2"
            >
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2 block">Unidade Selecionada</label>
              <div className="relative group">
                <select 
                  value={selectedShopId || ''}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 text-slate-200 text-xs font-bold py-3 pl-4 pr-10 rounded-xl appearance-none outline-none focus:border-emerald-500 transition-all cursor-pointer"
                >
                  {shops.filter(s => accessibleShopIds.includes(s.id)).map(shop => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover:text-slate-300" />
              </div>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
          {(!isSidebarCollapsed) && <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest px-4 mb-2 mt-2">Para Você</div>}
          {canAccessView('staff_pnl') && (
            <NavItem 
              icon={<User />} 
              label="Meu Painel" 
              active={currentView === 'staff_pnl'} 
              onClick={() => setCurrentView('staff_pnl')} 
              isCollapsed={isSidebarCollapsed}
              className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            />
          )}

          {currentUser?.role === 'waiter' ? (
            <>
              {isModuleEnabled('restaurant') && (
                <>
                  {!isSidebarCollapsed && <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest px-4 mb-2 mt-2">Operação</div>}
                  <NavItem icon={<TableIcon />} label="Minhas Mesas" active={currentView === 'tables'} onClick={() => setCurrentView('tables')} isCollapsed={isSidebarCollapsed} />
                  {canAccessView('pending_orders') && (
                    <NavItem 
                      icon={<ClipboardList />} 
                      label="Pedidos Ativos" 
                      active={currentView === 'pending_orders'} 
                      onClick={() => setCurrentView('pending_orders')} 
                      isCollapsed={isSidebarCollapsed} 
                      badge={orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length || undefined}
                    />
                  )}
                  {canAccessView('orders') && <NavItem icon={<ShoppingCart />} label="Novo Pedido" active={currentView === 'orders'} onClick={() => { setSelectedTable(null); setCurrentView('orders'); }} isCollapsed={isSidebarCollapsed} />}
                  {canAccessView('bar') && <NavItem icon={<Beer />} label="Pedidos Bar" active={currentView === 'bar'} onClick={() => setCurrentView('bar')} isCollapsed={isSidebarCollapsed} />}
                </>
              )}
              {canAccessView('history') && <NavItem icon={<History />} label="Meus Atendimentos" active={currentView === 'history'} onClick={() => setCurrentView('history')} isCollapsed={isSidebarCollapsed} />}
            </>
          ) : (
            <>
              {systemMode === 'distributor' ? (
                <>
                  {canAccessView('orders') && <NavItem icon={<ShoppingCart />} label="PDV / Balcão" active={currentView === 'orders'} onClick={() => { setSelectedTable(null); setCurrentView('orders'); }} isCollapsed={isSidebarCollapsed} />}
                  {canAccessView('dashboard') && <NavItem icon={<LayoutDashboard />} label="Dashboard" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} isCollapsed={isSidebarCollapsed} />}
                  {isModuleEnabled('restaurant') && canAccessView('tables') && <NavItem icon={<TableIcon />} label="Mesas (Garçom)" active={currentView === 'tables'} onClick={() => setCurrentView('tables')} isCollapsed={isSidebarCollapsed} />}
                </>
              ) : (
                <>
                  {canAccessView('dashboard') && <NavItem icon={<LayoutDashboard />} label="Dashboard" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} isCollapsed={isSidebarCollapsed} />}
                  {isModuleEnabled('restaurant') && (
                    <>
                      {canAccessView('tables') && <NavItem icon={<TableIcon />} label="Mesas / Salão" active={currentView === 'tables'} onClick={() => setCurrentView('tables')} isCollapsed={isSidebarCollapsed} />}
                      {canAccessView('pending_orders') && (
                        <NavItem 
                          icon={<ClipboardList />} 
                          label="Pedidos Ativos" 
                          active={currentView === 'pending_orders'} 
                          onClick={() => setCurrentView('pending_orders')} 
                          isCollapsed={isSidebarCollapsed} 
                          badge={orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length || undefined}
                        />
                      )}
                      {canAccessView('orders') && <NavItem icon={<ShoppingCart />} label="Venda Rápida" active={currentView === 'orders'} onClick={() => { setSelectedTable(null); setCurrentView('orders'); }} isCollapsed={isSidebarCollapsed} />}
                    </>
                  )}
                </>
              )}

              {isModuleEnabled('restaurant') && (
                <>
                  {canAccessView('reservations') && <NavItem icon={<Calendar />} label="Reservas" active={currentView === 'reservations'} onClick={() => setCurrentView('reservations')} isCollapsed={isSidebarCollapsed} />}
                  {canAccessView('kitchen') && systemMode !== 'distributor' && (
                    <NavItem 
                      icon={<ClipboardList />} 
                      label="Cozinha (KDS)" 
                      active={currentView === 'kitchen'} 
                      onClick={() => setCurrentView('kitchen')} 
                      isCollapsed={isSidebarCollapsed} 
                      badge={orders.filter(o => o.status === 'preparing' || o.status === 'pending').length || undefined}
                    />
                  )}
                  {canAccessView('bar') && systemMode !== 'distributor' && <NavItem icon={<Beer />} label="Bar (BDS)" active={currentView === 'bar'} onClick={() => setCurrentView('bar')} isCollapsed={isSidebarCollapsed} />}
                </>
              )}

              {isModuleEnabled('market') && (
                 <>
                   {!isSidebarCollapsed && <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest px-4 mb-2 mt-4">Mercado</div>}
                   {canAccessView('orders') && <NavItem icon={<ShoppingCart />} label="Frente de Caixa" active={currentView === 'orders'} onClick={() => setCurrentView('orders')} isCollapsed={isSidebarCollapsed} />}
                   {canAccessView('inventory') && <NavItem icon={<Package />} label="Estoque Loja" active={currentView === 'inventory'} onClick={() => setCurrentView('inventory')} isCollapsed={isSidebarCollapsed} />}
                 </>
              )}

              {isModuleEnabled('construction') && (
                 <>
                   {!isSidebarCollapsed && <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest px-4 mb-2 mt-4">Construção</div>}
                   <NavItem icon={<HardHat />} label="Minhas Obras" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} isCollapsed={isSidebarCollapsed} />
                   <NavItem icon={<Hammer />} label="Logística" active={currentView === 'history'} onClick={() => setCurrentView('history')} isCollapsed={isSidebarCollapsed} />
                 </>
              )}
              
              {canAccessView('printer_mgmt') && <NavItem icon={<PrinterIcon />} label="Impressoras" active={currentView === 'printer_mgmt'} onClick={() => setCurrentView('printer_mgmt')} isCollapsed={isSidebarCollapsed} />}
            </>
          )}

          {currentUser?.role !== 'waiter' && (canAccessView('menu_mgmt') || canAccessView('inventory') || canAccessView('reports') || canAccessView('history') || canAccessView('staff_mgmt') || canAccessView('schedule') || canAccessView('safety')) && (
            <div className={cn("pt-4 mt-4 border-t border-slate-800", isSidebarCollapsed && "px-0")}>
              {!isSidebarCollapsed && <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest px-4 mb-2">Administração</div>}
              {canAccessView('safety') && <NavItem icon={<ShieldCheck />} label="Saúde & Segurança" active={currentView === 'safety'} onClick={() => setCurrentView('safety')} isCollapsed={isSidebarCollapsed} />}
              {canAccessView('schedule') && <NavItem icon={<Clock />} label="Escala Semanal" active={currentView === 'schedule'} onClick={() => setCurrentView('schedule')} isCollapsed={isSidebarCollapsed} />}
              {canAccessView('menu_mgmt') && <NavItem icon={<UtensilsCrossed />} label="Gerenciar Itens" active={currentView === 'menu_mgmt'} onClick={() => setCurrentView('menu_mgmt')} isCollapsed={isSidebarCollapsed} />}
              {canAccessView('inventory') && <NavItem icon={<Package />} label="Estoque" active={currentView === 'inventory'} onClick={() => setCurrentView('inventory')} isCollapsed={isSidebarCollapsed} />}
              {canAccessView('reports') && <NavItem icon={<BarChart3 />} label="Relatórios" active={currentView === 'reports'} onClick={() => setCurrentView('reports')} isCollapsed={isSidebarCollapsed} />}
              {canAccessView('history') && <NavItem icon={<History />} label="Histórico" active={currentView === 'history'} onClick={() => setCurrentView('history')} isCollapsed={isSidebarCollapsed} />}
              {canAccessView('staff_mgmt') && <NavItem icon={<Users />} label="RH & Performance" active={currentView === 'staff_mgmt'} onClick={() => setCurrentView('staff_mgmt')} isCollapsed={isSidebarCollapsed} />}
              {canAccessView('finance_mgmt') && <NavItem icon={<Wallet />} label="Fluxo Financeiro" active={currentView === 'finance_mgmt'} onClick={() => setCurrentView('finance_mgmt')} isCollapsed={isSidebarCollapsed} />}
              {isModuleEnabled('service') && canAccessView('service_mgmt') && (
                <NavItem 
                  icon={<Briefcase />} 
                  label="Unidade de Serviço" 
                  active={currentView === 'service_mgmt'} 
                  onClick={() => setCurrentView('service_mgmt')} 
                  isCollapsed={isSidebarCollapsed} 
                  className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                />
              )}
              {canAccessView('supplier_mgmt') && <NavItem icon={<Truck />} label="Fornecedores B2B" active={currentView === 'supplier_mgmt'} onClick={() => setCurrentView('supplier_mgmt')} isCollapsed={isSidebarCollapsed} />}
              {canAccessView('settings') && <NavItem icon={<Settings />} label="Configurações" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} isCollapsed={isSidebarCollapsed} />}
              {currentUser?.role === 'owner' && <NavItem icon={<Settings2 />} label="Customização Global" active={currentView === 'customization'} onClick={() => setCurrentView('customization')} isCollapsed={isSidebarCollapsed} />}
              {<NavItem icon={<Building2 />} label="Gestão da Unidade" active={currentView === 'company_mgmt'} onClick={() => setCurrentView('company_mgmt')} isCollapsed={isSidebarCollapsed} />}
              {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
                <NavItem 
                  icon={<LayoutDashboard />} 
                  label="Selecionar Empresa" 
                  active={false} 
                  onClick={() => setHoldingActive(true)} 
                  isCollapsed={isSidebarCollapsed} 
                  className="bg-rose-500/10 text-rose-400 border border-rose-500/20 mt-4"
                />
              )}
            </div>
          )}

          {showDevTools && (
            <div className="pt-6 mt-6 border-t border-slate-800 space-y-3">
              {!isSidebarCollapsed && <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest px-4">Ferramentas de Simulação</div>}
              <button 
                onClick={handleRoleCycle}
                title={isSidebarCollapsed ? `Cargo: ${(currentUser?.role || 'waiter').replace('_', ' ').toUpperCase()}` : undefined}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-amber-400 hover:bg-amber-500/10 transition-all border border-amber-500/20 overflow-hidden",
                  isSidebarCollapsed && "justify-center px-0"
                )}
              >
                  <Zap className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && (
                    <span className="truncate">
                      Simular Cargo: {(currentUser?.role || 'waiter').replace('_', ' ').toUpperCase()}
                    </span>
                  )}
              </button>
            </div>
          )}
          
          <div className="pt-6 mt-6 border-t border-slate-800 space-y-3">
             <button
                onClick={handleLogout}
                title={isSidebarCollapsed ? "Encerrar Turno" : undefined}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 transition-all border border-rose-500/10 mt-2 overflow-hidden",
                  isSidebarCollapsed && "justify-center px-0"
                )}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span>Encerrar Turno</span>}
             </button>
          </div>
        </nav>

        <div className={cn("mt-auto p-4 border-t border-slate-800/50", isSidebarCollapsed && "p-2")}>
          {!isSidebarCollapsed && (
            <div className="bg-slate-800/50 rounded-xl p-4 flex flex-col gap-4 border border-slate-800 overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm",
                    currentUser?.role === 'owner' ? "bg-slate-700 text-slate-300" : currentUser?.role === 'waiter' ? "bg-amber-500/20 text-amber-500" : "bg-blue-500/20 text-blue-400"
                  )}>
                    {currentUser?.photo ? (
                      <img src={currentUser.photo} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      currentUser?.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '??'
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white leading-none mb-1 truncate">
                    {currentUser?.name || 'Funcionário'}
                  </p>
                  <p className={cn(
                    "text-[10px] uppercase tracking-widest font-black",
                    currentUser?.role === 'owner' ? "text-emerald-500" : currentUser?.role === 'waiter' ? "text-amber-500" : "text-blue-400"
                  )}>
                    {currentUser?.role === 'owner' ? 'Gerente Ativo' : currentUser?.role === 'waiter' ? 'Garçom' : currentUser?.role === 'admin' ? 'Desenvolvedor' : currentUser?.role?.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[140] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Area */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-32 lg:pb-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden w-10 h-10 sleek-card flex items-center justify-center text-slate-600 border-none hover:bg-slate-50"
            >
              <Layout className="w-5 h-5" />
            </button>
            <div className="flex lg:hidden items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs uppercase">RM</span>
              </div>
              <span className="font-bold text-slate-900">RestManager</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-8">
             <div className="flex flex-col">
               <h2 className="text-sm font-black text-slate-800 tracking-tight uppercase">
                 {currentUser?.role === 'waiter' ? 'Modo Garçom' : currentView.replace('_', ' ')}
               </h2>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                 {currentShop?.name} • {currentUser?.role === 'waiter' 
                   ? `${filteredTables.length} Mesas Designadas` 
                   : `Empresa: ${enterpriseId}`}
               </p>
             </div>
             <div className="h-4 w-px bg-slate-100" />
             {currentPermissions.actions.canViewSales && (
               <>
                 <div className="flex flex-col">
                   <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Vendas Hoje</span>
                   <span className="text-lg font-bold text-slate-900">
                     {formatCurrency(dashboardStats.totalSalesToday)} 
                     <span className={cn(
                       "text-xs font-black ml-2",
                       dashboardStats.trend >= 0 ? "text-emerald-500" : "text-rose-500"
                     )}>
                       {dashboardStats.trend >= 0 ? '+' : ''}{dashboardStats.trend.toFixed(0)}%
                     </span>
                   </span>
                 </div>
                 <div className="h-8 w-px bg-slate-200"></div>
               </>
             )}
             <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Mesas Ativas</span>
                <span className="text-lg font-bold text-slate-900">
                  {dashboardStats.activeTablesCount} / {selectedShopId ? tables.filter(t => t.shopId === selectedShopId).length : tables.length}
                </span>
             </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
               <div className={cn("w-1.5 h-1.5 rounded-full", meshNetwork.isConnectedToLocalMesh ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
               <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest whitespace-nowrap">
                 {meshNetwork.isConnectedToLocalMesh ? 'Mesh Local: Ativa' : 'Mesh Local: Off'}
               </span>
               <button 
                onClick={() => meshNetwork.scanForNearbyNodes()}
                className="ml-1 p-1 bg-white border border-slate-200 rounded-md hover:bg-slate-50"
                title="Escanear Bluetooth"
               >
                 <Zap className="w-2.5 h-2.5 text-amber-500" />
               </button>
            </div>
            <AnimatePresence>
              {isPrinting && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-600 rounded-full border border-emerald-200"
                >
                  <PrinterIcon className="w-3 h-3 animate-bounce" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Imprimindo...</span>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="relative">
              <button 
                onClick={() => setIsNotificationPaneOpen(!isNotificationPaneOpen)}
                className={cn(
                  "relative p-2.5 sleek-card hover:bg-slate-50 transition-all border-none cursor-pointer",
                  isNotificationPaneOpen && "bg-slate-100 ring-2 ring-emerald-500/20"
                )}
              >
                <Bell className={cn("w-5 h-5", notifications.some(n => !n.read) ? "text-emerald-500" : "text-slate-400")} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationPaneOpen && (
                  <>
                    <div className="fixed inset-0 z-40 lg:absolute lg:inset-auto lg:right-0 lg:top-full lg:mt-4" onClick={() => setIsNotificationPaneOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="fixed top-20 right-4 left-4 z-50 lg:absolute lg:top-full lg:right-0 lg:left-auto lg:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Notificações</h4>
                        <button 
                          onClick={handleClearNotifications}
                          className="text-[10px] font-bold text-emerald-600 hover:underline"
                        >
                          Limpar todas
                        </button>
                      </div>
                      <div className="max-h-96 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-300">
                             <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                             <p className="text-[10px] font-black uppercase tracking-widest leading-tight">Nenhuma notificação</p>
                          </div>
                        ) : (
                          notifications.map(notif => (
                            <div 
                              key={notif.id} 
                              onClick={() => {
                                markNotificationAsRead(notif.id);
                                if (notif.tableId) {
                                  const table = tables.find(t => t.id === notif.tableId);
                                  if (table) {
                                    handleOpenTable(table);
                                    setIsNotificationPaneOpen(false);
                                  }
                                }
                              }}
                              className={cn(
                                "p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-start gap-3",
                                !notif.read && "bg-emerald-50/30"
                              )}
                            >
                              {notif.type.includes('bar') && <div className="w-2 h-2 mt-1.5 rounded-full shrink-0 bg-blue-500 animate-pulse" />}
                              {notif.type.includes('kitchen') && <div className="w-2 h-2 mt-1.5 rounded-full shrink-0 bg-amber-500 animate-pulse" />}
                              {!notif.type.includes('bar') && !notif.type.includes('kitchen') && <div className="w-2 h-2 mt-1.5 rounded-full shrink-0 bg-emerald-400" />}
                              <div>
                                <p className={cn(
                                  "text-xs font-bold leading-snug",
                                  notif.type === 'order_ready_bar' ? "text-blue-600 font-black" :
                                  notif.type === 'order_ready_kitchen' ? "text-amber-600 font-black" :
                                  "text-slate-800"
                                )}>{notif.message}</p>
                                <p className="text-[9px] text-slate-400 font-medium mt-1">{format(notif.timestamp, 'HH:mm:ss', { locale: ptBR })}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="h-8 w-[1px] bg-slate-200" />
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm">
              {currentUser?.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
            </div>
          </div>
        </header>

        <section className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.15 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>

      {/* Bottom Nav - Mobile */}
      <nav className="lg:hidden fixed bottom-6 left-4 right-4 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-3 flex items-center justify-around z-50">
        <MobileNavItem icon={<LayoutDashboard />} active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
        <MobileNavItem icon={<TableIcon />} active={currentView === 'tables'} onClick={() => setCurrentView('tables')} />
        
        <button 
          onClick={() => { setSelectedTable(null); setCurrentView('tables'); }}
          className="bg-emerald-500 p-4 rounded-2xl shadow-lg -mt-12 border-4 border-slate-900 transform active:scale-90 transition-all"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>

        <MobileNavItem icon={<ClipboardList />} active={currentView === 'kitchen'} onClick={() => setCurrentView('kitchen')} />
        <MobileNavItem icon={<History />} active={currentView === 'history'} onClick={() => {
           if (currentUser?.role === 'waiter' || currentUser?.role === 'owner') setCurrentView('staff_management');
           else setCurrentView('reports');
        }} />
      </nav>
      {renderIncidentModal()}
      {renderPermissionModal()}
      {renderCreateRoleModal()}
      {renderQuickStockModal()}
    </div>
  );
}

// --- Internal Components ---

function MobileNavItem({ icon, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-2 rounded-xl transition-all relative",
        active ? "text-emerald-400 scale-110" : "text-slate-500"
      )}
    >
      {cloneElement(icon, { className: "w-6 h-6" })}
      {active && (
        <motion.div 
          layoutId="mob-nav-active" 
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400"
        />
      )}
    </button>
  );
}

function LegendItem({ color, label }: any) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-3 h-3 rounded-full", color)} />
      <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">{label}</span>
    </div>
  );
}

function FinanceCard({ title, value, percentage, color, icon }: any) {
  return (
    <div className="sleek-card p-6 bg-white border-slate-100 relative overflow-hidden group">
      <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 transition-transform group-hover:scale-150 duration-700", color)} />
      <div className="flex items-center gap-3 mb-4">
         <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg", color)}>
            {icon}
         </div>
         <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-tight">{title}</span>
      </div>
      <div className="flex items-baseline gap-2">
         <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
         <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", color.replace('bg-', 'bg-opacity-10 text-'))}>
            {percentage}
         </span>
      </div>
    </div>
  );
}

function CostBar({ label, value, total, color }: any) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-2">
       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
          <span className="text-slate-500">{label}</span>
          <div className="flex items-center gap-3">
             <span className="text-slate-400">{formatCurrency(value)}</span>
             <span className="text-slate-900">{percentage.toFixed(1)}%</span>
          </div>
       </div>
       <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, percentage)}%` }}
            className={cn("h-full rounded-full shadow-sm", color)}
          />
       </div>
    </div>
  );
}



