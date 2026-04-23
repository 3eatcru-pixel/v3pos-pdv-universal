import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  PieChart, 
  TrendingUp, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Calendar,
  Download,
  Lock,
  Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order } from '../../../types';
import { cn, formatCurrency } from '../../../lib/utils';

interface FinanceViewProps {
  orders: Order[];
  onCloseCash: (report: any) => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  orders,
  onCloseCash
}) => {
  const financeData = useMemo(() => {
    const closedOrders = orders.filter(o => o.status === 'delivered');
    const totalRevenue = closedOrders.reduce((acc, o) => acc + o.total, 0);
    const byMethod = closedOrders.reduce((acc: any, o) => {
      const method = o.paymentMethod || 'não informado';
      acc[method] = (acc[method] || 0) + o.total;
      return acc;
    }, {});
    
    return { totalRevenue, byMethod, count: closedOrders.length };
  }, [orders]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão Financeira</h2>
           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Fluxo de Caixa e Fechamento</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-sm">
              <Calendar className="w-5 h-5" />
           </button>
           <button className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-sm">
              <Download className="w-5 h-5" />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-emerald-500 p-8 rounded-[2.5rem] shadow-xl shadow-emerald-500/20 text-white relative overflow-hidden">
            <div className="relative z-10">
               <p className="text-[10px] font-black uppercase text-emerald-100 tracking-[0.2em] mb-2">Faturamento Total</p>
               <p className="text-4xl font-black tracking-tighter">{formatCurrency(financeData.totalRevenue)}</p>
               <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-emerald-100">
                  <TrendingUp className="w-3 h-3" />
                  <span>+12.5% em relação a ontem</span>
               </div>
            </div>
            <DollarSign className="absolute -bottom-6 -right-6 w-32 h-32 opacity-10" />
         </div>

         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Pedidos Finalizados</p>
               <p className="text-3xl font-black text-slate-900 tracking-tighter">{financeData.count}</p>
            </div>
            <div className="w-full h-2 bg-slate-50 rounded-full mt-4 overflow-hidden">
               <div className="h-full bg-blue-500 w-[70%]" />
            </div>
         </div>

         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Margem Operacional</p>
               <p className="text-3xl font-black text-slate-900 tracking-tighter">68.4%</p>
            </div>
            <div className="flex items-center gap-4 mt-4">
               <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-black">
                  <ArrowUpCircle className="w-3 h-3" /> 4.2%
               </div>
               <span className="text-[10px] font-bold text-slate-300 uppercase">vs meta mensal</span>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
            <h3 className="text-sm font-black uppercase text-slate-900 tracking-widest mb-8 flex items-center gap-2">
               <PieChart className="w-4 h-4 text-blue-500" />
               Divisão por Meio de Pagamento
            </h3>
            <div className="space-y-6">
               {Object.entries(financeData.byMethod).map(([method, value]: any) => (
                  <div key={method} className="space-y-2">
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">{method}</span>
                        <span className="text-xs font-black text-slate-900">{formatCurrency(value)}</span>
                     </div>
                     <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(value / financeData.totalRevenue) * 100}%` }}
                          className={cn(
                            "h-full rounded-full",
                            method === 'pix' ? "bg-emerald-400" : method === 'card' ? "bg-blue-400" : "bg-slate-300"
                          )} 
                        />
                     </div>
                  </div>
               ))}
            </div>
         </div>

         <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 text-white flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="relative z-10 space-y-6">
               <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center mx-auto backdrop-blur-sm">
                  <Lock className="w-10 h-10 text-emerald-400" />
               </div>
               <div>
                  <h3 className="text-2xl font-black tracking-tight">Fechamento de Caixa</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Turno: Diurno • 08:00 - 18:00</p>
               </div>
               <p className="text-[10px] text-slate-500 font-bold max-w-[240px] mx-auto leading-relaxed">
                  Ao fechar o caixa, todos os relatórios do turno serão consolidados e enviados para auditoria na nuvem.
               </p>
               <button 
                 onClick={() => onCloseCash(financeData)}
                 className="px-12 py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl hover:scale-105 active:scale-95 transition-all"
               >
                 Encerrar Turno agora
               </button>
            </div>
            <ArrowDownCircle className="absolute -top-10 -left-10 w-48 h-48 opacity-5" />
         </div>
      </div>
    </div>
  );
};
