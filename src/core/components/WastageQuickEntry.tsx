import React, { useState, useRef } from 'react';
import { Trash2, Search, Barcode, Plus, X, AlertOctagon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EndOfDayEngine } from '../services/EndOfDayEngine';
import { useCollection } from '../../hooks/useCollection';
import { cn } from '../../lib/utils';

export const WastageQuickEntry: React.FC<{ sessionId: string; enterpriseId: string }> = ({ sessionId, enterpriseId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [qty, setQty] = useState(1);
  const { data: inventory } = useCollection<any>('inventory', { enterpriseId });

  const filtered = inventory.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.barcode === searchTerm
  ).slice(0, 5);

  const handleAdd = async () => {
    if (!selectedItem) return;
    await EndOfDayEngine.recordWastage(sessionId, {
      itemId: selectedItem.id,
      name: selectedItem.name,
      quantity: qty,
      unit: selectedItem.unit || 'UN',
      sourceType: 'inventory',
      cost: selectedItem.costPerUnit || 0,
      reason: 'damaged'
    });
    setSelectedItem(null);
    setSearchTerm('');
    setQty(1);
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
          <Trash2 className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">Lançar Desperdício</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Baixa rápida de estoque (Quebras)</p>
        </div>
      </div>

      {!selectedItem ? (
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Nome do item ou Código de Barras..."
            className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-500 rounded-2xl py-5 pl-14 pr-6 font-bold outline-none transition-all"
          />
          {searchTerm.length > 2 && (
            <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl mt-2 border border-slate-100 z-10 overflow-hidden">
              {filtered.map(item => (
                <button 
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="w-full p-4 hover:bg-slate-50 text-left flex items-center justify-between border-b border-slate-50"
                >
                  <span className="text-xs font-black uppercase text-slate-700">{item.name}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{item.currentStock} em estoque</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-50 p-6 rounded-3xl border border-rose-100 flex items-center justify-between">
           <div>
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Item Selecionado</p>
              <p className="text-lg font-black text-rose-900 uppercase italic">{selectedItem.name}</p>
           </div>
           <div className="flex items-center gap-4">
              <input 
                type="number" 
                value={qty} 
                onChange={e => setQty(Number(e.target.value))}
                className="w-20 bg-white border-2 border-rose-200 rounded-xl p-3 font-black text-center text-rose-600 outline-none"
              />
              <button onClick={handleAdd} className="p-4 bg-rose-600 text-white rounded-xl shadow-lg hover:bg-rose-700 transition-all"><Plus /></button>
              <button onClick={() => setSelectedItem(null)} className="p-4 text-rose-300"><X /></button>
           </div>
        </motion.div>
      )}
    </div>
  );
};
