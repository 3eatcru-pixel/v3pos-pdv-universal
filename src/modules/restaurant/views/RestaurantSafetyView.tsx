import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  CheckCircle2, 
  Thermometer, 
  HardHat, 
  Waves, 
  Droplets, 
  Flame, 
  Clock, 
  LogOut, 
  FileText, 
  AlertTriangle, 
  Plus, 
  Wrench, 
  Zap, 
  Shield, 
  ClipboardList,
  Users,
  UtensilsCrossed,
  X,
  Smartphone,
  Smartphone as SmartphoneIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../../lib/utils';
import { useCollection } from '../../../hooks/useCollection';
import { accountService } from '../../../core/services/accountService';
import { firebaseService } from '../../../services/firebaseService';
import { IncidentReport, IncidentType } from '../../../types';

const INITIAL_SAFETY_TEMPLATE = [
  { id: 'temp_refrig', category: 'boh', section: 'Segurança Alimentar', label: 'Temperatura das Geladeiras', description: 'Verificar se todas as geladeiras estão abaixo de 5°C', enabled: true },
  { id: 'temp_congel', category: 'boh', section: 'Segurança Alimentar', label: 'Temperatura dos Congeladores', description: 'Verificar se estão abaixo de -18°C', enabled: true },
  { id: 'epi_check', category: 'boh', section: 'Segurança do Trabalho', label: 'Uso de EPIs', description: 'Luvas de malha, aventais térmicos e calçados antiderrapantes', enabled: true },
  { id: 'cleaning_grease', category: 'boh', section: 'Limpeza & Resíduos', label: 'Limpeza da Caixa de Gordura', description: 'Verificar nível e agendar limpeza se necessário', enabled: true },
  { id: 'higiene_banheiros', category: 'foh', section: 'Higiene', label: 'Checklist Banheiros', description: 'Reposição de papel, sabonete e limpeza geral a cada 2h', enabled: true },
  { id: 'extintores', category: 'foh', section: 'Segurança', label: 'Validade Extintores', description: 'Verificar manômetros e lacres', enabled: true },
  { id: 'abertura_gas', category: 'checklists', section: 'Abertura', label: 'Válvulas de Gás', description: 'Abrir registros e verificar cheiros', enabled: true },
  { id: 'fechamento_luz', category: 'checklists', section: 'Fechamento', label: 'Desligar Equipamentos', description: 'Verificar fritadeiras, chapas e luzes desnecessárias', enabled: true },
];

