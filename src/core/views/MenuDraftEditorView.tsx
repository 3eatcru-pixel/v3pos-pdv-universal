import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save, Upload, Search, Percent, Camera, Rocket, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MenuManagementEngine, MenuDraft } from '../services/MenuManagementEngine';
import { accountService } from '../services/accountService';
import { useDevice } from '../../hooks/useDevice';
import { cn, formatCurrency } from '../../lib/utils';
import { Product } from '../../types';

export const MenuDraftEditorView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const enterpriseId = accountService.getCurrentCompanyId() || '';
  const shopId = accountService.getSelectedShopId() || 'main';
  const { isMobile } = useDevice();

  const [draftItems, setDraftItems] = useState<Partial<Product>[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deliveryMarkup, setDeliveryMarkup] = useState(15);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('pos_menu_draft');
    if (raw) {
      const draft: MenuDraft = JSON.parse(raw);
      setDraftItems(draft.items);
    }
  }, []);

  const handleUpdateItem = (index: number, patch: Partial<Product>) => {
    const next = [...draftItems];
    next[index] = { ...next[index], ...patch };
    setDraftItems(next);
    MenuManagementEngine.saveDraft(enterpriseId, next);
  };

  const handlePhotoUpload = async (index: number, file: File) => {
    const blob = await MenuManagementEngine.processMenuPhoto(file);
    const previewUrl = URL.createObjectURL(blob);
    handleUpdateItem(index, { photo: previewUrl }); // Em produção, subiria para o storage
  };

  const handlePush = async () => {
    if (!confirm('Deseja publicar este cardápio agora? Isso atualizará o PDV e o Google Business Profile.')) return;
    setIsPublishing(true);
    const success = await MenuManagementEngine.publishMenu(enterpriseId, shopId);
    setIsPublishing(false);
    if (success) {
      alert('Cardápio publicado com sucesso!');
      onBack();
    }
  };

  const filtered = draftItems.filter(i => i.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[500] bg-slate-50 flex flex-col font-sans">
      {/* Header Mobile-First */}
      <div className="bg-slate-900 p-6 pt-12 text-white flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ChevronLeft /></button>
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter leading-none">Novo Catálogo</h2>
            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-1">Ambiente de Rascunho</p>
          </div>
        </div>
        <button 
          onClick={handlePush}
          disabled={isPublishing}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
        >
          {isPublishing ? <Save className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
          {isMobile ? 'Push' : 'Publicar Agora'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Delivery Control */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Percent className="w-4 h-4" /></div>
                 <h4 className="text-xs font-black uppercase italic text-slate-800">Markup de Delivery</h4>
              </div>
              <span className="text-lg font-black text-amber-600">+{deliveryMarkup}%</span>
           </div>
           <input 
             type="range" min="0" max="50" step="1"
             value={deliveryMarkup}
             onChange={(e) => setDeliveryMarkup(Number(e.target.value))}
             className="w-full accent-amber-500 h-1.5 bg-slate-100 rounded-lg appearance-none"
           />
        </div>

        {/* Search & List */}
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar item no rascunho..."
            className="w-full bg-white border border-slate-100 rounded-2xl py-5 pl-14 pr-6 font-bold shadow-sm outline-none focus:border-blue-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 pb-20">
          {filtered.map((item, idx) => (
            <motion.div 
              layout
              key={item.id || idx}
              className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6"
            >
              <div 
                onClick={() => document.getElementById(`photo-${idx}`)?.click()}
                className="w-24 h-24 bg-slate-50 rounded-[1.8rem] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer group"
              >
                {item.photo ? (
                  <img src={item.photo} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                ) : (
                  <Camera className="text-slate-300 w-8 h-8" />
                )}
                <input id={`photo-${idx}`} type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handlePhotoUpload(idx, e.target.files[0])} />
              </div>

              <div className="flex-1 space-y-3">
                <input 
                  value={item.name}
                  onChange={e => handleUpdateItem(idx, { name: e.target.value })}
                  className="w-full bg-transparent font-black text-slate-800 uppercase italic text-sm outline-none border-b border-transparent focus:border-blue-500"
                />
                <div className="flex gap-2">
                   <div className="bg-slate-50 px-4 py-2 rounded-xl flex-1 flex items-center gap-2 border border-slate-100">
                      <span className="text-[10px] font-black text-slate-400">R$</span>
                      <input 
                        type="number"
                        value={item.price}
                        onChange={e => handleUpdateItem(idx, { price: Number(e.target.value) })}
                        className="bg-transparent w-full font-black text-xs text-slate-900 outline-none"
                      />
                   </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};