import React, { useMemo } from 'react';
import { Printer as PrinterIcon, AlertCircle, CheckCircle2, RefreshCw, Cpu, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCollection } from '../../hooks/useCollection';
import { accountService } from '../services/accountService';
import { Printer } from '../../types';
import { cn } from '../../lib/utils';

const HardwareStatusWidget: React.FC = () => {
  const enterpriseId = accountService.getCurrentCompanyId();
  const shopId = accountService.getSelectedShopId();

  const { data: printers, loading } = useCollection<Printer>('printers', {
    enterpriseId: enterpriseId || null,
    shopId: shopId || null
  });

  const problematicPrinters = useMemo(() => {
    return printers.filter(p => p.status !== 'online');
  }, [printers]);

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm h-full flex flex-col group hover:border-blue-500 transition-all">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 italic leading-none">Status Hardware</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-tighter">Periféricos e Impressoras</p>
        </div>
        <div className={cn(
          "p-3 rounded-2xl transition-all shadow-lg",
          problematicPrinters.length > 0 ? "bg-rose-500 text-white animate-pulse shadow-rose-500/20" : "bg-slate-50 text-slate-300"
        )}>
          <PrinterIcon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="h-full flex items-center justify-center opacity-30 py-10">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : problematicPrinters.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center grayscale opacity-40 text-center py-10"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Tudo Online</p>
            </motion.div>
          ) : (
            problematicPrinters.map((printer, idx) => (
              <motion.div
                key={printer.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-between group/item hover:bg-white transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm">
                    {printer.status === 'error' ? <WifiOff className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-900 leading-none truncate max-w-[120px]">{printer.name}</p>
                    <p className="text-[8px] font-bold text-rose-600 uppercase mt-1 italic tracking-tighter">
                      {printer.status === 'error' ? 'Falha de Conexão' : 'Atenção Requerida'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                   <span className="text-[7px] font-black text-slate-400 uppercase bg-white px-2 py-0.5 rounded border border-slate-100">{printer.type}</span>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-500">
           <Cpu className="w-3 h-3" />
           <span className="text-[8px] font-black uppercase tracking-widest italic">Nexus Hub v2</span>
        </div>
        <button className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">
          Gerenciar
        </button>
      </div>
    </div>
  );
};

export default HardwareStatusWidget;