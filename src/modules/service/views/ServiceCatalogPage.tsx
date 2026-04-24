import React, { useState } from 'react';
import { Settings, Plus, Scissors, X } from 'lucide-react';
import { serviceManagementService } from '../services/serviceManagementService';
import { accountService } from '../../../core/services/accountService';
import { motion, AnimatePresence } from 'motion/react';

export const ServiceCatalogPage: React.FC = () => {
   const enterpriseId = accountService.getCurrentCompanyId() || '';
   const [services, setServices] = useState(serviceManagementService.getServices(enterpriseId));
   const shopId = accountService.getSelectedShopId() || '';
   const [showForm, setShowForm] = useState(false);
   const [formData, setFormData] = useState({ name: '', durationMinutes: 30, price: 0, category: '', colorCode: '#3b82f6' });

   const handleAddService = (e: React.FormEvent) => {
      e.preventDefault();
      serviceManagementService.addService({
         ...formData,
         enterpriseId,
         active: true
         shopId
      });
      setServices(serviceManagementService.getServices(enterpriseId, shopId));
      setShowForm(false);
      setFormData({ name: '', durationMinutes: 30, price: 0, category: '', colorCode: '#3b82f6' });
   };

   return (
      <div className="space-y-6 animate-in fade-in duration-500">
         <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 italic">Catálogo de Serviços</h2>
            <button 
               onClick={() => setShowForm(true)}
               className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-lg"
            >
               <Plus className="w-4 h-4" />
               Novo Serviço
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(s => (
               <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 group hover:shadow-xl transition-all">
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: s.colorCode }}>
                        <Scissors className="w-6 h-6" />
                     </div>
                     <div>
                        <h4 className="font-black text-sm text-slate-800 uppercase tracking-tight">{s.name}</h4>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.category} || 'Geral'</span>
                     </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                     <span className="text-sm font-black text-emerald-600">R$ {s.price.toFixed(2)}</span>
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.durationMinutes} min</span>
                  </div>
               </div>
            ))}
            {services.length === 0 && (
               <div className="col-span-full py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs border-2 border-dashed border-slate-100 rounded-[3rem]">
                  Nenhum serviço cadastrado
               </div>
            )}
         </div>

         <AnimatePresence>
            {showForm && (
               <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-6">
                  <motion.div 
                     initial={{ opacity: 0, scale: 0.9, y: 20 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.9, y: 20 }}
                     className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden font-sans"
                  >
                     <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                        <div>
                           <h3 className="text-xl font-black uppercase tracking-tighter italic leading-none mb-1">Novo Serviço</h3>
                        </div>
                        <button onClick={() => setShowForm(false)} className="p-3 text-slate-400 hover:text-rose-500 transition-colors">
                           <X className="w-6 h-6" />
                        </button>
                     </div>
                     
                     <form onSubmit={handleAddService} className="p-8 space-y-6">
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Nome do Serviço</label>
                           <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 rounded-2xl px-4 py-3 font-bold outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Duração (min)</label>
                              <input required type="number" min="5" value={formData.durationMinutes} onChange={e => setFormData({...formData, durationMinutes: Number(e.target.value)})} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 rounded-2xl px-4 py-3 font-bold outline-none" />
                           </div>
                           <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Preço (R$)</label>
                              <input required type="number" min="0" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 rounded-2xl px-4 py-3 font-bold outline-none" />
                           </div>
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Categoria</label>
                           <input type="text" placeholder="Ex: Cabelo, Spa" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 rounded-2xl px-4 py-3 font-bold outline-none" />
                        </div>
                        <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 transition-colors mt-8">
                           Salvar Serviço
                        </button>
                     </form>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>
      </div>
   );
};
