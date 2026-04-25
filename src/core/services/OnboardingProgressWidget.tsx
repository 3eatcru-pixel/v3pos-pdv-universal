import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Rocket, ChevronRight, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { OnboardingEngine, OnboardingStep } from '../services/OnboardingEngine';
import { accountService } from '../services/accountService';
import { cn } from '../../lib/utils';

const ConfettiBurst: React.FC = () => {
  const particles = Array.from({ length: 40 });
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
  
  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {particles.map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 80 + Math.random() * 200;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        return (
          <motion.div
            key={i}
            initial={{ x: "50%", y: "50%", scale: 0, opacity: 1, rotate: 0 }}
            animate={{ 
              x: `calc(50% + ${x}px)`, 
              y: `calc(50% + ${y}px)`,
              scale: [0, 1.2, 1, 0.5, 0],
              opacity: [1, 1, 1, 0.8, 0],
              rotate: Math.random() * 720
            }}
            transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1], delay: Math.random() * 0.1 }}
            className={cn("absolute w-2 h-2 rounded-sm", color)}
          />
        );
      })}
    </div>
  );
};

const OnboardingProgressWidget: React.FC = () => {
  const enterpriseId = accountService.getCurrentCompanyId();
  const shopId = accountService.getSelectedShopId();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (enterpriseId && shopId) {
      OnboardingEngine.getOnboardingProgress(enterpriseId, shopId)
        .then(setSteps)
        .finally(() => setLoading(false));
    }
  }, [enterpriseId, shopId]);

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const isComplete = progress === 100;

  if (loading) return <div className="h-64 bg-slate-50 animate-pulse rounded-[2.5rem]" />;

  return (
    <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl h-full flex flex-col group overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
         <Rocket className="w-32 h-32 text-blue-500 -rotate-12" />
      </div>

      {/* Celebration Effect */}
      {isComplete && <ConfettiBurst />}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white italic leading-none">Missões de Onboarding</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-tighter">Prepare sua unidade para o sucesso</p>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-2xl font-black text-blue-400 italic leading-none">{Math.round(progress)}%</span>
             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Global Setup</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-white/5 rounded-full mb-10 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${progress}%` }} 
            className={cn(
              "h-full rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]",
              isComplete ? "bg-emerald-500" : "bg-blue-500"
            )} 
          />
        </div>

        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div 
              key={step.id} 
              className={cn(
                "flex items-start gap-4 p-4 rounded-2xl transition-all border",
                step.completed ? "bg-white/5 border-emerald-500/20" : "bg-white/5 border-transparent opacity-60"
              )}
            >
              <div className="mt-1">
                {step.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                   <h4 className={cn("text-xs font-black uppercase italic", step.completed ? "text-white" : "text-slate-400")}>
                     {step.label}
                   </h4>
                   {!step.completed && (
                     <button className="text-[8px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1 hover:text-blue-300">
                        Ir <ChevronRight className="w-2 h-2" />
                     </button>
                   )}
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-1 leading-tight">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {isComplete && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mt-8 p-6 bg-emerald-500 rounded-3xl flex items-center gap-4 shadow-lg shadow-emerald-500/20"
          >
             <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Trophy className="text-white w-6 h-6" />
             </div>
             <div>
                <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest leading-none mb-1">Status: World Class</p>
                <h4 className="text-sm font-black text-white uppercase italic leading-none">Unidade Pronta para Operar</h4>
             </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default OnboardingProgressWidget;