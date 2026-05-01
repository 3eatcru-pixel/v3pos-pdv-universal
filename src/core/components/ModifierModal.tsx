import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Minus, Plus } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { idGenerator } from '../utils/idGenerator';
import { OrderItem, ItemModifier, ModifierType, InventoryItem } from '../../types';

interface ModifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: OrderItem | null;
  inventory: InventoryItem[];
  onUpdateModifiers: (itemId: string, modifiers: ItemModifier[]) => void;
}

const STANDARD_ALLERGIES = [
  'Amendoim', 'Glúten', 'Lactose', 'Frutos do Mar', 'Ovo', 'Soja', 'Nozes', 'Peixe', 'Trigo', 'Leite', 'Castanhas'
];

export const ModifierModal: React.FC<ModifierModalProps> = ({
  isOpen, onClose, item, inventory, onUpdateModifiers
}) => {
  const [modCustomName, setModCustomName] = useState('');
  const [modCustomPrice, setModCustomPrice] = useState('');
  const [modCustomRemove, setModCustomRemove] = useState('');

  if (!item) return null;

  const currentModifiers = item.modifiers || [];

  const toggleModifier = (name: string, type: ModifierType, price: number = 0) => {
    const exists = currentModifiers.find(m => m.name === name && m.type === type);
    let newModifiers: ItemModifier[] = [];
    
    if (exists) {
      newModifiers = currentModifiers.filter(m => !(m.name === name && m.type === type));
    } else {
      const invItem = inventory.find(i => i.name.toLowerCase() === name.toLowerCase());
      newModifiers = [...currentModifiers, { 
        id: idGenerator.generate('mod'),
        name, 
        type, 
        price,
        inventoryItemId: invItem?.id
      }];
    }
    onUpdateModifiers(item.id, newModifiers);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Customizar Item</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{item.name}</p>
              </div>
              <button onClick={onClose} className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
              {/* Alergias */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Alergias (Aviso Cozinha)
                </label>
                <div className="flex flex-wrap gap-2">
                  {STANDARD_ALLERGIES.map(allergy => {
                    const isActive = currentModifiers.some(m => m.name === allergy && m.type === 'allergy');
                    return (
                      <button 
                        key={allergy}
                        onClick={() => toggleModifier(allergy, 'allergy')}
                        className={cn(
                          "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                          isActive ? "bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20" : "bg-white text-slate-400 border-slate-100 hover:border-amber-200"
                        )}
                      >
                        {allergy}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Remoções */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                  <Minus className="w-3.5 h-3.5 text-rose-500" />
                  Remover (SEM)
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['Cebola', 'Tomate', 'Pão', 'Picles', 'Maionese', 'Alface'].map(remItem => {
                    const isActive = currentModifiers.some(m => m.name === remItem && m.type === 'remove');
                    return (
                      <button 
                        key={remItem}
                        onClick={() => toggleModifier(remItem, 'remove')}
                        className={cn(
                          "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                          isActive ? "bg-rose-500 text-white border-rose-600 shadow-lg shadow-rose-500/20" : "bg-white text-slate-400 border-slate-100 hover:border-rose-200"
                        )}
                      >
                        Sem {remItem}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Outro item..."
                    value={modCustomRemove}
                    onChange={e => setModCustomRemove(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 outline-none text-[10px] font-black uppercase tracking-widest"
                  />
                  <button onClick={() => { toggleModifier(modCustomRemove, 'remove'); setModCustomRemove(''); }} className="p-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Adicionais */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-blue-500" />
                  Adicionais (EXTRA)
                </label>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 border-dashed">
                  <div className="flex gap-2">
                    <input 
                      value={modCustomName}
                      onChange={e => setModCustomName(e.target.value)}
                      placeholder="Nome (ex: Bacon)"
                      className="flex-1 px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    />
                    <input 
                      value={modCustomPrice}
                      onChange={e => setModCustomPrice(e.target.value)}
                      type="number" 
                      placeholder="R$ 0,00"
                      className="w-24 px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                    <button onClick={() => { toggleModifier(modCustomName, 'extra', parseFloat(modCustomPrice || '0')); setModCustomName(''); setModCustomPrice(''); }} className="p-3.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 shadow-xl shadow-blue-500/20">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Preço Final do Item</span>
                <span className="text-2xl font-black text-white tracking-tight">
                  {formatCurrency(item.price + currentModifiers.reduce((acc, m) => acc + (m.price || 0), 0))}
                </span>
              </div>
              <button onClick={onClose} className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl shadow-emerald-500/20">
                Confirmar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};