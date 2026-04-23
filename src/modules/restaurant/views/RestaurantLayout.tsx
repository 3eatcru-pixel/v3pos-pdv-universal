import React, { useState, useMemo, useEffect } from 'react';
import { 
  TableIcon, 
  UtensilsCrossed, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  Users, 
  Calendar, 
  Shield, 
  Truck,
  LayoutDashboard,
  Building2,
  LogOut,
  Beer,
  Package,
  Printer as PrinterIcon,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TableMap } from '../components/TableMap';
import { OrderManagement } from './OrderManagement';
import { KitchenDisplay } from '../components/KitchenDisplay';
import { useRestaurantStats } from '../hooks/useRestaurantStats';
import { kitchenService } from '../services/kitchenService';
import { InventoryView } from './InventoryView';
import { PrinterSettings } from './PrinterSettings';
import { FinanceView } from './FinanceView';
import { 
  Table, 
  Order, 
  Product, 
  Staff, 
  View, 
  Enterprise, 
  Shop, 
  StaffSchedule,
  RolePermissions,
  BusinessConfig
} from '../../../types';
import { accountService } from '../../../core/services/accountService';
import { firebaseService } from '../../../services/firebaseService';
import { cn, formatCurrency } from '../../../lib/utils';
import { GlobalSettings } from '../../../core/components/GlobalSettings';

