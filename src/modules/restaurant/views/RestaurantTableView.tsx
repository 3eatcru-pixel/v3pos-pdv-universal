import React, { useState } from 'react';
import { Settings, Users, Clock, Utensils, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCollection } from '../../../hooks/useCollection';
import { accountService } from '../../../core/services/accountService';
import { TableConfigPopover } from '../../../core/components/TableConfigPopover';
import { Table } from '../../../types';
import { cn, formatCurrency } from '../../../lib/utils';

export const RestaurantTableView: React.FC = () => {
  const enterpriseId = accountService.getCurrentCompanyId();
  const shopId = accountService.getSelectedShopId();
  
  // Hook de tempo real para monitorar o estado das mesas via malha P2P/Firestore
  const { data: tables, loading } = useCollection<Table>('tables', { enterpriseId, shopId });
  
  // Estado para controlar qual popover de configuração está ativo
  const [activeConfigTableId, setActiveConfigTableId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 grayscale opacity-40">
        <Utensils className="w-12 h-12 animate-bounce mb-4 text-slate-300" />
        <p className="text-[10px] font-black uppercase tracking-widest italic animate-pulse">Sincronizando Mapa de Mesas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Operação de Salão</h2>
          <p className="text-slate-500 font-medium italic mt-2">Gestão tática de ocupação e consumo em tempo real.</p>
        </div>
        
        <div className="flex gap-4 bg-white p-2 rounded-[1.5rem] border border-slate-100 shadow-sm">
           <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {tables.filter(t => t.status === 'occupied').length} Ocupadas
              </span>
           </div>
           <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-400 rounded-xl">
              <span className="text-[10px] font-black uppercase tracking-widest">
                {tables.filter(t => t.status === 'available').length} Livres
              </span>
           </div>
        </div>
      </div>

      {/* Grid de Mesas Dinâmica */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {tables.sort((a, b) => a.number - b.number).map((table) => (
          <motion.div
            key={table.id}
            layout
            className={cn(
              "relative h-56 rounded-[2.5rem] border-2 transition-all p-8 flex flex-col justify-between overflow-visible",
              table.status === 'occupied' 
                ? "bg-slate-900 border-slate-800 text-white shadow-2xl shadow-slate-900/40" 
                : "bg-white border-slate-100 text-slate-400 hover:border-blue-200"
            )}
          >
            {/* Header da Mesa */}
            <div className="flex justify-between items-start">
               <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-40 italic">Mesa</span>
                  <span className="text-4xl font-black italic tracking-tighter leading-none">{table.number}</span>
               </div>
               
               {/* Botão de Configuração e Gatilho do Popover */}
               {table.status === 'occupied' && (
                 <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveConfigTableId(activeConfigTableId === table.id ? null : table.id);
                      }}
                      className={cn(
                        "p-3 rounded-2xl transition-all shadow-sm",
                        activeConfigTableId === table.id 
                          ? "bg-blue-600 text-white scale-110" 
                          : "bg-white/5 text-slate-500 hover:text-white hover:bg-white/10"
                      )}
                    >
                       <Settings className={cn("w-5 h-5", activeConfigTableId === table.id && "animate-spin-slow")} />
                    </button>

                    <AnimatePresence>
                      {activeConfigTableId === table.id && (
                        <TableConfigPopover 
                          table={table} 
                          onClose={() => setActiveConfigTableId(null)} 
                        />
                      )}
                    </AnimatePresence>
                 </div>
               )}
            </div>

            {/* Conteúdo Central: Consumo */}
            <div className="flex-1 flex flex-col justify-center">
               {table.status === 'occupied' ? (
                 <div className="space-y-1">
                    <p className="text-2xl font-black text-emerald-400 tracking-tighter italic">
                      {formatCurrency(table.activeOrder?.total || 0)}
                    </p>
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500 italic">
                       <Clock className="w-3.5 h-3.5" /> Ativa
                    </div>
                 </div>
               ) : (
                 <div className="text-[11px] font-black uppercase tracking-[0.3em] italic opacity-10">Livre</div>
               )}
            </div>

            {/* Rodapé da Mesa */}
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                  {table.status === 'occupied' && (
                    <>
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-black italic">{table.activeOrder?.customerCount || 2}</span>
                    </>
                  )}
               </div>
            </div>
          </motion.div>
        ))}
        
        <button className="h-56 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-300 hover:border-blue-300 hover:text-blue-500 transition-all group">
           <Plus className="w-10 h-10 group-hover:scale-110 transition-transform" />
           <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add Mesa</span>
        </button>
      </div>
    </div>
  );
};