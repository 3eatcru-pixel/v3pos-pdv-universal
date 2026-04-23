import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Package, 
  UtensilsCrossed, 
  AlertTriangle 
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import { useCollection } from '../../../hooks/useCollection';
import { accountService } from '../../../core/services/accountService';
import { firebaseService } from '../../../services/firebaseService';
import { Order, Table, AppNotification } from '../../../types';

export const KitchenDisplayView: React.FC = () => {
  const enterpriseId = accountService.getCurrentCompanyId();
  const { data: orders } = useCollection<Order>('orders');
  const { data: tables } = useCollection<Table>('tables');
  
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const barCategories = ['Bebidas', 'Bar', 'FOH'];
  const activeOrders = orders
    .map(o => ({
      ...o,
      items: o.items.filter(i => !barCategories.includes(i.category))
    }))
    .filter(o => o.items.some(i => i.status === 'pending' || i.status === 'preparing'));

  const handleAcceptItems = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = order.items.map(item => {
      if (!barCategories.includes(item.category) && item.status === 'pending') {
        return { ...item, status: 'preparing' };
      }
      return item;
    });

    await firebaseService.updateItem('orders', orderId, { items: updatedItems });
  };

  const handleMarkItemsReady = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = order.items.map(item => {
      if (!barCategories.includes(item.category) && item.status === 'preparing') {
        return { ...item, status: 'ready' };
      }
      return item;
    });

    await firebaseService.updateItem('orders', orderId, { items: updatedItems });
    
    // Notification
    const notifId = `notif-${Date.now()}`;
    await firebaseService.saveItem('notifications', notifId, {
      id: notifId,
      title: 'Pratos Prontos',
      message: `O pedido da Mesa ${tables.find(t => t.id === order.tableId)?.number || '?'} está pronto na cozinha.`,
      timestamp: Date.now(),
      read: false,
      type: 'order_ready_kitchen',
      companyId: enterpriseId!,
      tableId: order.tableId
    } as AppNotification);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Cozinha (KDS)</h2>
        <div className="flex items-center gap-4">
           <button
              onClick={() => { /* Quick stock logic could go here */ }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 border-2 border-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md"
           >
              <Package className="w-4 h-4" /> Gestão de Faltas (86)
           </button>
           <div className="w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
           <span className="text-xs font-black uppercase text-red-600">Alerta de Novos Pedidos</span>
        </div>
      </div>

      <div className="flex gap-4">
         <div className="flex items-center gap-2 group cursor-help">
           <span className="w-3 h-3 bg-red-500 rounded-full"></span>
           <span className="text-sm font-medium text-slate-500">Novo</span>
         </div>
         <div className="flex items-center gap-2 group cursor-help">
           <span className="w-3 h-3 bg-amber-400 rounded-full animate-pulse"></span>
           <span className="text-sm font-medium text-slate-500">Preparando</span>
         </div>
         <div className="flex items-center gap-2 group cursor-help">
           <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
           <span className="text-sm font-medium text-slate-500">Pronto</span>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {activeOrders.map(order => (
          <motion.div 
            key={order.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="sleek-card overflow-hidden transition-all shadow-xl"
          >
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <div>
                {order.orderType === 'takeaway' ? (
                  <h4 className="font-bold text-lg leading-tight text-emerald-400">Takeaway #{order.takeawayNumber}</h4>
                ) : (
                  <h4 className="font-bold text-lg leading-tight">Mesa {tables.find(t => t.id === order.tableId)?.number || '??'}</h4>
                )}
                <p className="text-[10px] font-black opacity-50 tracking-widest uppercase">#{order.id.substr(-6).toUpperCase()}</p>
              </div>
              <div className="flex flex-col items-end">
                 <div className={cn(
                   "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors",
                   (currentTime - (order.startTime || Date.now())) > 900000 ? "bg-rose-500 text-white animate-pulse" : 
                   (currentTime - (order.startTime || Date.now())) > 480000 ? "bg-amber-500 text-white" : 
                   "bg-white/10 text-white"
                 )}>
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px] font-black">
                    {Math.floor((currentTime - (order.startTime || Date.now())) / 60000)}m
                  </span>
                 </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {order.items.filter(i => i.status !== 'delivered' && i.status !== 'voided').map((item, idx) => (
                <div key={idx} className="flex items-start justify-between">
                  <div className="flex items-baseline gap-2">
                     <span className={cn(
                       "text-[10px] font-black px-1.5 py-0.5 rounded leading-none",
                       item.status === 'pending' ? "bg-red-500 text-white" :
                       item.status === 'preparing' ? "bg-amber-400 text-white" :
                       "bg-emerald-500 text-white"
                     )}>{item.quantity}x</span>
                     <div>
                      <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.modifiers.map((mod, midx) => (
                            <span key={midx} className={cn(
                              "text-[8px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-1",
                              mod.type === 'extra' ? "bg-blue-600 text-white" :
                              mod.type === 'remove' ? "bg-rose-600 text-white" :
                              "bg-amber-500 text-white ring-2 ring-amber-200 shadow-sm shadow-amber-300/30"
                            )}>
                              {mod.type === 'allergy' && <AlertTriangle className="w-2.5 h-2.5" />}
                              {mod.type === 'remove' ? 'SEM' : mod.type === 'extra' ? 'EXTRA' : 'ALERGIA:'} {mod.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.notes && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight italic bg-red-50 px-1 mt-1 w-fit">* {item.notes}</p>}
                     </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-slate-50 mt-auto flex flex-col gap-2 border-t border-slate-100">
              {order.items.some(i => i.status === 'pending') && (
                <button 
                  onClick={() => handleAcceptItems(order.id)}
                  className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-slate-800 transition-all text-[10px] uppercase tracking-widest"
                >
                  Aceitar Todos
                </button>
              )}
              {order.items.some(i => i.status === 'preparing') && (
                <button 
                  onClick={() => handleMarkItemsReady(order.id)}
                  className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl hover:bg-emerald-400 transition-all text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                >
                  Marcar como Pronto
                </button>
              )}
            </div>
          </motion.div>
        ))}
        {activeOrders.length === 0 && (
          <div className="col-span-full h-80 flex flex-col items-center justify-center text-slate-300">
             <UtensilsCrossed className="w-16 h-16 mb-4 opacity-10" />
             <p className="text-xs font-black uppercase tracking-widest opacity-30">Cozinha tranquila por agora</p>
          </div>
        )}
      </div>
    </div>
  );
};
