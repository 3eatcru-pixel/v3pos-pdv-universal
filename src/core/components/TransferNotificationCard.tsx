import React, { useState } from 'react';
import { Truck, PackageCheck, ChevronRight, Clock, MapPin, AlertCircle, Mail, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useStockTransfer } from '../services/useStockTransfer';
import { accountService } from '../services/accountService';
import { logger } from '../services/logger';
import { HREngine } from '../services/HREngine';
import { StockTransfer } from '../services/StockTransferEngine';

interface TransferNotificationCardProps {
  enterpriseId: string;
  shopId: string;
  userName: string;
}

export const TransferNotificationCard: React.FC<TransferNotificationCardProps> = ({ 
  enterpriseId, 
  shopId,
  userName 
}) => {
  const { pendingReceipt, receiveTransfer, loading } = useStockTransfer(enterpriseId, shopId);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [inboxStatus, setInboxStatus] = useState<Record<string, 'idle' | 'sending' | 'sent'>>({});

  if (loading || pendingReceipt.length === 0) return null;

  const handleQuickReceive = async (transferId: string) => {
    setProcessingId(transferId);
    try {
      // Para o recebimento rápido, assumimos que 100% dos itens chegaram.
      // O 'Ver Detalhes' permitiria editar quantidades (Divergência).
      const transfer = pendingReceipt.find(t => t.id === transferId);
      const qtys = transfer?.items.reduce((acc, i) => ({ ...acc, [i.id]: i.quantity }), {}) || {};
      const currentUser = accountService.getCurrentUser();
      if (!currentUser) throw new Error('Usuário não autenticado.');
      await receiveTransfer(transferId, currentUser.id, userName, qtys);
      logger.info('inventory', 'Recebimento rápido via card concluído', { transferId, userName });
    } catch (err) {
      alert('Falha ao processar recebimento. Verifique os logs.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSendToInbox = async (transfer: StockTransfer) => {
    setInboxStatus(prev => ({ ...prev, [transfer.id]: 'sending' }));
    try {
      const company = await accountService.getCompanyById(enterpriseId);
      if (!company?.ownerId) throw new Error('Dono não localizado');

      await HREngine.sendInternalMessage(
        enterpriseId,
        company.ownerId,
        `Guia de Remessa: ${transfer.digitalGuideId}`,
        HREngine.getDigitalGuideTemplate(transfer),
        'info'
      );
      setInboxStatus(prev => ({ ...prev, [transfer.id]: 'sent' }));
    } catch (err) {
      setInboxStatus(prev => ({ ...prev, [transfer.id]: 'idle' }));
    }
  };

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {pendingReceipt.map((transfer) => (
          <motion.div
            key={transfer.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-blue-500 transition-all group"
          >
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                <Truck className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest bg-blue-50 px-2 py-0.5 rounded">Remessa em Trânsito</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{transfer.digitalGuideId}</span>
                </div>
                <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
                  {transfer.items.length} itens chegando da Loja Central
                </h4>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">Enviado às {new Date(transfer.shippedAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">Origem: {transfer.sourceShopId.slice(-4).toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button className="flex-1 md:flex-none px-6 py-4 bg-slate-50 text-slate-500 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-100 transition-all">
                Ver Detalhes
              </button>
              <button 
                onClick={() => handleSendToInbox(transfer)}
                disabled={inboxStatus[transfer.id] === 'sending'}
                className={cn(
                  "p-4 rounded-xl border border-slate-100 transition-all flex items-center justify-center",
                  inboxStatus[transfer.id] === 'sent' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-white text-slate-400 hover:text-blue-600"
                )}
                title="Enviar Guia para Inbox do Dono"
              >
                {inboxStatus[transfer.id] === 'sent' ? <Check className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
              </button>
              <button 
                onClick={() => handleQuickReceive(transfer.id)}
                disabled={processingId === transfer.id}
                className={cn(
                  "flex-1 md:flex-none px-8 py-4 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg flex items-center gap-2 transition-all active:scale-95",
                  processingId === transfer.id ? "bg-slate-300 text-white cursor-wait" : "bg-slate-900 text-white hover:bg-black"
                )}
              >
                {processingId === transfer.id ? "Processando..." : <><PackageCheck className="w-4 h-4" /> Confirmar Recebimento</>}
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};