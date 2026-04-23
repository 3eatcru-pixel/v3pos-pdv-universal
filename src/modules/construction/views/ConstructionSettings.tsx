import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Type, 
  Hash, 
  CheckSquare, 
  Calendar, 
  List,
  AlertCircle,
  Clock,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { constructionService } from '../services/constructionService';
import { CustomFieldDefinition } from '../../../types';

export const ConstructionSettings: React.FC = () => {
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newField, setNewField] = useState<Omit<CustomFieldDefinition, 'id' | 'createdAt'>>({
    name: '',
    type: 'text',
    isRequired: false,
    options: []
  });
  const [optionInput, setOptionInput] = useState('');

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    const data = await constructionService.getCustomFields();
    setFields([...data]);
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    await constructionService.addCustomField(newField);
    setIsModalOpen(false);
    loadFields();
    setNewField({ name: '', type: 'text', isRequired: false, options: [] });
  };

  const addOption = () => {
    if (optionInput.trim()) {
      setNewField({ ...newField, options: [...(newField.options || []), optionInput.trim()] });
      setOptionInput('');
    }
  };

  const removeOption = (index: number) => {
    setNewField({ ...newField, options: newField.options?.filter((_, i) => i !== index) });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return <Type className="w-4 h-4" />;
      case 'number': return <Hash className="w-4 h-4" />;
      case 'boolean': return <CheckSquare className="w-4 h-4" />;
      case 'date': return <Calendar className="w-4 h-4" />;
      case 'select': return <List className="w-4 h-4" />;
      default: return <Type className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Personalização de Produtos</h2>
          <p className="text-slate-500 font-medium">Defina campos extras para seus materiais (ex: Voltagem, Marca, Validade)</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200"
        >
          <Plus className="w-5 h-5" /> Novo Campo Customizado
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/50">
           <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
              <Settings className="w-4 h-4" /> Configurações de Atributos
           </h3>
        </div>

        <div className="p-8">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fields.map(field => (
                <div key={field.id} className="p-6 rounded-[2rem] border border-slate-100 bg-white hover:border-emerald-200 transition-all group relative">
                   <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                         {getTypeIcon(field.type)}
                      </div>
                      <div className="flex items-center gap-2">
                         {field.isRequired && (
                           <span className="text-[8px] font-black uppercase bg-rose-50 text-rose-500 px-2 py-1 rounded-md">Obrigatório</span>
                         )}
                         <button className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                   </div>

                   <div>
                      <h4 className="font-black text-slate-800 uppercase tracking-tight">{field.name}</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Tipo: {field.type}</p>
                   </div>

                   {field.options && field.options.length > 0 && (
                     <div className="mt-4 flex flex-wrap gap-1">
                        {field.options.map((opt, i) => (
                           <span key={i} className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{opt}</span>
                        ))}
                     </div>
                   )}

                   <div className="mt-6 pt-4 border-t border-slate-50 flex items-center gap-2 text-[9px] font-bold text-slate-400">
                      <Clock className="w-3 h-3" /> Criado em: {new Date(field.createdAt).toLocaleString()}
                   </div>
                </div>
              ))}
              
              {fields.length === 0 && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
                   <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                   <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum campo customizado definido.</p>
                   <p className="text-slate-300 text-[10px] mt-2">Clique em "Novo Campo" para começar a personalizar seus produtos.</p>
                </div>
              )}
           </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-3xl overflow-hidden"
            >
               <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Novo Campo Customizado</h3>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                     <X className="w-6 h-6" />
                  </button>
               </div>

               <form onSubmit={handleAddField} className="p-8 space-y-6">
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nome do Campo</label>
                        <input 
                           required
                           type="text" 
                           placeholder="Ex: Voltagem, Marca, Cor..."
                           className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all"
                           value={newField.name}
                           onChange={e => setNewField({...newField, name: e.target.value})}
                        />
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tipo de Dado</label>
                        <select 
                           required
                           className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all appearance-none"
                           value={newField.type}
                           onChange={e => setNewField({...newField, type: e.target.value as any})}
                        >
                           <option value="text">Texto Curto</option>
                           <option value="number">Número / Valor</option>
                           <option value="boolean">Verdadeiro/Falso</option>
                           <option value="date">Data</option>
                           <option value="select">Seleção (Múltipla Escolha)</option>
                        </select>
                     </div>

                     {newField.type === 'select' && (
                        <div className="space-y-4 pt-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Opções da Seleção</label>
                           <div className="flex gap-2">
                              <input 
                                 type="text" 
                                 placeholder="Nova opção..."
                                 className="flex-1 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-xl py-3 px-4 font-bold outline-none transition-all"
                                 value={optionInput}
                                 onChange={e => setOptionInput(e.target.value)}
                              />
                              <button 
                                 type="button"
                                 onClick={addOption}
                                 className="bg-slate-900 text-white p-3 rounded-xl hover:bg-emerald-600 transition-all shadow-lg"
                              >
                                 <Plus className="w-5 h-5" />
                              </button>
                           </div>
                           <div className="flex flex-wrap gap-2">
                              {newField.options?.map((opt, i) => (
                                 <span key={i} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-black uppercase">
                                    {opt}
                                    <button onClick={() => removeOption(i)}><X className="w-3 h-3" /></button>
                                 </span>
                              ))}
                           </div>
                        </div>
                     )}

                     <label className="flex items-center gap-3 cursor-pointer group pt-2 px-2">
                        <input 
                           type="checkbox" 
                           className="w-5 h-5 rounded-lg border-2 border-slate-200 text-emerald-600 focus:ring-emerald-500"
                           checked={newField.isRequired}
                           onChange={e => setNewField({...newField, isRequired: e.target.checked})}
                        />
                        <span className="text-xs font-black text-slate-600 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">Este campo é obrigatório?</span>
                     </label>
                  </div>

                  <div className="pt-6 flex gap-4">
                     <button 
                        type="button" 
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-200 transition-all"
                     >
                        Descartar
                     </button>
                     <button 
                        type="submit" 
                        className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200"
                     >
                        Confirmar Campo
                     </button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
