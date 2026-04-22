import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Database, 
  Monitor, 
  ShoppingCart, 
  Users, 
  Package, 
  Truck,
  Settings,
  ChevronRight,
  Wifi,
  WifiOff,
  LayoutDashboard,
  FileText,
  HardHat,
  Boxes,
  LogOut,
  Bell,
  PanelLeftClose,
  PanelLeft,
  Printer,
  Calendar as CalendarIcon,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DeviceRole, DeviceMode } from '../../../core/types';
import { meshNetwork } from '../../../services/p2pSync';
import { ConstructionDashboard } from './ConstructionDashboard';
import { ConstructionInventory } from './ConstructionInventory';
import { ConstructionProjects } from './ConstructionProjects';
import { ConstructionLogistics } from './ConstructionLogistics';
import { ConstructionQuotes } from './ConstructionQuotes';
import { ConstructionCustomers } from './ConstructionCustomers';
import { ConstructionEmployees } from './ConstructionEmployees';
import { ConstructionSettings } from './ConstructionSettings';
import { StaffScheduleView } from '../../../core/views/StaffScheduleView';
import { GeneralStaffView } from '../../../core/views/GeneralStaffView';
import { FinanceManagementView } from '../../../core/views/FinanceManagementView';
import { SupplierManagementView } from '../../../core/views/SupplierManagementView';
import { PrinterManagement } from '../../../core/views/PrinterManagement';
import { CompanyManagement } from '../../../core/views/CompanyManagement';
import { accountService } from '../../../core/services/accountService';
import { cn } from '../../../lib/utils';

type ConstructionView = 'dashboard' | 'projects' | 'inventory' | 'logistics' | 'quotes' | 'staff' | 'settings' | 'management' | 'customers' | 'printers' | 'schedule' | 'finance' | 'suppliers';

