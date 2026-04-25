import React, { useState, useEffect } from 'react';
import { Play, Pause, Zap, Flame, AlertTriangle, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { SimulationEngine } from '../services/SimulationEngine';
import { cn } from '../../lib/utils';

export const GameSimulationController: React.FC<{ enterpriseId: string; shopId: string }> = ({ enterpriseId, shopId }) => {
  const [isActive, setIsActive] = useState(false);
  const [intensity, setIntensity] = useState<number>(1); // 1 to 5
  const [lastEvent, setLastEvent] = useState<string>('Aguardando início...');

  useEffect(() => {
    let timer: any;
    if (isActive) {
      const tick = async () => {
        const rand = Math.random();
        // 70% de chance de venda, 30% de incidente
        if (rand > 0.3) {
          await SimulationEngine.simulateLiveOrder(enterpriseId, shopId);
          setLastEvent(`Venda realizada: ${new Date().toLocaleTimeString()}`);
        } else {
          await SimulationEngine.triggerRandomIncident(enterpriseId);
          setLastEvent(`Incidente de RH gerado!`);
        }
        
        // Intervalo baseado na intensidade (1 = devagar, 5 = frenético)
        const nextTick = (10000 / intensity) + (Math.random() * 2000);
        timer = setTimeout(tick, nextTick);
      };
      timer = setTimeout(tick, 2000);
    }
    return () => clearTimeout(timer);
  }, [isActive, intensity, enterpriseId, shopId]);

  return (
    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
            isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-800"
          )}>
            <Zap className="text-white w-6 h-6" />
          </div>
          <div>
            <h4 className="text-white font-black uppercase italic tracking-tighter">Modo Simulação Viva</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Controle de tráfego em tempo real</p>
          </div>
        </div>
        <button 
          onClick={() => setIsActive(!isActive)}
          className={cn(
            "px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-3",
            isActive ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
          )}
        >
          {isActive ? <><Pause className="w-4 h-4" /> Parar Jogo</> : <><Play className="w-4 h-4" /> Iniciar Jogo</>}
        </button>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
             <span>Intensidade do Movimento</span>
             <span className="text-blue-400">{intensity}x speed</span>
          </div>
          <input 
            type="range" min="1" max="5" step="1" 
            value={intensity} 
            onChange={e => setIntensity(Number(e.target.value))}
            className="w-full accent-blue-500 bg-slate-800 rounded-lg appearance-none h-2"
          />
        </div>

        <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4">
           <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
           <div className="flex-1">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Status da Engine</p>
              <p className="text-xs font-bold text-slate-300 italic">{lastEvent}</p>
           </div>
           <div className="flex gap-1">
              {[...Array(intensity)].map((_, i) => (
                <Flame key={i} className="w-3 h-3 text-orange-500 fill-orange-500" />
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};