import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Database, 
  Monitor, 
  ShoppingCart, 
  Users, 
  Package, 
  Settings,
  ChevronRight,
  Wifi,
  WifiOff,
  LayoutDashboard,
  Tag,
  CreditCard,
  Target,
  LogOut,
  Bell,
  Box,
  Gift,
  FileText,
  PanelLeftClose,
  PanelLeft,
  Calendar as CalendarIcon,
  DollarSign,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DeviceRole, DeviceMode } from '../../../core/types';
import { meshNetwork } from '../../../services/p2pSync';
import { RetailDashboard } from './RetailDashboard';
import { RetailInventory } from './RetailInventory';
import { RetailPOS } from './RetailPOS';
import { RetailCRM } from './RetailCRM';
import { RetailEmployees } from './RetailEmployees';
import { StaffScheduleView } from '../../../core/views/StaffScheduleView';
import { GeneralStaffView } from '../../../core/views/GeneralStaffView';
import { FinanceManagementView } from '../../../core/views/FinanceManagementView';
import { SupplierManagementView } from '../../../core/views/SupplierManagementView';
import { CompanyManagement } from '../../../core/views/CompanyManagement';
import { accountService } from '../../../core/services/accountService';
import { cn } from '../../../lib/utils';

type RetailView = 'dashboard' | 'inventory' | 'pos' | 'crm' | 'reports' | 'promotions' | 'settings' | 'management' | 'schedule' | 'staff' | 'finance' | 'suppliers';

