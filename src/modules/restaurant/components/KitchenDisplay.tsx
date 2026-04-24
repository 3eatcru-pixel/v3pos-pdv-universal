import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Package, 
  CheckCircle2, 
  AlertTriangle,
  UtensilsCrossed,
  Beer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, OrderItem, Table } from '../../../types';
import { cn } from '../../../lib/utils';

interface KitchenDisplayProps {
  type: 'kitchen' | 'bar';
  orders: Order[];
  tables: Table[];
  onAcceptItems: (orderId: string, isBar: boolean) => void;
  onMarkItemsReady: (orderId: string, isBar: boolean) => void;
  onQuickStock: (sector: string) => void;
}

export const KitchenDisplay: React.FC<KitchenDisplayProps> = ({
  type,
  orders,
  tables,
  onAcceptItems,
  onMarkItemsReady,
  onQuickStock
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const barCategories = ['Bebidas', 'Bar', 'FOH'];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const activeOrders = orders
    .map(o => ({
      ...o,
      items: o.items.filter(i => 
        type === 'bar' ? barCategories.includes(i.category) : !barCategories.includes(i.category)
      )
    }))
    .filter(o => o.items.some(i => i.status === 'pending' || i.status === 'preparing' || i.status === 'ready'));

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
           <div className={cn(
             "w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg",
             type === 'kitchen' ? "bg-slate-900 shadow-slate-900/20" : "bg-blue-600 shadow-blue-600/20"
           )}>
             {type === 'kitchen' ? <UtensilsCrossed className="w-8 h-8" /> : <Beer className="w-8 h-8" />}
           </div>
           <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                 {type === 'kitchen' ? 'Cozinha (KDS)' : 'Bar (BDS)'}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pendentes</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Preparando</span>
                 </div>
              </div>
           </div>
        </div>

        <button
          onClick={() => onQuickStock(type)}
          className="flex items-center gap-3 px-6 py-4 bg-slate-50 border border-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
        >
          <Package className="w-4 h-4" /> Gestão de Faltas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {activeOrders.map(order => (
            <motion.div 
              key={order.id}
              layoutId={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col group transition-all hover:border-slate-200"
            >
              {/* Header Card */}
              <div className={cn(
                "p-5 flex items-center justify-between text-white",
                (currentTime - order.startTime) > 1200000 ? "bg-rose-500" : 
                (currentTime - order.startTime) > 600000 ? "bg-amber-500" : 
                "bg-slate-900"
              )}>
                <div>
                  <h4 className="font-black text-lg tracking-tighter leading-none">
                     {order.orderType === 'takeaway' ? `Takeaway #${order.takeawayNumber}` : `Mesa 0${tables.find(t => t.id === order.tableId)?.number}`}
                  </h4>
                  <p className="text-[8px] font-black opacity-50 tracking-[0.2em] uppercase mt-1">#{order.id.substr(-6).toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                   <Clock className="w-3.5 h-3.5" />
                   <span className="text-xs font-black">
                      {Math.floor((currentTime - (order.startTime || Date.now())) / 60000)}m
                   </span>
                </div>
              </div>

              {/* Items List */}
              <div className="p-6 flex-1 space-y-4">
                {order.items.filter(i => i.status !== 'delivered' && i.status !== 'voided').map((item, idx) => (
                  <div key={item.id} className="flex items-start gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-inner",
                      item.status === 'pending' ? "bg-red-50 text-red-500" :
                      item.status === 'preparing' ? "bg-amber-50 text-amber-500" :
                      "bg-emerald-50 text-emerald-500"
                    )}>
                      {item.quantity}x
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "font-black text-slate-800 text-sm tracking-tight leading-tight",
                        item.status === 'ready' && "line-through opacity-50"
                      )}>{item.name}</p>
                      
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {item.modifiers.map((mod, midx) => (
                            <span key={midx} className={cn(
                              "text-[8px] font-black uppercase px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm",
                              mod.type === 'extra' ? "bg-blue-600 text-white" :
                              mod.type === 'remove' ? "bg-rose-600 text-white" :
                              "bg-amber-500 text-white"
                            )}>
                              {mod.type === 'remove' ? 'SEM' : 'EXTRA'} {mod.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.notes && (
                         <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
                            <p className="text-[9px] text-red-600 font-black uppercase tracking-tight italic">
                               * {item.notes}
                            </p>
                         </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="p-4 bg-slate-50 flex flex-col gap-2">
                {order.items.some(i => i.status === 'pending') && (
                  <button 
                    onClick={() => onAcceptItems(order.id, type === 'bar')}
                    className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all text-[10px] uppercase tracking-widest shadow-lg shadow-slate-900/10 active:scale-95"
                    title={`Aceitar todos os itens pendentes da ${type === 'bar' ? 'barra' : 'cozinha'}`}
                  >
                    Aceitar Todos os Itens
                  </button>
                )}
                {order.items.some(i => i.status === 'preparing') && (
                  <button 
                    onClick={() => onMarkItemsReady(order.id, type === 'bar')}
                    className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl hover:bg-emerald-400 transition-all text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95"
                  >
                    Marcar como Pronto
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {activeOrders.length === 0 && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-300">
             <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center mb-6">
                {type === 'kitchen' ? <UtensilsCrossed className="w-10 h-10 opacity-20" /> : <Beer className="w-10 h-10 opacity-20" />}
             </div>
             <p className="text-sm font-black uppercase tracking-[0.2em] opacity-30">Sem pedidos pendentes</p>
          </div>
        )}
      </div>
    </div>
  );
};
