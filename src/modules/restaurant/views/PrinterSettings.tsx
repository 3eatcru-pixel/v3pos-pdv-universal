import React, { useState } from 'react';
import { 
  Printer as PrinterIcon, 
  Settings, 
  Wifi, 
  Usb, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Printer } from '../../../types';
import { cn } from '../../../lib/utils';

interface PrinterSettingsProps {
  printers: Printer[];
  onAddPrinter: (printer: Partial<Printer>) => void;
  onDeletePrinter: (id: string) => void;
  onTestPrinter: (printer: Printer) => void;
}

export const PrinterSettings: React.FC<PrinterSettingsProps> = ({
  printers,
  onAddPrinter,
  onDeletePrinter,
  onTestPrinter
}) => {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gerenciamento de Impressão</h2>
           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Configuração de Terminais Térmicos</p>
        </div>
        <button 
          onClick={() => onAddPrinter({})}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nova Impressora
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {printers.map(printer => (
          <motion.div 
            key={printer.id}
            layout
            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col group transition-all hover:shadow-xl hover:shadow-slate-200/50"
          >
            <div className="flex items-center justify-between mb-8">
               <div className={cn(
                 "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                 printer.status === 'online' ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-rose-500 text-white shadow-rose-500/20"
               )}>
                 <PrinterIcon className="w-7 h-7" />
               </div>
               <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl">
                  {printer.connectionType === 'network' ? <Wifi className="w-3.5 h-3.5 text-blue-500" /> : <Usb className="w-3.5 h-3.5 text-amber-500" />}
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{printer.connectionType}</span>
               </div>
            </div>

            <h3 className="text-lg font-black text-slate-900 tracking-tight mb-1">{printer.name}</h3>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-6">{printer.type} Terminal</p>

            <div className="space-y-4 mb-8 flex-1">
               <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-slate-400">Status</span>
                  <div className="flex items-center gap-2">
                     <div className={cn("w-1.5 h-1.5 rounded-full", printer.status === 'online' ? "bg-emerald-500" : "bg-rose-500")} />
                     <span className="text-[10px] font-bold text-slate-600 capitalize">{printer.status}</span>
                  </div>
               </div>
               {printer.ipAddress && (
                 <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-[9px] font-black uppercase text-slate-400">IP Address</span>
                    <span className="text-[10px] font-mono font-bold text-slate-600">{printer.ipAddress}</span>
                 </div>
               )}
            </div>

            <div className="flex items-center gap-3">
               <button 
                 onClick={() => onTestPrinter(printer)}
                 className="flex-1 py-4 bg-slate-50 text-slate-600 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
               >
                 <RefreshCw className="w-3.5 h-3.5" /> Testar
               </button>
               <button 
                 onClick={() => onDeletePrinter(printer.id)}
                 className="p-4 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
            </div>
          </motion.div>
        ))}

        {printers.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300">
             <PrinterIcon className="w-16 h-16 mb-4 opacity-10" />
             <p className="text-sm font-black uppercase tracking-widest opacity-30">Nenhuma impressora configurada</p>
          </div>
        )}
      </div>
    </div>
  );
};
