import React from 'react';
import { 
  Calendar, 
  Users, 
  Scissors, 
  Settings, 
  Search, 
  Bell, 
  LayoutDashboard,
  Database,
  UserCircle,
  Clock,
  Briefcase,
  DollarSign,
  MapPin,
  Building
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import { ServiceDashboard } from './ServiceDashboard';
import { ServiceCalendar } from './ServiceCalendar';
import { ServiceCatalogPage } from './ServiceCatalogPage';
import { ServiceEmployeesPage } from './ServiceEmployeesPage';
import { ServiceClientsPage } from './ServiceClientsPage';
import { ServiceResourcesPage } from './ServiceResourcesPage';
import { FinanceManagementView } from '../../../core/views/FinanceManagementView';
import { CompanyManagement } from '../../../core/views/CompanyManagement';

type ServiceTab = 'dashboard' | 'calendar' | 'services' | 'employees' | 'clients' | 'resources' | 'finance' | 'management';

export const ServiceLayout: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<ServiceTab>('calendar');

  const tabs = [
    { id: 'calendar', label: 'Agenda & Reservas', icon: Calendar },
    { id: 'dashboard', label: 'Performance', icon: LayoutDashboard },
    { id: 'finance', label: 'Financeiro & Caixa', icon: DollarSign },
    { id: 'services', label: 'Catálogo de Serviços', icon: Scissors },
    { id: 'employees', label: 'Profissionais', icon: Users },
    { id: 'clients', label: 'Clientes', icon: UserCircle },
    { id: 'resources', label: 'Recursos', icon: Database },
    { id: 'management', label: 'Gestão da Unidade', icon: Building },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans overflow-hidden">
      {/* Structural Sidebar */}
      <div className="w-[340px] bg-white border-r border-slate-100 flex flex-col p-10 gap-12 z-50 shadow-[20px_0_60px_-15px_rgba(0,0,0,0.03)] overflow-y-auto custom-scrollbar">
        <div className="space-y-2">
          <div className="flex items-center gap-4 text-slate-900 mb-6">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-200">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter leading-none italic">Service</h1>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Business Unit</span>
            </div>
          </div>
          
          <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
             <div className="flex items-center gap-3 mb-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Unidade Central</span>
             </div>
             <p className="text-[10px] font-bold text-slate-400 uppercase">Avenida da Liberdade, 102</p>
          </div>
        </div>

        <nav className="space-y-3 pb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 pl-4 mb-4">Módulos</p>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ServiceTab)}
              className={cn(
                "w-full flex items-center gap-5 p-6 rounded-[2rem] transition-all group font-sans text-sm",
                activeTab === tab.id 
                  ? "bg-slate-900 text-white shadow-2xl shadow-slate-200 translate-x-3" 
                  : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <tab.icon className={cn(
                "w-5 h-5 transition-transform group-hover:scale-110",
                activeTab === tab.id ? "text-emerald-400" : "text-slate-300"
              )} />
              <span className="font-black uppercase tracking-widest text-[10px]">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto p-8 bg-emerald-50 rounded-[3rem] border border-emerald-100 relative overflow-hidden group shrink-0">
           <div className="relative z-10">
              <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-200">
                 <DollarSign className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-[10px] font-black uppercase text-emerald-900 tracking-widest mb-1">Faturamento Hoje</h4>
              <p className="text-2xl font-black text-emerald-600 tracking-tighter italic">R$ 4.280</p>
           </div>
           <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-12 overflow-y-auto bg-slate-50/50 relative custom-scrollbar">
        {/* Header Bar */}
        <header className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-8">
               <div className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center group-hover:border-slate-900 transition-all">
                     <Search className="w-5 h-5 text-slate-400 group-hover:text-slate-900" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900 transition-all">Quick Search</span>
               </div>
            </div>

            <div className="flex items-center gap-6">
                <button className="relative w-12 h-12 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all">
                   <Bell className="w-5 h-5 text-slate-400" />
                   <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                </button>
                <div className="h-10 w-[1px] bg-slate-200 mx-2" />
                <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-2xl border border-slate-100 shadow-sm">
                   <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-white text-[10px] font-black">
                      ADM
                   </div>
                   <div className="hidden md:block">
                      <p className="text-[10px] font-black uppercase text-slate-900 tracking-tighter leading-none mb-1">Admin Master</p>
                      <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Online</span>
                   </div>
                </div>
            </div>
        </header>

        {activeTab === 'dashboard' && <ServiceDashboard />}
        {activeTab === 'calendar' && <ServiceCalendar />}
        {activeTab === 'services' && <ServiceCatalogPage />}
        {activeTab === 'employees' && <ServiceEmployeesPage />}
        {activeTab === 'clients' && <ServiceClientsPage />}
        {activeTab === 'resources' && <ServiceResourcesPage />}
        {activeTab === 'finance' && <FinanceManagementView module="service" />}
        {activeTab === 'management' && <CompanyManagement />}
      </main>
    </div>
  );
};
