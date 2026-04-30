import React, { useMemo } from 'react';
import { CheckCircle2, Circle, ClipboardList, RefreshCw, ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCollection } from '../../hooks/useCollection';
import { accountService } from '../services/accountService';
import { SectorTaskEngine, SectorTask, Sector } from '../services/SectorTaskEngine';
import { cn } from '../../lib/utils';

/**
 * StaffTaskBoard - Quadro de tarefas operacionais por setor.
 * Permite que o colaborador visualize suas obrigações diárias e as conclua.
 */
export const StaffTaskBoard: React.FC = () => {
  const user = accountService.getCurrentUser();
  const enterpriseId = accountService.getCurrentCompanyId() || '';
  
  // Mapeamento tático de Role -> Setor para filtragem automática
  const userSector: Sector = useMemo(() => {
    const role = user?.role || 'staff';
    if (['owner', 'manager', 'dev'].includes(role)) return 'Admin';
    if (role === 'chef' || (role as string) === 'cook') return 'Kitchen';
    if ((role as string) === 'bartender') return 'Bar';
    if ((role as string) === 'stockist') return 'Stock';
    return 'Service'; // Garçom, Caixa, etc.
  }, [user]);

  const today = new Date().toISOString().split('T')[0];

  const { data: tasks, loading } = useCollection<SectorTask>('sector_tasks', { 
    enterpriseId, 
    sector: userSector,
    assignedDate: today // Fase 2: Filtro nativo por data
  });

  const handleToggle = async (task: SectorTask) => {
    await SectorTaskEngine.toggleTask(task.id, !task.completed);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 font-sans pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Minhas Missões</h2>
          <div className="flex items-center gap-3 mt-2">
             <p className="text-slate-500 font-medium italic">Foco operacional de hoje para o setor: <span className="text-blue-600 font-black uppercase">{userSector}</span></p>
          </div>
        </div>
        
        <div className="bg-white px-8 py-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6">
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status de Entrega</p>
              <p className="text-2xl font-black text-slate-900 italic tracking-tighter">
                {tasks.filter(t => t.completed).length}/{tasks.length}
              </p>
           </div>
           <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
              <ClipboardList className="w-7 h-7" />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-20 text-center opacity-40">
             <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
             <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Ordens do Setor...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 opacity-40">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">O setor {userSector} está 100% em dia.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => handleToggle(task)}
                className={cn(
                  "p-8 rounded-[2.5rem] border-2 transition-all flex items-center justify-between group cursor-pointer",
                  task.completed 
                    ? "bg-emerald-50 border-emerald-500 shadow-xl shadow-emerald-500/5" 
                    : "bg-white border-slate-100 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/5"
                )}
              >
                <div className="flex items-center gap-8">
                   <div className={cn(
                     "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                     task.completed ? "bg-emerald-500 text-white shadow-lg" : "bg-slate-50 text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500"
                   )}>
                      {task.completed ? <CheckCircle2 className="w-8 h-8" /> : <Circle className="w-8 h-8" />}
                   </div>
                   <div>
                      <h4 className={cn(
                        "text-xl font-black uppercase italic tracking-tight transition-all",
                        task.completed ? "text-emerald-900 line-through opacity-40" : "text-slate-800"
                      )}>
                        {task.title}
                      </h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 italic">Protocolo Operacional Diário</p>
                   </div>
                </div>
                
                {task.completed && (
                  <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-emerald-100 text-[9px] font-black uppercase text-emerald-600 tracking-widest shadow-sm">
                     <ShieldCheck className="w-4 h-4" /> Concluído
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="p-10 bg-slate-950 rounded-[4rem] text-white flex items-center justify-between shadow-2xl relative overflow-hidden group">
         <div className="relative z-10">
            <h4 className="text-2xl font-black uppercase italic tracking-tighter mb-1 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">Nexus Mission Control</h4>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">Eficiência do setor impacta o scorecard individual.</p>
         </div>
         <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
            <Zap className="w-8 h-8 text-blue-500 fill-current" />
         </div>
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
      </div>
    </div>
  );
};