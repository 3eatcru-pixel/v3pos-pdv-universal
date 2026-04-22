import React from 'react';
import { Layout, Utensils, Building2, ShieldCheck, ChevronRight, ShoppingBag, ShoppingCart, Briefcase } from 'lucide-react';
import { motion } from 'motion/react';
import { BusinessMode } from '../types';

interface ModeSelectorProps {
  onSelect: (mode: BusinessMode) => void;
  enabledModules?: string[];
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ onSelect, enabledModules }) => {
  const modes: { id: BusinessMode; title: string; desc: string; icon: any; color: string; bg: string }[] = [
    { id: 'restaurant', title: 'Restaurante / Bar', desc: 'Controle de mesas, KDS, comandas abertas e fluxo de cozinha otimizado.', icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-100' },
    { id: 'construction', title: 'Materiais de Construção', desc: 'Múltiplas unidades, orçamentos, logística de carga e gestão de fornecedores.', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-100' },
    { id: 'retail', title: 'Varejo / Eletrônicos', desc: 'Controle de variações (cor/voltagem), serial, garantia e crediário integrado.', icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-100' },
    { id: 'market', title: 'Supermercado', desc: 'Controle por setores (frios, limpeza), balança, código de barras e validade FIFO.', icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { id: 'service', title: 'Serviços Master', desc: 'Gestão de agenda, profissionais, recursos de sala/equipamentos e comissões.', icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const filteredModes = enabledModules 
    ? modes.filter(m => enabledModules.includes(m.id))
    : modes;

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-6 z-[200] overflow-y-auto">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-5xl relative z-10 py-12"
      >
        <div className="text-center mb-16">
          <motion.div 
            variants={itemVariants}
            className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/20 rotate-3"
          >
            <Layout className="w-8 h-8 text-white" />
          </motion.div>
          <motion.h1 
            variants={itemVariants}
            className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4"
          >
            Escolha seu Modelo de Negócio
          </motion.h1>
          <motion.p 
            variants={itemVariants}
            className="text-slate-400 font-medium max-w-lg mx-auto text-lg"
          >
            O sistema irá configurar automaticamente os módulos e interface ideais para sua operação.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModes.map((m) => (
            <motion.button 
              key={m.id}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(m.id)}
              className="group relative bg-white/[0.03] backdrop-blur-sm border border-white/5 rounded-[2rem] p-8 text-left transition-all hover:bg-white/[0.07] hover:border-white/10"
            >
              <div className={`w-12 h-12 ${m.bg} ${m.color} rounded-xl flex items-center justify-center mb-6 transition-all group-hover:scale-110`}>
                <m.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{m.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed mb-8 min-h-[40px]">
                {m.desc}
              </p>
              <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-white/5 w-fit px-4 py-2 rounded-full group-hover:bg-indigo-500 group-hover:text-white transition-all">
                Ativar Módulo <ChevronRight className="w-3 h-3" />
              </div>
            </motion.button>
          ))}
        </div>

        <motion.div 
          variants={itemVariants}
          className="mt-16 flex items-center justify-center gap-3 text-slate-500"
        >
          <ShieldCheck className="w-4 h-4 opacity-30" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">Core Modular Security v2.5</span>
        </motion.div>
      </motion.div>
    </div>
  );
};
