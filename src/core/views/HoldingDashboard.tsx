import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  Settings, 
  ChevronRight, 
  Activity, 
  ShieldCheck, 
  Zap,
  LayoutDashboard,
  LogOut,
  Plus,
  AlertCircle,
  MapPin,
  Users,
  Wallet,
  TrendingUp,
  Package,
  Layers,
  ShoppingBag,
  UtensilsCrossed,
  Hammer,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { accountService } from '../services/accountService';
import { Enterprise, Shop } from '../../types';
import { formatCurrency } from '../../lib/utils';
// Data fetching refactored to Firebase

interface HoldingDashboardProps {
  onSelectEnterprise: (enterpriseId: string) => void;
  onLogout: () => void;
}

export const HoldingDashboard: React.FC<HoldingDashboardProps> = ({ onSelectEnterprise, onLogout }) => {
  const user = accountService.getCurrentUser();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [shopsMap, setShopsMap] = useState<Record<string, Shop[]>>({});
  const [metricsMap, setMetricsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const allEnts = await accountService.getAllCompanies();
        setEnterprises(allEnts);

        const sMap: Record<string, Shop[]> = {};
        const mMap: Record<string, any> = {};

        for (const ent of allEnts) {
          const shops = await accountService.getShopsByCompany(ent.id);
          const metrics = await accountService.getCompanyMetrics(ent.id);
          sMap[ent.id] = shops;
          mMap[ent.id] = metrics;
        }

        setShopsMap(sMap);
        setMetricsMap(mMap);
      } catch (error) {
        console.error("Erro ao carregar dados da Holding:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadAllData();
  }, []);

  // Filter companies where the user is an owner/manager
  const myEnterprises = useMemo(() => {
    if (!user) return [];
    if (user.role === 'dev') return enterprises;
    return enterprises.filter(e => 
      e.ownerEmail.toLowerCase() === user.email?.toLowerCase() || 
      (e.owners || []).includes(user.id)
    );
  }, [enterprises, user]);

  // Aggregate metrics for summary
  const summary = useMemo(() => {
    let totalRevenue = 0;
    let totalShops = 0;
    let totalStaff = 0; 
    
    myEnterprises.forEach(ent => {
      const metrics = metricsMap[ent.id] || { dailyRevenue: 0, staffCount: 0 };
      totalRevenue += metrics.dailyRevenue;
      totalShops += (shopsMap[ent.id] || []).length;
      totalStaff += metrics.staffCount || 0;
    });

    return { totalRevenue, totalShops, totalStaff, enterpriseCount: myEnterprises.length };
  }, [myEnterprises, metricsMap, shopsMap]);

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!user) return null;

  const getModuleIcon = (mod: string) => {
    switch (mod) {
      case 'restaurant': return <UtensilsCrossed className="w-3 h-3" />;
      case 'retail': return <ShoppingBag className="w-3 h-3" />;
      case 'service': return <Hammer className="w-3 h-3" />;
      case 'hr_core': return <Briefcase className="w-3 h-3" />; // Ícone para o módulo de RH
      case 'store_mgmt_core': return <LayoutDashboard className="w-3 h-3" />; // Ícone para Gestão de Loja
      case 'settings_custom_core': return <Settings className="w-3 h-3" />; // Ícone para Configurações
      default: return <Package className="w-3 h-3" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-rose-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-600 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <nav className="relative z-10 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl p-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20 ring-1 ring-white/20">
               <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter leading-none mb-1">Owner Nexus</h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Security: Hardened / Cloud Sync: Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-black text-white">{user.name}</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{user.role} Account</span>
             </div>
             <button 
               onClick={onLogout}
               className="p-4 hover:bg-white/5 rounded-2xl transition-all group"
             >
                <LogOut className="w-6 h-6 text-slate-500 group-hover:text-rose-500" />
             </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto p-10 md:p-20">
         {/* Welcome & Owner Profile Section */}
         <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="flex-1">
               <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-white mb-6">
                  Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">{user.name.split(' ')[0]}</span>.
               </h2>
               <p className="text-lg md:text-2xl text-slate-400 font-medium max-w-2xl leading-relaxed">
                  Bem-vindo ao seu centro de comando global. Gerencie suas unidades e acompanhe a saúde da sua infraestrutura em tempo real.
               </p>
            </div>
            
            {/* Quick Profile Stats */}
            <div className="flex gap-4">
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 min-w-[200px]">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-4">Módulos Ativos</span>
                 <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-blue-400" />
                    <span className="text-3xl font-black tracking-tighter">04</span>
                 </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 min-w-[200px]">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-4">Total Staff</span>
                 <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <span className="text-3xl font-black tracking-tighter">{summary.totalStaff}</span>
                 </div>
              </div>
            </div>
         </div>

         {/* Executive Summary Cards */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-20">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-blue-600 rounded-[2.5rem] shadow-xl shadow-blue-500/20">
               <div className="flex items-center justify-between mb-8 text-blue-100">
                  <Wallet className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">Faturamento Hoje</span>
               </div>
               <h4 className="text-4xl font-black tracking-tighter mb-1 leading-none">{formatCurrency(summary.totalRevenue, summary.totalRevenue >= 10000)}</h4>
               <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">+12.5% em relação a ontem</p>
            </motion.div>

            <div className="p-8 bg-slate-900 border border-white/5 rounded-[2.5rem]">
               <div className="flex items-center justify-between mb-8 text-slate-500">
                  <Building2 className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Empresas</span>
               </div>
               <h4 className="text-4xl font-black tracking-tighter mb-1 leading-none">{summary.enterpriseCount.toString().padStart(2, '0')}</h4>
               <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Ativas no ecossistema</p>
            </div>

            <div className="p-8 bg-slate-900 border border-white/5 rounded-[2.5rem]">
               <div className="flex items-center justify-between mb-8 text-slate-500">
                  <Activity className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Unidades / Lojas</span>
               </div>
               <h4 className="text-4xl font-black tracking-tighter mb-1 leading-none">{summary.totalShops.toString().padStart(2, '0')}</h4>
               <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Operando em 2 estados</p>
            </div>

            <div className="p-8 bg-slate-900 border border-white/5 rounded-[2.5rem]">
               <div className="flex items-center justify-between mb-8 text-slate-500">
                  <TrendingUp className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Ticket Médio</span>
               </div>
               <h4 className="text-4xl font-black tracking-tighter mb-1 leading-none">{formatCurrency(84.50, 84.50 >= 10000)}</h4>
               <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Geral Holding</p>
            </div>
         </div>

         <div className="mb-10 flex items-center justify-between">
            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-400">Minhas Marcas & Unidades</h3>
            <div className="h-px flex-1 mx-10 bg-gradient-to-r from-white/5 to-transparent" />
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {myEnterprises.map((ent, idx) => {
              const myShops = shopsMap[ent.id] || [];
              const metrics = metricsMap[ent.id] || { dailyRevenue: 0, healthScore: 0 };
              
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  key={ent.id}
                  onMouseEnter={() => setHoveredId(ent.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => onSelectEnterprise(ent.id)}
                  className="group relative bg-slate-900/40 border border-white/5 rounded-[3.5rem] p-10 cursor-pointer overflow-hidden transition-all hover:bg-slate-900/60 hover:border-white/10 hover:shadow-2xl hover:shadow-blue-500/10"
                >
                  {/* Health Gradient */}
                  <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${ent.status === 'active' ? 'from-emerald-500 to-teal-400' : 'from-amber-500 to-orange-400'}`} />
                  
                  <div className="flex items-center justify-between mb-12">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                           <Building2 className="w-7 h-7 text-blue-400" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black tracking-tighter text-white group-hover:text-blue-300 transition-colors leading-none mb-1">{ent.name}</h3>
                           <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">REF: {ent.id}</span>
                        </div>
                     </div>
                     <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${ent.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                        {ent.status}
                     </span>
                  </div>

                  {/* Modules Bar */}
                  <div className="flex items-center gap-2 mb-8">
                     {(ent.enabledModules || ['restaurant']).map(mod => (
                        <div key={mod} className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter text-slate-400 group-hover:border-blue-500/30 group-hover:text-blue-300 transition-all">
                           {getModuleIcon(mod)}
                           {mod}
                        </div>
                     ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                     <div className="p-5 bg-white/5 rounded-3xl border border-white/5 group-hover:border-emerald-500/30 transition-all">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">Vendas (24h)</span>
                        <span className="text-xl font-black text-white tracking-tighter">{formatCurrency(metrics.dailyRevenue, metrics.dailyRevenue >= 10000)}</span>
                     </div>
                     <div className="p-5 bg-white/5 rounded-3xl border border-white/5 group-hover:border-blue-500/30 transition-all">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">Unidades</span>
                        <span className="text-xl font-black text-white tracking-tighter">{myShops.length.toString().padStart(2, '0')}</span>
                     </div>
                  </div>
                  
                  {myShops.length > 0 && (
                    <div className="mb-8 p-5 bg-white/5 rounded-3xl border border-white/5 space-y-3">
                       <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block">Geolocalização das Lojas</span>
                       <div className="flex flex-wrap gap-2">
                          {myShops.map(s => (
                            <div key={s.id} className="flex items-center gap-1.5 bg-slate-950/50 text-slate-400 px-3 py-1.5 rounded-xl border border-white/5 text-[9px] font-bold">
                               <MapPin className="w-3 h-3 text-blue-500/50" />
                               {s.name}
                            </div>
                          ))}
                       </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Saúde: {metrics.healthScore}%</span>
                    </div>
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                       <ChevronRight className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <AnimatePresence>
                     {hoveredId === ent.id && (
                       <motion.div 
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         exit={{ opacity: 0 }}
                         className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent pointer-events-none"
                       />
                     )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Create New Node Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: myEnterprises.length * 0.1 }}
              className="bg-slate-900/20 border-2 border-dashed border-white/10 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center group hover:border-blue-500/30 hover:bg-slate-900/40 transition-all cursor-pointer"
            >
               <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-600/10 transition-all">
                  <Plus className="w-10 h-10 text-slate-500 group-hover:text-blue-500" />
               </div>
               <h3 className="text-2xl font-black text-slate-400 group-hover:text-white transition-colors">Solicitar Nova Unidade</h3>
               <p className="text-sm text-slate-600 group-hover:text-slate-400 mt-2 font-medium">Provisione uma nova filial ou empresa</p>
            </motion.div>
         </div>

         {myEnterprises.length === 0 && (
           <div className="mt-20 p-20 bg-slate-900/40 border border-white/5 rounded-[3rem] text-center">
              <Zap className="w-12 h-12 text-amber-500 mx-auto mb-6" />
              <h3 className="text-3xl font-black text-white mb-4">Nenhuma Empresa Vinculada</h3>
              <p className="text-slate-400 max-w-lg mx-auto">Sua conta global está ativa, mas você ainda não possui ou gerencia nenhuma unidade. Entre em contato com o suporte ou use um código de acesso.</p>
           </div>
         )}
      </main>

      <footer className="relative z-10 max-w-7xl mx-auto p-10 md:p-20 border-t border-white/5 mt-20">
         <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-slate-500">
            <div className="flex items-center gap-2">
               <Activity className="w-4 h-4 text-emerald-500" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">Global Uptime: 99.99%</span>
            </div>
            <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest">
               <a href="#" className="hover:text-white transition-colors">Security Audit</a>
               <a href="#" className="hover:text-white transition-colors">Documentation</a>
               <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
         </div>
      </footer>
    </div>
  );
};
