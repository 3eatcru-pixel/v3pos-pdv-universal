import React, { useState, useRef, useEffect } from 'react';
import { Camera, Search, ChevronLeft, Check, Plus, Minus, Package, Zap, Undo2, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useCollection } from '../../hooks/useCollection';
import { firebaseService } from '../../services/firebaseService';
import { accountService } from '../services/accountService';
import { InventoryEngine } from '../services/InventoryEngine';
import { cn, formatCurrency } from '../../lib/utils';

export const InventoryCollectorView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const enterpriseId = accountService.getCurrentCompanyId() || '';
  const shopId = accountService.getSelectedShopId() || 'main';
  const { data: inventory } = useCollection<any>('inventory', { enterpriseId, shopId });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [count, setCount] = useState(0);
  const [showHighDiffWarning, setShowHighDiffWarning] = useState(false);
  const [justification, setJustification] = useState('');
  const [lastAdjustment, setLastAdjustment] = useState<{ id: string, delta: number, name: string } | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Motor de Feedback Sonoro (Web Audio API)
  const playFeedbackSound = (type: 'success' | 'error') => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioCtx = audioCtxRef.current;
    
    // Auditoria: Resume o contexto de áudio (obrigatório em Android/Chrome após suspensão)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'success') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Nota A5
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } else {
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); // Nota A3
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    }
  };

  // Auto-foco para garantir que o "bip" sempre caia no input
  useEffect(() => {
    const focus = () => scanInputRef.current?.focus();
    focus();
    window.addEventListener('click', focus);
    return () => window.removeEventListener('click', focus);
  }, [selectedItem]);

  // Auditoria Nativa: Cleanup de hardware ao fechar a view
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  const handleBarcodeSubmit = (barcode: string) => {
    const item = inventory.find(i => i.barcode === barcode);
    
    if (item) {
      playFeedbackSound('success');
      if (selectedItem?.id === item.id) {
        // Se for o mesmo item, apenas incrementa (Workflow de bipes sucessivos)
        setCount(prev => prev + 1);
      } else {
        // Se for um novo item, seleciona e inicia com +1 da contagem atual
        setSelectedItem(item);
        setCount(item.currentStock + 1);
      }
      setSearchTerm('');
    } else {
      playFeedbackSound('error');
      console.warn('Item não encontrado no catálogo');
      setSearchTerm('');
    }
  };

  const filtered = inventory.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.barcode === searchTerm
  ).slice(0, 8);

  const handleSaveCount = async () => {
    if (!selectedItem) return;
    const diff = count - selectedItem.currentStock;
    
    if (diff === 0) {
      setSelectedItem(null);
      setSearchTerm('');
      return;
    }

    // Lógica de Divergência Alta (> 20%)
    const diffPercent = (Math.abs(diff) / (selectedItem.currentStock || 1)) * 100;
    if (diffPercent > 20 && !showHighDiffWarning) {
      setShowHighDiffWarning(true);
      playFeedbackSound('error');
      return;
    }

    // Se houver justificativa (procedeu após aviso) ou for diff baixa, commita
    try {
      await InventoryEngine.manualAdjustment(selectedItem.id, diff, 'inventory');
      
      // Se foi uma divergência alta, registra a justificativa no log de auditoria
      if (showHighDiffWarning) {
        await firebaseService.addAuditLog({
          enterpriseId,
          shopId,
          staffId: accountService.getCurrentUser()?.id || 'solo',
          staffName: accountService.getCurrentUser()?.name || 'Sistema',
          action: 'HIGH_DISCREPANCY_JUSTIFIED',
          details: `Divergência de ${diffPercent.toFixed(1)}% em ${selectedItem.name}. Justificativa: ${justification || 'Não informada'}`
        });
      }

      // Armazena para possível Undo
      setLastAdjustment({ id: selectedItem.id, delta: diff, name: selectedItem.name });
      
      playFeedbackSound('success');
      setSelectedItem(null);
      setSearchTerm('');
      setShowHighDiffWarning(false);
      setJustification('');
    } catch (error) {
      console.error(error);
      alert('Falha ao salvar contagem.');
    }
  };

  const handleUndo = async () => {
    if (!lastAdjustment) return;
    
    await InventoryEngine.manualAdjustment(lastAdjustment.id, -lastAdjustment.delta, 'inventory');
    playFeedbackSound('success');
    const msg = `Revertido: ${lastAdjustment.name} (${lastAdjustment.delta > 0 ? '-' : '+'}${Math.abs(lastAdjustment.delta)})`;
    setLastAdjustment(null);
    alert(msg);
  };

  return (
    <div className="fixed inset-0 z-[500] bg-slate-50 flex flex-col font-sans">
      {/* Header Compacto */}
      <div className="bg-slate-900 p-6 pt-12 text-white flex items-center gap-4 shadow-xl">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ChevronLeft /></button>
        <div>
           <h2 className="text-xl font-black uppercase italic tracking-tighter leading-none">Modo Coleta</h2>
           <div className="flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Scanner Ativo</p>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!selectedItem ? (
          <div className="space-y-8">
            {/* Undo Action Bar */}
            <AnimatePresence>
              {lastAdjustment && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <button 
                    onClick={handleUndo}
                    className="w-full p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-amber-700 active:scale-95 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Undo2 className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Desfazer última contagem</span>
                    </div>
                    <span className="text-[10px] font-bold italic">{lastAdjustment.name}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input
                ref={scanInputRef}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleBarcodeSubmit(e.currentTarget.value);
                  }
                }}
                placeholder="Bipe o código ou digite..."
                className="w-full bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl py-5 pl-14 pr-6 font-bold shadow-sm outline-none transition-all"
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white rounded-xl shadow-lg active:scale-90 transition-all">
                <Camera className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {filtered.map(item => (
                <button 
                  key={item.id}
                  onClick={() => { setSelectedItem(item); setCount(item.currentStock); }}
                  className="p-5 bg-white rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400"><Package className="w-5 h-5" /></div>
                    <div className="text-left">
                       <p className="text-xs font-black text-slate-800 uppercase italic">{item.name}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Físico: {item.currentStock} {item.unit}</p>
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-blue-500" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 py-10">
             <div className="flex flex-col items-center text-center space-y-4">
                <div className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full flex items-center gap-2">
                   <Zap className="w-3 h-3 fill-current" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Item em Foco</span>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificado</p>
                  <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">{selectedItem.name}</h3>
                  <p className="text-[10px] font-mono font-bold text-slate-400">{selectedItem.barcode}</p>
                </div>
             </div>

             <div className="flex items-center justify-center gap-10">
                <button onClick={() => setCount(Math.max(0, count - 1))} className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-lg active:scale-90"><Minus className="w-8 h-8 text-slate-400" /></button>
                <div className="text-center">
                   <span className="text-7xl font-black italic tracking-tighter text-blue-600">{count}</span>
                   <p className="text-[10px] font-black text-slate-400 uppercase mt-2">{selectedItem.unit}</p>
                </div>
                <button onClick={() => setCount(count + 1)} className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 active:scale-90"><Plus className="w-8 h-8" /></button>
             </div>

             <div className="p-6 bg-slate-100 rounded-3xl border border-slate-200 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Divergência calculada</p>
                <p className={cn("text-lg font-black italic", count - selectedItem.currentStock < 0 ? "text-rose-500" : "text-emerald-500")}>
                  {count - selectedItem.currentStock > 0 ? '+' : ''}{count - selectedItem.currentStock} unidades
                </p>
             </div>

             <div className="relative">
                <input 
                  ref={scanInputRef}
                  className="absolute inset-0 opacity-0 cursor-default"
                  onKeyDown={(e) => e.key === 'Enter' && handleBarcodeSubmit(e.currentTarget.value)}
                  onChange={(e) => handleBarcodeSubmit(e.target.value)}
                />
             </div>

             <AnimatePresence>
                {showHighDiffWarning ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-rose-50 border-2 border-rose-200 rounded-[2.5rem] p-8 space-y-6 shadow-2xl"
                  >
                     <div className="flex items-center gap-4 text-rose-600">
                        <AlertTriangle className="w-8 h-8 shrink-0" />
                        <div>
                           <h4 className="text-lg font-black uppercase italic tracking-tighter">Variação Crítica Detectada</h4>
                           <p className="text-[10px] font-bold uppercase opacity-70">A diferença excede 20% do esperado.</p>
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-rose-400 ml-2">Explique o motivo (Curto)</label>
                        <input 
                          value={justification}
                          onChange={e => setJustification(e.target.value)}
                          placeholder="Ex: Produto vencido, erro de entrada anterior..."
                          className="w-full bg-white border border-rose-100 rounded-2xl p-4 text-xs font-bold italic outline-none focus:border-rose-500 transition-all"
                        />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setShowHighDiffWarning(false)} className="py-5 bg-white border border-rose-200 text-rose-600 rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2"><RefreshCw className="w-3 h-3" /> Recontar</button>
                        <button onClick={handleSaveCount} disabled={!justification.trim()} className="py-5 bg-rose-600 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg disabled:opacity-50">Confirmar Mesmo Assim</button>
                     </div>
                  </motion.div>
                ) : (
                  <button onClick={handleSaveCount} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                    <Check className="w-6 h-6" /> Confirmar Conferência
                  </button>
                )}
             </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};