import { StaffScheduleView } from './core/views/StaffScheduleView';
import { GeneralStaffView } from './core/views/GeneralStaffView';
import { RestaurantEmployees } from './modules/restaurant/views/RestaurantEmployees';
import { FinanceManagementView } from './core/views/FinanceManagementView';
import { SupplierManagementView } from './core/views/SupplierManagementView';
import { RestaurantLayout } from './modules/restaurant/views/RestaurantLayout';
import { RestaurantDashboard } from './modules/restaurant/views/RestaurantDashboard';
import { CompanyManagement } from './core/views/CompanyManagement';
import { ServiceLayout } from './modules/service/views/ServiceLayout';
import { DashboardView } from './core/views/DashboardView';
import { GlobalSettingsView } from './core/views/GlobalSettingsView';
import { CustomizationView } from './core/views/CustomizationView';
import { PrinterManagementView } from './core/views/PrinterManagementView';

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
  const [selectedArea, setSelectedArea] = useState<string>('SalÃƒÂ£o Principal');
  
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
        console.error('Falha ao iniciar sessÃƒÂ£o Firebase', error);
        setAuthReady(false);
        setAuthError('NÃƒÂ£o foi possÃƒÂ­vel autenticar no Firebase para modo Cloud.');
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
    if (!confirm(`Ã¢Å¡Â Ã¯Â¸Â ATENÃƒâ€¡ÃƒÆ’O: Isso apagarÃƒÂ¡ TODOS os dados da empresa "${enterpriseId}" (pedidos, funcionÃƒÂ¡rios, produtos, mesas) e reiniciarÃƒÂ¡ com os dados padrÃƒÂ£o. Deseja continuar?`)) return;
    
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
      
      alert("OperaÃƒÂ§ÃƒÂ£o concluÃƒÂ­da com sucesso!");
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Erro ao processar reset.");
    }
  };

  const handleSeedTablesForCurrentShop = async () => {
    if (!selectedShopId) return;
    const areas = ['SalÃƒÂ£o Principal', 'Varanda Gourmet'];
    for (const area of areas) {
      const prefix = area === 'SalÃƒÂ£o Principal' ? 'p' : 'v';
      for (let i = 1; i <= 20; i++) {
        const tableId = `t-${selectedShopId}-${prefix}${i}`;
        const x = ((i - 1) % 5) * 160 + 80;
        const y = Math.floor((i - 1) / 5) * 140 + 80;
        
        await firebaseService.saveItem('tables', tableId, {
          id: tableId,
          shopId: selectedShopId,
          number: area === 'SalÃƒÂ£o Principal' ? i : i + 20,
          status: 'free',
          capacity: i <= 8 ? 2 : 4,
          position: { x, y },
          area: area
        });
      }
    }
    alert("40 mesas geradas com sucesso (20 por ÃƒÂ¡rea)!");
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
      // Suporte para celulares pequenos e mÃƒÂ©dios para evitar quebras de layout
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
      alert(`Ambiente "${areaName}" criado! Agora vocÃƒÂª pode adicionar mesas nesta ÃƒÂ¡rea.`);
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
  const [inventoryCategories, setInventoryCategories] = useState(['Carnes', 'Panificados', 'Vegetais', 'LaticÃƒÂ­nios', 'Bebidas', 'Secos']);
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
  // Modifiers State
  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);
  const [editingOrderItem, setEditingOrderItem] = useState<OrderItem | null>(null);
  const [modCustomName, setModCustomName] = useState('');
  const [modCustomPrice, setModCustomPrice] = useState('');
  const [modCustomRemove, setModCustomRemove] = useState('');

  const STANDARD_ALLERGIES = [
    'Amendoim', 'GlÃºten', 'Lactose', 'Frutos do Mar', 'Ovo', 'Soja', 'Nozes', 'Peixe', 'Trigo', 'Leite', 'Castanhas'
  ];

  // State for legacy components that still require it
  const [isPrinting, setIsPrinting] = useState(false);
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
GarÃƒÂ§om: ${staffMember?.name || 'Sistema'}
Data: ${format(order.startTime, 'dd/MM/yyyy HH:mm')}
-------------------------------
${order.items.filter(i => i.status !== 'voided').map(i => `${i.quantity}x ${i.name}\n${formatCurrency((i.price + (i.modifiers || []).reduce((acc, m) => acc + (m.price || 0), 0)) * i.quantity)}`).join('\n')}
-------------------------------
Subtotal: \t${formatCurrency(order.subtotal)}
ServiÃƒÂ§o (10%): \t${formatCurrency(order.serviceFee || 0)}
Desconto: \t-${formatCurrency(order.discount)}
TOTAL: \t\t${formatCurrency(order.total)}
===============================
Obrigado pela preferÃƒÂªncia!
    `;
    handlePrintToPrinter('receipt', receiptContent);
  };

  const handleExportSalesToExcel = () => {
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    if (deliveredOrders.length === 0) {
      alert("NÃƒÂ£o hÃƒÂ¡ vendas finalizadas para exportar.");
      return;
    }

    const data = deliveredOrders.map(order => ({
      'ID Pedido': order.id.toUpperCase(),
      'Data': format(order.closedAt || order.startTime, 'dd/MM/yyyy HH:mm:ss'),
      'Mesa': tables.find(t => t.id === order.tableId)?.number || '??',
      'Atendente': staff.find(s => s.id === order.staffId)?.name || 'Sistema',
      'Itens': order.items.filter(i => i.status !== 'voided').map(i => `${i.quantity}x ${i.name}`).join(', '),
      'Subtotal': order.subtotal,
      'ServiÃƒÂ§o': order.serviceFee || 0,
      'Desconto': order.discount,
      'Total': order.total,
      'MÃƒÂ©todo Pagamento': order.paymentMethod || 'N/A'
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
        title: 'RelatÃƒÂ³rio de Vendas RestManager',
        text: 'Segue em anexo o relatÃƒÂ³rio de vendas em formato Excel.',
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
      alert("Erro ao atualizar estoque. Verifique a conexÃƒÂ£o.");
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
    if (['HambÃƒÂºrgueres', 'Burgers', 'Pratos Principais'].includes(product.category)) {
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
        alert("VocÃƒÂª nÃƒÂ£o tem permissÃƒÂ£o para cancelar itens jÃƒÂ¡ enviados.");
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
        message: `Ã°Å¸Ââ€” Cozinha: Novo Pedido ${tableNumDisplay}`,
        type: 'new_order_kitchen',
        tableId: tableIdVal,
        timestamp: Date.now(),
        read: false
      });
    }
    if (newItems.some(i => barCategories.includes(i.category))) {
      await firebaseService.addItem('notifications', {
        shopId: (selectedShopId || 'shop-1'),
        message: `Ã°Å¸ÂÂ¹ Bar: Novo Pedido ${tableNumDisplay}`,
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

    // "se o cliente desistiu cancelar mesa com 2 confirmaÃƒÂ§ÃƒÂ£o"
    if (confirm("Ã¢Å¡Â Ã¯Â¸Â Esta mesa jÃƒÂ¡ possui itens enviados para a cozinha. Deseja realmente CANCELAR toda a conta?")) {
      if (confirm("Ã¢Ââ€” CONFIRMAÃƒâ€¡ÃƒÆ’O FINAL: Todos os itens serÃƒÂ£o invalidados e a mesa serÃƒÂ¡ liberada. Deseja prosseguir?")) {
        const voidReason = "Cancelamento Total (DesistÃƒÂªncia)";
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
    const tablesInThisArea = tables.filter(t => (t.area || 'SalÃƒÂ£o Principal') === selectedArea && t.shopId === (selectedShopId || 'shop-1'));
    
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
      alert("NÃƒÂ£o ÃƒÂ© possÃƒÂ­vel remover uma mesa com pedidos ativos.");
      return;
    }
    await firebaseService.deleteItem('tables', id);
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
          message: `Ã°Å¸â€â€ Pedido pronto para a Mesa 0${table.number}`,
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
      message: `${isBar ? 'Ã°Å¸ÂÂ¹ Drink' : 'Ã°Å¸ÂÂ³ Prato'} pronto: ${order.orderType === 'takeaway' ? `Takeaway #${order.takeawayNumber}` : `Mesa 0${table?.number}`}`,
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
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ConfiguraÃƒÂ§ÃƒÂµes e LocalizaÃƒÂ§ÃƒÂ£o</p>
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
                      <label htmlFor="edit-table-number" className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">NÃƒÂºmero da Mesa</label>
                      <input
                        id="edit-table-number"
                        type="number"
                        value={editingTable.number}
                        onChange={(e) => setEditingTable({ ...editingTable, number: parseInt(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        title="NÃƒÂºmero da Mesa"
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
                    <label htmlFor="edit-table-area" className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">ÃƒÂrea / Ambiente</label>
                    <select
                      id="edit-table-area"
                      value={editingTable.area || 'SalÃƒÂ£o Principal'}
                      onChange={(e) => setEditingTable({ ...editingTable, area: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none"
                      title="ÃƒÂrea da Mesa"
                    >
                      {Array.from(new Set(tables.map(t => t.area || 'SalÃƒÂ£o Principal'))).map(area => (
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
                      Salvar AlteraÃƒÂ§ÃƒÂµes
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
          if (cart.length > 0 && confirm("Esta mesa jÃƒÂ¡ tem um pedido ativo. Deseja mesclar seu carrinho atual com o pedido da mesa?")) {
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
                Ao vincular, este dispositivo terÃƒÂ¡ acesso sincronizado ao estoque, pedidos e relatÃƒÂ³rios da empresa.
              </p>
            </div>
          </div>
        </motion.div>
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
               </div>
             )}
          </div>
        </div>

        <div className="sleek-card bg-white border-slate-100 overflow-hidden shadow-2xl">
           <div className="grid grid-cols-[200px_repeat(7,1fr)] bg-slate-50/50 border-b border-slate-100">
              <div className="p-4 border-r border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">Equipe</div>
              {weekDays.map(day => (
                <div key={day.toString()} className={cn(
                  "p-4 border-r border-slate-100 last:border-r-0 text-center flex flex-col",
                  isSameDay(day, new Date()) && "bg-emerald-50/50"
                )}>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{format(day, 'EEE', { locale: ptBR })}</span>
                  <span className="text-sm font-black text-slate-800">{format(day, 'dd/MM')}</span>
                </div>
              ))}
           </div>

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

        {/* Legend */}
        <div className="flex items-center gap-6 px-4">
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: areaColors.BOH }} />
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Back of House (Cozinha)</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: areaColors.FOH }} />
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Front of House (SalÃ£o)</span>
           </div>
        </div>
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
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">FuncionÃƒÂ¡rio</label>
                  <select name="staffId" defaultValue={editingShift?.staffId} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700 appearance-none">
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">ÃƒÂrea</label>
                    <select name="area" defaultValue={editingShift?.area || 'FOH'} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700 appearance-none">
                      <option value="FOH">Front of House (SalÃƒÂ£o)</option>
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
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">InÃƒÂ­cio</label>
                    <input type="time" name="startTime" defaultValue={editingShift ? format(editingShift.startTime, 'HH:mm') : '08:00'} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">TÃƒÂ©rmino</label>
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
                    {['Cebola', 'Tomate', 'PÃƒÂ£o', 'Picles', 'Maionese', 'Alface'].map(item => {
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
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">PreÃƒÂ§o Final do Item</span>
                  <span className="text-2xl font-black text-white tracking-tight">
                    {formatCurrency(editingOrderItem.price + currentModifiers.reduce((acc, m) => acc + (m.price || 0), 0))}
                  </span>
                </div>
                <button 
                  onClick={() => setIsModifierModalOpen(false)}
                  className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl shadow-emerald-500/20"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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



  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <RestaurantDashboard setCurrentView={setCurrentView} setSelectedShopId={setSelectedShopId} />;
      case 'tables': return <RestaurantLayout defaultView="tables" />;
      case 'pending_orders': return <RestaurantLayout defaultView="pending_orders" />;
      case 'orders': return <RestaurantLayout defaultView="orders" />;
      case 'kitchen': return <RestaurantLayout defaultView="kitchen" />;
      case 'bar': return <RestaurantLayout defaultView="kitchen" />;
      case 'inventory': return <RestaurantLayout defaultView="inventory" />;
      case 'reports': return <RestaurantLayout defaultView="history" />;
      case 'history': return <RestaurantLayout defaultView="history" />;
      case 'staff_mgmt': return <GeneralStaffView module="restaurant" />;
      case 'finance_mgmt': return <FinanceManagementView module="restaurant" shopId={selectedShopId} />;
      case 'supplier_mgmt': return <SupplierManagementView module="restaurant" />;
      case 'service_mgmt': return <ServiceLayout />;
      case 'menu_mgmt': return <RestaurantLayout defaultView="menu" />;
      case 'reservations': return <RestaurantLayout defaultView="reservations" />;
      case 'printer_mgmt': return (
        <PrinterManagementView 
          onNew={() => { setEditingPrinter(null); setIsPrinterModalOpen(true); }}
          onEdit={(p) => { setEditingPrinter(p); setIsPrinterModalOpen(true); }}
        />
      );
      case 'schedule': return <StaffScheduleView module={systemMode} />;
      case 'safety': return <RestaurantLayout defaultView="safety" />;
      case 'settings': return (
        <GlobalSettingsView 
          enterpriseId={enterpriseId}
          companySettings={companySettings}
          setCompanySettings={setCompanySettings}
          isDeviceLinked={isDeviceLinked}
          linkedDevices={linkedDevices}
          linkToken={linkToken}
        />
      );
      case 'customization': return <CustomizationView enterpriseId={enterpriseId} />;
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
      default: return <RestaurantDashboard setCurrentView={setCurrentView} setSelectedShopId={setSelectedShopId} />;
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
          {(!isSidebarCollapsed) && <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest px-4 mb-2 mt-2">Para VocÃƒÂª</div>}
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
                  {!isSidebarCollapsed && <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest px-4 mb-2 mt-2">OperaÃƒÂ§ÃƒÂ£o</div>}
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
                  {canAccessView('orders') && <NavItem icon={<ShoppingCart />} label="PDV / BalcÃƒÂ£o" active={currentView === 'orders'} onClick={() => { setSelectedTable(null); setCurrentView('orders'); }} isCollapsed={isSidebarCollapsed} />}
                  {canAccessView('dashboard') && <NavItem icon={<LayoutDashboard />} label="Dashboard" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} isCollapsed={isSidebarCollapsed} />}
                  {isModuleEnabled('restaurant') && canAccessView('tables') && <NavItem icon={<TableIcon />} label="Mesas (GarÃƒÂ§om)" active={currentView === 'tables'} onClick={() => setCurrentView('tables')} isCollapsed={isSidebarCollapsed} />}
                </>
              ) : (
                <>
                  {canAccessView('dashboard') && <NavItem icon={<LayoutDashboard />} label="Dashboard" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} isCollapsed={isSidebarCollapsed} />}
                  {isModuleEnabled('restaurant') && (
                    <>
                      {canAccessView('tables') && <NavItem icon={<TableIcon />} label="Mesas / SalÃƒÂ£o" active={currentView === 'tables'} onClick={() => setCurrentView('tables')} isCollapsed={isSidebarCollapsed} />}
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
                      {canAccessView('orders') && <NavItem icon={<ShoppingCart />} label="Venda RÃƒÂ¡pida" active={currentView === 'orders'} onClick={() => { setSelectedTable(null); setCurrentView('orders'); }} isCollapsed={isSidebarCollapsed} />}
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
                   {!isSidebarCollapsed && <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest px-4 mb-2 mt-4">ConstruÃƒÂ§ÃƒÂ£o</div>}
                   <NavItem icon={<HardHat />} label="Minhas Obras" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} isCollapsed={isSidebarCollapsed} />
                   <NavItem icon={<Hammer />} label="LogÃƒÂ­stica" active={currentView === 'history'} onClick={() => setCurrentView('history')} isCollapsed={isSidebarCollapsed} />
                 </>
              )}
              
              {canAccessView('printer_mgmt') && <NavItem icon={<PrinterIcon />} label="Impressoras" active={currentView === 'printer_mgmt'} onClick={() => setCurrentView('printer_mgmt')} isCollapsed={isSidebarCollapsed} />}
            </>
          )}

          {currentUser?.role !== 'waiter' && (canAccessView('menu_mgmt') || canAccessView('inventory') || canAccessView('reports') || canAccessView('history') || canAccessView('staff_mgmt') || canAccessView('schedule') || canAccessView('safety')) && (
            <div className={cn("pt-4 mt-4 border-t border-slate-800", isSidebarCollapsed && "px-0")}>
              {!isSidebarCollapsed && <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest px-4 mb-2">AdministraÃƒÂ§ÃƒÂ£o</div>}
              {canAccessView('safety') && <NavItem icon={<ShieldCheck />} label="SaÃƒÂºde & SeguranÃƒÂ§a" active={currentView === 'safety'} onClick={() => setCurrentView('safety')} isCollapsed={isSidebarCollapsed} />}
              {canAccessView('schedule') && <NavItem icon={<Clock />} label="Escala Semanal" active={currentView === 'schedule'} onClick={() => setCurrentView('schedule')} isCollapsed={isSidebarCollapsed} />}
              {canAccessView('menu_mgmt') && <NavItem icon={<UtensilsCrossed />} label="Gerenciar Itens" active={currentView === 'menu_mgmt'} onClick={() => setCurrentView('menu_mgmt')} isCollapsed={isSidebarCollapsed} />}
              {canAccessView('inventory') && <NavItem icon={<Package />} label="Estoque" active={currentView === 'inventory'} onClick={() => setCurrentView('inventory')} isCollapsed={isSidebarCollapsed} />}
              {canAccessView('reports') && <NavItem icon={<BarChart3 />} label="RelatÃƒÂ³rios" active={currentView === 'reports'} onClick={() => setCurrentView('reports')} isCollapsed={isSidebarCollapsed} />}
              {canAccessView('history') && <NavItem icon={<History />} label="HistÃƒÂ³rico" active={currentView === 'history'} onClick={() => setCurrentView('history')} isCollapsed={isSidebarCollapsed} />}
              {canAccessView('staff_mgmt') && <NavItem icon={<Users />} label="RH & Performance" active={currentView === 'staff_mgmt'} onClick={() => setCurrentView('staff_mgmt')} isCollapsed={isSidebarCollapsed} />}
              {canAccessView('finance_mgmt') && <NavItem icon={<Wallet />} label="Fluxo Financeiro" active={currentView === 'finance_mgmt'} onClick={() => setCurrentView('finance_mgmt')} isCollapsed={isSidebarCollapsed} />}
              {isModuleEnabled('service') && canAccessView('service_mgmt') && (
                <NavItem 
                  icon={<Briefcase />} 
                  label="Unidade de ServiÃƒÂ§o" 
                  active={currentView === 'service_mgmt'} 
                  onClick={() => setCurrentView('service_mgmt')} 
                  isCollapsed={isSidebarCollapsed} 
                  className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                />
              )}
              {canAccessView('supplier_mgmt') && <NavItem icon={<Truck />} label="Fornecedores B2B" active={currentView === 'supplier_mgmt'} onClick={() => setCurrentView('supplier_mgmt')} isCollapsed={isSidebarCollapsed} />}
              {canAccessView('settings') && <NavItem icon={<Settings />} label="ConfiguraÃƒÂ§ÃƒÂµes" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} isCollapsed={isSidebarCollapsed} />}
              {currentUser?.role === 'owner' && <NavItem icon={<Settings2 />} label="CustomizaÃƒÂ§ÃƒÂ£o Global" active={currentView === 'customization'} onClick={() => setCurrentView('customization')} isCollapsed={isSidebarCollapsed} />}
              {<NavItem icon={<Building2 />} label="GestÃƒÂ£o da Unidade" active={currentView === 'company_mgmt'} onClick={() => setCurrentView('company_mgmt')} isCollapsed={isSidebarCollapsed} />}
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
              {!isSidebarCollapsed && <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest px-4">Ferramentas de SimulaÃƒÂ§ÃƒÂ£o</div>}
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
                    {currentUser?.name || 'FuncionÃƒÂ¡rio'}
                  </p>
                  <p className={cn(
                    "text-[10px] uppercase tracking-widest font-black",
                    currentUser?.role === 'owner' ? "text-emerald-500" : currentUser?.role === 'waiter' ? "text-amber-500" : "text-blue-400"
                  )}>
                    {currentUser?.role === 'owner' ? 'Gerente Ativo' : currentUser?.role === 'waiter' ? 'GarÃƒÂ§om' : currentUser?.role === 'admin' ? 'Desenvolvedor' : currentUser?.role?.replace('_', ' ')}
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
                 {currentUser?.role === 'waiter' ? 'Modo GarÃƒÂ§om' : currentView.replace('_', ' ')}
               </h2>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                 {currentShop?.name} Ã¢â‚¬Â¢ {currentUser?.role === 'waiter' 
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
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">NotificaÃƒÂ§ÃƒÂµes</h4>
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
                             <p className="text-[10px] font-black uppercase tracking-widest leading-tight">Nenhuma notificaÃƒÂ§ÃƒÂ£o</p>
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



