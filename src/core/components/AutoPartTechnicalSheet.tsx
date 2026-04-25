import React from 'react';
import { 
  Ruler, 
  Settings, 
  Car, 
  FileText, 
  X,
  ExternalLink,
  Layers,
  ArrowRightLeft,
  Maximize2
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils'; // Assuming this is correct
import { AutoPart } from '../services/AutoPartsCatalogEngine'; // Corrected path

interface AutoPartTechnicalSheetProps {
  part: AutoPart;
  onClose: () => void;
  onAddToCart?: (part: AutoPart) => void;
}

/**
 * Ficha Técnica de Peça - Interface Técnica para o módulo de Autopeças.
 * Exibe desenhos técnicos, medidas e compatibilidade detalhada.
 */
export const AutoPartTechnicalSheet: React.FC<AutoPartTechnicalSheetProps> = ({ 
  part, 
  onClose,
  onAddToCart 
}) => {
  // Extração de metadados técnicos
  const drawingUrl = part.technicalDetails?.drawingUrl || part.technicalDetails?.imageUrl;
  
  // Filtra chaves que não são URLs para exibir como especificações
  const specifications = Object.entries(part.technicalDetails || {})
    .filter(([key]) => !['drawingUrl', 'imageUrl', 'catalogUrl'].includes(key));

  const formatKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        className="w-full max-w-6xl bg-white rounded-[4rem] shadow-4xl overflow-hidden flex flex-col md:flex-row h-[90vh] border border-white/20"
      >
        {/* Coluna Esquerda: Galeria/Desenho Técnico */}
        <div className="w-full md:w-1/2 bg-slate-50 p-12 flex flex-col relative border-r border-slate-100">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
               <span className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] bg-blue-50 px-3 py-1 rounded-full">Engineering View</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Diagrama Técnico</h3>
          </div>

          <div className="flex-1 rounded-[3rem] bg-white border-2 border-slate-100 shadow-inner overflow-hidden relative group">
            {drawingUrl ? (
              <img 
                src={drawingUrl} 
                alt={`Esquema técnico ${part.name}`} 
                className="w-full h-full object-contain p-8 mix-blend-multiply transition-transform duration-700 group-hover:scale-110" 
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-4">
                <Layers size={100} strokeWidth={1} />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Imagem não disponível</p>
              </div>
            )}
            <button className="absolute bottom-6 right-6 p-4 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl text-slate-900 opacity-0 group-hover:opacity-100 transition-all">
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mt-8 p-6 bg-slate-900 rounded-3xl text-white flex items-center justify-between">
             <div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Código de Engenharia</p>
                <p className="text-lg font-black italic tracking-tighter">{part.manufacturerCode}</p>
             </div>
             <div className="text-right">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Garantia Técnica</p>
                <p className="text-lg font-black italic tracking-tighter text-blue-400">12 MESES</p>
             </div>
          </div>
        </div>

        {/* Coluna Direita: Dados e Especificações */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Header Interno */}
          <div className="p-12 pb-8 flex items-start justify-between">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{part.name}</h2>
              <p className="text-sm font-bold text-slate-400 mt-4 uppercase tracking-[0.2em]">{part.brand} Part No. {part.id}</p>
            </div>
            <button onClick={onClose} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:text-rose-500 transition-all active:scale-90">
              <X className="w-8 h-8" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-12 pb-12 space-y-12">
            {/* Medidas e Specs */}
            <section>
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-6 border-b border-slate-50 pb-4 flex items-center gap-3">
                <Ruler className="w-4 h-4 text-blue-500" /> Especificações Dimensionais
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {specifications.map(([key, value]) => (
                  <div key={key} className="p-5 bg-slate-50 rounded-[1.5rem] border border-transparent hover:border-blue-500/20 hover:bg-blue-50/30 transition-all flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{formatKey(key)}</span>
                    <span className="text-base font-black text-slate-800 italic">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Compatibilidade */}
            <section>
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-6 border-b border-slate-50 pb-4 flex items-center gap-3">
                <Car className="w-4 h-4 text-emerald-500" /> Guia de Aplicação
              </h4>
              <div className="space-y-3">
                {part.compatibility.map((comp, idx) => (
                  <div key={idx} className="p-5 bg-white border-2 border-slate-50 rounded-[2rem] flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                          <Car className="w-6 h-6 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                       </div>
                       <div>
                          <h5 className="font-black text-slate-800 uppercase italic tracking-tight">{comp.make} {comp.model}</h5>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{comp.engine} • {comp.yearStart} {comp.yearEnd ? `- ${comp.yearEnd}` : '++'}</p>
                       </div>
                    </div>
                    <ArrowRightLeft className="w-5 h-5 text-slate-100 group-hover:text-emerald-200 transition-colors" />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Footer Actions */}
          <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex gap-4">
            <button className="flex-1 py-6 bg-white border-2 border-slate-200 text-slate-600 rounded-[2rem] font-black uppercase text-[11px] tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3">
               <ExternalLink className="w-4 h-4" /> Catálogo Online
            </button>
            <button 
              onClick={() => onAddToCart?.(part)}
              className="flex-[2] py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/20 active:scale-[0.98]"
            >
               Confirmar Aplicação e Venda
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};