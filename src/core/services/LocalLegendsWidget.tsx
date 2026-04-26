import React, { useMemo, useState, useEffect } from 'react';
import { Sparkles, Moon, Star, Ghost, Wand2, RefreshCw, ScrollText, Lock, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LocalLegendsEngine, LocalLegend } from '../services/LocalLegendsEngine';
import { useCollection } from '../../hooks/useCollection';
import { accountService } from '../services/accountService';
import { cn } from '../../lib/utils';

const LocalLegendsWidget: React.FC = () => {
  const enterpriseId = accountService.getCurrentCompanyId();
  const shopId = accountService.getSelectedShopId();

  const { data: orders } = useCollection<any>('orders', { enterpriseId });
  const { data: staff } = useCollection<any>('staff', { enterpriseId });
  const { data: inventory } = useCollection<any>('inventory', { enterpriseId });
  const { data: sessions } = useCollection<any>('eod_sessions', { enterpriseId, shopId: shopId || null });
  
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auditoria RevelationLock: Verifica se o checklist de abertura/turno foi concluído
  const isLocked = useMemo(() => {
    const activeSession = sessions.find(s => s.status === 'in_progress');
    if (!activeSession) return true;
    // Bloqueado se houver qualquer item obrigatório pendente
    return activeSession.checklist.some((item: any) => item.required && !item.completed);
  }, [sessions]);

  const legends = useMemo(() => {
    return LocalLegendsEngine.generateLegends(orders, staff, inventory);
  }, [orders, staff, inventory]);

  const activeLegend = legends[currentIndex];

  const getMythColor = (level: string) => {
    switch(level) {
      case 'legendary': return 'text-amber-400 shadow-amber-500/50';
      case 'epic': return 'text-purple-400 shadow-purple-500/50';
      case 'rare': return 'text-blue-400 shadow-blue-500/50';
      default: return 'text-slate-400';
    }
  };

  if (legends.length === 0) return null;

  return (
    <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl h-full flex flex-col relative overflow-hidden group">
      {/* Misticismo Visual Background */}
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
         <Moon className="w-24 h-24 text-purple-500" />
      </div>
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-600/10 rounded-full blur-[80px]" />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                <Sparkles className="w-5 h-5 text-purple-400" />
             </div>
             <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Grimório da Unidade</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">O Folclore do seu Nexus</p>
             </div>
          </div>
          {!isLocked && (
            <button 
              onClick={() => setCurrentIndex((currentIndex + 1) % legends.length)}
              className="p-2 text-slate-500 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {isLocked ? (
            <motion.div
              key="locked-state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05, filter: 'blur(20px)' }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-6"
            >
               <div className="relative">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 animate-pulse">
                    <Lock className="w-8 h-8 text-slate-500" />
                  </div>
                  <div className="absolute -top-2 -right-2">
                     <Sparkles className="w-6 h-6 text-purple-500 animate-spin-slow" />
                  </div>
               </div>
               <div className="space-y-2">
                  <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">Grimório Trancado</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed px-10">
                    Conclua todos os rituais obrigatórios do checklist para revelar o folclore de hoje.
                  </p>
               </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeLegend.id}
              initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
              className="flex-1 flex flex-col justify-center space-y-6"
            >
              <div className="flex flex-col items-center text-center">
                 <div className={cn("mb-4 p-4 rounded-full bg-white/5 border border-white/10", getMythColor(activeLegend.mythLevel))}>
                    {activeLegend.iconType === 'table' && <ScrollText className="w-8 h-8" />}
                    {activeLegend.iconType === 'staff' && <Wand2 className="w-8 h-8" />}
                    {activeLegend.iconType === 'stock' && <Ghost className="w-8 h-8" />}
                    {activeLegend.iconType === 'money' && <Star className="w-8 h-8" />}
                 </div>
                 
                 <div className="space-y-2">
                    <span className={cn("text-[8px] font-black uppercase tracking-[0.3em]", getMythColor(activeLegend.mythLevel))}>
                      {activeLegend.mythLevel} Legend
                    </span>
                    <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-tight drop-shadow-lg">
                      {activeLegend.title}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium italic leading-relaxed px-4">
                      "{activeLegend.description}"
                    </p>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
           <div className="flex gap-1">
              {!isLocked && legends.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "h-1 transition-all duration-500 rounded-full",
                    i === currentIndex ? "w-6 bg-purple-500" : "w-2 bg-white/10"
                  )} 
                />
              ))}
           </div>
           <button className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-purple-400 transition-colors flex items-center gap-2">
             Adicionar Lenda <Wand2 className="w-3 h-3" />
           </button>
        </div>
      </div>
    </div>
  );
};

export default LocalLegendsWidget;