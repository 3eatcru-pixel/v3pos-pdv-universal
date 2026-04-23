import React, { useState, useMemo } from 'react';
import { 
  LogOut, 
  Bell, 
  Wifi, 
  WifiOff, 
  PanelLeftClose, 
  PanelLeft,
  ChevronRight,
  Database,
  Monitor,
  Settings,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DeviceRole, DeviceMode, Shop } from '../types';
import { useCollection } from '../../hooks/useCollection';
import { useDeviceConfig } from '../../hooks/useDeviceConfig';
import { accountService } from '../services/accountService';
import { cn } from '../../lib/utils';
import { NavItem } from './CommonUI';

interface NavItemConfig {
  id: string;
  icon: React.ReactNode;
  label: string;
  roles: string[];
}

interface BaseModuleLayoutProps {
  moduleName: string;
  moduleIcon: React.ReactNode;
  navItems: NavItemConfig[];
  renderContent: (currentView: string) => React.ReactNode;
  accentColor?: string;
  defaultView?: string;
  setupOptions?: {
    id: string;
    label: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
  }[];
}

export const BaseModuleLayout: React.FC<BaseModuleLayoutProps> = ({ 
  moduleName, 
  moduleIcon, 
  navItems, 
  renderContent, 
  accentColor = "indigo",
  defaultView = "dashboard",
  setupOptions
}) => {
  const { role, mode, isConnected, updateRole, updateMode, resetConfig } = useDeviceConfig();
  const [currentView, setCurrentView] = useState(defaultView);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem(`pos_${moduleName.toLowerCase()}_sidebar_collapsed`) === 'true';
  });

  const currentUser = accountService.getCurrentUser();
  const { data: shops } = useCollection<Shop>('shops');

  const filteredNavItems = useMemo(() => {
    return navItems.filter(item => !currentUser || item.roles.includes(currentUser.role));
  }, [navItems, currentUser]);

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem(`pos_${moduleName.toLowerCase()}_sidebar_collapsed`, String(newState));
  };

  const selectedShopId = accountService.getSelectedShopId();

  // Role Selection Screen (Host vs Client)
  if (!role) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6 z-[200]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl bg-white rounded-[3rem] p-12 text-center shadow-2xl"
        >
          <div className={cn("w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8", `bg-${accentColor}-100 text-${accentColor}-600`)}>
            <Database className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight uppercase italic">{moduleName} Smart Mesh</h2>
          <p className="text-slate-500 mb-12 max-w-sm mx-auto font-medium italic">
            Configure este terminal para operar no ecossistema P2P blindado da unidade.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
              onClick={() => updateRole('host')}
              className={cn("p-8 rounded-[2rem] border-2 border-slate-100 hover:bg-slate-50 transition-all text-left group", `hover:border-${accentColor}-500 hover:bg-${accentColor}-50`)}
            >
              <Database className={cn("w-8 h-8 text-slate-400 mb-4 group-hover:scale-110 transition-transform", `group-hover:text-${accentColor}-500`)} />
              <h4 className="text-xl font-black text-slate-800 mb-2 uppercase italic text-nowrap">Concentrador (Host)</h4>
              <p className="text-sm text-slate-500 leading-tight italic">Servidor local que valida vendas, cupons e estoque em tempo real.</p>
            </button>

            <button 
              onClick={() => updateRole('client')}
              className={cn("p-8 rounded-[2rem] border-2 border-slate-100 hover:bg-slate-50 transition-all text-left group", `hover:border-${accentColor}-500 hover:bg-${accentColor}-50`)}
            >
              <Monitor className={cn("w-8 h-8 text-slate-400 mb-4 group-hover:scale-110 transition-transform", `group-hover:text-${accentColor}-500`)} />
              <h4 className="text-xl font-black text-slate-800 mb-2 uppercase italic text-nowrap">Terminal Operador</h4>
              <p className="text-sm text-slate-500 leading-tight italic">Ponto de venda (Caixa) ou terminal de consulta conectado ao Host.</p>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Mode Selection Screen (Cashier, Sales, etc.)
  if (!mode && setupOptions) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6 z-[200]">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase italic">Ready to Work</h2>
            <p className="text-slate-400 font-medium font-sans italic">Selecione o perfil operacional deste terminal para hoje.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {setupOptions.map((opt) => (
              <button 
                key={opt.id}
                onClick={() => updateMode(opt.id as any)}
                className="bg-white rounded-[2.5rem] p-10 text-left hover:ring-8 hover:ring-white/10 hover:translate-y-[-4px] transition-all group shadow-2xl"
              >
                <div className={cn(`w-14 h-14 ${opt.color} text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-${opt.color.split('-')[1]}-500/20`)}>
                  {opt.icon}
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter italic">{opt.label}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8 italic">{opt.desc}</p>
                <div className={cn("flex items-center gap-2 text-xs font-black text-slate-400 group-hover:text-indigo-600 transition-colors uppercase tracking-widest", `group-hover:text-${accentColor}-600`)}>
                  Ativar Terminal <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>

          {currentUser?.role === 'owner' && (
            <div className="mt-12 flex justify-center">
               <button 
                onClick={() => updateMode('management')}
                className="flex items-center gap-6 px-10 py-6 bg-white/10 hover:bg-white/20 rounded-[2rem] border border-white/10 transition-all text-white group"
               >
                  <Settings className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                  <div className="text-left font-sans">
                    <span className={cn("block font-black uppercase text-xs tracking-widest italic", `text-${accentColor}-400`)}>Inteligência Administrativa</span>
                    <span className="block text-[10px] text-white/50 tracking-wide font-medium italic">Funcionários, unidades e backoffice.</span>
                  </div>
               </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex overflow-hidden">
      {/* Universal Sidebar */}
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
             "rounded-2xl flex items-center justify-center shadow-lg rotate-3 transition-all",
             isSidebarCollapsed ? "w-10 h-10" : "w-12 h-12",
             `bg-${accentColor}-600 shadow-${accentColor}-600/20`
           )}>
              {React.cloneElement(moduleIcon as React.ReactElement, { className: "text-white w-5 h-5" })}
           </div>
           {!isSidebarCollapsed && (
             <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <h1 className="text-lg font-black text-slate-800 tracking-tighter uppercase leading-none italic">{moduleName}</h1>
                <span className={cn("text-[9px] font-black uppercase bg-opacity-10 px-2 py-0.5 rounded-md mt-1.5 inline-block", `text-${accentColor}-600 bg-${accentColor}-600`)}>
                   {mode?.toUpperCase()} MODE
                </span>
             </motion.div>
           )}
        </div>

        <div className="flex-1 px-6 space-y-2 overflow-y-auto custom-scrollbar">
           {filteredNavItems.map(item => (
             <NavItem 
                key={item.id}
                id={item.id}
                icon={item.icon}
                label={item.label}
                active={currentView === item.id}
                onClick={() => setCurrentView(item.id)}
                isCollapsed={isSidebarCollapsed}
             />
           ))}
        </div>

        <div className={cn("p-8 border-t border-slate-50 bg-slate-50/10", isSidebarCollapsed && "p-4")}>
           <div className={cn(
              "flex items-center gap-3 p-4 rounded-2xl transition-all duration-500",
              isSidebarCollapsed ? "justify-center" : "",
              isConnected ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
           )}>
              <Wifi className={cn(isSidebarCollapsed ? "w-5 h-5" : "w-4 h-4", isConnected && "animate-pulse")} />
              {!isSidebarCollapsed && <span className="text-[9px] font-black uppercase tracking-widest">{isConnected ? 'Mesh Online' : 'Modo Offline'}</span>}
           </div>
           
           <button 
             onClick={resetConfig}
             className={cn(
               "w-full flex items-center gap-4 text-slate-400 hover:text-rose-600 font-black text-[9px] uppercase tracking-widest rounded-2xl hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100 overflow-hidden",
               isSidebarCollapsed ? "justify-center p-3 mt-4" : "p-4 mt-4"
             )}
           >
              <LogOut className="w-4 h-4 shrink-0" /> 
              {!isSidebarCollapsed && "Resetar Terminal"}
           </button>

           <button 
             onClick={toggleSidebar}
             className={cn(
               "w-full mt-2 flex items-center gap-4 text-slate-400 hover:text-slate-600 font-black text-[9px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 overflow-hidden",
               isSidebarCollapsed ? "justify-center p-3" : "p-4"
             )}
           >
              {isSidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              {!isSidebarCollapsed && "Ocultar Menu"}
           </button>
        </div>
      </aside>

      <div className="flex-1 min-h-screen flex flex-col overflow-hidden">
        {/* Universal Module Header */}
        <header className="bg-white/80 backdrop-blur-3xl border-b border-slate-100 px-12 py-8 sticky top-0 z-40 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
               <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">
                  {navItems.find(n => n.id === currentView)?.label || currentView.replace('_', ' ')}
               </h2>
               <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse shadow-lg", `bg-${accentColor}-600 shadow-${accentColor}-600/50`)} />
            </div>

            <div className="flex items-center gap-8">
                <select 
                  value={selectedShopId || ''} 
                  onChange={(e) => {
                    accountService.setSelectedShopId(e.target.value);
                    window.location.reload();
                  }}
                  className="bg-slate-100 border-none text-[10px] font-black uppercase px-4 py-2 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                >
                  {shops.map(shop => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                  ))}
                </select>

                <button className="relative p-3 bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-all group">
                   <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                   <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-[3px] border-white" />
                </button>
                <div className="h-8 w-[1px] bg-slate-100 hidden sm:block" />
                <div className="flex items-center gap-4">
                   <div className="text-right hidden sm:block">
                      <p className="text-xs font-black text-slate-800 uppercase leading-none tracking-tight">{currentUser?.name}</p>
                      <span className={cn("text-[10px] font-black italic mt-1 inline-block uppercase tracking-widest", `text-${accentColor}-500`)}>{currentUser?.role}</span>
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
                 {renderContent(currentView, setCurrentView)}
              </motion.div>
           </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