export const ConstructionLayout: React.FC = () => {
  const [role, setRole] = useState<DeviceRole | null>(() => {
    return localStorage.getItem('pos_device_role') as DeviceRole || null;
  });
  const [mode, setMode] = useState<DeviceMode | 'management' | null>(() => {
    return localStorage.getItem('pos_device_mode') as any || null;
  });
  
  const [currentView, setCurrentView] = useState<ConstructionView>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('pos_construction_sidebar_collapsed') === 'true';
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
    if (selectedMode === 'management') setCurrentView('management');
  };

  if (!role) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6 z-[200]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl bg-white rounded-[3rem] p-12 text-center"
        >
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Database className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-4">Configuração de Rede Local</h2>
          <p className="text-slate-500 mb-12 max-w-sm mx-auto font-medium">
            Defina o papel deste dispositivo na rede Wi-Fi local. Apenas um dispositivo deve ser o Host.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
              onClick={() => handleRoleSelect('host')}
              className="p-8 rounded-[2rem] border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <Database className="w-8 h-8 text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="text-xl font-black text-slate-800 mb-2">Servidor (Host)</h4>
              <p className="text-sm text-slate-500">Este dispositivo será a fonte da verdade e validará todas as vendas.</p>
            </button>

            <button 
              onClick={() => handleRoleSelect('client')}
              className="p-8 rounded-[2rem] border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <Monitor className="w-8 h-8 text-slate-400 mb-4 group-hover:text-blue-500 group-hover:scale-110 transition-transform" />
              <h4 className="text-xl font-black text-slate-800 mb-2">Terminal (Cliente)</h4>
              <p className="text-sm text-slate-500">Dispositivo de operação (caixa, vendedor ou estoque) conectado ao Host.</p>
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
            <h2 className="text-4xl font-black text-white mb-4 tracking-tighter">Modo de Operação</h2>
            <p className="text-slate-400 font-medium font-sans">Como este terminal será utilizado hoje?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: 'cashier', label: 'Modo PDV', desc: 'Vendas rápidas e faturamento.', icon: <ShoppingCart />, color: 'bg-emerald-500' },
              { id: 'salesperson', label: 'Vendedor', desc: 'Orçamentos e canteiro.', icon: <Users />, color: 'bg-blue-500' },
              { id: 'stock', label: 'Almoxarifado', desc: 'Estoque e conferência.', icon: <Package />, color: 'bg-amber-500' },
            ].map((m) => (
              <button 
                key={m.id}
                onClick={() => handleModeSelect(m.id as DeviceMode)}
                className="bg-white rounded-[2.5rem] p-10 text-left hover:ring-4 hover:ring-white/10 hover:translate-y-[-4px] transition-all group shadow-2xl"
              >
                <div className={`w-14 h-14 ${m.color} text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                  {m.icon}
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">{m.label}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">{m.desc}</p>
                <div className="flex items-center gap-2 text-xs font-black text-slate-400 group-hover:text-blue-600 transition-colors">
                  ATIVAR MODO <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>

          {currentUser?.role === 'owner' && (
            <div className="mt-8 flex justify-center">
               <button 
                onClick={() => handleModeSelect('management')}
                className="flex items-center gap-4 px-10 py-6 bg-white/10 hover:bg-white/20 rounded-[2rem] border border-white/10 transition-all text-white group"
               >
                  <Settings className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                  <div className="text-left">
                    <span className="block font-black uppercase text-xs tracking-widest">Painel Administrativo</span>
                    <span className="block text-[10px] text-white/50">Gerenciar funcionários e unidades.</span>
                  </div>
               </button>
            </div>
          )}

          <button 
            onClick={() => { setRole(null); localStorage.removeItem('pos_device_role'); }}
            className="mt-12 text-slate-500 text-xs font-bold uppercase tracking-widest block mx-auto hover:text-white transition-colors"
          >
            Alterar Papel de Rede ({role.toUpperCase()})
          </button>
        </motion.div>
      </div>
    );
  }

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('pos_construction_sidebar_collapsed', String(newState));
  };

  const NavItem = ({ icon, label, id }: { icon: React.ReactNode, label: string, id: ConstructionView }) => (
    <button 
      onClick={() => setCurrentView(id)}
      className={cn(
        "flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest group overflow-hidden",
        currentView === id 
          ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" 
          : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
        isSidebarCollapsed && "justify-center translate-x-0"
      )}
    >
      <div className={cn(
        "p-2 rounded-lg transition-colors shrink-0",
        currentView === id ? "bg-white/20" : "bg-slate-50 group-hover:bg-white"
      )}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4" })}
      </div>
      {!isSidebarCollapsed && <span className="truncate">{label}</span>}
    </button>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <ConstructionDashboard />;
      case 'inventory': return <ConstructionInventory />;
      case 'projects': return <ConstructionProjects />;
      case 'logistics': return <ConstructionLogistics />;
      case 'quotes': return <ConstructionQuotes />;
      case 'customers': return <ConstructionCustomers />;
      case 'staff': return <ConstructionEmployees />;
      case 'schedule': return <StaffScheduleView module="construction" />;
      case 'finance': return <FinanceManagementView module="construction" />;
      case 'suppliers': return <SupplierManagementView module="construction" />;
      case 'printers': return <PrinterManagement />;
      case 'settings': return <ConstructionSettings />;
      case 'management': return <CompanyManagement />;
      default: return <ConstructionDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex overflow-hidden">
      {/* Dynamic Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-slate-100 flex flex-col sticky top-0 h-screen z-50 transition-all duration-500 overflow-hidden",
          isSidebarCollapsed ? "w-24" : "w-80"
        )}
      >
        <div className={cn(
          "p-8 flex items-center gap-4 transition-all duration-500",
          isSidebarCollapsed ? "flex-col p-6 pb-10" : "pb-12"
        )}>
           <div className={cn(
             "bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 transition-all",
             isSidebarCollapsed ? "w-10 h-10" : "w-12 h-12"
           )}>
              <Building2 className="text-white w-5 h-5" />
           </div>
           {!isSidebarCollapsed && (
             <motion.div
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
             >
                <h1 className="text-lg font-black text-slate-800 tracking-tighter uppercase leading-none">ConstruPOS</h1>
                <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                   v2.4 {mode?.toUpperCase()}
                </span>
             </motion.div>
           )}
        </div>

            <NavItem icon={<LayoutDashboard />} label="Painel Geral" id="dashboard" />
            <NavItem icon={<Boxes />} label="Loja / Estoque" id="inventory" />
            <NavItem icon={<Users />} label="Clientes / Notas" id="customers" />
            <NavItem icon={<FileText />} label="Caixa / Orçamentos" id="quotes" />
            
            <div className="pt-8">
               <span className="px-6 text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-4">Gestão de Obras (Extras)</span>
               <NavItem icon={<HardHat />} label="Acompanhamento" id="projects" />
               <NavItem icon={<Truck />} label="Logística / Despacho" id="logistics" />
            </div>

            <div className="pt-8">
               <NavItem icon={<Users />} label="RH & Documentos" id="staff" />
               <NavItem icon={<CalendarIcon />} label="Escala da Obra" id="schedule" />
               <NavItem icon={<DollarSign />} label="Financeiro" id="finance" />
               <NavItem icon={<Truck />} label="Fornecedores" id="suppliers" />
               <NavItem icon={<Printer />} label="Impressoras" id="printers" />
               <NavItem icon={<Settings />} label="Campos Customizados" id="settings" />
               <NavItem icon={<Database />} label="Gestão da Unidade" id="management" />
            </div>

        <div className={cn("p-8 border-t border-slate-50 space-y-4", isSidebarCollapsed && "p-4")}>
           {!isSidebarCollapsed ? (
             <div className={`flex items-center gap-3 p-4 rounded-2xl ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span className="text-[10px] font-black uppercase tracking-widest">{isConnected ? 'Host Conectado' : 'Sem Conexão Host'}</span>
             </div>
           ) : (
             <div className="flex justify-center mb-4">
                {isConnected ? <Wifi className="w-5 h-5 text-emerald-500" /> : <WifiOff className="w-5 h-5 text-rose-500" />}
             </div>
           )}
           
           <button 
             onClick={() => { setMode(null); localStorage.removeItem('pos_device_mode'); }}
             className={cn(
               "w-full flex items-center gap-4 text-slate-400 hover:text-rose-600 font-black text-[10px] uppercase tracking-widest rounded-2xl bg-slate-50 hover:bg-rose-50 transition-all overflow-hidden",
               isSidebarCollapsed ? "justify-center p-3 mt-0" : "p-4 mt-4"
             )}
           >
              <LogOut className="w-4 h-4 shrink-0" /> 
              {!isSidebarCollapsed && "Trocar Login"}
           </button>

           <button 
             onClick={toggleSidebar}
             className={cn(
               "w-full flex items-center gap-4 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest rounded-2xl bg-slate-50 hover:bg-blue-50 transition-all overflow-hidden",
               isSidebarCollapsed ? "justify-center p-3" : "p-4"
             )}
           >
              {isSidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              {!isSidebarCollapsed && "Recolher Menu"}
           </button>
        </div>
      </aside>

      <div className="flex-1 min-h-screen flex flex-col">
        {/* Module Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-10 py-6 sticky top-0 z-40 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
              {currentView === 'dashboard' ? 'Visão Geral' : 
               currentView === 'projects' ? 'Projetos & Obras' :
               currentView === 'inventory' ? 'Gestão de Materiais' :
               currentView === 'logistics' ? 'Operações de Carga' : currentView}
            </h2>

            <div className="flex items-center gap-6">
                <button className="relative p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-all">
                   <Bell className="w-5 h-5" />
                   <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                </button>
                <div className="flex items-center gap-4">
                   <div className="text-right hidden sm:block">
                      <p className="text-xs font-black text-slate-800 uppercase leading-none">{currentUser?.name}</p>
                      <span className="text-[10px] font-bold text-slate-400">{currentUser?.role.toUpperCase()}</span>
                   </div>
                   <div className="w-10 h-10 rounded-2xl bg-slate-900 border-2 border-slate-100 shadow-lg" />
                </div>
            </div>
        </header>

        <main className="p-10 flex-1">
           <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                 {renderContent()}
              </motion.div>
           </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
