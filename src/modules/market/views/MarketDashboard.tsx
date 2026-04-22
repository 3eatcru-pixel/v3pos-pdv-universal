import React from 'react';
import { 
  BarChart3, 
  ShoppingCart, 
  Package, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  LayoutGrid,
  TrendingUp,
  History,
  Zap,
  Leaf,
  Scale
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatCurrency } from '../../../lib/utils';

export const MarketDashboard: React.FC = () => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Market Intelligence</h2>
           <p className="text-slate-500 font-medium font-sans">Monitoramento em tempo real • Periféricos & Estoque</p>
        </div>
        <div className="flex gap-4">
           <button className="px-8 py-5 bg-white border-2 border-slate-100 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all flex items-center gap-3">
              <History className="w-4 h-4" /> Log de Sangrias
           </button>
           <button className="px-10 py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-200">
              Gerenciar Ofertas
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Vendas Brutas', value: formatCurrency(12850.40), sub: '+18.2% vs ontem', icon: <ShoppingCart />, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Ticket Médio', value: formatCurrency(145.20), sub: 'Variação estável', icon: <TrendingUp />, color: 'bg-blue-50 text-blue-600' },
          { label: 'Perda/Vencidos', value: formatCurrency(420.00), sub: '3 itens críticos', icon: <AlertTriangle />, color: 'bg-rose-50 text-rose-600' },
          { label: 'PDVs Ativos', value: '06 / 08', sub: 'Pico de tráfego agora', icon: <Zap />, color: 'bg-amber-50 text-amber-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm group hover:scale-[1.02] transition-all">
             <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-8 ${stat.color} group-hover:rotate-6 transition-transform`}>
                {stat.icon}
             </div>
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">{stat.label}</p>
             <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-2 italic">{stat.value}</h3>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
         <div className="xl:col-span-2 space-y-10">
            <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden">
               <div className="flex items-center justify-between mb-12">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase flex items-center gap-4 italic">
                    <Clock className="w-7 h-7 text-emerald-500" /> Vendas por Hora
                  </h3>
                  <div className="flex items-center gap-3">
                     <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tempo Real</span>
                  </div>
               </div>

               <div className="flex items-end justify-between h-48 gap-4 px-4 overflow-hidden">
                  {[20, 35, 45, 30, 25, 40, 60, 85, 70, 50, 45, 65].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                       <div className="text-[9px] font-black text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {formatCurrency(h * 100)}
                       </div>
                       <motion.div 
                         initial={{ height: 0 }}
                         animate={{ height: `${h}%` }}
                         className={cn(
                           "w-full rounded-t-xl transition-all group-hover:brightness-110",
                           h > 80 ? "bg-emerald-600" : h > 50 ? "bg-emerald-400" : "bg-slate-100"
                         )}
                       />
                       <span className="text-[9px] font-black text-slate-300 uppercase">{8 + i}h</span>
                    </div>
                  ))}
               </div>
               
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-[120px] opacity-20 -z-10" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               <div className="bg-slate-900 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-8">
                     <h3 className="text-lg font-black uppercase tracking-widest italic outline-text">Sectores Top</h3>
                     <LayoutGrid className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="space-y-8">
                     {[
                       { name: 'Hortifruti', value: 85, color: 'bg-emerald-500' },
                       { name: 'Padaria', value: 62, color: 'bg-amber-400' },
                       { name: 'Laticínios', value: 45, color: 'bg-blue-400' },
                     ].map((s, i) => (
                       <div key={i} className="space-y-3">
                          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                             <span>{s.name}</span>
                             <span>{s.value}%</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${s.value}%` }}
                               className={`h-full ${s.color} rounded-full`} 
                             />
                          </div>
                       </div>
                     ))}
                  </div>
                  <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-600/10 rounded-full blur-[100px] group-hover:scale-150 transition-transform duration-700" />
               </div>

               <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800 mb-10 uppercase tracking-tighter italic flex items-center gap-4">
                     <AlertTriangle className="w-6 h-6 text-rose-500" /> Alertas Críticos
                  </h3>
                  <div className="space-y-6">
                     {[
                       { msg: 'Vencimento (03 Itens)', date: 'Hoje', urgency: 'high' },
                       { msg: 'Estoque Baixo: Arroz 5kg', date: 'Pico', urgency: 'medium' },
                       { msg: 'Falha Sincronização PDV 04', date: '02 min', urgency: 'high' },
                     ].map((alert, i) => (
                       <div key={i} className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100 group">
                          <div>
                             <p className="text-xs font-black text-slate-800 uppercase tracking-tight group-hover:text-rose-600">{alert.msg}</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{alert.date}</p>
                          </div>
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            alert.urgency === 'high' ? "bg-rose-500 animate-ping" : "bg-amber-400"
                          )} />
                       </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>

         <div className="space-y-10">
            <div className="bg-emerald-600 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
               <div className="relative z-10 text-center">
                  <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl">
                     <Scale className="w-12 h-12 text-white" />
                  </div>
                  <h4 className="text-2xl font-black mb-2 uppercase tracking-tighter italic">Balanças & Pesáveis</h4>
                  <p className="text-emerald-100 text-sm font-medium mb-12">98% dos equipamentos calibrados e transmitindo.</p>
                  
                  <div className="space-y-4">
                     {[
                       { n: 'Balança 01 (Horti)', s: 'Online' },
                       { n: 'Balança 02 (Açougue)', s: 'Online' },
                       { n: 'Etiquetadora Central', s: 'Aviso' }
                     ].map((b, i) => (
                       <div key={i} className="flex items-center justify-between px-6 py-4 rounded-2xl bg-black/10 text-xs font-black tracking-widest uppercase">
                          <span>{b.n}</span>
                          <span className={b.s === 'Online' ? 'text-white' : 'text-amber-300'}>{b.s}</span>
                       </div>
                     ))}
                  </div>
               </div>
               <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-[80px]" />
            </div>

            <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter italic flex items-center gap-4">
                     <Leaf className="w-6 h-6 text-emerald-500" /> Origem & Validade
                  </h3>
               </div>
               <div className="text-center p-10 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-6" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                     Digitalize um lote para ver <br /> histórico de recebimento
                  </p>
                  <button className="mt-8 px-6 py-4 bg-white shadow-lg shadow-slate-100 rounded-2xl text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all">
                     Abrir Scanner
                  </button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
