import React, { useState } from 'react';
import { UserCircle, Plus, Phone, Mail, X } from 'lucide-react';
import { clientService } from '../services/clientService';
import { accountService } from '../../../core/services/accountService';
import { motion, AnimatePresence } from 'motion/react';

export const ServiceClientsPage: React.FC = () => {
   const enterpriseId = accountService.getCurrentCompanyId() || '';
   const [clients, setClients] = useState(clientService.getClients(enterpriseId));
   const shopId = accountService.getSelectedShopId() || '';
   const [showForm, setShowForm] = useState(false);
   const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

   const handleAddClient = (e: React.FormEvent) => {
      e.preventDefault();
      clientService.addClient({
         ...formData,
         enterpriseId,
         shopId
      });
      setClients(clientService.getClients(enterpriseId, shopId));
      setShowForm(false);
      setFormData({ name: '', phone: '', email: '' });
   };

   return (
      <div className="space-y-6 animate-in fade-in duration-500">
         <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 italic">Clientes</h2>
            <button 
               onClick={() => setShowForm(true)}
               className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-lg"
            >
               <Plus className="w-4 h-4" />
               Novo Cliente
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map(c => (
               <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 group hover:shadow-xl transition-all">
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                        <UserCircle className="w-6 h-6" />
                     </div>
                     <div className="flex-1 overflow-hidden">
                        <h4 className="font-black text-sm text-slate-800 uppercase tracking-tight truncate">{c.name}</h4>
                        <div className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                           <Phone className="w-3 h-3" />
                           <span className="truncate">{c.phone}</span>
                        </div>
                     </div>
                  </div>
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Visitas: <span className="text-emerald-600">{c.history.length}</span>
                     </span>
                     {c.email && (
                        <div className="flex items-center gap-1 text-slate-400">
                           <Mail className="w-3 h-3" />
                        </div>
                     )}
                  </div>
               </div>
            ))}
            {clients.length === 0 && (
               <div className="col-span-full py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs border-2 border-dashed border-slate-100 rounded-[3rem]">
                  Nenhum cliente cadastrado
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
                           <h3 className="text-xl font-black uppercase tracking-tighter italic leading-none mb-1">Novo Cliente</h3>
                        </div>
                        <button onClick={() => setShowForm(false)} className="p-3 text-slate-400 hover:text-rose-500 transition-colors">
                           <X className="w-6 h-6" />
                        </button>
                     </div>
                     
                     <form onSubmit={handleAddClient} className="p-8 space-y-6">
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Nome Completo</label>
                           <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 rounded-2xl px-4 py-3 font-bold outline-none" />
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Celular / WhatsApp</label>
                           <input required type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 rounded-2xl px-4 py-3 font-bold outline-none" placeholder="(00) 00000-0000" />
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">E-mail (Opcional)</label>
                           <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 rounded-2xl px-4 py-3 font-bold outline-none" />
                        </div>
                        <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 transition-colors mt-8">
                           Cadastrar Cliente
                        </button>
                     </form>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>
      </div>
   );
};
