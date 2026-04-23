import React from 'react';
import { 
  ShoppingBag, 
  Table as TableIcon, 
  Clock, 
  CheckCircle2, 
  Wallet, 
  ClipboardList, 
  Trash2, 
  UtensilsCrossed 
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCollection } from '../../../hooks/useCollection';
import { firebaseService } from '../../../services/firebaseService';
import { cn, formatCurrency } from '../../../lib/utils';
import { Order, Table } from '../../../types';

export const PendingOrdersView: React.FC = () => {
  const { data: orders } = useCollection<Order>('orders');
  const { data: tables } = useCollection<Table>('tables');

  const pendingOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');

  const handleSendPendingToKitchen = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const updatedItems = order.items.map(item => ({ ...item, sentToKitchen: true }));
    await firebaseService.updateItem('orders', orderId, { items: updatedItems });
  };

  const handleOrderStatusChange = async (orderId: string, status: any) => {
    await firebaseService.updateItem('orders', orderId, { status });
  };

  return (
    <div className="space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pedidos Pendentes</h2>
           <p className="text-sm text-slate-500 font-medium tracking-tight">Monitoramento em tempo real de comandas em aberto</p>
        </div>

        <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
           <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
           <span className="text-[10px] font-black uppercase text-amber-600">{pendingOrders.length} Resultados</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {pendingOrders.map(order => {
           const table = tables.find(t => t.id === order.tableId);
           const hasUnsentItems = order.items.some(i => !i.sentToKitchen && i.status !== 'voided');
           
           return (
             <motion.div 
               key={order.id}
               layout
               className="sleek-card overflow-hidden flex flex-col group hover:border-emerald-200 transition-all shadow-xl"
             >
               <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                  <div>
                     <div className="flex items-center gap-2 mb-1">
                        {order.orderType === 'takeaway' ? (
                          <ShoppingBag className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <TableIcon className="w-4 h-4 text-emerald-400" />
                        )}
                        <h4 className="font-black text-lg">
                          {order.orderType === 'takeaway' ? `Retirada #${order.takeawayNumber}` : `Mesa 0${table?.number || '?'}`}
                        </h4>
                     </div>
                     <p className="text-[9px] font-black opacity-40 uppercase tracking-[0.2em]">ID: {order.id.slice(-6).toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-xl font-black text-emerald-400 tracking-tighter">{formatCurrency(order.total)}</p>
                     <p className="text-[9px] font-black opacity-40 uppercase">{Math.floor((Date.now() - order.startTime) / 60000)}m Decorridos</p>
                  </div>
               </div>

               <div className="p-6 flex-1 space-y-4">
                  <div className="space-y-2">
                     {order.items.slice(0, 3).map((item, idx) => (
                       <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 font-bold"><span className="text-emerald-500">{item.quantity}x</span> {item.name}</span>
                          <span className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                            item.sentToKitchen ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                          )}>
                             {item.sentToKitchen ? 'Enviado' : 'Aguardando'}
                          </span>
                       </div>
                     ))}
                     {order.items.length > 3 && (
                       <p className="text-[10px] text-slate-400 italic">+ {order.items.length - 3} outros itens...</p>
                     )}
                  </div>

                  {order.notes && (
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl relative mt-2">
                       <span className="absolute -top-2 left-3 px-2 bg-amber-100 text-amber-700 text-[8px] font-black uppercase rounded shadow-sm">Observação</span>
                       <p className="text-xs text-amber-700 font-medium italic">{order.notes}</p>
                    </div>
                  )}
               </div>

               <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <button 
                    className="col-span-2 py-4 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Wallet className="w-3.5 h-3.5" /> Marcar Pago
                  </button>
                  
                  <button 
                    onClick={() => {
                      const note = prompt("Adicionar observação ao pedido:", order.notes || "");
                      if (note !== null) {
                         firebaseService.updateItem('orders', order.id, { notes: note });
                      }
                    }}
                    className="py-3 bg-white text-slate-700 border border-slate-200 font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-slate-400" /> Notas
                  </button>

                  <button 
                    onClick={() => handleOrderStatusChange(order.id, 'cancelled')}
                    className="py-3 bg-white text-rose-600 border border-rose-100 font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-rose-50 transition-all flex items-center justify-center gap-2 shadow-sm shadow-rose-500/5 hover:border-rose-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Cancelar
                  </button>

                  {hasUnsentItems && (
                    <button 
                      onClick={() => handleSendPendingToKitchen(order.id)}
                      className="col-span-2 py-3 bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10"
                    >
                       <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" /> Enviar à Cozinha
                    </button>
                  )}
               </div>
             </motion.div>
           );
        })}

        {pendingOrders.length === 0 && (
          <div className="col-span-full py-40 text-center">
             <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
             </div>
             <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Tudo em Ordem!</h3>
             <p className="text-slate-400 text-sm font-medium">Nenhum pedido pendente de pagamento ou envio.</p>
          </div>
        )}
      </div>
    </div>
  );
};
