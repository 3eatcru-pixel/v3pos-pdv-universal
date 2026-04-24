import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle,
  Layers,
  MapPin,
  Tag,
  X,
  PlusCircle,
  MinusCircle,
  Clock,
  Info,
  Printer,
  History,
  TrendingDown,
  Edit2,
  Trash2,
  BarChart3,
  Box,
  LayoutGrid,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../../lib/utils';
import { firebaseService } from '../../services/firebaseService';
import { accountService } from '../services/accountService';
import { InventoryEngine } from '../services/InventoryEngine';
import { logger } from '../services/logger';
import { InventoryItem, CustomFieldDefinition } from '../../types';

interface InventoryManagementViewProps {
  module: 'restaurant' | 'market' | 'construction' | 'retail';
}

export const InventoryManagementView: React.FC<InventoryManagementViewProps> = ({ module }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const enterpriseId = accountService.getCurrentCompanyId() || 'default';
  const shopId = accountService.getSelectedShopId() || 'default';

  useEffect(() => {
    const unsub = firebaseService.subscribeCollection('inventory', enterpriseId, shopId, (data) => {
      setInventory(data as InventoryItem[]);
      setLoading(false);
    });
    return () => unsub();
  }, [enterpriseId, shopId]);

  const stats = useMemo(() => {
    const lowStock = inventory.filter(i => i.currentStock <= i.minStock).length;
    const totalValue = inventory.reduce((acc, i) => acc + (i.currentStock * i.costPerUnit), 0);
    const criticalItems = inventory.filter(i => i.currentStock <= i.minStock * 0.5).length;
    return { lowStock, totalValue, criticalItems };
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           i.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || i.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchTerm, filterCategory]);

  const handleAdjustStock = async (itemId: string, delta: number) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    // Lógica de proteção: Impedir que ajustes manuais resultem em estoque negativo
    if (item.currentStock + delta < 0) {
      logger.warn('inventory', 'Tentativa de ajuste para estoque negativo bloqueada', { itemId });
      return;
    }
    try {
      // Lógica: Utiliza o motor de inventário para garantir atualização atômica via Transaction
      await InventoryEngine.manualAdjustment(itemId, delta, 'inventory');
    } catch (error) {
      logger.error('inventory', 'Erro no ajuste manual de estoque', { itemId, error });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
           <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Centro de Suprimentos</h2>
           <p className="text-slate-500 font-medium italic">Gestão estratégica de insumos e ativos ({module.toUpperCase()}).</p>
        </div>

        <div className="flex items-center gap-4">
           <div className="bg-white px-8 py-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/5">
                 <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Rupturas Críticas</p>
                 <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{stats.criticalItems}</p>
              </div>
           </div>
           <div className="bg-slate-900 px-8 py-6 rounded-[2rem] shadow-2xl shadow-slate-900/20 flex items-center gap-6 text-white relative overflow-hidden">
              <div className="relative z-10 flex items-center gap-6">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                   <Package className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Ativos em Gôndola</p>
                   <p className="text-2xl font-black italic tracking-tighter">{formatCurrency(stats.totalValue)}</p>
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
           </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row items-center gap-6 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="relative flex-1 w-full">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
           <input 
             type="text" 
             placeholder="Filtrar por SKU, nome ou categoria..."
             className="w-full pl-16 pr-8 py-5 bg-slate-50 border-transparent rounded-[1.5rem] focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-700 italic placeholder:text-slate-300 outline-none"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
           <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn("p-3 rounded-xl transition-all", viewMode === 'grid' ? "bg-slate-900 text-white shadow-xl" : "text-slate-400 hover:text-slate-600")}
              >
                 <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn("p-3 rounded-xl transition-all", viewMode === 'list' ? "bg-slate-900 text-white shadow-xl" : "text-slate-400 hover:text-slate-600")}
              >
                 <List className="w-4 h-4" />
              </button>
           </div>
           
           <button 
             onClick={() => setIsModalOpen(true)}
             className="flex-1 md:flex-none bg-blue-600 text-white px-10 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95"
           >
              <Plus className="w-4 h-4" /> Novo Insumo
           </button>
        </div>
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-40 flex flex-col items-center justify-center space-y-6 grayscale opacity-30"
          >
            <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">Sincronizando Inventário Global...</p>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "grid gap-8",
              viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
            )}
          >
            {filteredInventory.map((item, idx) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "bg-white group transition-all duration-500 relative overflow-hidden",
                  viewMode === 'grid' 
                    ? "p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-200" 
                    : "p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between"
                )}
              >
                <div className={cn("flex gap-6", viewMode === 'grid' ? "flex-col" : "items-center flex-1")}>
                  <div className="flex items-center justify-between">
                     <div className={cn(
                       "w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                       item.currentStock <= item.minStock ? "bg-rose-50 text-rose-500" : "bg-slate-50 text-blue-500"
                     )}>
                        <Box className="w-8 h-8" />
                     </div>
                     <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{item.unit}</span>
                        <div className="flex items-baseline gap-2">
                           {module === 'construction' && item.reservedStock > 0 && (
                             <span className="text-xs font-black text-amber-500" title="Reservado para entregas">-{item.reservedStock}</span>
                           )}
                           <span className={cn(
                             "text-2xl font-black italic tracking-tighter",
                             item.currentStock <= item.minStock ? "text-rose-600" : "text-slate-900"
                           )}>{item.currentStock}</span>
                        </div>
                     </div>
                  </div>

                  <div className="flex-1">
                     <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic leading-none truncate">{item.name}</h4>
                     <p className="text-[9px] font-black uppercase text-slate-400 mt-2 tracking-widest flex items-center gap-2">
                        <Tag className="w-3 h-3" /> {item.category} • <MapPin className="w-3 h-3" /> {item.location || 'Central'}
                     </p>
                  </div>

                  {item.lastRecountDate && (
                    <div className="flex items-center gap-1.5 text-[8px] font-black uppercase text-slate-400 mt-1">
                       <Clock className="w-2.5 h-2.5" /> Auditado em {new Date(item.lastRecountDate).toLocaleDateString()}
                    </div>
                  )}

                  <div className="space-y-4">
                     <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((item.currentStock / (item.minStock * 3)) * 100, 100)}%` }}
                          className={cn(
                            "h-full rounded-full",
                            item.currentStock <= item.minStock ? "bg-rose-500" : "bg-emerald-500"
                          )}
                        />
                     </div>
                     
                     <div className="flex gap-2">
                        <button 
                          disabled={item.currentStock <= 0}
                          onClick={(e) => { e.stopPropagation(); handleAdjustStock(item.id, -1); }}
                          className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center disabled:opacity-30"
                        >
                           <MinusCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAdjustStock(item.id, 1); }}
                          className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center"
                        >
                           <PlusCircle className="w-4 h-4" />
                        </button>
                        <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all">
                           <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all" title="Imprimir Etiqueta">
                           <Printer className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
                </div>

                {item.currentStock <= item.minStock && (
                  <div className="absolute -top-10 -right-10 w-20 h-20 bg-rose-500/10 rotate-45 flex items-end justify-center pb-2">
                     <AlertTriangle className="w-4 h-4 text-rose-500" />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {filteredInventory.length === 0 && !loading && (
        <div className="py-40 flex flex-col items-center justify-center space-y-6 opacity-20">
          <Layers className="w-20 h-20 text-slate-400" />
          <p className="text-xl font-black uppercase tracking-widest italic">Nenhum item detectado no radar</p>
        </div>
      )}
    </div>
  );
};
