import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Award, 
  X, 
  Search, 
  LayoutGrid, 
  Table as TableIcon, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MoreHorizontal, 
  TrendingUp,
  UserPlus
} from 'lucide-react';
import { serviceManagementService } from '../services/serviceManagementService';
import { accountService } from '../../../core/services/accountService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';

export const ServiceEmployeesPage: React.FC = () => {
   const enterpriseId = accountService.getCurrentCompanyId() || '';
   const [providers, setProviders] = useState(serviceManagementService.getProviders(enterpriseId));
   const [showForm, setShowForm] = useState(false);
   const [formData, setFormData] = useState({ name: '', role: '', commissionRate: 0, colorCode: '#10b981' });
   const [searchTerm, setSearchTerm] = useState('');
   const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

   const handleAddProvider = (e: React.FormEvent) => {
      e.preventDefault();
      serviceManagementService.addProvider({
         ...formData,
         enterpriseId,
         skills: [],
         active: true
      });
      setProviders(serviceManagementService.getProviders(enterpriseId));
      setShowForm(false);
      setFormData({ name: '', role: '', commissionRate: 0, colorCode: '#10b981' });
   };

   const filteredProviders = providers.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.role.toLowerCase().includes(searchTerm.toLowerCase())
   );

   return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
               <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Profissionais</h2>
               <p className="text-slate-500 font-medium">Gestão de especialistas, comissões e disponibilidade</p>
            </div>
            <div className="flex gap-4">
               <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                  <button 
                     onClick={() => setViewMode('grid')}
                     className={cn("p-3 rounded-xl transition-all", viewMode === 'grid' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400")}
                  >
                     <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button 
                     onClick={() => setViewMode('list')}
                     className={cn("p-3 rounded-xl transition-all", viewMode === 'list' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400")}
                  >
                     <TableIcon className="w-4 h-4" />
                  </button>
               </div>
               <button 
                  onClick={() => setShowForm(true)}
                  className="px-10 py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-3"
               >
                  <UserPlus className="w-4 h-4" /> Novo Profissional
               </button>
            </div>
         </div>

         <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
            <div className="relative flex-1">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
               <input 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome, especialidade ou cargo..."
                  className="w-full bg-slate-50 border-none rounded-[1.5rem] py-5 pl-16 pr-8 font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
               />
            </div>
            <button className="p-5 bg-slate-50 text-slate-400 rounded-2xl hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100">
               <Filter className="w-5 h-5" />
            </button>
         </div>

         <div className={cn(
            "grid gap-6",
            viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
         )}>
            {filteredProviders.map((p, i) => (
               <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={p.id}
                  className={cn(
                     "bg-white group transition-all",
                     viewMode === 'grid' 
                        ? "p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-emerald-500/30 hover:shadow-2xl" 
                        : "p-6 rounded-3xl border border-slate-100 flex items-center justify-between"
                  )}
               >
                  <div className="flex items-center gap-6">
                     <div className="relative">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl overflow-hidden" style={{ backgroundColor: p.colorCode }}>
                           <Users className="w-8 h-8" />
                        </div>
                        <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white shadow-lg", p.active ? 'bg-emerald-500' : 'bg-rose-500')} />
                     </div>
                     <div>
                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">{p.name}</h4>
                        <div className="flex items-center gap-3 mt-1">
                           <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{p.role}</span>
                           <div className="w-1 h-1 bg-slate-200 rounded-full" />
                           <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-md">
                              <Award className="w-3 h-3 text-amber-500" />
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Comissão {p.commissionRate}%</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className={cn(
                     "flex items-center gap-8",
                     viewMode === 'grid' ? "mt-8 justify-between" : ""
                  )}>
                     <div className="flex flex-col gap-1 items-start">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                           <Clock className="w-3 h-3" /> Status Hoje
                        </span>
                        <span className={cn("text-xs font-black tracking-tighter italic uppercase", p.active ? "text-emerald-500" : "text-rose-500")}>
                           {p.active ? 'Livre para Agendamento' : 'Indisponível'}
                        </span>
                     </div>

                     <div className="text-right">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Produtividade</span>
                        <div className="flex items-center gap-2">
                           <span className="text-lg font-black text-slate-900 italic tracking-tighter">98%</span>
                           <TrendingUp className="w-4 h-4 text-emerald-500" />
                        </div>
                     </div>

                     {viewMode === 'grid' && (
                        <button className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all">
                           <MoreHorizontal className="w-5 h-5" />
                        </button>
                     )}
                  </div>
               </motion.div>
            ))}
            {filteredProviders.length === 0 && (
               <div className="col-span-full py-32 text-center text-slate-300 font-black uppercase tracking-widest text-xs border-4 border-dashed border-slate-100 rounded-[4rem]">
                  Nenhum profissional encontrado
               </div>
            )}
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10">
            <div className="bg-slate-950 p-8 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
               <h5 className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-6 pulse relative z-10">Staff Disponível</h5>
               <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-end">
                     <span className="text-3xl font-black italic tracking-tighter">{providers.filter(p => p.active).length}/{providers.length}</span>
                     <span className="text-[10px] font-bold text-slate-400 mb-2">PROFISSIONAIS</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-500" style={{ width: `${(providers.filter(p => p.active).length / providers.length) * 100 || 0}%` }} />
                  </div>
               </div>
            </div>

            {[
               { label: 'Ocupação de Agenda', val: '82%', color: 'text-emerald-500', icon: <Clock /> },
               { label: 'Satisfação Média', val: '4.9', color: 'text-amber-500', icon: <Award /> },
               { label: 'Novos Profissionais', val: '00', color: 'text-rose-500', icon: <Plus /> },
            ].map((card, i) => (
               <div key={i} className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm flex items-center justify-between hover:translate-y-[-4px] transition-all cursor-pointer">
                  <div>
                     <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">{card.label}</span>
                     <span className={cn("text-3xl font-black italic tracking-tighter", card.color)}>{card.val}</span>
                  </div>
                  <div className={cn("w-14 h-14 rounded-3xl flex items-center justify-center opacity-20", card.color.replace('text', 'bg'))}>
                     {React.cloneElement(card.icon as React.ReactElement, { className: "w-6 h-6" })}
                  </div>
               </div>
            ))}
         </div>

         <AnimatePresence>
            {showForm && (
               <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[250] flex items-center justify-center p-6">
                  <motion.div 
                     initial={{ opacity: 0, scale: 0.9, y: 40 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.9, y: 40 }}
                     className="bg-white w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden font-sans border border-white/20"
                  >
                     <div className="p-12 border-b border-slate-50 flex items-center justify-between bg-white relative">
                        <div>
                           <h3 className="text-3xl font-black uppercase tracking-tighter italic leading-none mb-2">Novo Profissional</h3>
                           <p className="text-slate-400 text-xs font-medium">Cadastre um novo especialista em sua unidade</p>
                        </div>
                        <button onClick={() => setShowForm(false)} className="p-4 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
                           <X className="w-6 h-6" />
                        </button>
                     </div>
                     
                     <form onSubmit={handleAddProvider} className="p-12 pt-10 space-y-8">
                        <div className="space-y-6">
                           <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Nome Completo</label>
                              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-300" placeholder="Ex: Roberto Silva" />
                           </div>
                           <div className="grid grid-cols-2 gap-6">
                              <div>
                                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Especialidade / Cargo</label>
                                 <input required type="text" placeholder="Ex: Barbeiro Master" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-300" />
                              </div>
                              <div>
                                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Comissão (%)</label>
                                 <input required type="number" min="0" max="100" value={formData.commissionRate} onChange={e => setFormData({...formData, commissionRate: Number(e.target.value)})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                              </div>
                           </div>
                           <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Cor de Identificação</label>
                              <div className="flex gap-4">
                                 {['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#0f172a'].map(color => (
                                    <button 
                                       key={color}
                                       type="button"
                                       onClick={() => setFormData({...formData, colorCode: color})}
                                       className={cn(
                                          "w-12 h-12 rounded-xl transition-all border-4",
                                          formData.colorCode === color ? "border-slate-900 scale-110 shadow-lg" : "border-transparent"
                                       )}
                                       style={{ backgroundColor: color }}
                                    />
                                 ))}
                              </div>
                           </div>
                        </div>
                        <button type="submit" className="w-full py-6 bg-slate-950 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all shadow-2xl shadow-emerald-500/20 active:scale-95">
                           Validar e Cadastrar Profissional
                        </button>
                     </form>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>
      </div>
   );
};

