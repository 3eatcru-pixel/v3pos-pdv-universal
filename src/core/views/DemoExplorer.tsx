import React, { useState } from 'react';
import { 
  Download, 
  Play, 
  Info, 
  Building2, 
  Package, 
  Search, 
  Utensils, 
  ShoppingBag, 
  ShoppingCart, 
  Scissors, 
  HardHat, 
  Settings,
  RefreshCw,
  CheckCircle2,
  CloudDownload,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCollection } from '../../hooks/useCollection';
import { accountService } from '../services/accountService';
import { BackupEngine } from '../services/BackupEngine';
import { cn } from '../../lib/utils';
import { logger } from '../services/logger';
import { Users, Shield, Briefcase, PlayCircle } from 'lucide-react';

const TYPE_ICONS: Record<string, any> = {
  restaurant: Utensils,
  retail: ShoppingBag,
  market: ShoppingCart,
  service: Scissors,
  construction: HardHat,
  autoparts: Settings,
};

export const DemoExplorer: React.FC<{ onClose?: () => void }> = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [simulatingTemplate, setSimulatingTemplate] = useState<any>(null);
  const { data: templates, loading } = useCollection<any>('global_demo_templates');
  const enterpriseId = accountService.getCurrentCompanyId() || 'global';

  const handleInstall = async (template: any) => {
    if (!confirm(`Deseja carregar o template "${template.templateName}"? Isso substituirá dados locais atuais pelo Modo Treinamento.`)) {
      return;
    }

    setInstallingId(template.driveFileId);
    try {
      const success = await BackupEngine.restoreDemoFromDriveId(enterpriseId, template.driveFileId);
      if (success) {
        alert('Modo Treinamento ativado! O sistema será reiniciado com os novos dados.');
        window.location.reload();
      } else {
        alert('Falha ao baixar pacote. Verifique sua conexão.');
      }
    } catch (error) {
      logger.error('system', 'Erro na instalação de demo', { error });
    } finally {
      setInstallingId(null);
    }
  };

  const handleSimulate = async (template: any, role: 'owner' | 'manager' | 'staff') => {
    setInstallingId(template.driveFileId);
    // Primeiro instala o ambiente mocado se necessário
    await BackupEngine.restoreDemoFromDriveId(enterpriseId, template.driveFileId);
    
    // Segundo, realiza o login no cargo específico (Simulação de Posição)
    const success = await accountService.simulateRoleAccess(template.id || 'demo-shop', role);
    if (success) window.location.reload();
  };

  const filtered = templates.filter(t => 
    t.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.businessType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
             <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20">
                   <CloudDownload className="w-6 h-6" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Discovery Hub</h1>
             </div>
             <p className="text-slate-500 font-medium italic max-w-xl">
                Explore ecossistemas prontos para treinamento. Baixe pacotes de demonstração com cardápios, estoque e staff configurados por especialistas.
             </p>
          </div>
          
          <div className="relative w-full md:w-96">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar nichos ou pacotes..."
              className="w-full bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-14 pr-6 font-bold shadow-sm outline-none transition-all italic"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-32 text-center space-y-4 opacity-40">
             <RefreshCw className="w-10 h-10 animate-spin mx-auto text-slate-400" />
             <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando loja de pacotes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filtered.map((template, i) => {
                const Icon = TYPE_ICONS[template.businessType] || Package;
                const isInstalling = installingId === template.driveFileId;

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={template.driveFileId}
                    className="group bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-2xl hover:border-blue-500 transition-all flex flex-col h-full"
                  >
                    <div className="flex items-start justify-between mb-8">
                      <div className="p-5 bg-slate-50 rounded-3xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <Icon className="w-8 h-8" />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Drive Cloud Package</span>
                    </div>

                    <div className="flex-1 space-y-3">
                      <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic leading-tight">{template.templateName}</h3>
                      <div className="flex items-center gap-2">
                         <span className="px-2.5 py-1 bg-slate-900 text-white text-[8px] font-black uppercase rounded-full">{template.businessType}</span>
                         <span className="text-[10px] font-bold text-slate-400 italic">v2.4.0</span>
                      </div>
                      <p className="text-sm text-slate-500 font-medium italic leading-relaxed pt-2">
                        {template.description || 'Configuração padrão Nexus com suporte a múltiplos terminais e gestão de estoque avançada.'}
                      </p>
                    </div>

                    <div className="mt-10 pt-8 border-t border-slate-50 space-y-4">
                       <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 tracking-widest">
                          <span>Status: Pronto</span>
                          <span>Snapshot: {new Date(template.lastUpdated).toLocaleDateString()}</span>
                       </div>
                       
                       <div className="flex gap-2">
                         <button
                           disabled={isInstalling}
                           onClick={() => setSimulatingTemplate(template)}
                           className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                         >
                           <PlayCircle className="w-4 h-4" /> Simular Cargo
                         </button>
                         <button
                           disabled={isInstalling}
                           onClick={() => handleInstall(template)}
                           className={cn(
                             "p-4 rounded-xl transition-all active:scale-95",
                             isInstalling 
                             ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                             : "bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-500/20"
                         )}
                       >
                           {isInstalling ? (
                           <>
                             <RefreshCw className="w-4 h-4 animate-spin" />
                             Instalando...
                           </>
                         ) : (
                           <>
                             <Download className="w-4 h-4" />
                           </>
                         )}
                         </button>
                       </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Role Selector Modal */}
      <AnimatePresence>
        {simulatingTemplate && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-xl rounded-[3rem] p-12 overflow-hidden shadow-4xl relative">
              <div className="text-center mb-10">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Simular Posição</h3>
                <p className="text-sm text-slate-400 font-medium italic mt-2">Como você deseja experimentar o ecossistema {simulatingTemplate.templateName}?</p>
              </div>

              <div className="space-y-4">
                {[
                  { role: 'owner', label: 'Dono do Negócio', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-50', desc: 'Visão completa estratégica, DRE e configurações de rede.' },
                  { role: 'manager', label: 'Gerente Operacional', icon: Briefcase, color: 'text-emerald-500', bg: 'bg-emerald-50', desc: 'Gestão de equipe, fechamento de caixa e controle de estoque.' },
                  { role: 'staff', label: 'Colaborador (Staff)', icon: Users, color: 'text-amber-500', bg: 'bg-amber-50', desc: 'Foco total em PDV, KDS, mesas e execução de tarefas.' },
                ].map((pos) => (
                  <button 
                    key={pos.role}
                    onClick={() => handleSimulate(simulatingTemplate, pos.role as any)}
                    className="w-full p-6 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-blue-500 transition-all text-left flex items-start gap-6 group"
                  >
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110", pos.bg, pos.color)}>
                      <pos.icon className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black uppercase italic text-slate-800 tracking-tight leading-none mb-1">{pos.label}</h4>
                      <p className="text-[10px] font-medium text-slate-500 italic leading-relaxed">{pos.desc}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setSimulatingTemplate(null)}
                className="w-full mt-8 py-5 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors"
              >
                Voltar para Galeria
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
