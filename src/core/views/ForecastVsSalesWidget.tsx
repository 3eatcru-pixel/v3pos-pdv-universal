import React from 'react';
import { Target, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatCurrency } from '../../lib/utils';
import { useCollection } from '../../hooks/useCollection';
import { accountService } from '../services/accountService';
import { format } from 'date-fns';

const ForecastVsSalesWidget: React.FC<{ stats: any }> = ({ stats }) => {
  const enterpriseId = accountService.getCurrentCompanyId();
  const shopId = accountService.getSelectedShopId();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  const { data: forecasts } = useCollection<any>('forecasts', { 
    enterpriseId, 
    shopId: shopId || null 
  });

  // Lógica: Busca o alvo do dia ou usa um fallback baseado na média histórica (simulada)
  const todayForecast = forecasts.find((f: any) => f.date === todayStr) || { targetRevenue: 5000 };
  const actual = stats.totalSalesToday;
  const target = todayForecast.targetRevenue;
  const progress = Math.min((actual / target) * 100, 100);
  const variance = actual - target;
  const isTargetMet = actual >= target;

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm h-full flex flex-col group hover:border-blue-200 transition-all">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-tight text-slate-800">Meta vs Realidade</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Forecast de Vendas</p>
          </div>
        </div>
        {isTargetMet ? (
          <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            <CheckCircle2 className="w-3 h-3" />
            <span className="text-[8px] font-black uppercase tracking-widest">Meta Batida</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-500 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
            <AlertCircle className="w-3 h-3" />
            <span className="text-[8px] font-black uppercase tracking-widest">Em Progresso</span>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vendas Atuais</span>
            <span className="text-2xl font-black italic tracking-tighter text-slate-900">{formatCurrency(actual)}</span>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Objetivo</span>
            <span className="text-xl font-bold text-slate-400 tracking-tighter">{formatCurrency(target, true)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
            <span>Eficiência de Forecast</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                isTargetMet ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-blue-600"
              )}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className={cn("w-4 h-4", variance >= 0 ? "text-emerald-500" : "text-slate-300")} />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Variância</span>
          </div>
          <span className={cn("text-xs font-black italic", variance >= 0 ? "text-emerald-600" : "text-rose-500")}>
            {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ForecastVsSalesWidget;