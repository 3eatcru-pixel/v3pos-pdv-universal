import React from 'react';
import { 
  Users, 
  HardHat, 
  UserPlus, 
  MapPin, 
  Phone, 
  Calendar, 
  Clock, 
  MoreVertical,
  Briefcase,
  Star,
  Search
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';

interface Staff {
  id: string;
  name: string;
  role: 'engineer' | 'foreman' | 'worker' | 'sales' | 'driver';
  status: 'active' | 'on_leave' | 'inactive';
  location: string;
  phone: string;
  rating: number;
}

const MOCK_STAFF: Staff[] = [
  { id: 's1', name: 'Ricardo Santos', role: 'engineer', status: 'active', location: 'Residencial Aurora', phone: '(11) 98877-6655', rating: 4.8 },
  { id: 's2', name: 'Josevaldo Silva', role: 'foreman', status: 'active', location: 'Galpão Trans-Express', phone: '(11) 97766-5544', rating: 4.9 },
  { id: 's3', name: 'Marcos Oliveira', role: 'driver', status: 'active', location: 'Em Rota - ABC-1234', phone: '(11) 96655-4433', rating: 4.5 },
  { id: 's4', name: 'Aline Souza', role: 'sales', status: 'active', location: 'Showroom Central', phone: '(11) 95544-3322', rating: 5.0 },
  { id: 's5', name: 'Pedro Braga', role: 'worker', status: 'on_leave', location: '-', phone: '(11) 94433-2211', rating: 4.2 },
];

export const ConstructionStaff: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-3xl font-black text-slate-800 tracking-tight">Equipe & Operários</h2>
           <p className="text-slate-500 font-medium font-sans">Gestão de capital humano, alocação em obras e desempenho</p>
        </div>
        <button className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all shadow-xl shadow-slate-200">
          <UserPlus className="w-5 h-5" /> Adicionar Membro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Staff', value: '42', icon: <Users className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600' },
          { label: 'Em Campo', value: '38', icon: <HardHat className="w-6 h-6" />, color: 'bg-amber-50 text-amber-600' },
          { label: 'Disponíveis', value: '04', icon: <Calendar className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Ausências', value: '02', icon: <Clock className="w-6 h-6" />, color: 'bg-rose-50 text-rose-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
             <div className={`p-4 rounded-2xl ${stat.color}`}>{stat.icon}</div>
             <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{stat.label}</p>
                <p className="text-2xl font-black text-slate-800">{stat.value}</p>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
         {MOCK_STAFF.map(member => (
           <motion.div 
             key={member.id}
             whileHover={{ y: -4 }}
             className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group"
           >
              <div className="flex items-start justify-between mb-6">
                 <div className="flex items-center gap-4">
                    <div className="relative">
                       <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden border-4 border-white shadow-lg">
                          <img src={`https://i.pravatar.cc/150?u=${member.id}`} alt={member.name} referrerPolicy="no-referrer" />
                       </div>
                       <div className={cn(
                         "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white",
                         member.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                       )} />
                    </div>
                    <div>
                       <h4 className="font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{member.name}</h4>
                       <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{member.rating} Score</span>
                       </div>
                    </div>
                 </div>
                 <button className="p-2 text-slate-300 hover:text-slate-600 transition-all"><MoreVertical className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                       <Briefcase className="w-4 h-4 text-slate-400" />
                       <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Cargo</span>
                    </div>
                    <span className="text-xs font-black text-slate-800 uppercase">{member.role}</span>
                 </div>

                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                       <MapPin className="w-4 h-4 text-slate-400" />
                       <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Local Atual</span>
                    </div>
                    <span className="text-xs font-black text-blue-600 uppercase">{member.location}</span>
                 </div>

                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                       <Phone className="w-4 h-4 text-slate-400" />
                       <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Contato</span>
                    </div>
                    <span className="text-xs font-black text-slate-800 uppercase">{member.phone}</span>
                 </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                 <button className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200">Ver Perfil</button>
                 <button className="py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 hover:text-slate-600 transition-all">Escala</button>
              </div>
           </motion.div>
         ))}
      </div>
    </div>
  );
};
