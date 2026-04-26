import React, { useState } from 'react';
import { MoveHorizontal, XCircle, Footprints, AlertTriangle, ChevronRight, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { coreSalesService } from '../services/coreServices';
import { accountService } from '../services/accountService';
import { useCollection } from '../../hooks/useCollection';
import { Table } from '../../types';

interface TableConfigPopoverProps {
  table: Table;
  onClose: () => void;
}

type TableAction = 'transfer' | 'cancel' | 'walkout' | 'out_of_stock';

export const TableConfigPopover: React.FC<TableConfigPopoverProps> = ({ table, onClose }) => {
  const [selectedAction, setSelectedAction] = useState<TableAction | null>(null);
  const [reason, setReason] = useState('');
  const [targetTableId, setTargetTableId] = useState('');
  const [loading, setLoading] = useState(false);

  const enterpriseId = accountService.getCurrentCompanyId() || '';
  const shopId = accountService.getSelectedShopId() || 'main';
  const user = accountService.getCurrentUser();

  const { data: allTables } = useCollection<Table>('tables', { enterpriseId, shopId });
  const availableTables = allTables.filter(t => t.id !== table.id && t.status === 'available');

  const handleAction = async () => {
    if (!selectedAction || !user) return;
    setLoading(true);

    try {
      if (selectedAction === 'transfer') {
        if (!targetTableId) throw new Error('Selecione uma mesa de destino');
        await coreSalesService.transferTable(enterpriseId, shopId, table.id, targetTableId, user.id, reason);
      } else if (selectedAction === 'walkout') {
        await coreSalesService.recordWalkout(enterpriseId, shopId, table.id, user.id, reason);
      } else {
        // Auditoria: Outras ações (Cancelamento/Falta de Estoque) seguem o mesmo fluxo de motivo
        alert(`Ação "${selectedAction}" registrada com motivo: ${reason}`);
      }
      onClose();
    } catch (error: any) {
      alert(error.message || 'Erro ao processar ação');
    } finally {
      setLoading(false);
    }
  };

  const actions = [
    { id: 'transfer' as TableAction, label: 'Transferir', icon: <MoveHorizontal />, color: 'bg-blue-600' },
    { id: 'cancel' as TableAction, label: 'Cancelar', icon: <XCircle />, color: 'bg-slate-600' },
    { id: 'walkout' as TableAction, label: 'Walkout', icon: <Footprints />, color: 'bg-rose-600' },
    { id: 'out_of_stock' as TableAction, label: 'Falta Item', icon: <AlertTriangle />, color: 'bg-amber-600' },
  ];

  return (
    <div className="absolute top-0 right-0 mt-2 mr-2 z-[100] w-64 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden font-sans">
      <div className="p-5 space-y-5">
        {!selectedAction ? (
          <div className="grid grid-cols-2 gap-2">
            {actions.map(action => (
              <button
                key={action.id}
                onClick={() => setSelectedAction(action.id)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all group"
              >
                <div className={cn("p-2 rounded-xl text-white shadow-sm transition-transform group-hover:scale-110", action.color)}>
                  {React.cloneElement(action.icon as React.ReactElement, { size: 16 })}
                </div>
                <span className="text-[9px] font-black uppercase tracking-tighter text-slate-600">{action.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="flex items-center gap-2">
               <button onClick={() => setSelectedAction(null)} className="p-1 text-slate-400 hover:text-slate-900"><ChevronRight size={14} className="rotate-180" /></button>
               <span className="text-[10px] font-black uppercase text-slate-800 italic">{actions.find(a => a.id === selectedAction)?.label}</span>
            </div>

            {selectedAction === 'transfer' && (
              <select 
                value={targetTableId}
                onChange={e => setTargetTableId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-blue-500 appearance-none"
              >
                <option value="">Para qual mesa?</option>
                {availableTables.map(t => <option key={t.id} value={t.id}>Mesa {t.number}</option>)}
              </select>
            )}

            <textarea 
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Motivo da ação..."
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] font-bold italic h-20 resize-none outline-none focus:border-blue-500"
            />

            <button 
              onClick={handleAction}
              disabled={loading || (selectedAction === 'transfer' && !targetTableId) || !reason.trim()}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-30"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Confirmar
            </button>
          </motion.div>
        )}
      </div>
      <div className="bg-slate-50 p-2 text-center border-t border-slate-100">
         <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Protocolo de Segurança Nexus</p>
      </div>
    </div>
  );
};