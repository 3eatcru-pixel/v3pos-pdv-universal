import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MapPin, 
  Phone, 
  Mail, 
  Star, 
  ShieldCheck, 
  History, 
  FileText, 
  MoreVertical, 
  X, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Package,
  Truck,
  DollarSign,
  AlertTriangle,
  Building,
  Target,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { Supplier, SupplierContract } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { accountService } from '../services/accountService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SupplierManagementViewProps {
  module: 'restaurant' | 'market' | 'construction' | 'retail';
}

export const SupplierManagementView: React.FC<SupplierManagementViewProps> = ({ module }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contracts, setContracts] = useState<SupplierContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'contracts' | 'orders'>('info');

  const currentUser = accountService.getCurrentUser();
  const companyId = currentUser?.companyId || 'default';

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [supps, conts] = await Promise.all([
        firebaseService.getAllDocs('suppliers', companyId),
        firebaseService.getAllDocs('supplier_contracts', companyId)
      ]);
      setSuppliers(supps as Supplier[]);
      setContracts(conts as SupplierContract[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const id = `supp-${Math.random().toString(36).substr(2, 9)}`;
    const newSupp: Supplier = {
      id,
      enterpriseId: companyId,
      name: formData.get('name') as string,
      contactName: formData.get('contactName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      category: formData.get('category') as string,
      active: true,
      rating: 5
    };

    try {
      await firebaseService.saveItem('suppliers', id, newSupp);
      setIsAddModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Supply Chain Hub</h2>
           <p className="text-slate-500 font-medium italic">Gestão de parceiros, contratos e procurement ({module.toUpperCase()}).</p>
        </div>
        <div className="flex gap-4">
           <button 
             onClick={() => setIsAddModalOpen(true)}
             className="px-10 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl flex items-center gap-3 active:scale-95"
           >
              <Plus className="w-4 h-4" /> Novo Fornecedor
           </button>
        </div>
      </div>

      {/* Stats Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
         {[
           { label: 'Parceiros Ativos', val: suppliers.length, icon: <Users />, color: 'text-blue-500' },
           { label: 'Contratos em Vigor', val: contracts.filter(c => c.status === 'active').length, icon: <FileText />, color: 'text-emerald-500' },
           { label: 'Pedidos Pendentes', val: '12', icon: <Package />, color: 'text-amber-500' },
           { label: 'Lead Time Médio', val: '2.4d', icon: <Clock />, color: 'text-indigo-500' },
         ].map((card, i) => (
           <div key={i} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-slate-300 transition-all">
              <div>
                 <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-2">{card.label}</span>
                 <span className={cn("text-3xl font-black italic tracking-tighter", card.color)}>{card.val}</span>
              </div>
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg shadow-opacity-5", card.color.replace('text', 'bg').replace('500', '50'))}>
                 {React.cloneElement(card.icon as React.ReactElement, { className: "w-6 h-6" })}
              </div>
           </div>
         ))}
      </div>

      {/* Tool & List View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         {/* Suppliers List */}
         <div className="lg:col-span-1 space-y-6">
            <div className="relative">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
               <input 
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
                 placeholder="Buscar fornecedor..."
                 className="w-full bg-white border border-slate-100 rounded-[1.5rem] py-5 pl-16 pr-8 font-bold text-xs focus:ring-2 focus:ring-slate-900 outline-none transition-all italic placeholder:text-slate-300 shadow-sm"
               />
            </div>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
               {filteredSuppliers.map((supp, i) => (
                 <motion.div 
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: i * 0.05 }}
                   key={supp.id}
                   onClick={() => setSelectedSupplier(supp)}
                   className={cn(
                     "p-6 rounded-[2rem] border transition-all cursor-pointer group flex items-center justify-between",
                     selectedSupplier?.id === supp.id ? "bg-slate-900 text-white border-slate-900 shadow-xl" : "bg-white text-slate-800 border-slate-100 hover:border-slate-300 shadow-sm"
                   )}
                 >
                    <div className="flex items-center gap-4">
                       <div className={cn(
                         "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                         selectedSupplier?.id === supp.id ? "bg-white/10" : "bg-slate-50 group-hover:bg-slate-100"
                       )}>
                          <Building className="w-6 h-6" />
                       </div>
                       <div>
                          <p className="font-black uppercase text-xs italic tracking-tighter truncate max-w-[120px]">{supp.name}</p>
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded mt-1 inline-block",
                            selectedSupplier?.id === supp.id ? "bg-white/10 text-white" : "bg-slate-100 text-slate-400"
                          )}>{supp.category}</span>
                       </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-30" />
                 </motion.div>
               ))}
            </div>
         </div>

         {/* Detailed View */}
         <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
               {selectedSupplier ? (
                 <motion.div 
                   key={selectedSupplier.id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -20 }}
                   className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full"
                 >
                    <div className="bg-slate-900 p-12 text-white relative overflow-hidden shrink-0">
                       <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center gap-8">
                             <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center backdrop-blur-xl border border-white/10">
                                <Building className="w-12 h-12 text-white" />
                             </div>
                             <div>
                                <h3 className="text-3xl font-black uppercase italic tracking-tighter">{selectedSupplier.name}</h3>
                                <div className="flex items-center gap-4 mt-2">
                                   <div className="flex items-center gap-1">
                                      {[1,2,3,4,5].map(s => <Star key={s} className={cn("w-3 h-3", s <= (selectedSupplier.rating || 5) ? "fill-amber-400 text-amber-400" : "text-white/20")} />)}
                                   </div>
                                   <span className="w-1 h-1 bg-white/20 rounded-full" />
                                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Verificado / Gold</span>
                                </div>
                             </div>
                          </div>
                          <button onClick={() => setSelectedSupplier(null)} className="p-4 bg-white/10 rounded-2xl hover:bg-rose-500 transition-all">
                             <X className="w-5 h-5" />
                          </button>
                       </div>
                       <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]" />
                    </div>

                    <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
                       <div className="flex border-b border-slate-100 mb-10">
                          {['info', 'contracts', 'orders'].map(tab => (
                            <button 
                              key={tab}
                              onClick={() => setActiveTab(tab as any)}
                              className={cn(
                                "px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 -mb-[1px]",
                                activeTab === tab ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
                              )}
                            >
                               {tab === 'info' ? 'Visão Geral' : tab === 'contracts' ? 'Contratos' : 'Logística'}
                            </button>
                          ))}
                       </div>

                       {activeTab === 'info' ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-10">
                               <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                                  <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic border-b border-slate-200 pb-3">Endpoint de Contato</h5>
                                  <div className="space-y-4">
                                     <div className="flex items-center gap-4 text-slate-600">
                                        <Mail className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-bold">{selectedSupplier.email}</span>
                                     </div>
                                     <div className="flex items-center gap-4 text-slate-600">
                                        <Phone className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-bold">{selectedSupplier.phone}</span>
                                     </div>
                                     <div className="flex items-center gap-4 text-slate-600">
                                        <Target className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-bold">{selectedSupplier.cnpj || 'CNPJ não informado'}</span>
                                     </div>
                                  </div>
                               </div>

                               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                  <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 italic">Fiscal Monitor</h5>
                                  <div className="flex items-center gap-6 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                                     <ShieldCheck className="w-10 h-10 text-emerald-500" />
                                     <div>
                                        <p className="text-xs font-black text-emerald-700 uppercase italic">Certidão Negativa Regular</p>
                                        <p className="text-[9px] font-bold text-emerald-600/60 uppercase mt-1">Válido até Dez/2026</p>
                                     </div>
                                  </div>
                               </div>
                            </div>

                            <div className="space-y-10">
                               <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                                  <h5 className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-4">Volume Compra (ANUAL)</h5>
                                  <p className="text-4xl font-black italic tracking-tighter">{formatCurrency(145420)}</p>
                                  <p className="text-[9px] font-medium text-slate-400 mt-2 italic capitalize">Frequência: Semanal (Bebidas)</p>
                               </div>
                               
                               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                                  <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 border-b border-slate-50 pb-2 italic">Principais SKUs</h5>
                                  <div className="space-y-3">
                                     {['Cerveja Premium 600ml', 'Água Mineral 500ml', 'Refrigerante Lata'].map((sku, i) => (
                                       <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                          <span className="text-xs font-bold text-slate-700">{sku}</span>
                                          <ArrowUpRight className="w-3 h-3 text-slate-300" />
                                       </div>
                                     ))}
                                  </div>
                               </div>
                            </div>
                         </div>
                       ) : activeTab === 'contracts' ? (
                          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                             {contracts.filter(c => c.supplierId === selectedSupplier.id).map(contract => (
                               <div key={contract.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-500 transition-all">
                                  <div className="flex items-center gap-6">
                                     <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                                        <FileText className="w-6 h-6" />
                                     </div>
                                     <div>
                                        <p className="font-black text-slate-900 uppercase text-sm tracking-tight italic">{contract.title}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Início: {format(contract.startDate, 'dd/MM/yyyy')}</span>
                                           <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                           <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">ATIVO</span>
                                        </div>
                                     </div>
                                  </div>
                                  <button className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all">
                                     Visualizar Termos
                                  </button>
                               </div>
                             ))}
                             
                             <button className="w-full py-8 border-2 border-dashed border-slate-100 rounded-[2.5rem] text-slate-300 font-black uppercase text-[10px] tracking-widest hover:border-blue-500/50 hover:text-blue-500 transition-all flex flex-col items-center gap-4">
                                <Plus className="w-8 h-8" />
                                Novo Contrato / Upgrade
                             </button>
                          </div>
                       ) : (
                          <div className="py-20 text-center space-y-6 opacity-30 grayscale blur-[1px]">
                             <Truck className="w-16 h-16 mx-auto text-slate-300" />
                             <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">Monitoramento de Carga</p>
                                <p className="text-xs font-medium italic">Endpoint Logístico em Manutenção.</p>
                             </div>
                          </div>
                       )}
                    </div>
                 </motion.div>
               ) : (
                 <div className="h-full bg-slate-50 rounded-[4rem] border border-dashed border-slate-200 flex flex-col items-center justify-center p-20 text-center space-y-8 grayscale opacity-40">
                    <div className="w-32 h-32 rounded-[3.5rem] border-2 border-dashed border-slate-300 flex items-center justify-center">
                       <Building className="w-12 h-12 text-slate-300" />
                    </div>
                    <div>
                       <h4 className="text-2xl font-black text-slate-600 tracking-tighter uppercase italic">Selecione um Parceiro</h4>
                       <p className="text-sm font-medium text-slate-400 mt-2 italic">Visualize contratos, notas fiscais e performance de entrega.</p>
                    </div>
                 </div>
               )}
            </AnimatePresence>
         </div>
      </div>

      {/* Add Supplier Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
             <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-xl bg-white rounded-[3rem] shadow-4xl p-16 relative"
             >
                <button onClick={() => setIsAddModalOpen(false)} className="absolute top-10 right-10 p-4 text-slate-400 hover:text-rose-500 transition-all active:scale-90">
                   <X className="w-8 h-8" />
                </button>

                <div className="mb-12">
                   <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Novo Supply Partner</h3>
                   <p className="text-slate-500 font-medium italic mt-2">Dados vitais para integração na cadeia de suprimentos.</p>
                </div>

                <form onSubmit={handleSaveSupplier} className="space-y-10">
                   <div className="space-y-6">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Nome Corporativo / Razão Social</label>
                         <input name="name" required className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 font-bold italic focus:border-blue-500 outline-none transition-all" placeholder="Ex: Ambev S/A" />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Segmento</label>
                            <input name="category" required className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 font-bold italic focus:border-blue-500 outline-none transition-all" placeholder="Ex: Bebidas" />
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Telefone Comercial</label>
                            <input name="phone" required className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 font-bold italic focus:border-blue-500 outline-none transition-all" placeholder="(00) 00000-0000" />
                         </div>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">E-mail para Pedidos (B2B)</label>
                         <input name="email" type="email" required className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 font-bold italic focus:border-blue-500 outline-none transition-all" placeholder="vendas@fornecedor.com.br" />
                      </div>
                   </div>

                   <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-black transition-all shadow-2xl active:scale-[0.98]">Inaugurar Parceria</button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