export const RestaurantLayout: React.FC = () => {
  const [enterpriseId, setEnterpriseId] = useState<string | null>(accountService.getCurrentCompanyId());
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedShopId, setSelectedShopId] = useState<string | null>(accountService.getSelectedShopId());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(localStorage.getItem('pos_restaurant_sidebar_collapsed') === 'true');
  
  // Data State (Subscribed from Firebase)
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [businessConfigs, setBusinessConfigs] = useState<BusinessConfig[]>([]);
  const [staffSchedules, setStaffSchedules] = useState<StaffSchedule[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('Salão Principal');
  const [isTableManagementMode, setIsTableManagementMode] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  const currentUser = accountService.getCurrentUser() as unknown as Staff | null;
  const stats = useRestaurantStats(orders, tables, selectedShopId, currentUser);

  // Subscriptions
  useEffect(() => {
    if (!enterpriseId) return;
    const unsubs = [
      firebaseService.subscribeCollection('shops', enterpriseId, null, setShops),
      firebaseService.subscribeCollection('tables', enterpriseId, selectedShopId, setTables),
      firebaseService.subscribeCollection('orders', enterpriseId, selectedShopId, setOrders),
      firebaseService.subscribeCollection('products', enterpriseId, selectedShopId, setProducts),
      firebaseService.subscribeStaff(enterpriseId, setStaff),
      firebaseService.subscribeCollection('businessConfigs', enterpriseId, null, setBusinessConfigs),
      firebaseService.subscribeCollection('staffSchedules', enterpriseId, null, setStaffSchedules),
      firebaseService.subscribeCollection('rolePermissions', null, null, setRolePermissions),
      firebaseService.subscribeCollection('inventory', enterpriseId, selectedShopId, setInventory),
      firebaseService.subscribeCollection('printers', enterpriseId, selectedShopId, setPrinters)
    ];
    return () => unsubs.forEach(u => u());
  }, [enterpriseId, selectedShopId]);

  const handleShopChange = (shopId: string | null) => {
    setSelectedShopId(shopId);
    accountService.setSelectedShopId(shopId);
  };

  const handleLogout = () => accountService.logout();

  const renderDashboard = () => (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            {stats.isRegionalView && !selectedShopId ? 'Visão Regional' : 'Dashboard Operacional'}
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">
            Acompanhamento em tempo real • {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
           <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
           </div>
           <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest pr-4">Sistema Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Vendas Hoje" 
          value={formatCurrency(stats.totalSalesToday)} 
          trend={stats.trend} 
          icon={<ShoppingCart className="w-5 h-5 text-emerald-500" />} 
        />
        <StatCard 
          title="Mesas Ativas" 
          value={stats.activeTablesCount.toString()} 
          icon={<TableIcon className="w-5 h-5 text-blue-500" />} 
          subtitle={`${Math.round((stats.activeTablesCount / (tables.length || 1)) * 100)}% de ocupação`}
        />
        <StatCard 
          title="Ticket Médio" 
          value={formatCurrency(stats.avgTicket)} 
          icon={<UtensilsCrossed className="w-5 h-5 text-amber-500" />} 
        />
        <StatCard 
          title="Margem Prevista" 
          value={`${stats.profitMargin.toFixed(1)}%`} 
          icon={<BarChart3 className="w-5 h-5 text-indigo-500" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 h-[400px] flex flex-col items-center justify-center">
            <BarChart3 className="w-12 h-12 text-slate-100 mb-4" />
            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Gráfico de Vendas (Em breve)</p>
         </div>
         <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
               <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6">Unidades Top Performance</h3>
               <div className="space-y-6">
                  {shops.slice(0, 3).map((shop, idx) => (
                    <div key={shop.id} className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <span className="text-lg font-black text-slate-700">0{idx + 1}</span>
                          <span className="text-sm font-bold">{shop.name}</span>
                       </div>
                       <span className="text-emerald-400 font-black tracking-tight">{formatCurrency(stats.totalSalesToday / (idx + 1.5))}</span>
                    </div>
                  ))}
               </div>
            </div>
            <div className="absolute -bottom-10 -right-10 opacity-10">
               <Building2 className="w-48 h-48" />
            </div>
         </div>
      </div>
    </div>
  );

  const renderTablesView = () => (
    <div className="p-8 space-y-8 h-full overflow-auto">
      <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Mapa de Mesas</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
             {tables.filter(t => t.status === 'occupied').length} mesas em atendimento
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsTableManagementMode(!isTableManagementMode)}
            className={cn(
              "px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
              isTableManagementMode ? "bg-blue-500 text-white shadow-xl shadow-blue-500/20" : "bg-slate-900 text-white"
            )}
          >
            {isTableManagementMode ? "Salvar Layout" : "Gerenciar Mesas"}
          </button>
        </div>
      </div>

      <TableMap 
        tables={tables}
        selectedArea={selectedArea}
        isTableManagementMode={isTableManagementMode}
        currentUser={currentUser}
        onTableClick={(table) => {
          setSelectedTable(table);
          setCurrentView('orders');
        }}
        onEditTable={(table) => {
          console.log('Edit table', table.number);
        }}
      />
    </div>
  );

  const renderOrdersView = () => (
    <OrderManagement 
      products={products}
      tables={tables}
      orders={orders}
      staff={staff}
      selectedTable={selectedTable}
      onBack={() => {
        setSelectedTable(null);
        setCurrentView('tables');
      }}
      onAssignTable={setSelectedTable}
      onSendToKitchen={(orderId, items) => {
        console.log('Send to kitchen', orderId, items);
      }}
      onCloseOrder={(orderId) => {
        console.log('Close order', orderId);
      }}
    />
  );

  const renderKitchenView = () => (
    <KitchenDisplay 
      type="kitchen"
      orders={orders}
      tables={tables}
      onAcceptItems={(orderId) => {
        const order = orders.find(o => o.id === orderId);
        if (order) kitchenService.acceptItems(order, false);
      }}
      onMarkItemsReady={(orderId) => {
        const order = orders.find(o => o.id === orderId);
        if (order) kitchenService.markItemsReady(order, false);
      }}
      onQuickStock={(sector) => console.log('Quick stock', sector)}
    />
  );

  const renderBarView = () => (
    <KitchenDisplay 
      type="bar"
      orders={orders}
      tables={tables}
      onAcceptItems={(orderId) => {
        const order = orders.find(o => o.id === orderId);
        if (order) kitchenService.acceptItems(order, true);
      }}
      onMarkItemsReady={(orderId) => {
        const order = orders.find(o => o.id === orderId);
        if (order) kitchenService.markItemsReady(order, true);
      }}
      onQuickStock={(sector) => console.log('Quick stock', sector)}
    />
  );

  const renderInventoryView = () => (
    <InventoryView 
      inventory={inventory as any[]}
      currentUser={currentUser}
      onUpdateItem={(item) => console.log('Update item', item)}
      onReportError={(req) => console.log('Report error', req)}
    />
  );

  const renderPrintersView = () => (
    <PrinterSettings 
      printers={printers}
      onAddPrinter={(p) => console.log('Add printer', p)}
      onDeletePrinter={(id) => console.log('Delete printer', id)}
      onTestPrinter={(p) => console.log('Test printer', p)}
    />
  );

  const renderFinanceView = () => (
    <FinanceView 
      orders={orders}
      onCloseCash={(report) => console.log('Close cash', report)}
    />
  );

  const navItems = useMemo(() => {
    const items = [
      { id: 'dashboard', icon: <BarChart3 />, label: 'Dashboard', roles: ['owner', 'manager', 'dev'] },
      { id: 'tables', icon: <TableIcon />, label: 'Mapa de Mesas', roles: ['owner', 'manager', 'waiter', 'dev'] },
      { id: 'orders', icon: <ShoppingCart />, label: 'Pedidos', roles: ['owner', 'manager', 'waiter', 'dev'] },
      { id: 'kitchen', icon: <UtensilsCrossed />, label: 'Cozinha (KDS)', roles: ['owner', 'manager', 'chef', 'dev'] },
      { id: 'bar', icon: <Beer />, label: 'Bar (BDS)', roles: ['owner', 'manager', 'waiter', 'dev'] },
      { id: 'inventory', icon: <Package />, label: 'Estoque', roles: ['owner', 'manager', 'dev'] },
      { id: 'printers', icon: <PrinterIcon />, label: 'Impressoras', roles: ['owner', 'dev'] },
      { id: 'finances', icon: <DollarSign />, label: 'Financeiro', roles: ['owner', 'manager', 'dev'] },
      { id: 'settings', icon: <Settings />, label: 'Configurações', roles: ['owner', 'dev'] },
    ];
    return items.filter(item => !currentUser || item.roles.includes(currentUser.role));
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-slate-100 transition-all duration-500 flex flex-col",
        isSidebarCollapsed ? "w-24" : "w-72"
      )}>
        <div className="p-8 flex items-center justify-between">
           {!isSidebarCollapsed && <h1 className="text-xl font-black italic tracking-tighter text-slate-900">RESTMGR<span className="text-emerald-500">.</span></h1>}
           <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-colors">
              <LayoutDashboard className="w-5 h-5" />
           </button>
        </div>

        <nav className="flex-1 px-4 space-y-2">
           {navItems.map(item => (
             <NavItem 
               key={item.id}
               icon={item.icon} 
               label={item.label} 
               active={currentView === item.id} 
               onClick={() => setCurrentView(item.id as any)} 
               isCollapsed={isSidebarCollapsed} 
             />
           ))}
        </nav>

        <div className="p-4 border-t border-slate-50">
           <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all group">
              <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              {!isSidebarCollapsed && <span className="text-xs font-black uppercase tracking-widest">Sair do Sistema</span>}
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto h-screen relative">
         <div className="sticky top-0 z-50 bg-slate-50/80 backdrop-blur-md px-8 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black shadow-lg">R</div>
               <div>
                  <p className="text-xs font-black text-slate-900 leading-none">{shops.find(s => s.id === selectedShopId)?.name || 'Selecione uma Unidade'}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Status: Operacional</p>
               </div>
            </div>

            <div className="flex items-center gap-3">
               <select 
                 value={selectedShopId || ''} 
                 onChange={(e) => handleShopChange(e.target.value)}
                 className="bg-white border border-slate-200 text-[10px] font-black uppercase px-4 py-2 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer"
               >
                 {shops.map(shop => (
                   <option key={shop.id} value={shop.id}>{shop.name}</option>
                 ))}
               </select>
            </div>
         </div>

         {currentView === 'dashboard' && renderDashboard()}
         {currentView === 'tables' && renderTablesView()}
         {currentView === 'orders' && renderOrdersView()}
         {currentView === 'kitchen' && renderKitchenView()}
         {currentView === 'bar' && renderBarView()}
         {currentView === 'inventory' && renderInventoryView()}
         {currentView === 'printers' && renderPrintersView()}
         {currentView === 'finances' && renderFinanceView()}
      </main>
    </div>
  );
};

const NavItem: React.FC<{ icon: any, label: string, active: boolean, onClick: () => void, isCollapsed: boolean }> = ({ icon, label, active, onClick, isCollapsed }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group",
      active ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20" : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
    )}
  >
    {React.cloneElement(icon, { className: "w-5 h-5" })}
    {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>}
  </button>
);

const StatCard: React.FC<{ title: string, value: string, icon: any, trend?: number, subtitle?: string }> = ({ title, value, icon, trend, subtitle }) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
    <div className="flex items-center justify-between mb-6">
      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
        {icon}
      </div>
      {trend !== undefined && (
        <span className={cn(
          "px-3 py-1 rounded-full text-[10px] font-black tracking-widest",
          trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        )}>
          {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
        </span>
      )}
    </div>
    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{title}</p>
    <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
    {subtitle && <p className="text-[10px] font-bold text-slate-400 mt-2">{subtitle}</p>}
  </div>
);
