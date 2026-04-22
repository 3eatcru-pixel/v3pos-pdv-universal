import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  MapPin, 
  Shield, 
  MoreHorizontal, 
  Plus, 
  UserPlus, 
  LayoutGrid, 
  Table,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  UtensilsCrossed,
  ChefHat,
  Beer,
  Coffee,
  Heart,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';

interface Employee {
  id: string;
  name: string;
  role: 'waiter' | 'chef' | 'host' | 'bartender' | 'manager';
  station: 'dining_room' | 'kitchen' | 'bar' | 'reception' | 'admin';
  status: 'active' | 'break' | 'offline';
  shift: string;
  tablesHandled?: number;
  ordersProcessed?: number;
}

export const RestaurantEmployees: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const employees: Employee[] = [
    { id: '1', name: 'Tiago Souza', role: 'waiter', station: 'dining_room', status: 'active', shift: '11:00 - 23:00', tablesHandled: 12 },
    { id: '2', name: 'Juliana Paes', role: 'chef', station: 'kitchen', status: 'active', shift: '10:00 - 22:00', ordersProcessed: 85 },
    { id: '3', name: 'Roberto Carlos', role: 'manager', station: 'admin', status: 'active', shift: '09:00 - 18:00' },
    { id: '4', name: 'Alice Marinho', role: 'bartender', station: 'bar', status: 'break', shift: '16:00 - 02:00', ordersProcessed: 42 },
    { id: '5', name: 'Marcos Paulo', role: 'waiter', station: 'dining_room', status: 'offline', shift: '11:00 - 23:00', tablesHandled: 0 },
    { id: '6', name: 'Fabiola Lima', role: 'host', station: 'reception', status: 'active', shift: '18:00 - 00:00' },
  ];

  const getStationIcon = (station: string) => {
    switch (station) {
      case 'dining_room': return <UtensilsCrossed className="w-3 h-3" />;
      case 'kitchen': return <ChefHat className="w-3 h-3" />;
      case 'bar': return <Beer className="w-3 h-3" />;
      case 'reception': return <Heart className="w-3 h-3" />;
      case 'admin': return <Shield className="w-3 h-3" />;
      default: return <Coffee className="w-3 h-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500';
      case 'break': return 'bg-amber-500';
      default: return 'bg-slate-300';
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans p-6 lg:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Staff do Restaurante</h2>
           <p className="text-slate-500 font-medium">Equipe de salão, cozinha e bar em tempo real</p>
        </div>
        <div className="flex gap-4">
           <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn("p-3 rounded-xl transition-all", viewMode === 'grid' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn("p-3 rounded-xl transition-all", viewMode === 'list' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400")}
              >
                <Table className="w-4 h-4" />
              </button>
           </div>
           <button className="px-10 py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-3">
              <UserPlus className="w-4 h-4" /> Escalar Membro
           </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
         <div className="relative flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, cargo ou praça..."
              className="w-full bg-slate-50 border-none rounded-[1.5rem] py-5 pl-16 pr-8 font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
         </div>
         <button className="p-5 bg-slate-50 text-slate-400 rounded-2xl hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100">
            <Filter className="w-5 h-5" />
         </button>
      </div>

      <div className={cn(
        "grid gap-6",
        viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
      )}>
        {employees.map((emp, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={emp.id}
            className={cn(
              "bg-white group transition-all",
              viewMode === 'grid' 
                ? "p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-emerald-500/30 hover:shadow-2xl" 
                : "p-6 rounded-3xl border border-slate-100 flex items-center justify-between"
            )}
          >
             <div className="flex items-center gap-6">
                <div className="relative">
                   <div className="w-16 h-16 rounded-2xl bg-slate-100 border-4 border-white shadow-xl overflow-hidden">
                      <img src={`https://i.pravatar.cc/150?u=${emp.id}`} alt={emp.name} referrerPolicy="no-referrer" />
                   </div>
                   <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white shadow-lg", getStatusColor(emp.status))} />
                </div>
                <div>
                   <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">{emp.name}</h4>
                   <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{emp.role}</span>
                      <div className="w-1 h-1 bg-slate-200 rounded-full" />
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-md">
                         {getStationIcon(emp.station)}
                         <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{emp.station.replace('_', ' ')}</span>
                      </div>
                   </div>
                </div>
             </div>

             <div className={cn(
                "flex items-center gap-8",
                viewMode === 'grid' ? "mt-8 justify-between" : ""
             )}>
                <div className="flex flex-col gap-1 items-start">
                   <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Turno
                   </span>
                   <span className="text-xs font-black text-slate-600 tracking-tighter italic">{emp.shift}</span>
                </div>

                <div className="text-right">
                   <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">
                     {emp.role === 'waiter' ? 'Mesas' : emp.role === 'chef' ? 'Pedidos' : 'Status'}
                   </span>
                   <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-slate-900 italic tracking-tighter">
                        {emp.tablesHandled !== undefined ? emp.tablesHandled : emp.ordersProcessed !== undefined ? emp.ordersProcessed : 'OK'}
                      </span>
                      {(emp.tablesHandled || 0) > 10 && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                   </div>
                </div>

                {viewMode === 'grid' && (
                  <button className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all">
                     <MoreHorizontal className="w-5 h-5" />
                  </button>
                )}
             </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10">
         <div className="bg-slate-900 p-8 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
            <h5 className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-6 pulse relative z-10">Serviço Ativo</h5>
            <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-end">
                   <span className="text-3xl font-black italic tracking-tighter">12/15</span>
                   <span className="text-[10px] font-bold text-slate-400 mb-2">STAFF ON-BY</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 w-[80%]" />
                </div>
            </div>
         </div>

         {[
           { label: 'Eficiência Cozinha', val: '94%', color: 'text-emerald-500', icon: <ChefHat /> },
           { label: 'Tempo Médio Atend.', val: '18m', color: 'text-amber-500', icon: <Clock /> },
           { label: 'Membros em Pausa', val: '02', color: 'text-rose-500', icon: <Coffee /> },
         ].map((card, i) => (
           <div key={i} className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm flex items-center justify-between hover:translate-y-[-4px] transition-all cursor-pointer">
              <div>
                 <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">{card.label}</span>
                 <span className={cn("text-3xl font-black italic tracking-tighter", card.color)}>{card.val}</span>
              </div>
              <div className={cn("w-14 h-14 rounded-3xl flex items-center justify-center opacity-20", card.color.replace('text', 'bg'))}>
                 {React.cloneElement(card.icon as React.ReactElement, { className: "w-6 h-6" })}
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};