export const RetailLayout: React.FC = () => {
  const [role, setRole] = useState<DeviceRole | null>(() => {
    return localStorage.getItem('pos_device_role') as DeviceRole || null;
  });
  const [mode, setMode] = useState<DeviceMode | 'management' | null>(() => {
    return localStorage.getItem('pos_device_mode') as any || null;
  });
  const [currentView, setCurrentView] = useState<RetailView>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('pos_retail_sidebar_collapsed') === 'true';
  });

  const currentUser = accountService.getCurrentUser();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(meshNetwork.isConnectedToLocalMesh);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRoleSelect = (selectedRole: DeviceRole) => {
    meshNetwork.setRole(selectedRole);
    setRole(selectedRole);
  };

  const handleModeSelect = (selectedMode: DeviceMode | 'management') => {
    localStorage.setItem('pos_device_mode', selectedMode);
    setMode(selectedMode);
    if (selectedMode === 'retail_cashier') setCurrentView('pos');
    if (selectedMode === 'management') setCurrentView('management');
  };

  if (!role) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6 z-[200]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl bg-white rounded-[3rem] p-12 text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Database className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight uppercase italic">Smart Retail Mesh</h2>
          <p className="text-slate-500 mb-12 max-w-sm mx-auto font-medium">
            Configure este terminal para operar no ecossistema P2P blindado da loja.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
              onClick={() => handleRoleSelect('host')}
              className="p-8 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group"
            >
              <Database className="w-8 h-8 text-indigo-500 mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="text-xl font-black text-slate-800 mb-2 uppercase italic">Concentrador (Host)</h4>
              <p className="text-sm text-slate-500 leading-tight">Servidor local que valida vendas, cupons e estoque em tempo real.</p>
            </button>

            <button 
              onClick={() => handleRoleSelect('client')}
              className="p-8 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group"
            >
              <Monitor className="w-8 h-8 text-slate-400 mb-4 group-hover:text-indigo-500 group-hover:scale-110 transition-transform" />
              <h4 className="text-xl font-black text-slate-800 mb-2 uppercase italic">Terminal Operador</h4>
              <p className="text-sm text-slate-500 leading-tight">Ponto de venda (Caixa) ou terminal de consulta conectado ao Host.</p>
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
            <h2 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase italic">Ready to Sell</h2>
            <p className="text-slate-400 font-medium font-sans italic">Selecione o perfil operacional deste terminal para hoje.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: 'retail_cashier', label: 'Modo PDV', desc: 'Interface de caixa rápida e intuitiva.', icon: <ShoppingCart />, color: 'bg-emerald-500' },
              { id: 'retail_sales', label: 'Atendimento', desc: 'Consulta de estoque e CRM.', icon: <Users />, color: 'bg-indigo-500' },
              { id: 'admin', label: 'Gestão/Dashboard', desc: 'Visão 360 do negócio.', icon: <Package />, color: 'bg-blue-500' },
            ].map((m) => (
              <button 
                key={m.id}
                onClick={() => handleModeSelect(m.id as DeviceMode)}
                className="bg-white rounded-[2.5rem] p-10 text-left hover:ring-8 hover:ring-white/10 hover:translate-y-[-4px] transition-all group shadow-2xl"
              >
                <div className={`w-14 h-14 ${m.color} text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-${m.color.split('-')[1]}-500/20`}>
                  {m.icon}
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter italic">{m.label}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8 italic">{m.desc}</p>
                <div className="flex items-center gap-2 text-xs font-black text-slate-400 group-hover:text-indigo-600 transition-colors uppercase tracking-widest">
                  Ativar Terminal <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>

          {currentUser?.role === 'owner' && (
            <div className="mt-12 flex justify-center">
               <button 
                onClick={() => handleModeSelect('management')}
                className="flex items-center gap-6 px-10 py-6 bg-white/10 hover:bg-white/20 rounded-[2rem] border border-white/10 transition-all text-white group"
               >
                  <Settings className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                  <div className="text-left font-sans">
                    <span className="block font-black uppercase text-xs tracking-widest italic text-indigo-400">Inteligência Administrativa</span>
                    <span className="block text-[10px] text-white/50 tracking-wide font-medium">Funcionários, unidades e backoffice.</span>
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
    localStorage.setItem('pos_retail_sidebar_collapsed', String(newState));
  };

  const NavItem = ({ icon, label, id }: { icon: React.ReactNode, label: string, id: RetailView }) => (
    <button 
      onClick={() => setCurrentView(id)}
      className={cn(
        "flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest group overflow-hidden",
        currentView === id 
          ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20" 
          : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
        isSidebarCollapsed && "justify-center translate-x-0"
      )}
    >
      <div className={cn(
        "p-2.5 rounded-xl transition-colors shrink-0",
        currentView === id ? "bg-white/20" : "bg-slate-100 group-hover:bg-white"
      )}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4" })}
      </div>
      {!isSidebarCollapsed && <span className="truncate">{label}</span>}
    </button>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <RetailDashboard />;
      case 'inventory': return <RetailInventory />;
      case 'pos': return <RetailPOS />;
      case 'crm': return <RetailCRM />;
      case 'staff': return <RetailEmployees />;
      case 'schedule': return <StaffScheduleView module="retail" />;
      case 'finance': return <FinanceManagementView module="retail" />;
      case 'suppliers': return <SupplierManagementView module="retail" />;
      case 'management': return <CompanyManagement />;
      default: return <RetailDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex overflow-hidden">
      {/* Sidebar Varejo */}
      <aside 
        className={cn(
          "bg-white border-r border-slate-100 flex flex-col sticky top-0 h-screen z-50 overflow-hidden transition-all duration-500",
          isSidebarCollapsed ? "w-24" : "w-80"
        )}
      >
        <div className={cn(
          "p-10 flex items-center gap-4 transition-all duration-500",
          isSidebarCollapsed ? "flex-col p-6 pb-10" : "pb-12"
        )}>
           <div className={cn(
             "bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 rotate-3 transition-all",
             isSidebarCollapsed ? "w-10 h-10" : "w-12 h-12"
           )}>
              <ShoppingBag className="text-white w-5 h-5" />
           </div>
           {!isSidebarCollapsed && (
             <motion.div
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
             >
                <h1 className="text-lg font-black text-slate-800 tracking-tighter uppercase leading-none italic">RetailGrid</h1>
                <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mt-1.5 inline-block">
                   {mode?.toUpperCase()} MODE
                </span>
             </motion.div>
           )}
        </div>

        <div className="flex-1 px-6 space-y-2 overflow-y-auto custom-scrollbar">
           <NavItem icon={<LayoutDashboard />} label="Dashboard" id="dashboard" />
           <NavItem icon={<CreditCard />} label="Vendas / PDV" id="pos" />
           <NavItem icon={<Box />} label="Produtos & Estoque" id="inventory" />
           <NavItem icon={<Target />} label="Clientes & CRM" id="crm" />
           <NavItem icon={<Users />} label="RH Central" id="staff" />
           <NavItem icon={<CalendarIcon />} label="Escala Staff" id="schedule" />
           <NavItem icon={<DollarSign />} label="Fluxo de Caixa" id="finance" />
           <NavItem icon={<Truck />} label="Fornecedores" id="suppliers" />
           <NavItem icon={<Gift />} label="Promoções" id="promotions" />
           <NavItem icon={<FileText />} label="Relatórios" id="reports" />
           
           <div className="pt-8 mb-4 border-t border-slate-50 mt-4 h-[1px]" />
           <NavItem icon={<Settings />} label="Configuração" id="settings" />
           <NavItem icon={<Database />} label="Gestão da Unidade" id="management" />
        </div>

        <div className={cn("p-8 border-t border-slate-50 bg-slate-50/10", isSidebarCollapsed && "p-4")}>
           {!isSidebarCollapsed ? (
             <div className={cn(
               "flex items-center gap-3 p-4 rounded-2xl transition-all duration-500",
               isConnected ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
             )}>
                <Wifi className={cn("w-4 h-4", isConnected && "animate-pulse")} />
                <span className="text-[9px] font-black uppercase tracking-widest">{isConnected ? 'Host Sincronizado' : 'Offline Mode'}</span>
             </div>
           ) : (
             <div className="flex justify-center mb-4">
                <Wifi className={cn("w-5 h-5", isConnected ? "text-emerald-500" : "text-rose-500", isConnected && "animate-pulse")} />
             </div>
           )}
           
           <button 
             onClick={() => { setMode(null); localStorage.removeItem('pos_device_mode'); }}
             className={cn(
               "w-full flex items-center gap-4 text-slate-400 hover:text-rose-600 font-black text-[9px] uppercase tracking-widest rounded-2xl hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100 overflow-hidden",
               isSidebarCollapsed ? "justify-center p-3 mt-0" : "p-4 mt-4"
             )}
           >
              <LogOut className="w-4 h-4 shrink-0" /> 
              {!isSidebarCollapsed && "Resetar Terminal"}
           </button>

           <button 
             onClick={toggleSidebar}
             className={cn(
               "w-full mt-2 flex items-center gap-4 text-slate-400 hover:text-indigo-600 font-black text-[9px] uppercase tracking-widest rounded-2xl hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100 overflow-hidden",
               isSidebarCollapsed ? "justify-center p-3" : "p-4"
             )}
           >
              {isSidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              {!isSidebarCollapsed && "Ocultar Menu"}
           </button>
        </div>
      </aside>

      <div className="flex-1 min-h-screen flex flex-col overflow-hidden">
        {/* Module Header */}
        <header className="bg-white/80 backdrop-blur-3xl border-b border-slate-100 px-12 py-8 sticky top-0 z-40 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
               <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">
                 {currentView === 'dashboard' ? 'Business Intelligence' : 
                  currentView === 'pos' ? 'Ponto de Venda' :
                  currentView === 'inventory' ? 'Gestão de Insumos' :
                  currentView === 'schedule' ? 'Escala de Trabalho' :
                  currentView === 'crm' ? 'Loyalty & CRM' : currentView.replace('_', ' ')}
               </h2>
               <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
            </div>

            <div className="flex items-center gap-8">
                <button className="relative p-3 bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-all group">
                   <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                   <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-[3px] border-white" />
                </button>
                <div className="h-8 w-[1px] bg-slate-100 hidden sm:block" />
                <div className="flex items-center gap-4">
                   <div className="text-right hidden sm:block">
                      <p className="text-xs font-black text-slate-800 uppercase leading-none tracking-tight">{currentUser?.name}</p>
                      <span className="text-[10px] font-black text-indigo-500 italic mt-1 inline-block uppercase tracking-widest">{currentUser?.role}</span>
                   </div>
                   <div className="w-12 h-12 rounded-2xl bg-slate-900 border-2 border-slate-100 shadow-xl overflow-hidden hover:scale-105 transition-transform duration-500 cursor-pointer">
                      <img src={`https://i.pravatar.cc/150?u=${currentUser?.id}`} alt="User" referrerPolicy="no-referrer" />
                   </div>
                </div>
            </div>
        </header>

        <main className="p-12 pb-24 flex-1 overflow-y-auto custom-scrollbar">
           <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                transition={{ duration: 0.3, ease: "circOut" }}
              >
                 {renderContent()}
              </motion.div>
           </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
