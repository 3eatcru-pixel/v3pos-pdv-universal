import React, { useState, useEffect } from 'react';
import { 
  Printer as PrinterIcon, 
  Plus, 
  Settings, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Wifi, 
  Usb, 
  Monitor,
  Search,
  RefreshCw,
  X,
  ChevronRight,
  Globe,
  Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Printer, PrinterType } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { accountService } from '../services/accountService';
import { cn } from '../../lib/utils';
import { idGenerator } from '../utils/idGenerator';

export const PrinterManagement: React.FC = () => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const currentUser = accountService.getCurrentUser();
  const companyId = currentUser?.companyId || 'default';

  const [newPrinter, setNewPrinter] = useState<Omit<Printer, 'id' | 'enterpriseId' | 'shopId' | 'status'>>({
    name: '',
    type: 'receipt',
    connectionType: 'network',
    ipAddress: '',
    port: 9100,
    isDefault: false
  });

  useEffect(() => {
    if (!companyId) return;
    
    setLoading(true);
    
    // Auditoria: Implementação correta da subscrição em tempo real com limpeza de memória
    const unsub = firebaseService.subscribeCollection<Printer>(
      'printers',
      companyId,
      accountService.getSelectedShopId(),
      (data) => {
        setPrinters(data);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [companyId]);

  const loadPrinters = () => {
    // Apenas um trigger visual, pois o subscribe no useEffect já cuida dos dados
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  const handleAddPrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = idGenerator.generate('ptr');
    
    const printerData: Printer = {
      ...newPrinter,
      id,
      enterpriseId: companyId,
      shopId: accountService.getSelectedShopId() || 'main-shop', // Usar shopId selecionado
      status: 'online'
    };

    try {
      // If setting as default, unset others of same type
      if (printerData.isDefault) {
        const othersToUpdate = printers.filter(p => p.type === printerData.type && p.isDefault);
        for (const other of othersToUpdate) {
          await firebaseService.saveItem('printers', other.id, { ...other, isDefault: false });
        }
      }

      await firebaseService.saveItem('printers', id, printerData);
      setIsModalOpen(false);
      setNewPrinter({
        name: '',
        type: 'receipt',
        connectionType: 'network',
        ipAddress: '',
        port: 9100,
        isDefault: false
      });
      loadPrinters();
    } catch (error) {
      console.error('Failed to add printer:', error);
    }
  };

  const handleDeletePrinter = async (id: string) => {
    if (confirm('Deseja excluir esta impressora?')) {
      try {
        await firebaseService.deleteItem('printers', id);
        loadPrinters();
      } catch (error) {
        console.error('Failed to delete printer:', error);
      }
    }
  };

  const toggleDefault = async (printer: Printer) => {
    try {
      // Unset current default of same type
      const currentDefault = printers.find(p => p.type === printer.type && p.isDefault);
      if (currentDefault) {
        await firebaseService.saveItem('printers', currentDefault.id, { ...currentDefault, isDefault: false });
      }

      await firebaseService.saveItem('printers', printer.id, { ...printer, isDefault: true });
      loadPrinters();
    } catch (error) {
      console.error('Failed to set default printer:', error);
    }
  };

  const filteredPrinters = printers.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Gerenciamento de Impressoras</h2>
          <p className="text-slate-500 font-medium font-sans">Configure seus pontos de impressão na rede local.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95 shrink-0"
        >
          <Plus className="w-5 h-5" /> Adicionar Impressora
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Stats Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
             <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <PrinterIcon className="w-6 h-6" />
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Unidades</p>
             <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{printers.length}</h3>
          </div>

          <div className="bg-emerald-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-500/20">
             <div className="w-12 h-12 bg-white/20 text-white rounded-2xl flex items-center justify-center mb-6">
                <RefreshCw className="w-6 h-6" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Status de Rede</p>
             <h3 className="text-2xl font-black tracking-tight">Sistema Online</h3>
             <p className="text-[10px] font-bold mt-4 opacity-100 bg-white/10 p-2 rounded-xl text-center">Protocolo ESC/POS Ativo</p>
          </div>
        </div>

        {/* Main List Column */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-8 border-b border-slate-100 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome ou tipo..."
                  className="w-full bg-slate-50 border-none rounded-xl py-4 pl-12 pr-4 font-bold text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                />
              </div>
              <button 
                onClick={loadPrinters}
                className="p-4 bg-slate-50 text-slate-400 rounded-xl hover:text-blue-600 transition-all"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="p-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredPrinters.length === 0 && !loading && (
                    <div className="col-span-full py-20 text-center">
                       <PrinterIcon className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                       <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhuma impressora encontrada</p>
                    </div>
                  )}

                  {filteredPrinters.map(printer => (
                    <motion.div 
                      layout
                      key={printer.id}
                      className="p-6 rounded-[2rem] border border-slate-100 hover:border-blue-200 transition-all relative group shadow-sm hover:shadow-xl bg-white"
                    >
                       <div className="flex items-center justify-between mb-6">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                            printer.status === 'online' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          )}>
                             {printer.connectionType === 'network' ? <Wifi className="w-6 h-6" /> : 
                              printer.connectionType === 'usb' ? <Usb className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                          </div>
                          <div className="flex items-center gap-2">
                             {printer.isDefault && (
                               <span className="bg-blue-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded-md tracking-widest shadow-lg shadow-blue-500/20">PADRÃO</span>
                             )}
                             <span className="bg-slate-50 text-slate-500 text-[8px] font-black uppercase px-2 py-1 rounded-md tracking-widest">{printer.type}</span>
                          </div>
                       </div>

                       <div>
                          <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-1">{printer.name}</h4>
                          <p className="text-[10px] font-mono font-bold text-slate-400">
                             {printer.connectionType === 'network' ? `${printer.ipAddress}:${printer.port}` : 'Conexão Local (USB/OS)'}
                          </p>
                       </div>

                       <div className="mt-8 flex items-center gap-2">
                          {!printer.isDefault && (
                            <button 
                              onClick={() => toggleDefault(printer)}
                              className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            >
                               Definir Padrão
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeletePrinter(printer.id)}
                            className="p-3 bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                          >
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                    </motion.div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Printer Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-xl bg-white rounded-[3rem] shadow-3xl overflow-hidden relative z-10"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                       <Plus className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Nova Impressora</h3>
                 </div>
                 <button 
                   onClick={() => setIsModalOpen(false)}
                   className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                 >
                   <X className="w-6 h-6" />
                 </button>
              </div>

              <form onSubmit={handleAddPrinter} className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Nome Amigável</label>
                      <input 
                        required
                        value={newPrinter.name}
                        onChange={e => setNewPrinter({...newPrinter, name: e.target.value})}
                        placeholder="Ex: Impressora Cozinha 01"
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold text-sm outline-none transition-all"
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Tipo / Finalidade</label>
                      <select 
                        value={newPrinter.type}
                        onChange={e => setNewPrinter({...newPrinter, type: e.target.value as PrinterType})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold text-sm outline-none transition-all appearance-none"
                      >
                         <option value="receipt">Recibo / Caixa</option>
                         <option value="kitchen">Cozinha / Produção</option>
                         <option value="bar">Bar / Bebidas</option>
                         <option value="report">Relatórios</option>
                      </select>
                   </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Tipo de Conexão</label>
                  <div className="grid grid-cols-3 gap-4">
                     {[
                       { id: 'network', icon: <Wifi className="w-4 h-4" />, label: 'TCP/IP' },
                       { id: 'usb', icon: <Usb className="w-4 h-4" />, label: 'USB Local' },
                       { id: 'system_default', icon: <Monitor className="w-4 h-4" />, label: 'Sistema' }
                     ].map(t => (
                       <button
                         key={t.id}
                         type="button"
                         onClick={() => setNewPrinter({...newPrinter, connectionType: t.id as any})}
                         className={cn(
                           "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                           newPrinter.connectionType === t.id ? "bg-blue-600 border-blue-600 text-white shadow-lg" : "bg-white border-slate-100 text-slate-400 hover:border-blue-200"
                         )}
                       >
                          {t.icon}
                          <span className="text-[9px] font-black uppercase">{t.label}</span>
                       </button>
                     ))}
                  </div>
                </div>

                {newPrinter.connectionType === 'network' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-8"
                  >
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Endereço IP</label>
                        <div className="relative">
                           <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                           <input 
                            required
                            value={newPrinter.ipAddress}
                            onChange={e => setNewPrinter({...newPrinter, ipAddress: e.target.value})}
                            placeholder="192.168.1.100"
                            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-12 pr-6 font-mono font-bold text-sm outline-none transition-all"
                           />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Porta (Raw/Telnet)</label>
                        <div className="relative">
                           <Radio className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                           <input 
                            type="number"
                            required
                            value={newPrinter.port}
                            onChange={e => setNewPrinter({...newPrinter, port: parseInt(e.target.value)})}
                            placeholder="9100"
                            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-12 pr-6 font-mono font-bold text-sm outline-none transition-all"
                           />
                        </div>
                     </div>
                  </motion.div>
                )}

                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl">
                   <input 
                    type="checkbox"
                    id="isDefault"
                    checked={newPrinter.isDefault}
                    onChange={e => setNewPrinter({...newPrinter, isDefault: e.target.checked})}
                    className="w-5 h-5 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500"
                   />
                   <label htmlFor="isDefault" className="text-xs font-bold text-slate-600">Definir como impressora padrão para este tipo</label>
                </div>

                <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                   <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="py-5 bg-slate-100 text-slate-500 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                   >
                     Cancelar
                   </button>
                   <button 
                    type="submit"
                    className="py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10"
                   >
                     Salvar Impressora
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
