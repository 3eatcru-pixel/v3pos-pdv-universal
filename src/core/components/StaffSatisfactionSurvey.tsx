import React, { useState } from 'react';
import { Smile, Frown, Meh, Star, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HREngine } from '../services/HREngine';
import { cn } from '../../lib/utils';
import { logger } from '../services/logger';

interface StaffSatisfactionSurveyProps {
  enterpriseId: string;
  shopId: string;
  staffId: string;
  staffName: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

/**
 * StaffSatisfactionSurvey - Componente para capturar feedback de satisfação do colaborador.
 * Pode ser exibido ao final do turno ou do processo EOD.
 */
export const StaffSatisfactionSurvey: React.FC<StaffSatisfactionSurveyProps> = ({
  enterpriseId,
  shopId,
  staffId,
  staffName,
  onClose,
  onSubmitted
}) => {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === null) {
      alert('Por favor, selecione uma avaliação.');
      return;
    }

    setIsSubmitting(true);
    try {
      await HREngine.recordStaffSurvey({
        enterpriseId,
        shopId,
        staffId,
        staffName,
        rating,
        comment
      });
      logger.info('hr', 'Pesquisa de satisfação enviada', { staffId, rating });
      onSubmitted?.();
      onClose();
    } catch (error) {
      logger.error('hr', 'Falha ao enviar pesquisa de satisfação', { error });
      alert('Erro ao enviar feedback. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingIcon = (r: number) => {
    if (r <= 2) return <Frown className="w-8 h-8" />;
    if (r === 3) return <Meh className="w-8 h-8" />;
    return <Smile className="w-8 h-8" />;
  };

  return (
    <div className="fixed inset-0 z-[800] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-xl bg-white rounded-[3rem] shadow-4xl overflow-hidden flex flex-col border border-white/20"
      >
        {/* Header */}
        <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <Smile className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Seu Feedback</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Ajude-nos a melhorar seu dia a dia</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-500 transition-all active:scale-90">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar">
          <div className="text-center space-y-4">
            <p className="text-sm font-bold text-slate-700">Como você avalia seu turno hoje, {staffName}?</p>
            <div className="flex justify-center gap-4">
              {[1, 2, 3, 4, 5].map(r => (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center text-slate-400 transition-all duration-300",
                    rating === r ? "bg-blue-600 text-white shadow-lg scale-110" : "bg-slate-100 hover:bg-slate-200"
                  )}
                >
                  {getRatingIcon(r)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Comentários (Opcional)</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="O que podemos melhorar? O que funcionou bem?"
              rows={4}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl p-5 font-bold italic outline-none transition-all resize-none"
            />
          </div>
        </div>

        <div className="p-10 bg-slate-50/50 border-t border-slate-100">
          <button
            onClick={handleSubmit}
            disabled={rating === null || isSubmitting}
            className="w-full py-6 bg-slate-900 text-white rounded-[1.8rem] font-black uppercase text-[11px] tracking-widest hover:bg-black transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <Send className="w-5 h-5" /> {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};