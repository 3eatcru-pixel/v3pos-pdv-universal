import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Table as TableIcon, Trash2 } from 'lucide-react';
import { Table } from '../../types';

interface TableEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTable: Table | null;
  availableAreas: string[];
  onUpdate: (tableId: string, updates: Partial<Table>) => Promise<void>;
  onDelete: (tableId: string) => Promise<void>;
  setEditingTable: (table: Table) => void;
}

export const TableEditModal: React.FC<TableEditModalProps> = ({
  isOpen, onClose, editingTable, availableAreas, onUpdate, onDelete, setEditingTable
}) => {
  if (!editingTable) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <TableIcon className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Editar Mesa {editingTable.number}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configurações e Localização</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Número da Mesa</label>
                    <input
                      type="number"
                      value={editingTable.number}
                      onChange={(e) => setEditingTable({ ...editingTable, number: parseInt(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Capacidade</label>
                    <input
                      type="number"
                      value={editingTable.capacity}
                      onChange={(e) => setEditingTable({ ...editingTable, capacity: parseInt(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Área / Ambiente</label>
                  <select
                    value={editingTable.area || 'Salão Principal'}
                    onChange={(e) => setEditingTable({ ...editingTable, area: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none"
                  >
                    {availableAreas.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={async () => {
                      await onUpdate(editingTable.id, {
                        number: editingTable.number,
                        capacity: editingTable.capacity,
                        area: editingTable.area
                      });
                      onClose();
                    }}
                    className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-500 transition-all shadow-xl"
                  >
                    Salvar Alterações
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir a mesa ${editingTable.number}?`)) {
                        onDelete(editingTable.id);
                        onClose();
                      }
                    }}
                    className="w-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};