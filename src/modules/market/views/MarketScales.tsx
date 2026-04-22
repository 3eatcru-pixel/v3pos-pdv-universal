import React from 'react';
import { 
  Scale, 
  Wifi, 
  AlertTriangle, 
  Zap, 
  RotateCcw, 
  Settings2, 
  Monitor,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';

export const MarketScales: React.FC = () => {
  const scales = [
    { id: 'SC-01', name: 'Balança Hortifruti 01', type: 'Toledo 2090', status: 'online', lastSync: '2 min', weight: '0.000 kg' },
    { id: 'SC-02', name: 'Balança Hortifruti 02', type: 'Toledo 2090', status: 'online', lastSync: '10 min', weight: '1.245 kg' },
    { id: 'SC-03', name: 'Balança Açougue 01', type: 'Filizola Platinum', status: 'warning', lastSync: '1h', weight: '---- kg' },
    { id: 'SC-04', name: 'Balança Padaria 01', type: 'Toledo Prix 5', status: 'online', lastSync: 'Active', weight: '0.000 kg' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Peripheral Mesh</h2>
           <p className="text-slate-500 font-medium font-sans">Sincronização de balanças, etiquetadoras e terminais ativos</p>
        </div>
        <div className="flex gap-4">
           <button className="px-8 py-5 bg-white border-2 border-slate-100 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all flex items-center gap-3">
              <RotateCcw className="w-4 h-4" /> Resetar Grid
           </button>
           <button className="px-10 py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-200">
              Nova Conexão
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         <div className="space-y-8">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.3em] ml-2 italic">Balanças de Pesagem</h3>
            {scales.map((scale, i) => (
              <motion.div 
                key={scale.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-500/50 transition-all"
              >
                 <div className="flex items-center gap-8">
                    <div className={cn(
                      "w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all group-hover:rotate-6 shadow-xl",
                      scale.status === 'online' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-500/10' : 'bg-rose-50 text-rose-600 shadow-rose-500/10'
                    )}>
                       <Scale className="w-10 h-10" />
                    </div>
                    <div>
                       <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">{scale.name}</h4>
                       <div className="flex items-center gap-3 mt-1.5 opacity-60">
                          <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded italic">{scale.id}</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest">{scale.type}</span>
                       </div>
                    </div>
                 </div>

                 <div className="text-right">
                    <div className="bg-slate-900 rounded-3xl p-5 mb-4 border border-white/5">
                       <span className="text-2xl font-black text-emerald-400 font-mono tracking-tighter italic">{scale.weight}</span>
                    </div>
                    <div className="flex items-center justify-end gap-3">
                       <span className={cn(
                         "text-[9px] font-black uppercase tracking-widest",
                         scale.status === 'online' ? 'text-emerald-500' : 'text-rose-500'
                       )}>
                          {scale.status.toUpperCase()}
                       </span>
                       <div className={cn("w-2 h-2 rounded-full", scale.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500')} />
                    </div>
                 </div>
              </motion.div>
            ))}
         </div>

         <div className="space-y-10">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.3em] ml-2 italic">Status do Hardware</h3>
            
            <div className="bg-slate-950 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
               <div className="relative z-10">
                  <div className="flex items-center justify-between mb-12">
                     <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                        <Cpu className="w-8 h-8 text-emerald-400" />
                     </div>
                     <div className="flex items-center gap-3 bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20">
                        <Wifi className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Mesh Ativo</span>
                     </div>
                  </div>
                  
                  <h4 className="text-3xl font-black mb-4 uppercase tracking-tighter italic outline-text">Driver Central</h4>
                  <p className="text-slate-400 font-medium mb-10 italic">Gerenciando 12 dispositivos via P2P local.</p>
                  
                  <div className="space-y-6">
                     {[
                       { label: 'Uptime Sistema', val: '142h 12m', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
                       { label: 'Latência Balanças', val: '15ms (Ótimo)', icon: <Zap className="w-4 h-4 text-amber-500" /> },
                       { label: 'Fila de Etiquetas', val: '00 Pendente', icon: <Settings2 className="w-4 h-4 text-blue-500" /> },
                     ].map((st, i) => (
                        <div key={i} className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                           <div className="flex items-center gap-4">
                              {st.icon}
                              <span className="text-xs font-black uppercase tracking-widest text-slate-400">{st.label}</span>
                           </div>
                           <span className="text-xs font-black uppercase tracking-tighter italic">{st.val}</span>
                        </div>
                     ))}
                  </div>
               </div>
               <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px] group-hover:scale-125 transition-transform duration-700" />
            </div>

            <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm">
               <div className="flex items-center justify-between mb-10">
                  <h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-4 italic">
                    <AlertTriangle className="w-7 h-7 text-rose-500" /> Logs de Erro
                  </h3>
                  <button className="text-[10px] font-black uppercase text-indigo-600 hover:scale-105 transition-transform tracking-widest">Limpar</button>
               </div>
               <div className="space-y-6">
                  {[
                    { dev: 'SC-03', msg: 'Time-out na comunicação serial', time: '12:05' },
                    { dev: 'PR-02', msg: 'Papel de etiqueta esgotado', time: '11:42' },
                    { dev: 'POS-04', msg: 'Gaveta aberta forçadamente', time: '09:15' }
                  ].map((log, i) => (
                    <div key={i} className="flex items-start gap-5 p-6 rounded-3xl bg-slate-50 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-200 group">
                       <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Monitor className="w-5 h-5 text-slate-400 group-hover:text-rose-500" />
                       </div>
                       <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                             <span className="text-xs font-black uppercase tracking-tighter group-hover:text-rose-600">{log.dev}</span>
                             <span className="text-[9px] font-bold text-slate-400">{log.time}</span>
                          </div>
                          <p className="text-[11px] font-medium text-slate-500 italic leading-snug">{log.msg}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
