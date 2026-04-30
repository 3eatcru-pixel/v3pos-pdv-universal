import React, { useState } from 'react';
import { Inbox, CheckCheck, Trash2, X, AlertCircle, Info, MailOpen, Reply, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CommunicationEngine, InternalMessage } from '../services/CommunicationEngine'; // Usar o novo motor
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Adicionado para tipagem consistente
interface UserInboxViewProps {
  enterpriseId: string;
  userId: string;
  userName: string;
  messages: InternalMessage[];
  onClose: () => void;
}

export const UserInboxView: React.FC<UserInboxViewProps> = ({ enterpriseId, userId, userName, messages, onClose }) => {
  const [selectedMessage, setSelectedMessage] = useState<InternalMessage | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<InternalMessage[]>(messages); // Estado local para gerenciar exclusões

  const handleOpenMessage = async (msg: InternalMessage) => {
    setSelectedMessage(msg);
    setIsReplying(false);
    setReplyText('');
    if (!msg.read) {
      await CommunicationEngine.markAsRead(msg.id);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Deseja excluir esta mensagem permanentemente?')) {
      await CommunicationEngine.deleteMessage(id);
      setLocalMessages(prev => prev.filter(m => m.id !== id)); // Atualiza a lista local
      if (selectedMessage?.id === id) setSelectedMessage(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (confirm('Deseja marcar todas as suas mensagens como lidas?')) {
      await CommunicationEngine.markAllAsRead(enterpriseId, userId);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;
    setIsSending(true);
    try {
      await CommunicationEngine.sendReply(enterpriseId, selectedMessage, userId, userName, replyText);
      setIsReplying(false);
      setReplyText('');
      alert('Resposta enviada com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Falha ao enviar resposta.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[3rem] w-full max-w-5xl h-[85vh] shadow-4xl overflow-hidden flex flex-col border border-white/20"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Inbox de Notificações</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Centro de Comunicações Internas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm"
            >
              <CheckCheck className="w-4 h-4" /> Marcar tudo
            </button>
            <button onClick={onClose} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-rose-500 transition-all shadow-sm">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* List Section */}
          <div className="w-full md:w-2/5 border-r border-slate-100 overflow-y-auto custom-scrollbar bg-slate-50/30">
            <div className="p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="py-20 text-center opacity-30">
                  <MailOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma mensagem disponível</p>
                </div>
              ) : (
                localMessages.map((msg) => (
                  <div 
                    key={msg.id}
                    onClick={() => handleOpenMessage(msg)}
                    className={cn(
                      "p-5 rounded-[1.5rem] border-2 transition-all cursor-pointer relative group",
                      selectedMessage?.id === msg.id 
                        ? "bg-white border-blue-500 shadow-xl shadow-blue-500/5" 
                        : "bg-white border-transparent hover:border-slate-200 shadow-sm",
                      !msg.read && "after:absolute after:top-4 after:right-4 after:w-2 after:h-2 after:bg-blue-600 after:rounded-full after:animate-pulse"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        msg.type === 'critical' ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-500"
                      )}>
                        {msg.type === 'critical' ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className={cn("text-xs font-black uppercase truncate", msg.read ? "text-slate-500" : "text-slate-900")}>{msg.title}</h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{format(msg.timestamp, 'dd MMM • HH:mm', { locale: ptBR })}</p>
                      </div>
                      <button 
                        onClick={(e) => handleDelete(e, msg.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reading Section */}
          <div className="hidden md:block flex-1 overflow-y-auto custom-scrollbar p-12 bg-white relative">
            <AnimatePresence mode="wait">
              {selectedMessage ? (
                <motion.div 
                  key={selectedMessage.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-2xl mx-auto"
                >
                  <div className="mb-10 pb-8 border-b border-slate-50">
                    <span className={cn(
                      "text-[9px] font-black uppercase px-3 py-1 rounded-lg tracking-widest",
                      selectedMessage.type === 'critical' ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                    )}>{selectedMessage.type} notice</span>
                    <div className="flex items-center justify-between mt-4">
                       <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-tight">{selectedMessage.title}</h1>
                       <button 
                         onClick={() => setIsReplying(!isReplying)}
                         className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg hover:bg-blue-700 transition-all active:scale-90"
                         title="Responder Mensagem"
                       >
                          <Reply className="w-5 h-5" />
                       </button>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Recebido em {format(selectedMessage.timestamp, "PPPP 'às' p", { locale: ptBR })}</p>
                       {selectedMessage.senderName && (
                         <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg">De: {selectedMessage.senderName}</span>
                       )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isReplying && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-10 bg-slate-50 rounded-[2rem] p-6 border-2 border-blue-500/20"
                      >
                         <label className="block text-[10px] font-black uppercase text-blue-600 tracking-widest mb-3 ml-2">Sua Contra-nota / Resposta</label>
                         <textarea 
                           autoFocus
                           value={replyText}
                           onChange={(e) => setReplyText(e.target.value)}
                           className="w-full bg-white border-none rounded-2xl p-5 font-bold italic text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 mb-4 h-32 resize-none"
                           placeholder="Digite os detalhes da divergência ou justificativa..."
                         />
                         <div className="flex justify-end gap-3">
                            <button onClick={() => setIsReplying(false)} className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Cancelar</button>
                            <button 
                              disabled={!replyText.trim() || isSending}
                              onClick={handleSendReply}
                              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                               <Send className="w-4 h-4" /> {isSending ? 'Enviando...' : 'Enviar Resposta'}
                            </button>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Nota: O conteúdo deve ser sanitizado no backend ou via biblioteca como DOMPurify antes do render */}
                  <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed font-medium text-lg italic">
                    {typeof selectedMessage.content === 'string' ? 
                      <div dangerouslySetInnerHTML={{ __html: selectedMessage.content }} /> : 
                      selectedMessage.content}
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-6 grayscale opacity-50">
                  <MailOpen size={100} strokeWidth={1} />
                  <p className="text-xl font-black uppercase tracking-[0.3em] italic">Selecione uma mensagem para ler</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};