import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { Staff, Shift } from '../../types';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingShift: Shift | null;
  staff: Staff[];
  selectedDate: Date;
  onSave: (shift: Pick<Shift, 'staffId' | 'area' | 'startTime' | 'endTime'>) => Promise<void>;
  onDelete: (shiftId: string) => Promise<void>;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen, onClose, editingShift, staff, selectedDate, onSave, onDelete
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             exit={{ scale: 0.9, opacity: 0 }}
             className="bg-white modal-rounded w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
               <h3 className="responsive-h3 text-slate-800">{editingShift ? 'Editar Turno' : 'Novo Turno'}</h3>
               <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600">
                 <X className="w-5 h-5" />
               </button>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const dateStr = formData.get('date') as string;
                const start = new Date(`${dateStr}T${formData.get('startTime')}:00`).getTime();
                const end = new Date(`${dateStr}T${formData.get('endTime')}:00`).getTime();
                onSave({
                  staffId: formData.get('staffId') as string,
                  area: formData.get('area') as 'FOH' | 'BOH',
                  startTime: start,
                  endTime: end
                });
              }}
              className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar"
            >
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Funcionário</label>
                <select name="staffId" defaultValue={editingShift?.staffId} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none">
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Área</label>
                  <select name="area" defaultValue={editingShift?.area || 'FOH'} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none">
                    <option value="FOH">Front of House</option>
                    <option value="BOH">Back of House</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Data</label>
                  <input type="date" name="date" defaultValue={editingShift ? format(editingShift.startTime, 'yyyy-MM-dd') : format(selectedDate, 'yyyy-MM-dd')} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input type="time" name="startTime" defaultValue={editingShift ? format(editingShift.startTime, 'HH:mm') : '08:00'} required className="px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700" />
                <input type="time" name="endTime" defaultValue={editingShift ? format(editingShift.endTime, 'HH:mm') : '16:00'} required className="px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700" />
              </div>

              {editingShift && (
                <button type="button" onClick={() => confirm("Remover?") && onDelete(editingShift.id)} className="w-full py-2 text-xs font-black uppercase text-red-500 hover:bg-red-50 rounded-xl">Excluir Turno</button>
              )}
              
              <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl">
                 Salvar Turno
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};