export const RestaurantSafetyView: React.FC = () => {
  const [activeSafetyTab, setActiveSafetyTab] = useState<'boh' | 'foh' | 'checklists' | 'incidents' | 'pops' | 'config'>('boh');
  const [safetySelectedDate, setSafetySelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [safetyLogs, setSafetyLogs] = useState<Record<string, Record<string, boolean>>>({});
  const [safetyTemplate, setSafetyTemplate] = useState(INITIAL_SAFETY_TEMPLATE);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [newIncident, setNewIncident] = useState<Partial<IncidentReport>>({});

  const currentUser = accountService.getCurrentUser();
  const { data: incidentReports, loading: loadingIncidents } = useCollection<IncidentReport>('incidentReports');

  const isManagerOrOwner = currentUser?.role === 'owner' || currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const dayLogs = safetyLogs[safetySelectedDate] || {};

  const toggleCheck = (id: string) => {
    setSafetyLogs(prev => ({
      ...prev,
      [safetySelectedDate]: {
        ...(prev[safetySelectedDate] || {}),
        [id]: !(prev[safetySelectedDate]?.[id])
      }
    }));
  };

  const toggleTemplateItem = (id: string) => {
    setSafetyTemplate(prev => prev.map(item => 
      item.id === id ? { ...item, enabled: !item.enabled } : item
    ));
  };

  const handleCreateIncident = async () => {
    if (!newIncident.title || !newIncident.description) return;
    
    const report: IncidentReport = {
      id: 'inc-' + Date.now(),
      shopId: (accountService.getSelectedShopId() || 'shop-1'),
      type: (newIncident.type as IncidentType) || 'error',
      title: newIncident.title,
      description: newIncident.description,
      reporterId: currentUser?.id || 'guest',
      reporterName: currentUser?.name || 'Sistema',
      status: 'open',
      priority: newIncident.priority || 'medium',
      timestamp: Date.now(),
      location: newIncident.location,
      enterpriseId: accountService.getCurrentCompanyId()!
    } as any;

    await firebaseService.saveItem('incidentReports', report.id, report);
    setIsIncidentModalOpen(false);
    setNewIncident({ type: 'error', priority: 'medium', status: 'open' });
  };

  const renderCheckItem = (item: typeof safetyTemplate[0]) => {
    if (!item.enabled && activeSafetyTab !== 'config') return null;

    return (
      <div 
        key={item.id}
        onClick={() => activeSafetyTab === 'config' ? toggleTemplateItem(item.id) : toggleCheck(item.id)}
        className={cn(
          "flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer",
          activeSafetyTab === 'config' 
            ? (item.enabled ? "bg-white border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm" : "bg-slate-50 border-slate-200 opacity-50 grayscale")
            : (dayLogs[item.id] ? "bg-emerald-50 border-emerald-100 shadow-sm" : "bg-white border-slate-100 hover:border-slate-200")
        )}
      >
        {activeSafetyTab === 'config' ? (
          <div className={cn(
            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all mt-0.5 shrink-0",
            item.enabled ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 text-slate-200"
          )}>
            <Settings className="w-4 h-4" />
          </div>
        ) : (
          <div className={cn(
            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all mt-0.5 shrink-0",
            dayLogs[item.id] ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 text-transparent"
          )}>
            <CheckCircle2 className="w-4 h-4" />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className={cn("text-sm font-bold", 
              activeSafetyTab === 'config' ? (item.enabled ? "text-slate-800" : "text-slate-400") :
              (dayLogs[item.id] ? "text-emerald-900" : "text-slate-800")
            )}>{item.label}</p>
            {activeSafetyTab === 'config' && (
              <span className={cn("text-[8px] font-black uppercase px-2 py-1 rounded", 
                item.enabled ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400"
              )}>
                {item.enabled ? 'Ativo' : 'Inativo'}
              </span>
            )}
          </div>
          {item.description && <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-medium">{item.description}</p>}
        </div>
      </div>
    );
  };

  const renderSection = (category: string, sectionName: string, icon: any, bgColor: string, textColor: string) => {
    const items = safetyTemplate.filter(i => i.category === category && i.section === sectionName);
    if (items.length === 0 || (activeSafetyTab !== 'config' && items.every(i => !i.enabled))) return null;

    return (
      <div key={sectionName} className="sleek-card p-6 border-slate-100">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", bgColor, textColor)}>
          {icon}
        </div>
        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">{sectionName}</h3>
        <div className="space-y-4">
          {items.map(renderCheckItem)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-32">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
             <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Saúde e Segurança</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight">Conformidade sanitária e segurança operacional</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           {activeSafetyTab !== 'config' && (
             <div className="flex items-center sleek-card px-4 py-2.5 bg-white border-slate-100 gap-4 shadow-sm">
                <button onClick={() => setSafetySelectedDate(format(addDays(parseISO(safetySelectedDate), -1), 'yyyy-MM-dd'))} className="p-1 text-slate-400 hover:text-emerald-500 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex flex-col items-center min-w-[100px]">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Relatório de</span>
                  <span className="text-xs font-bold text-slate-800">{isSameDay(parseISO(safetySelectedDate), new Date()) ? 'Hoje' : format(parseISO(safetySelectedDate), "dd 'de' MMM", { locale: ptBR })}</span>
                </div>
                <button onClick={() => setSafetySelectedDate(format(addDays(parseISO(safetySelectedDate), 1), 'yyyy-MM-dd'))} className="p-1 text-slate-400 hover:text-emerald-500 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
             </div>
           )}

           <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar">
              {[
                { id: 'boh', label: 'Cozinha', icon: <UtensilsCrossed className="w-4 h-4" /> },
                { id: 'foh', label: 'Salão', icon: <Users className="w-4 h-4" /> },
                { id: 'checklists', label: 'Daily', icon: <ClipboardList className="w-4 h-4" /> },
                { id: 'incidents', label: 'Reportes', icon: <AlertTriangle className="w-4 h-4" /> },
                { id: 'pops', label: 'Normas', icon: <FileText className="w-4 h-4" /> },
                ...(isManagerOrOwner ? [{ id: 'config', label: 'Config', icon: <Settings className="w-4 h-4" /> }] : []),
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSafetyTab(tab.id as any)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap",
                    activeSafetyTab === tab.id ? "bg-white text-slate-900 shadow-xl" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
           </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSafetyTab + safetySelectedDate}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="grid grid-cols-1 gap-8"
        >
          {activeSafetyTab === 'config' && (
            <div className="space-y-8">
               <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0">
                     <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                     <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest">Modo de Configuração do Template</h4>
                     <p className="text-xs text-amber-700 font-medium mt-1">Habilite ou desabilite os itens que fazem sentido para a operação do seu restaurante. Itens desabilitados não aparecerão nos checklists diários da equipe.</p>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {['boh', 'foh', 'checklists'].map(cat => (
                    <div key={cat} className="space-y-4">
                       <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-2">{cat.toUpperCase()}</h3>
                       <div className="space-y-3">
                          {safetyTemplate.filter(i => i.category === cat).map(renderCheckItem)}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeSafetyTab === 'boh' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderSection('boh', 'Segurança Alimentar', <Thermometer className="w-5 h-5" />, 'bg-amber-100', 'text-amber-600')}
              {renderSection('boh', 'Segurança do Trabalho', <HardHat className="w-5 h-5" />, 'bg-blue-100', 'text-blue-600')}
              {renderSection('boh', 'Limpeza & Resíduos', <Waves className="w-5 h-5" />, 'bg-emerald-100', 'text-emerald-600')}
            </div>
          )}

          {activeSafetyTab === 'foh' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderSection('foh', 'Higiene', <Droplets className="w-5 h-5" />, 'bg-indigo-100', 'text-indigo-600')}
                {renderSection('foh', 'Segurança', <Flame className="w-5 h-5" />, 'bg-rose-100', 'text-rose-600')}
              </div>
            </div>
          )}

          {activeSafetyTab === 'checklists' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-6">
                  <div className="flex items-center gap-3 px-2">
                     <Clock className="w-5 h-5 text-emerald-500" />
                     <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">Abertura</h3>
                  </div>
                  <div className="space-y-3">
                    {safetyTemplate.filter(i => i.category === 'checklists' && i.section === 'Abertura').map(renderCheckItem)}
                  </div>
               </div>
               <div className="space-y-6">
                  <div className="flex items-center gap-3 px-2">
                     <LogOut className="w-5 h-5 text-indigo-500" />
                     <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">Fechamento</h3>
                  </div>
                  <div className="space-y-3">
                    {safetyTemplate.filter(i => i.category === 'checklists' && i.section === 'Fechamento').map(renderCheckItem)}
                  </div>
               </div>
            </div>
          )}

          {activeSafetyTab === 'pops' && (
            <div className="sleek-card border-slate-100 overflow-hidden">
              <div className="p-8 bg-slate-900 text-white">
                  <h3 className="text-lg font-black uppercase tracking-[0.2em]">POPs Obrigatórios (ANVISA)</h3>
                  <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest max-w-2xl">Procedimentos Operacionais Padronizados necessários para conformidade com a RDC 216/2004.</p>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                  {[
                    'Higienização de instalações, equipamentos e móveis',
                    'Controle de potabilidade da água',
                    'Higiene e saúde dos manipuladores',
                    'Manejo de resíduos',
                    'Limpeza do reservatório de água',
                    'Controle integrado de pragas',
                    'Manutenção preventiva e calibração de equipamentos',
                    'Seleção de fornecedores'
                  ].map((pop, idx) => (
                    <div key={idx} className="flex items-start gap-4 py-6 border-b border-slate-50 last:border-0 group cursor-default">
                       <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-sm font-black text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0">
                         {idx + 1}
                       </div>
                       <div>
                         <p className="text-sm font-bold text-slate-700 tracking-tight">{pop}</p>
                         <p className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-widest font-black group-hover:text-emerald-500 transition-colors">Norma RDC 216/2004</p>
                       </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeSafetyTab === 'incidents' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest leading-none">Central de Incidentes</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">Gestão de riscos, quebras e ocorrências</p>
                </div>
                <button 
                  onClick={() => setIsIncidentModalOpen(true)}
                  className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Reportar Novo
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Erros', type: 'error', color: 'bg-rose-50 text-rose-600', icon: <AlertTriangle className="w-4 h-4" /> },
                  { label: 'Quebras', type: 'broken', color: 'bg-amber-50 text-amber-600', icon: <Wrench className="w-4 h-4" /> },
                  { label: 'Riscos', type: 'risk', color: 'bg-orange-50 text-orange-600', icon: <Zap className="w-4 h-4" /> },
                  { label: 'Ações', type: 'action', color: 'bg-blue-50 text-blue-600', icon: <Shield className="w-4 h-4" /> },
                ].map(stat => (
                  <div key={stat.type} className={cn("p-4 rounded-2xl flex items-center justify-between shadow-sm", stat.color)}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/50">{stat.icon}</div>
                      <span className="text-[10px] font-black uppercase tracking-widest">{stat.label}</span>
                    </div>
                    <span className="text-xl font-black">{incidentReports.filter(r => r.type === stat.type && r.status === 'open').length}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {incidentReports.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <ClipboardList className="w-8 h-8" />
                    </div>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhuma ocorrência registrada</p>
                  </div>
                ) : (
                  incidentReports.map(report => (
                    <div key={report.id} className="sleek-card p-5 border-slate-100 flex items-start justify-between group">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                          report.type === 'error' ? "bg-rose-100 text-rose-500" :
                          report.type === 'broken' ? "bg-amber-100 text-amber-500" :
                          report.type === 'risk' ? "bg-orange-100 text-orange-500" :
                          "bg-blue-100 text-blue-500"
                        )}>
                          {report.type === 'error' && <AlertTriangle className="w-6 h-6" />}
                          {report.type === 'broken' && <Wrench className="w-6 h-6" />}
                          {report.type === 'risk' && <Zap className="w-6 h-6" />}
                          {report.type === 'action' && <Shield className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                              report.priority === 'high' || report.priority === 'critical' ? "bg-red-500 text-white" : "bg-slate-200 text-slate-500"
                            )}>{report.priority}</span>
                            <h4 className="font-bold text-slate-800 tracking-tight">{report.title}</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-xl">{report.description}</p>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1.5 focus-mode-element">
                              <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400">
                                {report.reporterName[0]}
                              </div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{report.reporterName}</span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">•</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{format(report.timestamp, 'HH:mm - dd/MM')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {isIncidentModalOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Reportar Incidente</h2>
                 <button onClick={() => setIsIncidentModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                   <X className="w-6 h-6" />
                 </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                   <div>
                     <span className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Tipo</span>
                     <div className="grid grid-cols-1 gap-2">
                       {[
                         { id: 'error', label: 'Erro', icon: <AlertTriangle className="w-4 h-4" /> },
                         { id: 'broken', label: 'Quebra', icon: <Wrench className="w-4 h-4" /> },
                         { id: 'risk', label: 'Risco', icon: <Zap className="w-4 h-4" /> },
                         { id: 'action', label: 'Ação', icon: <Shield className="w-4 h-4" /> },
                       ].map(type => (
                         <button
                           key={type.id}
                           type="button"
                           onClick={() => setNewIncident({...newIncident, type: type.id as any})}
                           className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-xs font-bold",
                            newIncident.type === type.id ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm" : "border-slate-100 text-slate-400"
                           )}
                         >
                           {type.icon}
                           {type.label}
                         </button>
                       ))}
                     </div>
                   </div>
                   <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Prioridade</label>
                      <div className="grid grid-cols-1 gap-2">
                       {['low', 'medium', 'high', 'critical'].map(p => (
                         <button
                           key={p}
                           type="button"
                           onClick={() => setNewIncident({...newIncident, priority: p as any})}
                           className={cn(
                            "p-3 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-widest",
                            newIncident.priority === p ? "border-slate-800 bg-slate-800 text-white shadow-lg shadow-slate-900/20" : "border-slate-100 text-slate-400"
                           )}
                         >
                           {p}
                         </button>
                       ))}
                     </div>
                   </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Título da Ocorrência</label>
                  <input 
                    type="text" 
                    value={newIncident.title || ''}
                    onChange={e => setNewIncident({...newIncident, title: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl p-4 font-bold text-slate-800 outline-none transition-all"
                    placeholder="Ex: Forno parou de aquecer"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Descrição Detalhada</label>
                  <textarea 
                    value={newIncident.description || ''}
                    onChange={e => setNewIncident({...newIncident, description: e.target.value})}
                    rows={3}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl p-4 font-bold text-slate-800 text-sm outline-none transition-all"
                    placeholder="Descreva o que aconteceu..."
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Local / Setor</label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={newIncident.location || ''}
                      onChange={e => setNewIncident({...newIncident, location: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl p-4 pr-12 font-bold text-slate-800 outline-none transition-all"
                      placeholder="Ex: Cozinha Quente, Mesa 12"
                    />
                    <button 
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition((pos) => {
                            setNewIncident({...newIncident, location: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`});
                          }, (err) => alert("Erro ao obter localização: " + err.message));
                        }
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-emerald-500 transition-colors"
                    >
                      <SmartphoneIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleCreateIncident}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]"
                >
                  Registrar Ocorrência
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
