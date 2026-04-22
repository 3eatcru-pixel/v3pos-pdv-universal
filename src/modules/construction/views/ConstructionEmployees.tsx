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
  HardHat,
  Truck,
  ShieldCheck,
  FileText,
  Wrench,
  Construction,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';

interface Employee {
  id: string;
  name: string;
  role: 'engineer' | 'foreman' | 'worker' | 'logistics' | 'admin';
  site: 'Main Store' | 'Site Alpha' | 'Site Beta' | 'Warehouse';
  status: 'active' | 'break' | 'offline';
  shift: string;
  certifications: string[];
}

export const ConstructionEmployees: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const employees: Employee[] = [
    { id: '1', name: 'Joao Silva', role: 'engineer', site: 'Site Alpha', status: 'active', shift: '07:00 - 17:00', certifications: ['NR-10', 'NR-35'] },
    { id: '2', name: 'Pedro Santos', role: 'foreman', site: 'Site Alpha', status: 'active', shift: '07:00 - 17:00', certifications: ['NR-18'] },
    { id: '3', name: 'Maria Oliveira', role: 'admin', site: 'Main Store', status: 'active', shift: '08:00 - 18:00', certifications: [] },
    { id: '4', name: 'Ricardo Lima', role: 'logistics', site: 'Warehouse', status: 'break', shift: '06:00 - 15:00', certifications: ['Empilhadeira'] },
    { id: '5', name: 'Carlos Souza', role: 'worker', site: 'Site Beta', status: 'offline', shift: '07:00 - 17:00', certifications: ['NR-18'] },
    { id: '6', name: 'Ana Costa', role: 'engineer', site: 'Site Beta', status: 'active', shift: '07:00 - 17:00', certifications: ['NR-10', 'NR-35', 'AutoCAD'] },
  ];

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'engineer': return <HardHat className="w-3 h-3 text-blue-500" />;
      case 'foreman': return <ShieldCheck className="w-3 h-3 text-amber-500" />;
      case 'logistics': return <Truck className="w-3 h-3 text-indigo-500" />;
      case 'admin': return <FileText className="w-3 h-3 text-slate-500" />;
      default: return <Wrench className="w-3 h-3 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500';
      case 'break': return 'bg-amber-500';
      default: return 'bg-slate-300';
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Mão de Obra</h2>
           <p className="text-slate-500 font-medium">Gestão de engenheiros, mestres de obra e logística de canteiro</p>
        </div>
        <div className="flex gap-4">
           <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn("p-3 rounded-xl transition-all", viewMode === 'grid' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn("p-3 rounded-xl transition-all", viewMode === 'list' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400")}
              >
                <Table className="w-4 h-4" />
              </button>
           </div>
           <button className="px-10 py-5 bg-blue-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-3">
              <UserPlus className="w-4 h-4" /> Registrar Staff
           </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
         <div className="relative flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, registro ou especialidade..."
              className="w-full bg-slate-50 border-none rounded-[1.5rem] py-5 pl-16 pr-8 font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
         </div>
         <button className="p-5 bg-slate-50 text-slate-400 rounded-2xl hover:text-blue-600 transition-all border border-transparent hover:border-blue-100">
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
                ? "p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-blue-500/30 hover:shadow-2xl" 
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
                      <div className="flex items-center gap-1">
                        {getRoleIcon(emp.role)}
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">{emp.role}</span>
                      </div>
                      <div className="w-1 h-1 bg-slate-200 rounded-full" />
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-md">
                         <MapPin className="w-3 h-3 text-slate-400" />
                         <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{emp.site}</span>
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
                      <Clock className="w-3 h-3" /> Turno Obra
                   </span>
                   <span className="text-xs font-black text-slate-600 tracking-tighter italic">{emp.shift}</span>
                </div>

                <div className="text-right flex flex-col items-end">
                   <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Status</span>
                   <div className="flex flex-wrap gap-1 justify-end max-w-[120px]">
                      {emp.certifications.length > 0 ? (
                        emp.certifications.slice(0, 2).map((cert, j) => (
                          <span key={j} className="text-[8px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-widest">{cert}</span>
                        ))
                      ) : (
                        <span className="text-xs font-black text-emerald-500 tracking-tighter italic uppercase">Liberado</span>
                      )}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
         <div className="bg-slate-950 p-8 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
            <h5 className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-6 pulse relative z-10">Canteiro Ativo</h5>
            <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-end">
                   <span className="text-3xl font-black italic tracking-tighter">118/125</span>
                   <span className="text-[10px] font-bold text-slate-400 mb-2">OPERÁRIOS</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 w-[94%]" />
                </div>
            </div>
         </div>

         {[
           { label: 'EPIs em Ordem', val: '100%', color: 'text-emerald-500', icon: <ShieldCheck /> },
           { label: 'Turno de Saída', val: '14', color: 'text-blue-500', icon: <Clock /> },
           { label: 'Certificações Exp.', val: '02', color: 'text-rose-500', icon: <XCircle /> },
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
