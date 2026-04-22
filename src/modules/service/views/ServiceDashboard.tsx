import React from 'react';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Star, 
  ArrowUpRight, 
  ArrowDownRight,
  Monitor,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatCurrency } from '../../../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const mockData = [
  { name: 'Seg', v: 4000 },
  { name: 'Ter', v: 3000 },
  { name: 'Qua', v: 2000 },
  { name: 'Qui', v: 2780 },
  { name: 'Sex', v: 1890 },
  { name: 'Sab', v: 2390 },
  { name: 'Dom', v: 3490 },
];

export const ServiceDashboard: React.FC = () => {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      <div className="flex items-center justify-between">
         <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Performance Hub</h2>
            <p className="text-slate-500 font-medium">Análise em tempo real do faturamento e produtividade</p>
         </div>
         <div className="flex gap-3">
             <button className="px-6 py-4 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all shadow-sm">Exportar PDF</button>
             <button className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-2xl shadow-slate-200">Gerar Relatório</button>
         </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[
          { label: 'Faturamento Mensal', value: 'R$ 42.850', trend: '+12.5%', icon: TrendingUp, color: 'emerald' },
          { label: 'Agendamentos', value: '184', trend: '+5.2%', icon: Calendar, color: 'blue' },
          { label: 'Ocupação Média', value: '78%', trend: '-2.1%', icon: Clock, color: 'amber' },
          { label: 'Novos Clientes', value: '42', trend: '+18.3%', icon: Users, color: 'indigo' },
        ].map((kpi, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all group"
          >
            <div className="flex items-center justify-between mb-8">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform", {
                'bg-emerald-50 text-emerald-600': kpi.color === 'emerald',
                'bg-blue-50 text-blue-600': kpi.color === 'blue',
                'bg-amber-50 text-amber-600': kpi.color === 'amber',
                'bg-indigo-50 text-indigo-600': kpi.color === 'indigo',
              })}>
                <kpi.icon className="w-6 h-6" />
              </div>
              <span className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1", 
                kpi.trend.startsWith('+') ? "text-emerald-500" : "text-rose-500"
              )}>
                {kpi.trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {kpi.trend}
              </span>
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 italic">{kpi.label}</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">{kpi.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-10">
               <h3 className="text-lg font-black uppercase tracking-tighter italic">Fluxo de Receita Semanal</h3>
               <div className="flex gap-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                     <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Serviços</span>
                  </div>
               </div>
            </div>
            <div className="flex-1">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94A3B8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94A3B8' }} />
                    <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontFamily: 'Inter' }} />
                    <Area type="monotone" dataKey="v" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-slate-900 p-12 rounded-[4rem] shadow-2xl flex flex-col h-[500px] relative overflow-hidden">
            <h3 className="text-lg font-black uppercase tracking-tighter italic text-white mb-10 relative z-10">Agendamentos por Categoria</h3>
            <div className="flex-1 relative z-10">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Estética', v: 45 },
                    { name: 'Peluaria', v: 82 },
                    { name: 'Massagem', v: 24 },
                    { name: 'Tattoo', v: 38 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94A3B8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94A3B8' }} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', backgroundColor: '#fff' }} />
                    <Bar dataKey="v" fill="#10b981" radius={[12, 12, 12, 12]} barSize={40} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
               <Monitor className="w-64 h-64 text-white" />
            </div>
         </div>
      </div>

      {/* Bottom Section: Top Professionals & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         <div className="lg:col-span-2 bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-10">
               <h3 className="text-lg font-black uppercase tracking-tighter italic">Ranking de Performance</h3>
               <button className="text-[10px] font-black uppercase text-emerald-500 tracking-widest hover:translate-x-1 transition-transform">Ver Todos →</button>
            </div>
            <div className="space-y-6">
               {[
                 { name: 'Ricardo Santos', role: 'Master Barber', rating: 4.9, earnings: 8450, growth: '+15%', photo: 'RS' },
                 { name: 'Ana Oliveira', role: 'Esteticista Sênior', rating: 4.8, earnings: 7120, growth: '+8%', photo: 'AO' },
                 { name: 'Bruno Souza', role: 'Tatuador Blackwork', rating: 5.0, earnings: 6800, growth: '+22%', photo: 'BS' },
               ].map((pro, i) => (
                 <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2.5rem] hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-slate-100 group">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white font-black text-sm group-hover:rotate-6 transition-transform">
                          {pro.photo}
                       </div>
                       <div>
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{pro.name}</h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pro.role}</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-12">
                       <div className="hidden md:block">
                          <div className="flex items-center gap-1 text-amber-500 mb-1">
                             <Star className="w-3.5 h-3.5 fill-current" />
                             <span className="text-xs font-black">{pro.rating}</span>
                          </div>
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest italic">Score Cliente</span>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-black text-slate-900 italic tracking-tighter">{formatCurrency(pro.earnings)}</p>
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{pro.growth}</span>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         </div>

         <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm flex flex-col">
            <h3 className="text-lg font-black uppercase tracking-tighter italic mb-10">Últimos Ganhos</h3>
            <div className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar">
               {[
                 { customer: 'João Silva', service: 'Corte + Barba', amount: 85.00, time: '10 min atrás', status: 'success' },
                 { customer: 'Maria Clara', service: 'Limpeza de Pele', amount: 150.00, time: '25 min atrás', status: 'success' },
                 { customer: 'Carlos Eduardo', service: 'Massagem Relax', amount: 120.00, time: '1 hora atrás', status: 'success' },
                 { customer: 'Daniela Martins', service: 'Design de Sobrancelha', amount: 45.00, time: '2 horas atrás', status: 'pending' },
               ].map((log, i) => (
                 <div key={i} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                       <div className={cn("w-3 h-3 rounded-full shadow-sm", log.status === 'success' ? "bg-emerald-500" : "bg-amber-400")} />
                       <div>
                          <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{log.customer}</p>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{log.service}</span>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[11px] font-black text-slate-900 italic leading-none mb-1">{formatCurrency(log.amount)}</p>
                       <span className="text-[8px] font-medium text-slate-300 uppercase tracking-widest">{log.time}</span>
                    </div>
                 </div>
               ))}
            </div>
            <button className="w-full mt-10 py-5 bg-slate-50 text-slate-400 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm">Ver Histórico Financeiro</button>
         </div>
      </div>
    </div>
  );
};
