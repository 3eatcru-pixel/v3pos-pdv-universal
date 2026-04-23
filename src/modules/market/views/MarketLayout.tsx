import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, 
  Database, 
  Monitor, 
  Users, 
  Package, 
  Settings,
  ChevronRight,
  Wifi,
  WifiOff,
  Barcode,
  Scale,
  LayoutGrid,
  TrendingUp,
  History,
  Zap,
  Leaf,
  Bell,
  LogOut,
  AlertTriangle,
  PanelLeftClose,
  PanelLeft,
  Calendar as CalendarIcon,
  DollarSign,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DeviceRole, DeviceMode } from '../../../core/types';
import { meshNetwork } from '../../../services/p2pSync';
import { MarketDashboard } from './MarketDashboard';
import { MarketInventory } from './MarketInventory';
import { MarketPOS } from './MarketPOS';
import { MarketScales } from './MarketScales';
import { MarketSectionView } from './MarketSectionView';
import { MarketEmployees } from './MarketEmployees';
import { StaffScheduleView } from '../../../core/views/StaffScheduleView';
import { GeneralStaffView } from '../../../core/views/GeneralStaffView';
import { FinanceManagementView } from '../../../core/views/FinanceManagementView';
import { SupplierManagementView } from '../../../core/views/SupplierManagementView';
import { CompanyManagement } from '../../../core/views/CompanyManagement';
import { accountService } from '../../../core/services/accountService';
import { firebaseService } from '../../../services/firebaseService';
import { Shop } from '../../../core/types';
import { cn } from '../../../lib/utils';
import { 
  Beef, 
  Croissant, 
  Apple, 
  Warehouse, 
  Users as UsersIcon,
  HandPlatter,
  Store
} from 'lucide-react';

type MarketView = 
  | 'dashboard' 
  | 'inventory' 
  | 'pos' 
  | 'delivery' 
  | 'scales' 
  | 'management' 
  | 'settings'
  | 'butcher' 
  | 'bakery' 
  | 'produce' 
  | 'warehouse' 
  | 'employees'
  | 'schedule'
  | 'finance'
  | 'suppliers';

