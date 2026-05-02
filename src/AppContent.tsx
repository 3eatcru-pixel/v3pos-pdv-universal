import React, { useState, useMemo, Suspense, lazy, useEffect, cloneElement } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Table as TableIcon, ClipboardList, ShoppingCart, 
  Package, History, Users, Wallet, Settings, LogOut, Bell, Zap, 
  Printer as PrinterIcon, Calendar, Briefcase, ShieldCheck, PieChart, AlertTriangle, Minus, Plus, Link2, Trash2, Clock, Building2, Layout, Settings2, UtensilsCrossed, BarChart3, Truck, HardHat, Hammer, Tag, Utensils,
  PanelLeft, PanelLeftClose, X, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfDay, addDays, endOfDay, isSameDay, eachDayOfInterval, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale'; // Import ptBR locale

import { Table, Order, InventoryItem, Staff, Shift, Shop, AppNotification, OrderItem, View, UserRole, ItemModifier, OrderStatus, ItemStatus, Product, RecountRequest, CompanySettings, DeviceLink, BusinessConfig, Enterprise, Printer, PrinterType, ModifierType } from './types';
import { useCollection } from './hooks/useCollection';
import { accountService } from './core/services/accountService';
import { firebaseService } from './services/firebaseService';
import { InventoryEngine } from './core/services/InventoryEngine';
import { ShiftEngine } from './core/services/ShiftEngine';
import { idGenerator } from './core/utils/idGenerator';
import { logger } from './core/services/logger';
import { meshNetwork } from './services/p2pSync';
import { cn, formatCurrency } from './lib/utils';
import { MOCK_PERMISSIONS, MOCK_PRODUCTS, MOCK_TABLES, MOCK_INVENTORY, MOCK_ORDERS, MOCK_STAFF } from './mockData'; // Added MOCK_PRODUCTS, MOCK_TABLES, MOCK_INVENTORY, MOCK_ORDERS, MOCK_STAFF
import { paymentService } from './services/paymentService'; // Import paymentService
import { calculateOrderTotals } from './core/utils/OrderCalculator'; // Import calculateOrderTotals
import * as XLSX from 'xlsx'; // Import XLSX for Excel export
import { printerService } from './services/printerService'; // Import printerService

// Lazy Components
const RestaurantDashboard = lazy(() => import('./modules/restaurant/views/RestaurantDashboard').then(m => ({ default: m.RestaurantDashboard })));
const RestaurantLayout = lazy(() => import('./modules/restaurant/views/RestaurantLayout').then(m => ({ default: m.RestaurantLayout })));
const StaffDashboard = lazy(() => import('./core/views/StaffDashboard').then(m => ({ default: m.StaffDashboard })));
const FinanceManagementView = lazy(() => import('./core/views/FinanceManagementView').then(m => ({ default: m.FinanceManagementView })));
const GlobalSettingsView = lazy(() => import('./core/views/GlobalSettingsView').then(m => ({ default: m.GlobalSettingsView })));
const DeviceLinkingView = lazy(() => import('./core/views/DeviceLinkingView').then(m => ({ default: m.DeviceLinkingView }))); // Lazy import DeviceLinkingView
const ScheduleView = lazy(() => import('./core/components/ScheduleView').then(m => ({ default: m.ScheduleView }))); // Lazy import ScheduleView
const CompanyManagement = lazy(() => import('./core/views/CompanyManagement').then(m => ({ default: m.CompanyManagement }))); // Lazy import CompanyManagement
const CustomizationView = lazy(() => import('./core/views/GlobalSettingsView').then(m => ({ default: m.CustomizationView }))); // Lazy import CustomizationView
const SupplierManagementView = lazy(() => import('./core/views/SupplierManagementView').then(m => ({ default: m.SupplierManagementView }))); // Lazy import SupplierManagementView
const ServiceLayout = lazy(() => import('./modules/service/views/ServiceLayout').then(m => ({ default: m.ServiceLayout }))); // Lazy import ServiceLayout
const GeneralStaffView = lazy(() => import('./core/views/GeneralStaffView').then(m => ({ default: m.GeneralStaffView }))); // Lazy import GeneralStaffView
const PrinterManagementView = lazy(() => import('./core/views/PrinterManagementView').then(m => ({ default: m.PrinterManagementView }))); // Lazy import PrinterManagementView
const PurchasingForecastView = lazy(() => import('./modules/retail/views/PurchasingForecastView').then(m => ({ default: m.PurchasingForecastView }))); // Lazy import PurchasingForecastView

