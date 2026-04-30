import React, { useState } from 'react';
import { Armchair, Plus, Check, X } from 'lucide-react';
import { serviceManagementService } from '../services/serviceManagementService';
import { accountService } from '../../../core/services/accountService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';

export const ServiceResourcesPage: React.FC = () => {
   const enterpriseId = accountService.getCurrentCompanyId() || '';
   const [resources, setResources] = useState(serviceManagementService.getResources(enterpriseId));
   const shopId = accountService.getSelectedShopId() || '';
   const [showForm, setShowForm] = useState(false);
   const [formData, setFormData] = useState({ name: '', type: '' });

   const handleAddResource = (e: React.FormEvent) => {
      e.preventDefault();
      serviceManagementService.addResource({
         ...formData,
         enterpriseId,
         active: true,
         shopId
      });
      setResources(serviceManagementService.getResources(enterpriseId, shopId));
      setShowForm(false);
      setFormData({ name: '', type: '' });
   };

   return (
      <div className="space-y-6 animate-in fade-in duration-500">
         <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 italic">Recursos / Equipamentos</h2>
            <button 
               onClick={() => setShowForm(true)}
               className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-lg"
            >
               <Plus className="w-4 h-4" />
               Novo Recurso
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {resources.map(r => (
               <div key={r.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 group hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between">
                     <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                        <Armchair className="w-6 h-6" />
                     </div>
                     <button
                        onClick={() => {
                           const updatedResources = resources.map(resource => 
                             resource.id === r.id ? { ...resource, active: !resource.active } : resource
                           );
                           setResources(updatedResources);
                        }}
                        className={cn(
                           "text-[9px] font-black uppercase px-3 py-1 rounded-full border transition-all cursor-pointer",
                           r.active ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200" 
                                    : "bg-rose-50 text-rose-600 border-rose-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                        )}
                        title={r.active ? "Desativar (Falta Inativa)" : "Ativar Recurso"}
                     >
                        {r.active ? 'Ativo' : 'Inativo (86)'}
                     </button>
                  </div>
                  <div className="pt-2">
                     <h4 className="font-black text-sm text-slate-800 uppercase tracking-tight">{r.name}</h4>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{r.type}</span>
                  </div>
               </div>
            ))}
            {resources.length === 0 && (
               <div className="col-span-full py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs border-2 border-dashed border-slate-100 rounded-[3rem]">
                  Nenhum recurso cadastrado
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
                           <h3 className="text-xl font-black uppercase tracking-tighter italic leading-none mb-1">Novo Recurso</h3>
                        </div>
                        <button onClick={() => setShowForm(false)} className="p-3 text-slate-400 hover:text-rose-500 transition-colors">
                           <X className="w-6 h-6" />
                        </button>
                     </div>
                     
                     <form onSubmit={handleAddResource} className="p-8 space-y-6">
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Identificação / Nome</label>
                           <input required type="text" placeholder="Ex: Cadeira 02, Sala de Massagem" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 rounded-2xl px-4 py-3 font-bold outline-none" />
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Tipo / Categoria</label>
                           <input required type="text" placeholder="Ex: Cadeira, Sala, Equipamento" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 rounded-2xl px-4 py-3 font-bold outline-none" />
                        </div>
                        <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 transition-colors mt-8">
                           Cadastrar Recurso
                        </button>
                     </form>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>
      </div>
   );
};