export const MarketLayout: React.FC = () => {
  const [role, setRole] = useState<DeviceRole | null>(() => {
    return localStorage.getItem('pos_device_role') as DeviceRole || null;
  });
  const [mode, setMode] = useState<DeviceMode | 'management' | null>(() => {
    return localStorage.getItem('pos_device_mode') as any || null;
  });
  const [currentView, setCurrentView] = useState<MarketView>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('pos_market_sidebar_collapsed') === 'true';
  });

  const currentUser = accountService.getCurrentUser();
  const [selectedShopId, setSelectedShopId] = useState<string | null>(accountService.getSelectedShopId());
  const [shops, setShops] = useState<Shop[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = firebaseService.subscribeCollection('shops', currentUser.companyId, null, setShops);
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(meshNetwork.isConnectedToLocalMesh);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleShopChange = (shopId: string | null) => {
    setSelectedShopId(shopId);
    accountService.setSelectedShopId(shopId);
  };

  const handleRoleSelect = (selectedRole: DeviceRole) => {
    meshNetwork.setRole(selectedRole);
    setRole(selectedRole);
  };

  const handleModeSelect = (selectedMode: DeviceMode | 'management') => {
    localStorage.setItem('pos_device_mode', selectedMode);
    setMode(selectedMode);
    if (selectedMode === 'market_pos') setCurrentView('pos');
    if (selectedMode === 'management') setCurrentView('management');
  };

  if (!role) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6 z-[200]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl bg-white rounded-[4rem] p-12 text-center shadow-2xl"
        >
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/10">
            <Database className="w-12 h-12" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter uppercase italic">Market Connectivity</h2>
          <p className="text-slate-500 mb-12 max-w-sm mx-auto font-medium font-sans">
            Ative o Host de Sincronização ou conecte este terminal via Wi-Fi local para operação offline em grid.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <button 
              onClick={() => handleRoleSelect('host')}
              className="p-10 rounded-[3rem] border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
            >
              <Database className="w-10 h-10 text-emerald-500 mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="text-xl font-black text-slate-800 mb-2 uppercase italic tracking-tighter">Matriz (Host)</h4>
              <p className="text-sm text-slate-500 leading-tight">Servidor local que centraliza balanças, estoque e vendas de todos os PDVs.</p>
            </button>

            <button 
              onClick={() => handleRoleSelect('client')}
              className="p-10 rounded-[3rem] border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
            >
              <Monitor className="w-10 h-10 text-slate-400 mb-4 group-hover:text-emerald-500 group-hover:scale-110 transition-transform" />
              <h4 className="text-xl font-black text-slate-800 mb-2 uppercase italic tracking-tighter">Terminal Operador</h4>
              <p className="text-sm text-slate-500 leading-tight">Terminal de caixa rápida ou terminal de pesagem/balança isolado.</p>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!mode) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6 z-[200]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-4xl"
        >
          <div className="text-center mb-12">
            <h2 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase italic outline-text">The Grid Market</h2>
            <p className="text-slate-400 font-medium font-sans italic tracking-widest uppercase text-xs">Defina a função deste dispositivo no mercado local.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {[
              { id: 'market_pos', label: 'Checkout', desc: 'Frente de caixa rápida.', icon: <Barcode />, color: 'bg-emerald-500' },
              { id: 'market_butcher', label: 'Setor Açougue', desc: 'Pesagem e fracionamento de carnes.', icon: <Beef />, color: 'bg-rose-500' },
              { id: 'market_bakery', label: 'Setor Padaria', desc: 'Produção e etiquetas de balcão.', icon: <Croissant />, color: 'bg-amber-500' },
              { id: 'market_scanner', label: 'Gestão Estoque', desc: 'Lotes e conferências.', icon: <Package />, color: 'bg-blue-500' },
            ].map((m) => (
              <button 
                key={m.id}
                onClick={() => {
                  handleModeSelect(m.id as DeviceMode);
                  if (m.id === 'market_butcher') setCurrentView('butcher');
                  if (m.id === 'market_bakery') setCurrentView('bakery');
                }}
                className="bg-white rounded-[3rem] p-12 text-left hover:ring-8 hover:ring-white/10 hover:translate-y-[-8px] transition-all group shadow-2xl"
              >
                <div className={`w-16 h-16 ${m.color} text-white rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-${m.color.split('-')[1]}-500/30 group-hover:rotate-6 transition-transform`}>
                  {m.icon}
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-3 uppercase tracking-tighter italic">{m.label}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-10 italic">{m.desc}</p>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 group-hover:text-emerald-600 transition-colors uppercase tracking-[0.2em]">
                  Ativar Grid <ChevronRight className="w-5 h-5" />
                </div>
              </button>
            ))}
          </div>

          {currentUser?.role === 'owner' && (
            <div className="mt-16 flex justify-center">
               <button 
                onClick={() => handleModeSelect('management')}
                className="flex items-center gap-8 px-12 py-8 bg-white/5 hover:bg-white/10 rounded-[3rem] border border-white/10 transition-all text-white group backdrop-blur-xl"
               >
                  <Settings className="w-8 h-8 group-hover:rotate-90 transition-transform" />
                  <div className="text-left">
                    <span className="block font-black uppercase text-xs tracking-widest italic text-emerald-400 mb-1">Central Administrativa</span>
                    <span className="block text-[10px] text-white/40 tracking-widest font-black uppercase">Sangrias, Comissões e Periféricos.</span>
                  </div>
               </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('pos_market_sidebar_collapsed', String(newState));
  };

  const NavItem = ({ icon, label, id }: { icon: React.ReactNode, label: string, id: MarketView }) => (
    <button 
      onClick={() => setCurrentView(id)}
      className={cn(
        "flex items-center gap-4 w-full p-5 rounded-3xl transition-all font-black text-[10px] uppercase tracking-[0.2em] group italic overflow-hidden",
        currentView === id 
          ? "bg-emerald-600 text-white shadow-2xl shadow-emerald-500/40 translate-x-2" 
          : "text-slate-400 hover:text-slate-700 hover:bg-slate-50",
        isSidebarCollapsed && "justify-center p-4 translate-x-0"
      )}
    >
      <div className={cn(
        "p-3 rounded-2xl transition-colors shrink-0",
        currentView === id ? "bg-white/20" : "bg-slate-100 group-hover:bg-white"
      )}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
      </div>
      {!isSidebarCollapsed && <span className="truncate">{label}</span>}
    </button>
  );

  const navItems = useMemo(() => {
    const items = [
      { id: 'dashboard', icon: <LayoutGrid />, label: 'Insights Hub', roles: ['owner', 'manager', 'dev'] },
      { id: 'pos', icon: <Barcode />, label: 'Checkout Rápido', roles: ['owner', 'manager', 'staff', 'operator', 'dev'] },
      { id: 'inventory', icon: <Package />, label: 'Lotes & Validade', roles: ['owner', 'manager', 'staff', 'dev'] },
      { id: 'butcher', icon: <Beef />, label: 'Açougue Central', roles: ['owner', 'manager', 'staff', 'operator', 'dev'] },
      { id: 'bakery', icon: <Croissant />, label: 'Padaria / Doceria', roles: ['owner', 'manager', 'staff', 'operator', 'dev'] },
      { id: 'produce', icon: <Apple />, label: 'Hortifruti', roles: ['owner', 'manager', 'staff', 'operator', 'dev'] },
      { id: 'scales', icon: <Scale />, label: 'Hardware Balanças', roles: ['owner', 'manager', 'dev'] },
      { id: 'employees', icon: <UsersIcon />, label: 'RH & Performance', roles: ['owner', 'manager', 'dev'] },
      { id: 'schedule', icon: <CalendarIcon />, label: 'Escala Interna', roles: ['owner', 'manager', 'staff', 'dev'] },
      { id: 'finance', icon: <DollarSign />, label: 'Fluxo Financeiro', roles: ['owner', 'manager', 'dev'] },
      { id: 'suppliers', icon: <Truck />, label: 'Contratos / B2B', roles: ['owner', 'manager', 'dev'] },
      { id: 'settings', icon: <Settings />, label: 'Periféricos', roles: ['owner', 'dev'] },
      { id: 'management', icon: <Database />, label: 'Gestão da Unidade', roles: ['owner', 'dev'] },
    ];
    return items.filter(item => !currentUser || item.roles.includes(currentUser.role));
  }, [currentUser]);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <MarketDashboard />;
      case 'inventory': return <MarketInventory />;
      case 'pos': return <MarketPOS />;
      case 'scales': return <MarketScales />;
      case 'butcher': return <MarketSectionView type="butcher" />;
      case 'bakery': return <MarketSectionView type="bakery" />;
      case 'produce': return <MarketSectionView type="produce" />;
      case 'employees': return <MarketEmployees />;
      case 'schedule': return <StaffScheduleView module="market" />;
      case 'finance': return <FinanceManagementView module="market" />;
      case 'suppliers': return <SupplierManagementView module="market" />;
      case 'management': return <CompanyManagement />;
      default: return <MarketDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex overflow-hidden">
      {/* Dynamic Market Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-slate-100 flex flex-col sticky top-0 h-screen z-50 overflow-hidden shadow-2xl transition-all duration-500",
          isSidebarCollapsed ? "w-28" : "w-88"
        )}
      >
        <div className={cn(
          "p-12 flex items-center gap-5 transition-all duration-500",
          isSidebarCollapsed ? "p-8 flex-col pb-12" : "pb-16"
        )}>
           <div className={cn(
             "bg-emerald-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-emerald-600/30 rotate-6 group transition-all",
             isSidebarCollapsed ? "w-12 h-12" : "w-14 h-14"
           )}>
              <ShoppingCart className="text-white w-6 h-6" />
           </div>
           {!isSidebarCollapsed && (
             <motion.div
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
             >
                <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">MarketGrid</h1>
                <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg mt-2 inline-block tracking-widest pulse">
                   OPERATIONAL
                </span>
             </motion.div>
           )}
        </div>

        <div className="flex-1 px-8 space-y-3 overflow-y-auto custom-scrollbar transition-all">
           {navItems.map(item => (
             <React.Fragment key={item.id}>
               <NavItem icon={item.icon} label={item.label} id={item.id as MarketView} />
             </React.Fragment>
           ))}
        </div>

        <div className={cn("p-10 border-t border-slate-50 bg-slate-50/20", isSidebarCollapsed && "p-6")}>
           {!isSidebarCollapsed ? (
             <div className={cn(
               "flex items-center gap-4 p-5 rounded-3xl transition-all duration-700 border-2",
               isConnected ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
             )}>
                <div className="relative">
                   <Wifi className={cn("w-5 h-5", isConnected && "animate-pulse")} />
                   {isConnected && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">{isConnected ? 'Sincronizado' : 'Offline Loop'}</span>
             </div>
           ) : (
             <div className="flex justify-center mb-6">
                <Wifi className={cn("w-6 h-6", isConnected ? "text-emerald-500" : "text-rose-500", isConnected && "animate-pulse")} />
             </div>
           )}
           
           <button 
             onClick={() => { setMode(null); localStorage.removeItem('pos_device_mode'); }}
             className={cn(
               "w-full flex items-center gap-4 text-slate-400 hover:text-rose-600 font-black text-[10px] uppercase tracking-[0.2em] rounded-3xl hover:bg-rose-50 transition-all group italic overflow-hidden",
               isSidebarCollapsed ? "justify-center p-4 mt-0" : "p-5 mt-6"
             )}
           >
              <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform shrink-0" /> 
              {!isSidebarCollapsed && "Resetar Terminal"}
           </button>

           <button 
             onClick={toggleSidebar}
             className={cn(
               "w-full mt-3 p-5 flex items-center gap-4 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] rounded-3xl hover:bg-blue-50 transition-all group italic",
               isSidebarCollapsed ? "justify-center p-4" : "p-5"
             )}
           >
              {isSidebarCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
              {!isSidebarCollapsed && "Recolher Menu"}
           </button>
        </div>
      </aside>

      <div className="flex-1 min-h-screen flex flex-col overflow-hidden relative">
        {/* Module Header */}
        <header className="bg-white/80 backdrop-blur-3xl border-b border-slate-100 px-16 py-10 sticky top-0 z-40 flex items-center justify-between">
            <div className="flex items-baseline gap-4">
               <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
                 {currentView === 'dashboard' ? 'Real-Time Insights' : 
                  currentView === 'pos' ? 'Cashier Terminal' :
                  currentView === 'inventory' ? 'Inventory Control' :
                  currentView === 'scales' ? 'Scales & Peripherals' : 
                  currentView === 'butcher' ? 'Setor Açougue' :
                  currentView === 'bakery' ? 'Setor Padaria' :
                  currentView === 'produce' ? 'Hortifruti' :
                  currentView === 'employees' ? 'Gestão de Staff' :
                  currentView.replace('_', ' ')}
               </h2>
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            </div>

            <div className="flex items-center gap-10">
                 <div className="hidden lg:flex items-center gap-6 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
                    <select 
                      value={accountService.getSelectedShopId() || ''} 
                      onChange={(e) => {
                        accountService.setSelectedShopId(e.target.value);
                        window.location.reload();
                      }}
                      className="bg-transparent border-none text-[10px] font-black uppercase outline-none cursor-pointer"
                    >
                      {shops.map(shop => (
                        <option key={shop.id} value={shop.id}>{shop.name}</option>
                      ))}
                    </select>
                 </div>

                 <button className="relative p-4 bg-slate-100 rounded-2xl text-slate-400 hover:text-emerald-600 transition-all group">
                   <Bell className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                   <span className="absolute top-2 right-2 w-3 h-3 bg-rose-500 rounded-full border-[4px] border-white" />
                </button>
                
                <div className="flex items-center gap-5 border-l border-slate-100 pl-10">
                   <div className="text-right hidden sm:block">
                      <p className="text-sm font-black text-slate-900 uppercase leading-none tracking-tighter italic">{currentUser?.name}</p>
                      <span className="text-[10px] font-black text-emerald-500 italic mt-2 inline-block uppercase tracking-[0.2em]">{currentUser?.role}</span>
                   </div>
                   <div className="w-14 h-14 rounded-3xl bg-slate-900 border-4 border-white shadow-2xl overflow-hidden hover:scale-110 transition-transform duration-500 cursor-pointer">
                      <img src={`https://i.pravatar.cc/150?u=${currentUser?.id}`} alt="User" referrerPolicy="no-referrer" />
                   </div>
                </div>
            </div>
        </header>

        <main className="p-16 pb-32 flex-1 overflow-y-auto custom-scrollbar">
           <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                 {renderContent()}
              </motion.div>
           </AnimatePresence>
        </main>

        <div className="absolute left-0 bottom-0 w-full h-24 bg-gradient-to-t from-slate-50 to-transparent pointer-none z-10" />
      </div>
    </div>
  );
};
