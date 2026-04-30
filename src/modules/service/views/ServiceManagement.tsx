import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Scissors, 
  Settings, 
  Plus, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  MoreVertical,
  Briefcase,
  Star,
  Zap,
  LayoutGrid,
  Clock,
  DollarSign,
  Monitor,
  Package,
  Layers,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../../../lib/utils';
import { ServiceItem, Staff, ServiceResource } from '../../../types';
import { firebaseService } from '../../../services/firebaseService';
import { accountService } from '../../../core/services/accountService';

type ManagementTab = 'services' | 'professionals' | 'resources' | 'clients';

export const ServiceManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ManagementTab>('services');
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [resources, setResources] = useState<ServiceResource[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const enterpriseId = accountService.getCurrentCompanyId(); // Assuming enterpriseId is already set
      const shopId = accountService.getSelectedShopId(); // Assuming shopId is already set
      const [servicesData, staffData, resourcesData] = await Promise.all([
        firebaseService.getAllDocs('services', enterpriseId || undefined, shopId || undefined),
        firebaseService.getAllDocs('staff', enterpriseId || undefined, shopId || undefined),
        firebaseService.getAllDocs('resources', enterpriseId || undefined, shopId || undefined)
      ]);
      setServices(servicesData as ServiceItem[]);
      setStaff((staffData as Staff[]).filter(s => {
        const role = String(s.role || '').toLowerCase();
        return role === 'professional' || role === 'staff' || role === 'operator';
      }));
      setResources(resourcesData as ServiceResource[]);
    } catch (err) {
      console.error('Error loading management data:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'services', label: 'Serviços Flexíveis', icon: Scissors },
    { id: 'professionals', label: 'Especialistas', icon: Users },
    { id: 'resources', label: 'Infraestrutura', icon: Layers },
    { id: 'clients', label: 'Clube de Fidelidade', icon: Star },
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
         <div className="flex items-center gap-3 bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm overflow-x-auto custom-scrollbar">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ManagementTab)}
                className={cn(
                  "px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all whitespace-nowrap",
                  activeTab === tab.id ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
         </div>

         <button 
           onClick={() => setShowAddModal(true)}
           className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 transition-all shadow-2xl shadow-slate-200 flex items-center gap-4"
         >
            <Plus className="w-5 h-5" /> Novo {activeTab === 'services' ? 'Serviço' : activeTab === 'professionals' ? 'Especialista' : 'Recurso'}
         </button>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
         {activeTab === 'services' && services.map(s => (
           <motion.div 
            key={s.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all group relative overflow-hidden"
           >
              <div className="flex items-center justify-between mb-8">
                 <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    <Scissors className="w-6 h-6" />
                 </div>
                 <button className="p-3 bg-slate-50 rounded-xl text-slate-300 hover:text-slate-900 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                 </button>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic mb-1">{s.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">{s.category}</p>
              
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                       <Clock className="w-4 h-4 text-slate-300" />
                       <span className="text-[10px] font-black text-slate-400 uppercase">Duração</span>
                    </div>
                    <span className="text-xs font-black text-slate-900">{s.duration} MIN</span>
                 </div>
                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                       <DollarSign className="w-4 h-4 text-emerald-500" />
                       <span className="text-[10px] font-black text-slate-400 uppercase">Preço</span>
                    </div>
                    <span className="text-lg font-black text-emerald-600 italic tracking-tighter">{formatCurrency(s.price)}</span>
                 </div>
              </div>

              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                 <Zap className="w-24 h-24" />
              </div>
           </motion.div>
         ))}

         {activeTab === 'professionals' && staff.map(pro => (
           <motion.div 
            key={pro.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all group relative overflow-hidden"
           >
              <div className="flex items-center justify-between mb-8">
                 <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white font-black text-lg group-hover:rotate-6 transition-transform">
                    {pro.name.charAt(0)}
                 </div>
                 <button className="p-3 bg-slate-50 rounded-xl text-slate-300 hover:text-slate-900 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                 </button>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic mb-1">{pro.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">{pro.role}</p>

              <div className="flex flex-wrap gap-2 mb-8">
                 {(pro.skills || ['Geral']).map((skill, i) => (
                   <span key={i} className="px-4 py-2 bg-slate-50 rounded-lg text-[8px] font-black uppercase text-slate-400 tracking-widest">
                     {skill}
                   </span>
                 ))}
              </div>

              <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Comissão Base</span>
                    <span className="text-emerald-400 text-sm font-black italic">{(pro.commissionRate || 0) * 100}%</span>
                 </div>
                 <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${(pro.commissionRate || 0.15) * 100}%` }} />
                 </div>
              </div>
           </motion.div>
         ))}

         {activeTab === 'resources' && resources.map(res => (
           <motion.div 
            key={res.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all group relative overflow-hidden"
           >
              <div className="flex items-center justify-between mb-8">
                 <div className={cn(
                    "p-4 rounded-2xl",
                    res.type === 'chair' ? "bg-blue-50 text-blue-600" :
                    res.type === 'room' ? "bg-amber-50 text-amber-600" :
                    "bg-rose-50 text-rose-600"
                 )}>
                    <Layers className="w-6 h-6" />
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Live</span>
                 </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic mb-1">{res.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Tipo: {res.type}</p>
              
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                 <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>Ocupação Atual</span>
                    <span>Disponível</span>
                 </div>
              </div>
           </motion.div>
         ))}

         {activeTab === 'clients' && (
           <div className="col-span-full border-4 border-dashed border-slate-100 rounded-[4rem] p-40 text-center opacity-40">
              <Star className="w-24 h-24 mx-auto mb-8 text-slate-200" />
              <h3 className="text-3xl font-black uppercase tracking-tighter italic text-slate-300">Hub de Clientes Estendido</h3>
              <p className="text-sm font-bold text-slate-300 uppercase tracking-widest mt-2">Gestão de histórico, CRM e recorrência automática</p>
           </div>
         )}
      </div>

      {/* Simplified Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-6">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden font-sans"
            >
               <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-xl font-black uppercase tracking-tighter italic">Novo Registro Master</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-3 text-slate-400 hover:text-rose-500 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
               </div>
               <div className="p-10 space-y-8 text-center italic">
                  <Monitor className="w-16 h-16 mx-auto text-slate-100" />
                  <p className="text-slate-400">Interface de cadastro corporativo em desenvolvimento para sincronização segura de banco de dados.</p>
               </div>
               <div className="p-10 pt-0">
                  <button className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-black transition-all">Fechar Terminal</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
