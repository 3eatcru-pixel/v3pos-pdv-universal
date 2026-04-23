import React from 'react';
import { Plus, Printer as PrinterIcon, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Printer } from '../../types';
import { useCollection } from '../../hooks/useCollection';
import { firebaseService } from '../../services/firebaseService';

interface PrinterManagementViewProps {
  onEdit: (printer: Printer) => void;
  onNew: () => void;
}

export const PrinterManagementView: React.FC<PrinterManagementViewProps> = ({ onEdit, onNew }) => {
  const { data: printers } = useCollection<Printer>('printers');

  const handleDeletePrinter = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta impressora?')) {
      await firebaseService.deleteItem('printers', id);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gerenciamento de Impressoras</h2>
          <p className="text-sm text-slate-500 font-medium tracking-tight">Configure as impressoras para recibos, cozinha e relatórios</p>
        </div>
        <button 
          onClick={onNew}
          className="sleek-card px-4 py-3 bg-emerald-500 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 border-none shadow-emerald-200"
        >
          <Plus className="w-4 h-4" /> Nova Impressora
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {printers.map(printer => (
          <div key={printer.id} className="sleek-card p-6 border-t-4" style={{ borderTopColor: printer.status === 'online' ? '#10b981' : '#f59e0b' }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-slate-800">{printer.name} {printer.isDefault && <span className="ml-2 text-[8px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">Padrão</span>}</h4>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">{printer.type.replace('_', ' ')} • {printer.connectionType}</p>
              </div>
              <div className={cn(
                "w-3 h-3 rounded-full shadow-sm",
                printer.status === 'online' ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              )} />
            </div>
            
            <div className="bg-slate-50 rounded-xl p-3 mb-6 space-y-2">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-bold uppercase">Status</span>
                <span className={cn("font-black uppercase", printer.status === 'online' ? "text-emerald-600" : "text-amber-600")}>{printer.status}</span>
              </div>
              {printer.ipAddress && (
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-bold uppercase">Endereço IP</span>
                  <span className="text-slate-700 font-mono font-bold">{printer.ipAddress}:{printer.port}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => onEdit(printer)}
                className="flex-1 p-2 text-[10px] font-black uppercase text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all border border-slate-100"
              >
                Configurar
              </button>
              <button 
                onClick={() => handleDeletePrinter(printer.id)}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all border border-slate-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {printers.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
             <PrinterIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhuma impressora configurada</p>
          </div>
        )}
      </div>
    </div>
  );
};
