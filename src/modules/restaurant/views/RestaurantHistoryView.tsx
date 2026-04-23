import React, { useState } from 'react';
import { 
  Smartphone, 
  CreditCard, 
  Banknote, 
  ArrowLeftRight, 
  ShoppingBag, 
  Table as TableIcon, 
  FileText, 
  Search,
  Download,
  Calendar
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCollection } from '../../../hooks/useCollection';
import { cn, formatCurrency } from '../../../lib/utils';
import { Order, Table } from '../../../types';

export const RestaurantHistoryView: React.FC = () => {
  const [historyFilter, setHistoryFilter] = useState<'all' | 'open' | 'closed'>('all');
  const { data: orders } = useCollection<Order>('orders');
  const { data: tables } = useCollection<Table>('tables');

  const filteredOrders = orders.filter(o => {
    if (historyFilter === 'open') return o.status !== 'delivered';
    if (historyFilter === 'closed') return o.status === 'delivered';
    return true;
  }).sort((a, b) => (b.closedAt || b.startTime) - (a.closedAt || a.startTime));

  const totalOpen = orders.filter(o => o.status !== 'delivered').reduce((sum, o) => sum + o.total, 0);
  const totalClosed = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total, 0);

  const handleExportSalesToExcel = () => {
    alert('Exportando relatório consolidado...');
  };

  return (
    <div className="space-y-6 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Histórico de Vendas</h2>
          <p className="text-sm text-slate-500 font-medium">Relatório detalhado de todas as transações do restaurante</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button 
            onClick={handleExportSalesToExcel}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
          <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block" />
          {[
            { id: 'all', label: 'Todos' },
            { id: 'open', label: 'Em Aberto' },
            { id: 'closed', label: 'Finalizados' },
          ].map(f => (
            <button 
              key={f.id}
              onClick={() => setHistoryFilter(f.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                historyFilter === f.id ? "bg-slate-800 text-white shadow-lg" : "bg-white text-slate-400 hover:bg-slate-50 border border-slate-100"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <div className="sleek-card p-6 border-l-4 border-emerald-500">
           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Vendas Finalizadas</p>
           <p className="text-2xl font-black text-slate-800">{formatCurrency(totalClosed)}</p>
         </div>
         <div className="sleek-card p-6 border-l-4 border-amber-500">
           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total em Aberto (Mesas)</p>
           <p className="text-2xl font-black text-slate-800">{formatCurrency(totalOpen)}</p>
         </div>
         <div className="sleek-card p-6 border-l-4 border-slate-800">
           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Volume Total Processado</p>
           <p className="text-2xl font-black text-slate-800">{formatCurrency(totalOpen + totalClosed)}</p>
         </div>
      </div>

      <div className="sleek-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">ID / Data</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Origem</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Financeiro</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Pagamento</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono font-black text-slate-400 group-hover:text-slate-600 transition-colors">#{order.id.slice(-8).toUpperCase()}</span>
                      <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tight">{format(order.closedAt || order.startTime, 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {order.orderType === 'takeaway' ? (
                      <span className="font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-lg text-xs flex items-center gap-1 w-fit">
                        <ShoppingBag className="w-3 h-3" /> TKW #{order.takeawayNumber}
                      </span>
                    ) : (
                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg text-xs flex items-center gap-1 w-fit">
                        <TableIcon className="w-3 h-3" /> Mesa 0{tables.find(t => t.id === order.tableId)?.number || '??'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-emerald-600 text-sm">{formatCurrency(order.total)}</span>
                      {order.discount > 0 && <span className="text-[8px] text-red-500 font-bold uppercase tracking-tighter">Desconto: -{formatCurrency(order.discount)}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {order.status === 'delivered' ? (
                        <div className="flex items-center gap-1">
                           <div className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 text-slate-400">
                             {order.paymentMethod === 'card' ? <CreditCard className="w-3 h-3" /> : order.paymentMethod === 'pix' ? <Smartphone className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                           </div>
                           <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{order.paymentMethod || 'Sistema'}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] italic text-slate-300">Pendente</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                      order.status === 'delivered' ? "bg-slate-100 text-slate-400" : "bg-amber-100 text-amber-600 shadow-sm shadow-amber-200"
                    )}>
                      {order.status === 'delivered' ? 'Finalizado' : 'Em Aberto'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="py-20 text-center">
               <FileText className="w-12 h-12 text-slate-100 mx-auto mb-4" />
               <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum registro encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
