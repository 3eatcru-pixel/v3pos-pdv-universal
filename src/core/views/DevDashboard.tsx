import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  BarChart3, 
  MessageSquare, 
  Users, 
  Calendar, 
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronRight,
  LogOut,
  Settings,
  Lock,
  Unlock,
  ShieldAlert,
  UserPlus,
  Mail,
  Phone,
  Briefcase,
  Eye,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { accountService } from '../services/accountService';
import { formatCurrency } from '../../lib/utils';
import { BusinessMode, Company } from '../types';
import { firebaseService } from '../../services/firebaseService';

export const DevDashboard: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const messages = accountService.getSupportMessages();
  
  const refreshData = async () => {
    const all = await accountService.getAllCompanies();
    setCompanies(all);
  };

  useEffect(() => {
    refreshData();
  }, []);
  const [activeTab, setActiveTab] = useState<'companies' | 'support' | 'clients' | 'analytics' | 'infrastructure'>('companies');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ company: Company; credentials: { password: string; pin: string } } | null>(null);
  const [revealCredentials, setRevealCredentials] = useState(false);
  
  // New account form state
  const [newComp, setNewComp] = useState({
    name: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    type: 'generic' as BusinessMode,
    enabledModules: ['restaurant'] as string[]
  });

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.includes(searchTerm) ||
    c.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: 'Total de Empresas', value: companies.length, icon: Building2, color: 'text-blue-500' },
    { label: 'Donos Cadastrados', value: companies.length, icon: Users, color: 'text-emerald-500' },
    { label: 'Tickets Abertos', value: messages.filter(m => m.status === 'open').length, icon: MessageSquare, color: 'text-rose-500' },
    { label: 'Uptime Global', value: '99.9%', icon: ShieldAlert, color: 'text-indigo-500' },
  ];

  const handleLogout = () => {
    accountService.logout();
  };

  const handleToggleMaintenance = async (companyId: string, enabled: boolean) => {
    await accountService.toggleMaintenance(companyId, enabled);
    refreshData();
  };

  const handleToggleLock = async (companyId: string, moduleId: string, locked: boolean) => {
    await accountService.toggleModuleLock(companyId, moduleId, locked);
    refreshData();
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await accountService.registerCompany(
      newComp.name, 
      newComp.ownerEmail, 
      newComp.type, 
      newComp.ownerName, 
      newComp.ownerPhone,
      newComp.enabledModules
    );
    setLastCreated(result);
    setShowAddCompany(false);
    refreshData();
    setNewComp({ name: '', ownerName: '', ownerEmail: '', ownerPhone: '', type: 'generic', enabledModules: ['restaurant'] });
  };

  const handleResetDemo = async (company: Company) => {
    if (!confirm(`Deseja realmente resetar todos os dados da demo ${company.name}? Isso apagará pedidos e estoque atuais.`)) return;
    
    setResettingId(company.id);
    try {
      await accountService.resetDemoData(company.id, company.businessType);
      refreshData();
    } catch (error) {
      console.error(error);
      alert('Falha ao resetar dados.');
    } finally {
      setResettingId(null);
    }
  };

  // Fase 10: Auditoria de acesso privilegiado (Impersonation)
  const handleImpersonate = async (company: Company) => {
    const reason = prompt(`MOTIVO DO ACESSO (LGPD): Você está prestes a acessar dados sensíveis da empresa ${company.name}. Justifique o acesso técnico:`);
    
    if (!reason || reason.length < 10) {
      alert("Acesso negado: Justificativa insuficiente para auditoria.");
      return;
    }

    const dev = accountService.getCurrentUser();
    await firebaseService.saveItem('audit_logs', `access_${Date.now()}`, {
      action: 'DEV_IMPERSONATION_ACCESS',
      staffName: dev?.name || 'Unknown Dev',
      details: `Acesso à empresa ${company.id} (${company.name}). Motivo: ${reason}`,
      timestamp: Date.now()
    });

    accountService.loginAsManager(company.id);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-[#0f172a] text-white p-6 sticky top-0 z-50 border-b border-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-3 rounded-2xl shadow-lg shadow-rose-500/20 ring-1 ring-white/20">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter leading-none mb-1">Global infrastructure monitor</h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Systems Online / Real-time sync</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
                onClick={() => setShowAddCompany(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-white/10"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                Provision New Account
              </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-rose-500/20"
            >
              Terminate Session
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-10 space-y-12">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              key={stat.label}
              className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-2xl hover:shadow-slate-200/50 transition-all cursor-default"
            >
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">{stat.label}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-[#0f172a] tracking-tighter">{stat.value}</span>
                  <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
                </div>
              </div>
              <div className={`p-5 rounded-2xl bg-slate-50 ${stat.color} group-hover:bg-slate-100 transition-colors`}>
                <stat.icon className="w-7 h-7" />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20 overflow-hidden">
          <div className="flex bg-slate-50/50 p-2 border-b border-slate-100 flex-wrap">
            {[
              { id: 'companies', label: 'Nodes Monitor', icon: Building2 },
              { id: 'clients', label: 'Accounts', icon: Users },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'infrastructure', label: 'Infrastructure', icon: Settings },
              { id: 'support', label: 'Support Queue', icon: MessageSquare }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 min-w-[120px] flex items-center justify-center gap-2 py-6 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all",
                  activeTab === tab.id 
                    ? "bg-white text-[#0f172a] shadow-md shadow-slate-200/50" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
                )}
              >
                <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-blue-500" : "text-slate-300")} />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'companies' && (
            <div className="p-8 border-b border-slate-100 bg-slate-50/30">
               <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <input 
                      type="text"
                      placeholder="Search nodes by ID, Name or Email..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 font-bold outline-none"
                    />
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  </div>
                  <div className="flex items-center gap-2">
                     <button 
                       onClick={() => {
                         if(confirm("Confirm maintenance mode for ALL nodes?")) {
                           companies.forEach(c => accountService.toggleMaintenance(c.id, true));
                           refreshData();
                         }
                       }}
                       className="px-6 py-4 bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-100 transition-all"
                     >
                        Lock All Nodes
                     </button>
                     <button 
                       onClick={async () => {
                         const demoNodes = companies.filter(c => (c as any).isDemo);
                         if(confirm(`Deseja resetar ${demoNodes.length} ambientes de demonstração simultaneamente?`)) {
                           setResettingId('all-demos');
                           for(const node of demoNodes) await accountService.resetDemoData(node.id, node.businessType);
                           setResettingId(null);
                           refreshData();
                         }
                       }}
                       disabled={resettingId === 'all-demos'}
                       className="px-6 py-4 bg-blue-50 text-blue-600 border border-blue-200 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-100 transition-all flex items-center gap-2"
                     >
                        <RefreshCw className={cn("w-4 h-4", resettingId === 'all-demos' && "animate-spin")} />
                        Reset Demos
                     </button>
                  </div>
               </div>
            </div>
          )}

          <div className="p-10">
            {activeTab === 'companies' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4">Empresa / ID</th>
                      <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4">Modo / Status</th>
                      <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4">Modules</th>
                      <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4">Código acesso</th>
                      <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4 text-right">Dev Ops</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredCompanies.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-8 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-lg tracking-tight">{c.name}</span>
                            <span className="text-[10px] font-mono font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded w-fit mt-1">ID: {c.id}</span>
                          </div>
                        </td>
                        <td className="py-8 px-4">
                          <div className="flex flex-col gap-2">
                            <span className="w-fit bg-slate-900 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-white/10">
                              {c.businessType}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                c.status === 'active' ? 'bg-emerald-500' : c.status === 'maintenance' ? 'bg-amber-500' : 'bg-rose-500'
                              )} />
                              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{c.status}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-8 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(c.enabledModules || []).map(mod => (
                                <span key={mod} className="px-2 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded text-[8px] font-black uppercase">
                                  {mod}
                                </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-8 px-4">
                          <span className="font-mono font-black text-slate-400 text-lg">#{c.accessCode}</span>
                        </td>
                        <td className="py-8 px-4 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                             {(c as any).isDemo && (
                               <button 
                                 onClick={() => handleResetDemo(c)}
                                 disabled={resettingId === c.id}
                                 className={cn(
                                   "p-3 rounded-xl transition-all text-blue-500 bg-blue-50 hover:bg-blue-100 border border-blue-100",
                                   resettingId === c.id && "animate-pulse"
                                 )}
                                 title="Reset Demo Data"
                               >
                                 <RefreshCw className={cn("w-4 h-4", resettingId === c.id && "animate-spin")} />
                               </button>
                             )}
                             <button 
                                onClick={() => {
                                  const modules = ['restaurant', 'market', 'construction', 'retail', 'service'];
                                  accountService.setEnabledModules(c.id, modules);
                                  refreshData();
                                }}
                                className="p-3 bg-white text-slate-400 hover:text-blue-500 border border-slate-200 rounded-xl"
                                title="Enable All Modules"
                             >
                                <ShieldAlert className="w-4 h-4" />
                             </button>
                            <button 
                              onClick={() => handleToggleMaintenance(c.id, c.status !== 'maintenance')}
                              className={cn(
                                "p-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2",
                                c.status === 'maintenance' ? "bg-amber-100 text-amber-600 border border-amber-200" : "bg-slate-100 text-slate-600 hover:bg-amber-50 border border-slate-200"
                              )}
                            >
                              {c.status === 'maintenance' ? 'Unlock' : 'Lock'}
                            </button>
                            <button 
                            onClick={() => handleImpersonate(c)}
                              className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all tracking-widest shadow-xl shadow-blue-500/20"
                            >
                              Impersonate Owner
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'analytics' && (
               <div className="space-y-12">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                        <div className="flex items-center justify-between mb-8">
                           <h4 className="font-black uppercase tracking-widest text-[10px] text-slate-400">Merchant Growth (Last 30d)</h4>
                           <BarChart3 className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="h-64 flex items-end gap-2">
                           {[40, 70, 45, 90, 65, 80, 100].map((v, i) => (
                             <div key={i} className="flex-1 bg-blue-500 rounded-t-xl transition-all hover:bg-blue-600 cursor-help" style={{ height: `${v}%` }} title={`Day ${i+1}: ${v} users`} />
                           ))}
                        </div>
                     </div>
                     <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                        <div className="flex items-center justify-between mb-8">
                           <h4 className="font-black uppercase tracking-widest text-[10px] text-slate-400">Business Distribution</h4>
                           <Users className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="space-y-4">
                           {['restaurant', 'market', 'service'].map(type => (
                             <div key={type} className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase">
                                   <span className="text-slate-500">{type}</span>
                                   <span className="text-slate-800">33%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                   <div className="h-full bg-emerald-500" style={{ width: '33%' }} />
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {activeTab === 'infrastructure' && (
               <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="p-10 bg-slate-900 rounded-[2.5rem] text-white">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 block">Central Nexus</span>
                        <div className="text-3xl font-black mb-2">Connected</div>
                        <div className="text-[10px] font-mono text-emerald-400">Latency: 24ms / Stability: 100%</div>
                     </div>
                     <div className="p-10 bg-white border border-slate-200 rounded-[2.5rem]">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 block">P2P Network</span>
                        <div className="text-3xl font-black mb-2 text-slate-800">Active</div>
                        <div className="text-[10px] font-mono text-blue-500">Nodes: {companies.length} / Mesh: Enabled</div>
                     </div>
                     <div className="p-10 bg-white border border-slate-200 rounded-[2.5rem]">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 block">Database State</span>
                        <div className="text-3xl font-black mb-2 text-slate-800">Healthy</div>
                        <div className="text-[10px] font-mono text-emerald-500">Sync: Real-time / Backups: OK</div>
                     </div>
                  </div>

                  <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                     <h5 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-6">Global Master Keys</h5>
                     <div className="space-y-4">
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <Lock className="w-5 h-5 text-amber-500" />
                              <div>
                                 <div className="text-sm font-black text-slate-800">POS-OVERRIDE-2024</div>
                                 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Master Bypass Key</div>
                              </div>
                           </div>
                           <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Copy Hash</button>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {activeTab === 'clients' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {companies.map(c => (
                   <div key={c.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6 group hover:shadow-xl transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                           <Users className="w-7 h-7 text-emerald-500" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 uppercase tracking-tight">{c.ownerName || 'Proprietário s/ Nome'}</h4>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável por: {c.name}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-slate-600">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium">{c.ownerEmail}</span>
                        </div>
                        {c.ownerPhone && (
                          <div className="flex items-center gap-3 text-slate-600">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium">{c.ownerPhone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-slate-600">
                          <Briefcase className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium">Empresa: {c.businessType}</span>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                         <span className={cn(
                           "text-[9px] font-black uppercase px-2 py-1 rounded-lg",
                           c.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                         )}>Status Conta: {c.status}</span>
                         <button className="text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">Bloquear Usuário</button>
                      </div>
                   </div>
                 ))}
                 {companies.length === 0 && (
                   <div className="col-span-full py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">
                     Nenhum dono de empresa cadastrado
                   </div>
                 )}
              </div>
            )}

            {activeTab === 'support' && (
              <div className="space-y-6">
                {messages.map(msg => (
                  <div key={msg.id} className="p-8 bg-slate-50 rounded-[2rem] flex items-start gap-6 group hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                      <MessageSquare className="w-6 h-6 text-rose-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-slate-800 uppercase tracking-tight text-sm">Empresa ID: {msg.companyId}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 font-medium leading-relaxed">{msg.message}</p>
                      <div className="mt-6 flex items-center gap-4">
                        <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border ${msg.status === 'open' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                          {msg.status}
                        </span>
                        <button className="text-xs font-black uppercase text-blue-600 hover:underline">Responder Cliente</button>
                      </div>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">
                    Nenhum ticket de suporte aberto
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Account Generation Modal */}
      <AnimatePresence>
        {showAddCompany && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 sm:p-20">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddCompany(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden p-12"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Criar Nova Conta</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Gerar infraestrutura para novo cliente</p>
                </div>
                <button 
                  onClick={() => setShowAddCompany(false)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateAccount} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5 col-span-full">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Nome da Empresa</label>
                    <input 
                      required
                      value={newComp.name}
                      onChange={e => setNewComp({...newComp, name: e.target.value})}
                      placeholder="Ex: Mercado do João"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Nome do Dono</label>
                    <input 
                      required
                      value={newComp.ownerName}
                      onChange={e => setNewComp({...newComp, ownerName: e.target.value})}
                      placeholder="Ex: João Silva"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Telefone</label>
                    <input 
                      value={newComp.ownerPhone}
                      onChange={e => setNewComp({...newComp, ownerPhone: e.target.value})}
                      placeholder="(11) 99999-9999"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-full">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Email Principal</label>
                    <input 
                      required
                      type="email"
                      value={newComp.ownerEmail}
                      onChange={e => setNewComp({...newComp, ownerEmail: e.target.value})}
                      placeholder="joao@email.com"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-full">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Importar Template de Demonstração (Drive)</label>
                    <select 
                      onChange={(e) => {
                        if (e.target.value) {
                          setNewComp({
                            ...newComp,
                            name: `Demo ${e.target.options[e.target.selectedIndex].text}`,
                            type: e.target.value as BusinessMode
                          });
                        }
                      }}
                      className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl font-bold outline-none text-blue-600"
                    >
                      <option value="">Nenhum (Começar do zero)</option>
                      <option value="restaurant">Restaurante Gourmet (Menu + KDS)</option>
                      <option value="retail">Varejo Store (Estoque + Grade)</option>
                      <option value="market">Mercado/Distribuidora (Lotes)</option>
                      <option value="service">Services/Tattoo (Agenda)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 col-span-full">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Ativar Módulos Base</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      {['restaurant', 'market', 'construction', 'retail', 'service'].map(mod => (
                        <label key={mod} className="flex items-center gap-2 cursor-pointer group">
                           <input 
                             type="checkbox"
                             checked={newComp.enabledModules.includes(mod)}
                             onChange={(e) => {
                               const next = e.target.checked 
                                ? [...newComp.enabledModules, mod]
                                : newComp.enabledModules.filter(m => m !== mod);
                               setNewComp({ ...newComp, enabledModules: next });
                             }}
                             className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                           />
                           <span className="text-[10px] font-bold text-slate-600 uppercase group-hover:text-slate-900">{mod}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 mt-4"
                >
                  Gerar Conta e Código de Acesso
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {lastCreated && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLastCreated(null)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden p-12 text-center"
            >
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              
              <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Conta Provisionada!</h3>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-10">A infraestrutura foi gerada com sucesso</p>

              <div className="space-y-4 text-left mb-10">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Company ID</span>
                    <span className="font-mono font-black text-blue-600 text-lg">{lastCreated.company.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Access Code</span>
                    <span className="font-mono font-black text-amber-600 text-lg">#{lastCreated.company.accessCode}</span>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email</span>
                    <span className="font-bold text-slate-700">{lastCreated.company.ownerEmail}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Password</span>
                    <div className="flex items-center gap-2">
                       <span className="font-mono font-black text-slate-800 bg-white px-2 py-1 rounded border border-slate-200">
                          {revealCredentials ? lastCreated.credentials.password : '********'}
                       </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Master PIN</span>
                    <span className="font-mono font-black text-emerald-600 text-lg">{revealCredentials ? lastCreated.credentials.pin : '****'}</span>
                  </div>
                  <button 
                    onClick={() => setRevealCredentials(!revealCredentials)}
                    className="w-full py-2 text-[9px] font-black uppercase text-blue-500 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all"
                  >
                    {revealCredentials ? 'Ocultar Dados' : 'Revelar Credenciais'}
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setLastCreated(null)}
                className="w-full py-5 bg-[#0f172a] text-white rounded-3xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
              >
                Concluído
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
