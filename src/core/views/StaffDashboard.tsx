import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Building2, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Play, 
  Pause, 
  Award, 
  TrendingUp,
  AlertCircle,
  MapPin,
  Briefcase,
  ChevronRight,
  History,
  Target,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Enterprise, Shop, Staff, StaffSchedule, Order } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCollection } from '../../hooks/useCollection';
import { firebaseService } from '../../services/firebaseService';
import { accountService } from '../services/accountService';
import { logger } from '../services/logger';

interface StaffDashboardProps {
  staff: Staff | null;
  enterprise: Enterprise | null;
  shops: Shop[];
  schedules: StaffSchedule[];
}
export const StaffDashboard: React.FC<StaffDashboardProps> = ({ staff, enterprise, shops, schedules }) => {  
  const currentUser = accountService.getCurrentUser();
  const enterpriseId = currentUser?.companyId || accountService.getCurrentCompanyId();
  const shopId = accountService.getSelectedShopId();
  const { data: orders } = useCollection<Order>('orders', { enterpriseId: enterpriseId || null, shopId: shopId || null });
  const [clockedIn, setClockedIn] = useState(() => {
    return localStorage.getItem(`pos_clock_in_${staff?.id}`) !== null;
  });

  // Cálculo de Ganhos Extras (Comissões/Taxa de Serviço)
  const staffPerformance = useMemo(() => {
    if (!staff) return { totalTips: 0, salesCount: 0, totalSales: 0 };
    const myOrders = orders.filter(o => o.staffId === staff.id && o.status === 'delivered');
    const totalTips = myOrders.reduce((acc, o) => acc + (o.serviceFee || 0), 0);
    const totalSales = myOrders.reduce((acc, o) => acc + o.total, 0);
    return { totalTips, salesCount: myOrders.length, totalSales };
  }, [orders, staff]);

  const [clockStartTime, setClockStartTime] = useState<number | null>(() => {
    const saved = localStorage.getItem(`pos_clock_in_${staff?.id}`);
    return saved ? parseInt(saved) : null;
  });
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

  useEffect(() => {
    let interval: any;
    const updateTimer = () => {
      if (clockStartTime) {
        const diff = Date.now() - clockStartTime;
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        setElapsedTime(`${h}:${m}:${s}`);
      }
    };

    if (clockedIn && clockStartTime) {
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime('00:00:00');
    }
    return () => clearInterval(interval);
  }, [clockedIn, clockStartTime]);

  const handleClockToggle = async () => {
    if (!clockedIn) {
      const now = Date.now();
      try {
        setClockedIn(true);
        setClockStartTime(now);
        localStorage.setItem(`pos_clock_in_${staff?.id}`, now.toString());
        
        await firebaseService.saveItem('staff_activity', `clock_${staff?.id}`, {
          staffId: staff?.id,
          startTime: now,
          status: 'working',
          lastUpdate: now
        });
        logger.info('staff', 'Início de expediente registrado', { staffId: staff?.id });
      } catch (error) {
        logger.error('staff', 'Falha ao registrar início de expediente', { error });
      }
    } else {
      try {
        setClockedIn(false);
        setClockStartTime(null);
        localStorage.removeItem(`pos_clock_in_${staff?.id}`);
        
        await firebaseService.updateItem('staff_activity', `clock_${staff?.id}`, {
          status: 'offline',
          endTime: Date.now()
        });
        logger.info('staff', 'Encerramento de expediente registrado', { staffId: staff?.id });
      } catch (error) {
        logger.error('staff', 'Falha ao registrar encerramento de expediente', { error });
      }
    }
  };

  const mySchedules = useMemo(() => {
    if (!staff) return [];
    return schedules
      .filter(s => s.staffId === staff.id)
      .sort((a, b) => a.startTime - b.startTime);
  }, [schedules, staff]);

  const upcomingShift = useMemo(() => {
    const now = Date.now();
    return mySchedules.find(s => s.startTime > now);
  }, [mySchedules]);

  if (!staff) return null;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
      {/* Header Profile Section */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -ml-32 -mb-32" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="relative">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] bg-slate-800 border-4 border-slate-700 overflow-hidden flex items-center justify-center">
               {staff.photo ? (
                 <img src={staff.photo} alt={staff.name} className="w-full h-full object-cover" />
               ) : (
                 <User className="w-12 h-12 text-slate-500" />
               )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-lg">
               <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="text-center md:text-left flex-1">
             <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter">{staff.name}</h1>
                <span className="bg-white/10 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                   {staff.role.replace('_', ' ')}
                </span>
             </div>
             
             <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-slate-400">
                <div className="flex items-center gap-2">
                   <Building2 className="w-4 h-4 text-emerald-500" />
                   <span className="text-sm font-bold">{enterprise?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                   <MapPin className="w-4 h-4 text-blue-500" />
                   <span className="text-sm font-bold">
                      {staff.assignedShopIds.length > 0 
                        ? shops.find(s => s.id === staff.assignedShopIds[0])?.name || 'Unidade Principal'
                        : 'Múltiplas Unidades'}
                   </span>
                </div>
                <div className="flex items-center gap-2">
                   <Briefcase className="w-4 h-4 text-amber-500" />
                   <span className="text-sm font-bold uppercase tracking-tight">{staff.contractType || 'CLT'}</span>
                </div>
             </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-4">
             <div className={`px-8 py-6 rounded-[2rem] border-2 transition-all flex flex-col items-center ${clockedIn ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-800/50 border-slate-700'}`}>
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Tempo de Expediente</span>
                <span className={`text-3xl font-mono font-black ${clockedIn ? 'text-emerald-400' : 'text-slate-500'}`}>{elapsedTime}</span>
             </div>
             <button
               onClick={handleClockToggle}
               className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${clockedIn ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/30' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'}`}
             >
                {clockedIn ? (
                  <>
                    <Pause className="w-5 h-5 fill-current" />
                    Encerrar Turno
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    Iniciar Trabalho
                  </>
                )}
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Weekly Schedule */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-3">
                 <Calendar className="w-6 h-6 text-emerald-500" />
                 Escala de Trabalho
              </h3>
              <span className="text-xs font-bold text-slate-500">Próximos 7 dias</span>
           </div>

           <div className="grid gap-4">
              {mySchedules.length > 0 ? (
                mySchedules.map((shift, idx) => (
                  <motion.div 
                    key={shift.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-white border border-slate-200 rounded-3xl p-6 flex items-center justify-between hover:border-emerald-500/50 transition-all shadow-sm hover:shadow-xl hover:shadow-emerald-500/5"
                  >
                    <div className="flex items-center gap-6">
                       <div className="w-14 h-14 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-slate-100 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors">
                          <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-emerald-500">{format(shift.startTime, 'EEE', { locale: ptBR })}</span>
                          <span className="text-lg font-black text-slate-800">{format(shift.startTime, 'dd')}</span>
                       </div>
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <Clock className="w-3 h-3 text-slate-400" />
                             <span className="text-sm font-black text-slate-800">
                                {format(shift.startTime, 'HH:mm')} - {format(shift.endTime, 'HH:mm')}
                             </span>
                          </div>
                          <div className="flex items-center gap-2">
                             <Tag className="w-3 h-3 text-slate-400" />
                             <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                {shift.module} • {shops.find(s => s.id === shift.shopId)?.name}
                             </span>
                          </div>
                       </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                       <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                         shift.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-600' : 
                         shift.status === 'planned' ? 'bg-blue-500/10 text-blue-600' :
                         'bg-slate-100 text-slate-500'
                       }`}>
                          {shift.status}
                       </span>
                       <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] text-center">
                   <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                   <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum turno planejado</p>
                </div>
              )}
           </div>
        </div>

        {/* Side Performance / Goals */}
        <div className="space-y-6">
           <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-3">
              <Award className="w-6 h-6 text-amber-500" />
              Meu Desempenho
           </h3>

           <div className="bg-slate-900 rounded-[3rem] p-8 text-white space-y-8 shadow-xl">
              <div>
                 <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Score de Performance</span>
                    <span className="text-emerald-400 font-black tracking-tighter">{staff.performanceScore || 85}%</span>
                 </div>
                 <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${staff.performanceScore || 85}%` }}
                      className="h-full bg-emerald-500" 
                    />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                       <TrendingUp className="w-4 h-4 text-blue-400" />
                       <span className="text-[9px] font-black uppercase text-slate-500">Vendas</span>
                    </div>
                    <span className="text-xl font-black tracking-tighter">{formatCurrency(staffPerformance.totalSales, staffPerformance.totalSales >= 10000)}</span>
                 </div>
                 <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                       <Target className="w-4 h-4 text-rose-400" />
                       <span className="text-[9px] font-black uppercase text-slate-500">Pedidos</span>
                    </div>
                    <span className="text-xl font-black tracking-tighter">142</span>
                 </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                 <button className="w-full bg-white/10 hover:bg-white/20 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                    <History className="w-4 h-4" />
                    Ver Histórico Completo
                 </button>
              </div>
           </div>

           {/* Alerts / Info */}
           <div className="bg-amber-50 border border-amber-100 rounded-[2.5rem] p-8">
              <div className="flex items-start gap-4">
                 <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                 <div>
                    <h4 className="text-sm font-black text-amber-900 uppercase mb-1">Avisos da Empresa</h4>
                    <p className="text-xs font-medium text-amber-700 leading-relaxed">
                       Reunião geral na próxima segunda-feira às 14:00 para alinhamento de novos módulos de varejo.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