// Core Components
import { NavItem } from './core/components/CommonUI';
import { ErrorBoundary } from './core/components/ErrorBoundary';
import { TableEditModal } from './core/components/TableEditModal';
import { ModifierModal } from './core/components/ModifierModal';
import { ShiftModal } from './core/components/ShiftModal';

export function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.substring(1) || 'dashboard';

  // --- Estados e Dados ---
  const enterpriseId = useMemo(() => accountService.getCurrentCompanyId() || 'unauthorized', []);
  
  // Nexus Standard: selectedShopId deve ser derivado diretamente do serviço de conta
  const [selectedShopId, setSelectedShopIdState] = useState<string | null>(() => accountService.getSelectedShopId());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('pos_restaurant_sidebar_collapsed') === 'true');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationPaneOpen, setIsNotificationPaneOpen] = useState(false);

  const setSelectedShopId = (id: string | null) => {
    accountService.setSelectedShopId(id);
    setSelectedShopIdState(id);
    // Auditoria: Força o reload de coleções dependentes via troca de estado
    logger.info('system', 'Troca de unidade operacional confirmada', { shopId: id });
  };

  const currentUser = useMemo(() => {
    const globalUser = accountService.getCurrentUser();
    if (!globalUser) return null;
    return { ...globalUser, role: globalUser.role === 'dev' ? 'admin' : globalUser.role } as any;
  }, []);

  // Coleções Atômicas
  const { data: shops, setData: setShops } = useCollection<Shop>('shops', { enterpriseId });
  const { data: tables, setData: setTables } = useCollection<Table>('tables', { enterpriseId, shopId: selectedShopId });
  const { data: orders, setData: setOrders } = useCollection<Order>('orders', { enterpriseId, shopId: selectedShopId });
  const { data: notifications, setData: setNotifications } = useCollection<AppNotification>('notifications', { enterpriseId, shopId: selectedShopId });
  const { data: inventory, setData: setInventory } = useCollection<InventoryItem>('inventory', { enterpriseId, shopId: selectedShopId });
  const { data: staff, setData: setStaff } = useCollection<Staff>('staff', { enterpriseId });
  const { data: shifts, setData: setShifts } = useCollection<Shift>('shifts', { enterpriseId, shopId: selectedShopId });
  const { data: products, setData: setProducts } = useCollection<Product>('products', { enterpriseId, shopId: selectedShopId }); // Added products
  const { data: printers, setData: setPrinters } = useCollection<any>('printers', { enterpriseId, shopId: selectedShopId }); // Added printers
  const { data: businessConfigs } = useCollection<BusinessConfig>('businessConfigs', { enterpriseId }); // Added businessConfigs
  const { data: rolePermissions } = useCollection<any>('rolePermissions', { enterpriseId }); // Added rolePermissions
  const { data: reservations, setData: setReservations } = useCollection<any>('reservations', { enterpriseId, shopId: selectedShopId }); // Added reservations
  const { data: recountRequests, setData: setRecountRequests } = useCollection<RecountRequest>('recountRequests', { enterpriseId, shopId: selectedShopId }); // Added recountRequests
  const { data: enterprises } = useCollection<Enterprise>('enterprises', { enterpriseId: null, shopId: null }); // Added enterprises for StaffDashboard


  // Modais
  const [isEditTableModalOpen, setIsEditTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [editingOrderItem, setEditingOrderItem] = useState<OrderItem | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);

  // Permissões
  const currentPermissions = useMemo(() => 
    MOCK_PERMISSIONS.find(p => p.role === currentUser?.role) || MOCK_PERMISSIONS.find(p => p.role === 'waiter')!
  , [currentUser]);

  const accessibleShopIds = useMemo(() => {
    const baseShops = shops.map((s: any) => s.id);
    if (currentUser?.role === 'owner' || currentUser?.role === 'admin') return baseShops;
    
    const assigned = currentUser?.assignedShopIds || [];
    // Nexus Standard: Intersecção para garantir que o usuário não tenha acesso a IDs de lojas deletadas
    return assigned.filter((id: string) => baseShops.includes(id));
  }, [currentUser, shops]);

  // --- Handlers ---
  const handleLogout = () => {
    meshNetwork.disconnect();
    accountService.logout();
  };
  
  const markNotificationAsRead = async (id: string) => {
    await firebaseService.updateItem('notifications', id, { read: true });
  };

  const handleUpdateTable = async (tableId: string, updates: Partial<any>) => {
    await firebaseService.updateItem('tables', tableId, updates);
  };

  const handleRemoveTable = async (id: string) => {
    if (orders.find((o: any) => o.tableId === id && o.status !== 'delivered')) {
      alert("Não é possível remover uma mesa com pedidos ativos.");
      return;
    }
    await firebaseService.deleteItem('tables', id);
  };

  const handleUpdateItemModifiers = (itemId: string, modifiers: any[]) => {
    // Lógica para atualizar modificadores no estado global de pedidos/carrinho
    console.log(`[CORE] Modificadores atualizados para o item ${itemId}`);
  };

  const handleSaveShift = async (shift: any) => {
    await ShiftEngine.saveShift({
      editingShift,
      selectedShopId,
      ...shift
    });
    setIsShiftModalOpen(false);
    setEditingShift(null);
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (confirm("Remover este turno?")) {
      await ShiftEngine.deleteShift(shiftId);
      setIsShiftModalOpen(false);
    }
  };

  // --- Renderização ---
  const dashboardStats = useMemo(() => ({
    totalSalesToday: orders.filter((o: any) => o.status === 'delivered').reduce((acc: number, o: any) => acc + o.total, 0),
    activeTablesCount: tables.filter((t: any) => t.status === 'occupied').length,
    trend: 12
  }), [orders, tables]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-900 font-sans overflow-x-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 bg-slate-900 border-r border-slate-800 flex flex-col h-screen p-4 sm:p-6 transition-all duration-500 z-[160] lg:static lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isSidebarCollapsed ? "w-24" : "w-72"
      )}>
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-white">RM</div>
            {!isSidebarCollapsed && <h1 className="text-white font-bold tracking-tight">Nexus POS</h1>}
          </div>
          <button onClick={() => isSidebarCollapsed ? setIsSidebarCollapsed(false) : setIsSidebarCollapsed(true)} className="text-slate-500 hover:text-white">
            {isSidebarCollapsed ? <PanelLeft className="w-6 h-6" /> : <PanelLeftClose className="w-6 h-6" />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
          <NavItem icon={<LayoutDashboard />} label="Dashboard" active={currentPath === 'dashboard'} onClick={() => navigate('/dashboard')} isCollapsed={isSidebarCollapsed} />
          <NavItem icon={<TableIcon />} label="Mesas" active={currentPath === 'tables'} onClick={() => navigate('/tables')} isCollapsed={isSidebarCollapsed} />
          <NavItem icon={<ShoppingCart />} label="PDV" active={currentPath === 'orders'} onClick={() => navigate('/orders')} isCollapsed={isSidebarCollapsed} />
          <NavItem icon={<Package />} label="Estoque" active={currentPath === 'inventory'} onClick={() => navigate('/inventory')} isCollapsed={isSidebarCollapsed} />
          
          <div className="pt-4 mt-4 border-t border-slate-800">
            {!isSidebarCollapsed && <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-2 block">Gestão</span>}
            <NavItem icon={<Wallet />} label="Financeiro" active={currentPath === 'finance'} onClick={() => navigate('/finance')} isCollapsed={isSidebarCollapsed} />
            <NavItem icon={<Users />} label="Equipe" active={currentPath === 'staff'} onClick={() => navigate('/staff')} isCollapsed={isSidebarCollapsed} />
            <NavItem icon={<Settings />} label="Ajustes" active={currentPath === 'settings'} onClick={() => navigate('/settings')} isCollapsed={isSidebarCollapsed} />
          </div>
        </nav>

        <button onClick={handleLogout} className="mt-auto flex items-center gap-3 p-4 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
          <LogOut className="w-5 h-5" />
          {!isSidebarCollapsed && <span className="font-bold text-sm uppercase tracking-widest">Sair</span>}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 sm:p-8 space-y-8 max-w-7xl mx-auto w-full pb-32">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-white rounded-xl shadow-sm"><PanelLeft className="w-6 h-6" /></button>
            <div>
               <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">{currentPath.replace('-', ' ')}</h2>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentUser?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-100">
               <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Vendas Hoje</span>
                  <span className="font-bold text-slate-900">{formatCurrency(dashboardStats.totalSalesToday)}</span>
               </div>
               <div className="w-px h-8 bg-slate-100" />
               <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Mesas Ativas</span>
                  <span className="font-bold text-slate-900">{dashboardStats.activeTablesCount}</span>
               </div>
            </div>

            <button onClick={() => setIsNotificationPaneOpen(!isNotificationPaneOpen)} className="relative p-3 bg-white rounded-xl shadow-sm hover:bg-slate-50 transition-all">
              <Bell className={cn("w-6 h-6", notifications.some((n: any) => !n.read) ? "text-emerald-500" : "text-slate-400")} />
              {notifications.filter((n: any) => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">
                  {notifications.filter((n: any) => !n.read).length}
                </span>
              )}
            </button>
          </div>
        </header>

        <section className="flex-1">
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}>
              <Routes>
                <Route path="/dashboard" element={<RestaurantDashboard setCurrentView={(v: string) => navigate(`/${v}`)} setSelectedShopId={setSelectedShopId} />} />
                <Route path="/tables" element={<RestaurantLayout defaultView="tables" />} />
                <Route path="/orders" element={<RestaurantLayout defaultView="orders" />} />
                <Route path="/inventory" element={<RestaurantLayout defaultView="inventory" />} />
                <Route path="/finance" element={<FinanceManagementView module="restaurant" shopId={selectedShopId} />} />
                <Route path="/staff" element={<StaffDashboard staff={currentUser} enterprise={accountService.getCurrentTenant()} shops={shops.filter((s: any) => accessibleShopIds.includes(s.id))} schedules={[]} />} />
                <Route path="/settings" element={<GlobalSettingsView enterpriseId={enterpriseId} />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </section>
      </main>

      {/* Modais Globais */}
      <TableEditModal 
        isOpen={isEditTableModalOpen} 
        onClose={() => setIsEditTableModalOpen(false)} 
        editingTable={editingTable} 
        availableAreas={Array.from(new Set(tables.map((t: any) => t.area || 'Salão Principal')))} 
        onUpdate={handleUpdateTable} 
        onDelete={handleRemoveTable} 
        setEditingTable={setEditingTable} 
      />
      <ModifierModal 
        isOpen={isModifierModalOpen} 
        onClose={() => setIsModifierModalOpen(false)} 
        item={editingOrderItem} 
        inventory={inventory} 
        onUpdateModifiers={handleUpdateItemModifiers} 
      />
      <ShiftModal 
        isOpen={isShiftModalOpen} 
        onClose={() => setIsShiftModalOpen(false)} 
        editingShift={editingShift} 
        staff={staff} 
        selectedDate={new Date()} 
        onSave={handleSaveShift} 
        onDelete={handleDeleteShift} 
      />

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-6 left-4 right-4 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 flex items-center justify-around z-[160]">
         <button onClick={() => navigate('/dashboard')} className={cn("p-2", currentPath === 'dashboard' ? "text-emerald-400" : "text-slate-400")}><LayoutDashboard className="w-6 h-6" /></button>
         <button onClick={() => navigate('/tables')} className={cn("p-2", currentPath === 'tables' ? "text-emerald-400" : "text-slate-400")}><TableIcon className="w-6 h-6" /></button>
         <button onClick={() => navigate('/orders')} className="bg-emerald-500 p-4 rounded-2xl shadow-lg -mt-12 border-4 border-slate-900"><Plus className="w-6 h-6 text-white" /></button>
         <button onClick={() => navigate('/inventory')} className={cn("p-2", currentPath === 'inventory' ? "text-emerald-400" : "text-slate-400")}><Package className="w-6 h-6" /></button>
         <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400"><Users className="w-6 h-6" /></button>
      </nav>
    </div>
  );
}