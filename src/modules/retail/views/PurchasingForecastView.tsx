import React from 'react';
import { ShoppingBag, TrendingUp } from 'lucide-react';

export const PurchasingForecastView: React.FC = () => {
  return (
    <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Previsão de Compras</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inteligência de Estoque Nexus</p>
        </div>
      </div>
      <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs italic">
        Módulo de análise preditiva em processamento...
      </div>
    </div>
  );
};