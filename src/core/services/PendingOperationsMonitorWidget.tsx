import React, { useMemo } from 'react';
import { AlertCircle, ChevronRight, Clock, CheckCircle2, ShoppingCart, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCollection } from '../../hooks/useCollection';
import { accountService } from '../services/accountService';
import { Order } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';

/**
 * PendingOperationsMonitorWidget - Monitor de Bloqueios EOD
 * Lista operações ativas que impedem o fechamento de dia/turno.
 */
const PendingOperationsMonitorWidget: React.FC = () => {
  const enterpriseId = accountService.getCurrentCompanyId();
  const shopId = accountService.getSelectedShopId();

  // Busca pedidos da unidade
  const { data: allOrders, loading } = useCollection<Order>('orders', { 
    enterpriseId, 
    shopId: shopId || null 
  });

  // Filtra apenas o que bloqueia o fechamento (EndOfDayEngine Logic)
  const blockingOrders = useMemo(() => {
    return allOrders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
  }, [allOrders]);

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm h-full flex flex-col group hover:border-amber-500 transition-all">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 italic leading-none">Operações em Aberto</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-tighter">Status impeditivo para EOD</p>
        </div>
        <div className={cn(
          "p-3 rounded-2xl transition-all duration-500 shadow-lg",
          blockingOrders.length > 0 
            ? "bg-amber-500 text-white animate-pulse shadow-amber-500/20" 
            : "bg-slate-50 text-slate-300"
        )}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertCircle className="w-5 h-5" />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
        <AnimatePresence mode="popLayout">
          {blockingOrders.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center grayscale opacity-40 text-center py-10"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Unidade em Conformidade</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Nenhum pedido pendente</p>
            </motion.div>
          ) : (
            blockingOrders.map((order, idx) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex items-center justify-between group/item hover:bg-white hover:border-amber-200 hover:shadow-xl hover:shadow-amber-500/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-amber-500 group-hover/item:bg-amber-500 group-hover/item:text-white transition-all">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase text-slate-900 italic leading-none">#{order.id.slice(-6).toUpperCase()}</p>
                      <span className="text-[8px] font-black text-white bg-slate-900 px-2 py-0.5 rounded uppercase tracking-widest">{order.status}</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> {formatCurrency(order.total)} • Mesa {order.tableId || 'Balcão'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover/item:text-amber-500 transition-all translate-x-0 group-hover/item:translate-x-1" />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {blockingOrders.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-500">
             <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
             <span className="text-[9px] font-black uppercase tracking-widest italic">Ação Requerida</span>
          </div>
          <button className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">
            Resolver Tudo
          </button>
        </div>
      )}
    </div>
  );
};

export default PendingOperationsMonitorWidget;