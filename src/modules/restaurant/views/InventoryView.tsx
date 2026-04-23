import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Edit, 
  AlertTriangle, 
  History, 
  CheckCircle2, 
  X,
  Package,
  TrendingDown,
  ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryItem, Staff, RecountRequest } from '../../../types';
import { cn, formatCurrency } from '../../../lib/utils';

interface InventoryViewProps {
  inventory: InventoryItem[];
  currentUser: Staff | null;
  onUpdateItem: (item: InventoryItem) => void;
  onReportError: (req: RecountRequest) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  currentUser,
  onUpdateItem,
  onReportError
}) => {
  const [inventoryLocation, setInventoryLocation] = useState<'FOH' | 'BOH'>('BOH');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecountModalOpen, setIsRecountModalOpen] = useState(false);
  const [activeRecountItem, setActiveRecountItem] = useState<InventoryItem | null>(null);

  const filteredInventory = useMemo(() => {
    return inventory.filter(i => 
      i.location === inventoryLocation && 
      (searchQuery ? (i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.category.toLowerCase().includes(searchQuery.toLowerCase())) : true)
    );
  }, [inventory, inventoryLocation, searchQuery]);

  const stats = useMemo(() => {
    const lowStock = inventory.filter(i => i.currentStock < i.minStock).length;
    const totalValue = inventory.reduce((acc, i) => acc + (i.currentStock * i.costPerUnit), 0);
    return { lowStock, totalValue };
  }, [inventory]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Insumos</h2>
           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Controle de Estoque Real-Time</p>
        </div>

        <div className="flex items-center gap-4">
           <div className="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                 <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                 <p className="text-[8px] font-black uppercase text-slate-400">Itens Críticos</p>
                 <p className="text-xl font-black text-slate-900">{stats.lowStock}</p>
              </div>
           </div>
           <div className="bg-slate-900 px-6 py-4 rounded-2xl shadow-xl shadow-slate-900/10 flex items-center gap-4 text-white">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                 <Package className="w-5 h-5" />
              </div>
              <div>
                 <p className="text-[8px] font-black uppercase text-white/50">Valor em Estoque</p>
                 <p className="text-xl font-black">{formatCurrency(stats.totalValue)}</p>
              </div>
           </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
           <button 
             onClick={() => setInventoryLocation('BOH')}
             className={cn(
               "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
               inventoryLocation === 'BOH' ? "bg-white text-slate-900 shadow-md" : "text-slate-400"
             )}
           >
             BOH (Cozinha)
           </button>
           <button 
             onClick={() => setInventoryLocation('FOH')}
             className={cn(
               "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
               inventoryLocation === 'FOH' ? "bg-white text-slate-900 shadow-md" : "text-slate-400"
             )}
           >
             FOH (Salão)
           </button>
        </div>

        <div className="relative flex-1">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
           <input 
             type="text" 
             placeholder="Buscar insumos..."
             className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold text-slate-600 text-sm"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
           />
        </div>

        {currentUser?.role === 'owner' && (
           <button className="bg-emerald-500 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all flex items-center gap-2">
              <Plus className="w-4 h-4" /> Adicionar Insumo
           </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Insumo</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Quantidade</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Custo Unit.</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredInventory.map(item => (
              <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-6">
                   <div>
                      <p className="font-black text-slate-800 text-sm tracking-tight">{item.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{item.category}</p>
                   </div>
                </td>
                <td className="px-8 py-6">
                   {item.currentStock < item.minStock ? (
                      <span className="bg-rose-50 text-rose-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase border border-rose-100">Crítico</span>
                   ) : (
                      <span className="bg-emerald-50 text-emerald-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase border border-emerald-100">Normal</span>
                   )}
                </td>
                <td className="px-8 py-6">
                   <span className="font-mono font-black text-slate-700 text-sm">{item.currentStock}</span>
                   <span className="text-[10px] font-bold text-slate-400 ml-1.5 uppercase">{item.unit}</span>
                </td>
                <td className="px-8 py-6">
                   <span className="font-mono font-bold text-slate-400 text-xs">{formatCurrency(item.costPerUnit)}</span>
                </td>
                <td className="px-8 py-6">
                   <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setActiveRecountItem(item); setIsRecountModalOpen(true); }}
                        className="p-2.5 bg-amber-50 text-amber-500 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                        title="Reportar Diferença"
                      >
                         <AlertTriangle className="w-4 h-4" />
                      </button>
                      {currentUser?.role === 'owner' && (
                         <button className="p-2.5 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-sm">
                            <Edit className="w-4 h-4" />
                         </button>
                      )}
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recount Modal */}
      <AnimatePresence>
        {isRecountModalOpen && activeRecountItem && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Reportar Diferença</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Item: {activeRecountItem.name}</p>
                 </div>
                 <button onClick={() => setIsRecountModalOpen(false)} className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-slate-900">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <form 
                onSubmit={(e) => {
                   e.preventDefault();
                   const formData = new FormData(e.currentTarget);
                   onReportError({
                      id: `req-${Date.now()}`,
                      enterpriseId: activeRecountItem.enterpriseId,
                      shopId: activeRecountItem.shopId,
                      itemId: activeRecountItem.id,
                      itemName: activeRecountItem.name,
                      previousStock: activeRecountItem.currentStock,
                      newStock: parseFloat(formData.get('newStock') as string),
                      comment: formData.get('comment') as string,
                      status: 'pending',
                      date: Date.now(),
                      staffId: currentUser?.id || 'unknown'
                   });
                   setIsRecountModalOpen(false);
                }}
                className="p-8 space-y-6"
              >
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Quantidade Identificada</label>
                   <div className="flex items-center gap-3">
                      <input 
                        name="newStock" 
                        type="number" 
                        step="0.01" 
                        required 
                        className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-mono font-black text-lg focus:bg-white focus:border-emerald-500/20 outline-none transition-all"
                        placeholder="0.00"
                      />
                      <span className="bg-slate-100 px-6 py-4 rounded-2xl text-xs font-black uppercase text-slate-400">{activeRecountItem.unit}</span>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Observação / Justificativa</label>
                   <textarea 
                     name="comment" 
                     required 
                     className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500/20 outline-none transition-all resize-none"
                     placeholder="Explique o motivo da diferença..."
                   />
                </div>

                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex gap-4 items-start">
                   <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                   <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-tight">
                      Esta ação notificará o gerente para auditoria. A recontagem altera a margem de lucro prevista do dia.
                   </p>
                </div>

                <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all">
                   Confirmar e Enviar
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
