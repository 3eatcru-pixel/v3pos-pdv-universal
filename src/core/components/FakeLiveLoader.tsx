import React, { useState, useEffect, useMemo } from 'react';
import { CloudDownload, ShieldCheck, Database, RefreshCw, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { accountService } from '../services/accountService';
import { useCollection } from '../../hooks/useCollection';

const LOADING_STEPS = [
  { icon: <Lock className="w-4 h-4" />, msg: "Estabelecendo túnel seguro com G-Drive..." },
  { icon: <CloudDownload className="w-4 h-4" />, msg: "Baixando Snapshot operacional comprimido..." },
  { icon: <Database className="w-4 h-4" />, msg: "Descomprimindo e validando integridade P2P..." },
  { icon: <ShieldCheck className="w-4 h-4" />, msg: "Reconciliando saldos com mestre Firestore..." },
  { icon: <RefreshCw className="w-4 h-4" />, msg: "Renderizando dashboards em tempo real (Eco-Mode)..." }
];

export const FakeLiveLoader: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  
  const tenant = accountService.getCurrentTenant();
  const branding = useMemo(() => ({
    name: (tenant as any)?.branding?.customName || tenant?.name || 'Nexus OS',
    logo: (tenant as any)?.branding?.logo || null
  }), [tenant]);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= LOADING_STEPS.length - 1) {
          clearInterval(stepInterval);
          setTimeout(onComplete, 800);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + (100 / (LOADING_STEPS.length * 12)), 100));
    }, 100);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[999] bg-slate-950 flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-12">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl overflow-hidden border border-white/10 animate-bounce">
            {branding.logo ? (
              <img src={branding.logo} alt="Logo" className="w-full h-full object-contain p-4" />
            ) : (
              <CloudDownload className="text-blue-500 w-12 h-12" />
            )}
          </div>
          <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{branding.name}</h3>
          <div className="flex flex-col items-center gap-1">
             <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em]">Sincronização de Dados em Tempo Real</p>
             <div className="flex items-center gap-2 mt-4 opacity-40">
                <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Powered by</span>
                <span className="text-[8px] font-black uppercase text-blue-500 tracking-tighter italic">3eatcru</span>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
            />
          </div>

          <div className="bg-white/5 border border-white/5 rounded-3xl p-6 min-h-[100px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex items-center gap-4 text-blue-400"
              >
                <div className="animate-spin">{LOADING_STEPS[currentStep].icon}</div>
                <span className="text-xs font-bold uppercase tracking-widest italic text-slate-300">
                  {LOADING_STEPS[currentStep].msg}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex justify-center gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-all duration-500", i <= currentStep ? "bg-blue-500 scale-125" : "bg-white/10")} />
          ))}
        </div>
      </div>
    </div>
  );
};