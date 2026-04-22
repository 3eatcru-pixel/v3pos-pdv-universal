import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Printer, 
  History,
  Search,
  ShoppingCart,
  ChevronRight,
  TrendingUp,
  Beef,
  Croissant,
  Apple,
  Users,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { Staff } from '../../../types';
import { firebaseService } from '../../../services/firebaseService';
import { accountService } from '../../../core/services/accountService';

interface OrderItem {
  id: string;
  name: string;
  weight: string;
  price: number;
  time: string;
  status: 'pending' | 'preparing' | 'ready';
  customerName?: string;
  ticketId: string;
}

interface MarketSectionViewProps {
  type: 'butcher' | 'bakery' | 'produce';
}

export const MarketSectionView: React.FC<MarketSectionViewProps> = ({ type }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [staffInSector, setStaffInSector] = useState<Staff[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([
    { id: '1', name: 'Picanha Maturatta', weight: '1.245 kg', price: 145.80, time: '2 min', status: 'preparing', ticketId: '0042', customerName: 'João Silva' },
    { id: '2', name: 'Contra-Filé', weight: '0.850 kg', price: 42.50, time: '5 min', status: 'pending', ticketId: '0043' },
    { id: '3', name: 'Músculo Moído', weight: '1.000 kg', price: 29.90, time: '10 min', status: 'ready', ticketId: '0040' },
  ]);

  const currentUser = accountService.getCurrentUser();
  const companyId = currentUser?.companyId || 'default';

  useEffect(() => {
    loadStaff();
  }, [companyId]);

  const loadStaff = async () => {
    try {
      const data = await firebaseService.getAllDocs('staff', companyId);
      // Filter staff by role/sector context in real app
      setStaffInSector((data as Staff[]).slice(0, 3)); 
    } catch (err) {
      console.error('Error loading sector staff:', err);
    }
  };

  const config = {
    butcher: { title: 'Açougue Central', icon: <Beef className="w-10 h-10" />, color: 'bg-rose-500', accent: 'text-rose-600' },
    bakery: { title: 'Padaria & Confeitaria', icon: <Croissant className="w-10 h-10" />, color: 'bg-amber-500', accent: 'text-amber-600' },
    produce: { title: 'Hortifruti Selecionado', icon: <Apple className="w-10 h-10" />, color: 'bg-emerald-500', accent: 'text-emerald-600' },
  }[type];

  const handleStatusChange = (id: string, newStatus: OrderItem['status']) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className={cn("w-20 h-20 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-opacity-20", config.color)}>
            {config.icon}
          </div>
          <div>
             <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{config.title}</h2>
             <p className="text-slate-500 font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                Terminal {type.toUpperCase()}-01 Online • Sincronizado com o Caixa
             </p>
          </div>
        </div>
        <div className="flex gap-4">
           <button className="px-8 py-5 bg-slate-100 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all flex items-center gap-3">
              <Scale className="w-4 h-4" /> Calibrar Balança
           </button>
           <button className={cn("px-10 py-5 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all shadow-2xl overflow-hidden relative group", config.color)}>
              <span className="relative z-10 flex items-center gap-3"><Plus className="w-4 h-4" /> Novo Pré-Ticket</span>
              <div className="absolute inset-0 bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform" />
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Orders List */}
        <div className="lg:col-span-2 space-y-8">
           <div className="flex items-center gap-4 px-4">
              <button 
                onClick={() => setActiveTab('active')}
                className={cn(
                  "px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                  activeTab === 'active' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Pendentes ({orders.filter(o => o.status !== 'ready').length})
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={cn(
                  "px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                  activeTab === 'history' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Prontos / Histórico
              </button>
           </div>

           <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {orders.filter(o => activeTab === 'active' ? o.status !== 'ready' : o.status === 'ready').map((order, i) => (
                  <motion.div 
                    layout
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-500/30 hover:shadow-xl transition-all"
                  >
                     <div className="flex items-center gap-8">
                        <div className="w-16 h-16 bg-slate-50 flex flex-col items-center justify-center rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
                           <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Senha</span>
                           <span className="text-xl font-black text-slate-800 italic">{order.ticketId}</span>
                        </div>
                        <div>
                           <h4 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">{order.name}</h4>
                           <p className="text-slate-400 font-bold text-sm mt-1">
                              {order.customerName ? `Cliente: ${order.customerName}` : 'Ticket Balcão'} • <span className={config.accent}>{order.weight}</span>
                           </p>
                        </div>
                     </div>

                     <div className="flex items-center gap-6">
                        <div className="text-right">
                           <div className="flex items-center gap-2 mb-2 justify-end">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">{order.time}</span>
                           </div>
                           <div className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black uppercase text-slate-500 tracking-widest">
                              {order.status === 'pending' ? 'Na Fila' : 'Pesando...'}
                           </div>
                        </div>

                        <div className="flex gap-2">
                           <button 
                             onClick={() => handleStatusChange(order.id, 'ready')}
                             className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-110 active:scale-95 transition-all"
                           >
                              <CheckCircle2 className="w-6 h-6" />
                           </button>
                           <button className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20 hover:scale-110 active:scale-95 transition-all">
                              <Printer className="w-6 h-6" />
                           </button>
                        </div>
                     </div>
                  </motion.div>
                ))}
              </AnimatePresence>
           </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
           <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                 <div className="flex items-center justify-between mb-10">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10 group-hover:rotate-12 transition-transform">
                       <TrendingUp className="w-8 h-8 text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">Fluxo: Alto</span>
                 </div>
                 <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2 outline-text">Performance {type}</h3>
                 <p className="text-slate-400 text-xs font-bold leading-relaxed mb-10 italic">Tempo médio de pesagem: 3.2m • Meta: 2.5m</p>
                 
                 <div className="space-y-4">
                    {[
                      { label: 'Pesagens Hoje', val: '142', progress: 75 },
                      { label: 'Ticket Médio', val: 'R$ 84,20', progress: 60 },
                    ].map((stat, i) => (
                      <div key={i} className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                           <span className="text-slate-400">{stat.label}</span>
                           <span>{stat.val}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${stat.progress}%` }}
                             className="h-full bg-emerald-500" 
                           />
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]" />
           </div>

           {/* Equipe no Setor */}
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
               <div className="flex items-center justify-between mb-8">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest italic flex items-center gap-3">
                     <Users className="w-4 h-4" /> Equipe no Turno
                  </h4>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
               </div>
               
               <div className="space-y-6">
                  {staffInSector.map((staff) => (
                    <div key={staff.id} className="flex items-center justify-between group">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden ring-2 ring-transparent group-hover:ring-blue-500 transition-all">
                             <img src={`https://i.pravatar.cc/150?u=${staff.id}`} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </div>
                          <div>
                             <p className="text-xs font-black text-slate-900 uppercase italic leading-none">{staff.name}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate max-w-[80px]">{staff.role}</p>
                          </div>
                       </div>
                       <button className="p-3 bg-slate-50 text-slate-300 rounded-xl hover:text-emerald-500 hover:bg-emerald-50 transition-all">
                          <Award className="w-4 h-4" />
                       </button>
                    </div>
                  ))}
               </div>

               <button className="w-full mt-10 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-100 hover:text-slate-600 transition-all border border-dashed border-slate-200">
                  Gerenciar Escala
               </button>
            </div>

           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-[0.3em] mb-8 italic">Configuração do Terminal</h4>
              <div className="space-y-4">
                 {[
                   { label: 'Balança Ativa', val: 'ETH-2090 (Toledo)', icon: <Scale className="w-4 h-4" /> },
                   { label: 'Impressora Labbel', val: 'Zebra GK420t', icon: <Printer className="w-4 h-4" /> },
                   { label: 'Rede Local', val: 'G-MARKET_HOSPEDA', icon: <History className="w-4 h-4" /> },
                 ].map((item, i) => (
                   <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                         <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400">{item.icon}</div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{item.label}</span>
                      </div>
                      <span className="text-[10px] font-black tracking-tighter italic whitespace-nowrap">{item.val}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
