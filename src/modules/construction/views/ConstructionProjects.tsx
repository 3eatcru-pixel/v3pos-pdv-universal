import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreVertical,
  Plus,
  Users,
  HardHat,
  BarChart2,
  DollarSign,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatCurrency } from '../../../lib/utils';
import { ConstructionProject } from '../services/constructionService';

const MOCK_PROJECTS: ConstructionProject[] = [
  {
    id: 'proj-1',
    name: 'Residencial Aurora - Bloco A',
    clientName: 'Aurora Incorporadora',
    address: 'Rua das Flores, 123 - Centro',
    startDate: Date.now() - 1000 * 60 * 60 * 24 * 60, // 60 days ago
    status: 'in_progress',
    progress: 45,
    budget: 850000,
    spent: 420000,
    engineer: 'Ricardo S.'
  },
  {
    id: 'proj-2',
    name: 'Galpão Logístico Trans-Express',
    clientName: 'Logística S.A.',
    address: 'Av. Industrial, KM 42',
    startDate: Date.now() - 1000 * 60 * 60 * 24 * 15, // 15 days ago
    status: 'in_progress',
    progress: 12,
    budget: 2500000,
    spent: 350000,
    engineer: 'Mariana L.'
  },
  {
    id: 'proj-3',
    name: 'Reforma Comercial - Office 404',
    clientName: 'Grupo XPTO',
    address: 'Edifício Infinity, Sala 404',
    startDate: Date.now() + 1000 * 60 * 60 * 24 * 5, // 5 days from now
    status: 'planning',
    progress: 0,
    budget: 125000,
    spent: 5000,
    engineer: 'Fernando J.'
  }
];

export const ConstructionProjects: React.FC = () => {
  const [filter, setFilter] = useState<string>('all');

  const filteredProjects = MOCK_PROJECTS.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Canteiro de Obras</h2>
          <p className="text-slate-500 font-medium">Gestão de projetos ativos, progresso e custos</p>
        </div>
        <button className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all shadow-xl shadow-slate-200">
          <Plus className="w-5 h-5" /> Cadastrar Obra
        </button>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-4 font-sans">
        {['all', 'planning', 'in_progress', 'paused', 'completed'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-2 transition-all",
              filter === s 
                ? "bg-slate-900 border-slate-900 text-white shadow-lg" 
                : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
            )}
          >
            {s === 'all' ? 'Todas as Obras' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {filteredProjects.map(p => (
          <motion.div 
            layout
            key={p.id}
            className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-2xl transition-all group"
          >
            <div className="p-8 md:p-12">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg",
                    p.status === 'in_progress' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                  )}>
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase group-hover:text-blue-600 transition-colors">{p.name}</h3>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 mt-1">
                      <MapPin className="w-3.5 h-3.5" /> {p.address}
                    </p>
                  </div>
                </div>
                <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-all">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest block">Cliente</span>
                  <span className="text-sm font-bold text-slate-700">{p.clientName}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest block">Início</span>
                  <span className="text-sm font-bold text-slate-700">{new Date(p.startDate).toLocaleDateString()}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest block">Engenheiro Responsável</span>
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <HardHat className="w-4 h-4 text-amber-500" /> {p.engineer}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest block">Status</span>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      p.status === 'in_progress' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                    )} />
                    <span className="text-xs font-black uppercase text-slate-500">{p.status}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                       <BarChart2 className="w-4 h-4 text-blue-500" />
                       <span className="text-xs font-black uppercase text-slate-800 tracking-widest">Execução da Obra</span>
                    </div>
                    <span className="text-sm font-black text-blue-600">{p.progress}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${p.progress}%` }}
                      className="h-full bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-black uppercase text-slate-400">Orçamento Previsto</span>
                       <DollarSign className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                    <p className="text-lg font-black text-slate-800 tracking-tight">{formatCurrency(p.budget)}</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-black uppercase text-slate-400">Gasto Atual</span>
                       <Clock className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                    <p className="text-lg font-black text-slate-800 tracking-tight">{formatCurrency(p.spent)}</p>
                    <div 
                      className="absolute bottom-0 left-0 h-1 bg-amber-500 transition-all duration-1000"
                      style={{ width: `${(p.spent / p.budget) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <div className="flex -space-x-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 overflow-hidden">
                       <img src={`https://picsum.photos/seed/worker${i}/40/40`} alt="Staff" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-4 border-white bg-slate-900 flex items-center justify-center text-[10px] font-black text-white">
                    +12
                  </div>
                </div>
                <button className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl transition-all">
                   Ver Detalhes da Obra <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
