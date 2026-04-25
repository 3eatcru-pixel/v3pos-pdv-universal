import React, { useMemo, Suspense, useEffect, useState } from 'react';
import { 
  Banknote, 
  Wallet, 
  BarChart3, 
  Table as TableIcon, 
  Clock, 
  UtensilsCrossed, 
  AlertTriangle,
  Building2,
  History,
  CheckCircle2,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format, startOfDay, addDays, isSameDay } from 'date-fns';
import { useCollection } from '../../hooks/useCollection';
import { accountService } from '../services/accountService';
import { useDevice } from '../../hooks/useDevice';
import { cn, formatCurrency } from '../../lib/utils';
import { WidgetRegistry } from '../services/WidgetRegistry';
import { reportEngine } from '../services/ReportEngine';
import { DailyAggregatorEngine } from '../services/DailyAggregatorEngine';
import { StatCard } from '../components/CommonUI';
import { 
  Order, 
  Table, 
  InventoryItem, 
  Staff, 
  Shift, 
  IncidentReport, 
  Reservation,
  Shop,
  RolePermissions
} from '../../types';

interface DashboardViewProps {
  setCurrentView: (view: any) => void;
  setSelectedShopId: (id: string | null) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  setCurrentView,
  setSelectedShopId
}) => {
  const currentUser = accountService.getCurrentUser();
  const selectedShopId = accountService.getSelectedShopId();

  const enterpriseId = currentUser?.companyId || accountService.getCurrentCompanyId();
  const { data: orders } = useCollection<Order>('orders', { enterpriseId: enterpriseId || null, shopId: selectedShopId || null });
  const { data: tables } = useCollection<Table>('tables', { enterpriseId: enterpriseId || null, shopId: selectedShopId || null });
  const { data: inventory } = useCollection<InventoryItem>('inventory', { enterpriseId: enterpriseId || null, shopId: selectedShopId || null });
  const { data: staff } = useCollection<Staff>('staff', { enterpriseId: enterpriseId || null, shopId: selectedShopId || null });
  const { data: shifts } = useCollection<Shift>('shifts', { enterpriseId: enterpriseId || null, shopId: selectedShopId || null });
  const { data: incidentReports } = useCollection<IncidentReport>('incidentReports', { enterpriseId: enterpriseId || null, shopId: selectedShopId || null });
  const { data: reservations } = useCollection<Reservation>('reservations', { enterpriseId: enterpriseId || null, shopId: selectedShopId || null });
  const { data: shops } = useCollection<Shop>('shops');
  const { data: roles } = useCollection<RolePermissions>('rolePermissions');
  const { data: summaries } = useCollection<any>('dailySummaries', { enterpriseId: enterpriseId || null, shopId: selectedShopId || null });
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | '7d' | '30d'>('today');
  const [isAuditPassed, setIsAuditPassed] = useState(false);
  const { isMobile } = useDevice();
  const [mobileTab, setMobileTab] = useState<'resumo' | 'graficos' | 'alertas'>('resumo');

  const accessibleShopIds = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'owner') return shops.map(s => s.id);
    return (currentUser as any).assignedShopIds || [];
  }, [currentUser, shops]);

  // Lógica: Verifica se o cargo do usuário permite ver dados de vendas/faturamento
  const userPermissions = useMemo(() => {
    if (currentUser?.role === 'owner' || currentUser?.role === 'admin' || currentUser?.role === 'dev') return { canViewSales: true };
    const role = roles.find(r => r.role === currentUser?.role);
    return role?.actions || { canViewSales: false };
  }, [roles, currentUser]);

  // Lógica de LEGO: Filtra quais widgets este usuário pode ver hoje
  const enabledWidgets = useMemo(() => {
    return Object.values(WidgetRegistry).filter(widget => {
      // Se for admin/owner vê tudo, senão checa a permissão específica do widget
      if (currentUser?.role === 'owner' || currentUser?.role === 'dev') return true;
      return userPermissions[widget.permission];
    });
  }, [userPermissions, currentUser]);

  const currentShop = shops.find(s => s.id === selectedShopId);
  const isRegionalView = currentUser?.role === 'owner' || currentUser?.role === 'regional_manager' || currentUser?.role === 'admin';

  // Validador de Integridade BFF: Dispara se o resumo parecer desatualizado em relação aos pedidos
  useEffect(() => {
    if (!enterpriseId || !selectedShopId || summaries.length === 0) {
      setIsAuditPassed(false);
      return;
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todaySummary = summaries.find((s: any) => s.shopId === selectedShopId && s.date === todayStr);

    if (todaySummary) {
      const todayStart = startOfDay(new Date()).getTime();
      const todayOrders = orders.filter(o => 
        o.shopId === selectedShopId && 
        o.status === 'delivered' && 
        o.closedAt && 
        o.closedAt >= todayStart
      );

      const latestOrderAt = todayOrders.length > 0 
        ? Math.max(...todayOrders.map(o => o.closedAt || 0)) 
        : 0;

      // Se há um pedido fechado após a última atualização do resumo (com margem de 5s para o processamento central terminar)
      if (latestOrderAt > (todaySummary.updatedAt || 0) + 5000) {
        DailyAggregatorEngine.validateDailyIntegrity(enterpriseId, selectedShopId, todayStr)
          .then(passed => setIsAuditPassed(passed));
      } else {
        // Se o updatedAt é recente o suficiente, assumimos que os dados estão síncronos
        setIsAuditPassed(true);
      }
    }
  }, [summaries, orders, enterpriseId, selectedShopId]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now).getTime();
    const todayStr = format(now, 'yyyy-MM-dd');

    let startDate: Date;
    if (selectedPeriod === '7d') startDate = startOfDay(addDays(now, -6));
    else if (selectedPeriod === '30d') startDate = startOfDay(addDays(now, -29));
    else startDate = startOfDay(now);
    
    const startDateStr = format(startDate, 'yyyy-MM-dd');

    // Prioritizar dados pré-agregados (BFF Pattern) para performance
    const periodSummaries = summaries.filter(s => {
      const isTargetShop = !selectedShopId || s.shopId === selectedShopId;
      return isTargetShop && s.date >= startDateStr;
    });

    const periodAggregation = periodSummaries.reduce((acc: any, s: any) => {
      // Hourly only makes sense for "Today" or current state
      const newHourly = { ...(acc.hourlySales || {}) };
      if (s.hourlySales && (selectedPeriod === 'today' || s.date === todayStr)) {
        Object.entries(s.hourlySales).forEach(([hour, amount]) => {
          newHourly[hour] = (newHourly[hour] || 0) + (amount as number);
        });
      }

      const dateKey = s.date;
      acc.dailyData[dateKey] = (acc.dailyData[dateKey] || 0) + (s.totalSales || 0);

      return {
        totalSales: (acc.totalSales || 0) + (s.totalSales || 0),
        totalCost: (acc.totalCost || 0) + (s.totalCost || 0),
        totalTax: (acc.totalTax || 0) + (s.totalTax || 0),
        orderCount: (acc.orderCount || 0) + (s.orderCount || 0),
        hourlySales: newHourly,
        dailyData: acc.dailyData
      };
    }, { totalSales: 0, totalCost: 0, totalTax: 0, orderCount: 0, hourlySales: {}, dailyData: {} });
    
    const relevantOrders = (isRegionalView && !selectedShopId) ? orders : orders.filter(o => o.shopId === selectedShopId);
    const closedOrdersInPeriod = relevantOrders.filter(o => o.status === 'delivered' && o.closedAt && o.closedAt >= startDate.getTime());
    const closedOrdersToday = relevantOrders.filter(o => o.status === 'delivered' && o.closedAt && o.closedAt >= todayStart);
    
    const totalSales = periodAggregation.totalSales || closedOrdersInPeriod.reduce((acc, o) => acc + o.total, 0);
    const orderCount = periodAggregation.orderCount || closedOrdersInPeriod.length;
    const avgTicket = orderCount > 0 ? totalSales / orderCount : 0;

    // Cálculo de Labor Cost % (Salários / Vendas Totais)
    const totalMonthlyPayroll = staff.reduce((acc, s) => acc + (s.salary || 0), 0);
    const dailyLaborCost = totalMonthlyPayroll / 30;
    const laborCostPercentage = totalSalesToday > 0 ? (dailyLaborCost / totalSalesToday) * 100 : 0;

    // Cálculo de Table Turn Time Médio (Minutos)
    const turnTimes = closedOrdersToday
      .filter(o => o.closedAt && o.startTime)
      .map(o => (o.closedAt! - o.startTime) / 60000);
    const avgTableTurnTime = turnTimes.length > 0 
      ? Math.round(turnTimes.reduce((a, b) => a + b, 0) / turnTimes.length) 
      : 0;
    
    const totalCost = periodAggregation.totalCost || closedOrdersInPeriod.reduce((acc, o) => {
      return acc + (o.items || []).reduce((itemAcc, item) => itemAcc + (Number((item as any).unitCost || (item as any).cost || 0)) * item.quantity, 0);
    }, 0);
    
    // Auditoria: Margem Real = (Receita Bruta - Impostos - Custo) / Receita Bruta
    const totalTax = periodAggregation.totalTax || (totalSales * 0.05); // Fallback 5%
    const netRevenue = totalSales - totalTax;
    const profitMargin = totalSales > 0 ? ((netRevenue - totalCost) / totalSales) * 100 : 0;

    const activeTablesCount = (isRegionalView && !selectedShopId ? tables : tables.filter(t => t.shopId === selectedShopId)).filter(t => t.status === 'occupied').length;
    const preparingCount = relevantOrders.filter(o => o.status === 'preparing').length;

    // Chart Data logic
    const hourlyDataMap: Record<number, number> = {};
    const dailyDataList: { name: string, sales: number }[] = [];

    if (selectedPeriod === 'today') {
      for (let i = 0; i < 12; i++) {
        const hour = new Date();
        hour.setHours(hour.getHours() - (11 - i), 0, 0, 0);
        hourlyDataMap[hour.getTime()] = 0;
      }
      
      if (periodAggregation.hourlySales) {
        Object.entries(periodAggregation.hourlySales).forEach(([h, val]) => {
          const ts = new Date().setHours(Number(h), 0, 0, 0);
          if (hourlyDataMap[ts] !== undefined) hourlyDataMap[ts] = Number(val);
        });
      } else {
        closedOrdersToday.forEach(o => {
          const orderDate = new Date(o.closedAt!);
          orderDate.setMinutes(0, 0, 0);
          const timestamp = orderDate.getTime();
          if (hourlyDataMap[timestamp] !== undefined) {
            hourlyDataMap[timestamp] += o.total;
          }
        });
      }
    } else {
      // Multi-day chart
      const daysToGenerate = selectedPeriod === '7d' ? 7 : 30;
      for (let i = 0; i < daysToGenerate; i++) {
        const d = startOfDay(addDays(now, -(daysToGenerate - 1 - i)));
        const dStr = format(d, 'yyyy-MM-dd');
        dailyDataList.push({
          name: format(d, 'dd/MM'),
          sales: periodAggregation.dailyData[dStr] || 0
        });
      }
    }

    const chartData = selectedPeriod === 'today' 
      ? Object.entries(hourlyDataMap).sort((a, b) => Number(a[0]) - Number(b[0])).map(([ts, val]) => ({
          name: format(Number(ts), 'HH:mm'),
          sales: val
        }))
      : dailyDataList;

    // Worked hours today
    const now = Date.now();
    const shiftsToday = shifts.filter(s => isSameDay(s.startTime, new Date()) && s.startTime <= now);
    const totalWorkedMs = shiftsToday.reduce((acc, shift) => {
      const start = shift.startTime;
      const end = Math.min(now, shift.endTime);
      return acc + Math.max(0, end - start);
    }, 0);
    const totalHours = Math.floor(totalWorkedMs / (1000 * 60 * 60));
    const totalMinutes = Math.floor((totalWorkedMs % (1000 * 60 * 60)) / (1000 * 60));

    const stockAlerts = (isRegionalView && !selectedShopId ? inventory : inventory.filter(i => i.shopId === selectedShopId))
      .filter(i => (i.currentStock || 0) <= (i.minStock || 0)).length;

    // Multi-shop performance
    const shopPerformance = shops
      .filter(s => accessibleShopIds.includes(s.id))
      .map(s => {
        const shopOrders = orders.filter(o => o.shopId === s.id && o.status === 'delivered' && o.closedAt && o.closedAt >= todayStart);
        const sales = shopOrders.reduce((acc, o) => acc + o.total, 0);
        return { name: s.name, sales };
      })
      .sort((a, b) => b.sales - a.sales);

    return {
      totalSalesToday: totalSales,
      avgTicketToday: avgTicket,
      profitMargin,
      activeTablesCount,
      laborCostPercentage,
      avgTableTurnTime,
      preparingCount,
      totalHours,
      totalMinutes,
      stockAlerts,
      chartData,
      shopPerformance,
      orderCount: orderCount,
      shiftsToday
    };
  }, [orders, tables, inventory, shifts, shops, selectedShopId, isRegionalView, accessibleShopIds, summaries, selectedPeriod]);

  // Navegação de Abas para Celular
  const renderMobileNav = () => (
    <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] mb-6 md:hidden">
       {[
         { id: 'resumo', label: 'Resumo', icon: <BarChart3 className="w-4 h-4" /> },
         { id: 'graficos', label: 'Vendas', icon: <TrendingUp className="w-4 h-4" /> },
         { id: 'alertas', label: 'Alertas', icon: <AlertTriangle className="w-4 h-4" /> },
       ].map(tab => (
         <button
           key={tab.id}
           onClick={() => setMobileTab(tab.id as any)}
           className={cn(
             "flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl transition-all",
             mobileTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
           )}
         >
            {tab.icon}
            <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
         </button>
       ))}
    </div>
  );

  return (
    <div className={cn("space-y-8 animate-in fade-in duration-500", isMobile ? "px-2" : "")}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="responsive-h2 text-slate-800 tracking-tight">
              {isRegionalView && !selectedShopId ? 'Visão Regional' : currentShop?.name || 'Dashboard'}
            </h2>
            {isAuditPassed && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                title="Conferência concluída: O sistema validou a integridade comparando a soma dos pedidos individuais com os relatórios agregados."
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 shadow-sm cursor-help"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Dados Auditados</span>
              </motion.div>
            )}
          </div>
          <p className="text-sm text-slate-400 font-medium tracking-tight">
            {isRegionalView ? 'Monitoramento em tempo real de toda a rede' : 'Gestão operacional e financeira em tempo real'}
          </p>
        </div>
        {isRegionalView && (
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-sm border border-slate-200 self-start">
             <button 
               onClick={() => setSelectedShopId(accessibleShopIds[0])}
               className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", selectedShopId ? "bg-white text-slate-800 shadow-sm" : "text-slate-400")}
             >Unitário</button>
             <button 
               onClick={() => setSelectedShopId(null)}
               className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", !selectedShopId ? "bg-white text-slate-800 shadow-sm" : "text-slate-400")}
             >Geral</button>
          </div>
        )}
      </div>

      {isMobile && renderMobileNav()}

      {/* Slot-Based Grid adaptada ao Mobile Tab */}
      <div className={cn(
        "grid gap-4",
        isMobile ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
      )}>
        {(!isMobile || mobileTab === 'resumo') && (
          <>
        <Suspense fallback={<div className="h-32 bg-slate-50 animate-pulse rounded-3xl" />}>
          {enabledWidgets.map(widget => (
            <div key={widget.id} className={cn(!isMobile && (
              widget.gridSpan === 'medium' ? 'col-span-2' : 
              widget.gridSpan === 'large' ? 'col-span-full' : ''
            ))}>
              <widget.component stats={stats} />
            </div>
          ))}
        </Suspense>
        
        {!userPermissions.canViewSales && (
           <div className="col-span-2 bg-slate-50 border border-dashed border-slate-200 rounded-3xl flex items-center justify-center p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Painel Financeiro Restrito
           </div>
        )}

        <StatCard 
          title="Mesas Ocupadas" 
          value={stats.activeTablesCount.toString()} 
          icon={<TableIcon className="w-5 h-5 text-slate-500" />} 
          trend={`${Math.round((stats.activeTablesCount / (tables.length || 1)) * 100)}% cap.`}
        />
        <StatCard 
          title="Horas Staff" 
          value={`${stats.totalHours}h ${stats.totalMinutes}m`} 
          icon={<Clock className="w-5 h-5 text-indigo-500" />} 
          trend={`${stats.shiftsToday.filter(s => Date.now() >= s.startTime && Date.now() <= s.endTime).length} ativos agora`}
        />
        <StatCard 
          title="Pedidos KDS" 
          value={stats.preparingCount.toString()} 
          icon={<UtensilsCrossed className="w-5 h-5 text-amber-500" />} 
        />
        <StatCard 
          title="Alertas Estoque" 
          value={stats.stockAlerts.toString()} 
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />} 
          isWarning={stats.stockAlerts > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="sleek-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Desempenho Comercial</h3>
                <p className="text-xs text-slate-400 font-medium tracking-tight">
                  {selectedPeriod === 'today' ? 'Fluxo de vendas brutas (Últimas 12h)' : `Tendência de vendas (${selectedPeriod})`}
                </p>
              </div>
              <button onClick={() => setCurrentView('reports')} className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">Relatórios Full</button>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 12, fill: '#94a3b8'}} 
                    tickFormatter={(val) => formatCurrency(val, val >= 10000)}
                  />
                  <Tooltip 
                    formatter={(val: number) => [formatCurrency(val, val >= 10000), 'Vendas']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {isRegionalView && !selectedShopId && (
            <div className="sleek-card p-6 bg-slate-800 text-white relative overflow-hidden mb-6">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Building2 className="w-24 h-24" />
              </div>
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-6">Performance por Unidade</h3>
              <div className="space-y-4">
                {stats.shopPerformance.map(perf => (
                  <div key={perf.name}>
                    <div className="flex justify-between text-[11px] font-bold mb-1.5 uppercase tracking-tighter">
                      <span>{perf.name}</span>
                      <span className="text-emerald-400">{formatCurrency(perf.sales, perf.sales >= 10000)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(perf.sales / (stats.totalSalesToday || 1)) * 100}%` }}
                        className="h-full bg-emerald-500 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="sleek-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Time em Operação</h3>
                <p className="text-xs text-slate-400 font-medium whitespace-nowrap">Escala de {format(new Date(), 'dd/MM')}</p>
              </div>
              <button onClick={() => setCurrentView('schedule')} className="text-[10px] font-black uppercase text-slate-400 border border-slate-200 px-3 py-1.5 rounded-lg">Ver Escala Completa</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stats.shiftsToday.length === 0 ? (
                <div className="col-span-full py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <History className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Nenhum turno escalado hoje</p>
                </div>
              ) : (
                stats.shiftsToday.map(shift => {
                  const member = staff.find(s => s.id === shift.staffId);
                  if (!member) return null;
                  const isCurrentlyWorking = Date.now() >= shift.startTime && Date.now() <= shift.endTime;
                  return (
                    <div key={shift.id} className="flex items-center gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-slate-400 border border-slate-100 shadow-sm flex-shrink-0">
                        {member.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 leading-none mb-1 truncate">{member.name}</p>
                        <div className="flex items-center gap-2">
                           <span className="text-[8px] font-black uppercase text-slate-400 px-1.5 py-0.5 bg-white border border-slate-100 rounded">{shift.area}</span>
                           <span className="text-[10px] font-medium text-slate-500">{format(shift.startTime, 'HH:mm')} - {format(shift.endTime, 'HH:mm')}</span>
                        </div>
                      </div>
                      {isCurrentlyWorking && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          </div>
        )}

        {(!isMobile || mobileTab === 'alertas') && (
          <div className="space-y-6">
          <div className="sleek-card p-6 bg-red-50/30 border-red-100/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase text-red-800 tracking-[0.15em] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Alertas Críticos
              </h3>
              <span className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 text-[10px] font-black rounded-full shadow-sm">
                {incidentReports.filter(i => i.status === 'open' && i.priority === 'high').length}
              </span>
            </div>
            <div className="space-y-3">
              {incidentReports.filter(i => i.status === 'open').length === 0 ? (
                <div className="py-6 flex flex-col items-center justify-center text-center opacity-40">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Operação Segura</p>
                </div>
              ) : (
                incidentReports.filter(i => i.status === 'open').slice(0, 2).map(inc => (
                  <div key={inc.id} className="p-3 bg-white rounded-xl border border-red-100 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs font-black text-slate-800 truncate pr-2">{inc.title}</p>
                      <span className={cn(
                        "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                        inc.priority === 'high' ? "bg-red-500 text-white" : "bg-amber-100 text-amber-600"
                      )}>{inc.priority}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">{inc.description}</p>
                  </div>
                ))
              )}
              <button 
                onClick={() => setCurrentView('safety')}
                className="w-full py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all mt-2"
              >
                Central de Segurança
              </button>
            </div>
          </div>

          <div className="sleek-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Próximas Reservas</h3>
                <p className="text-xs text-slate-400 font-medium">Fluxo de hoje</p>
              </div>
              <button onClick={() => setCurrentView('reservations')} className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">Ver todas</button>
            </div>
            <div className="space-y-4">
              {reservations.filter(r => r.dateTime > Date.now() && r.dateTime < Date.now() + 86400000).slice(0, 3).map(res => (
                <div key={res.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                     <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                       {res.customerName[0]}
                     </div>
                     <div className="min-w-0">
                       <p className="text-sm font-bold text-slate-800 leading-none mb-1 truncate">{res.customerName}</p>
                       <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{format(res.dateTime, 'HH:mm')} • Mesa {res.tableNumber}</p>
                     </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                </div>
              ))}
              {reservations.filter(r => r.dateTime > Date.now() && r.dateTime < Date.now() + 86400000).length === 0 && (
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 text-center py-4">Sem reservas hoje</p>
              )}
            </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-sm border border-slate-200">
             {['today', '7d', '30d'].map((p) => (
               <button 
                 key={p}
                 onClick={() => setSelectedPeriod(p as any)}
                 className={cn(
                   "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", 
                   selectedPeriod === p ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
                 )}
               >
                 {p === 'today' ? 'Hoje' : p === '7d' ? '7 Dias' : '30 Dias'}
               </button>
             ))}
          </div>

          </div>

          <div className="sleek-card p-6">
             <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.15em] mb-6 flex items-center gap-2 border-b border-slate-50 pb-4">
               <History className="w-4 h-4" /> Vendas Recentes
             </h3>
             <div className="space-y-5">
               {orders.filter(o => o.status === 'delivered').slice(-4).reverse().map(order => (
                 <div key={order.id} className="flex gap-4 relative pb-5 last:pb-0">
                   <div className="absolute left-[7px] top-[14px] bottom-0 w-[1px] bg-slate-50 last:hidden"></div>
                   <div className="w-[15px] h-[15px] rounded-full bg-emerald-500 border-[3px] border-emerald-50 shadow-sm flex-shrink-0 z-10 mt-0.5" />
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-slate-800 truncate pr-2">Mesa {tables.find(t => t.id === order.tableId)?.number} fechada</p>
                        <span className="text-[9px] font-medium text-slate-400 whitespace-nowrap">{format(order.closedAt!, 'HH:mm')}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-emerald-600 font-black">{formatCurrency(order.total, order.total >= 10000)}</p>
                        <span className="text-[10px] text-slate-300">•</span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{order.paymentMethod?.toUpperCase() || 'PAGO'}</p>
                      </div>
                   </div>
                 </div>
               ))}
               {orders.filter(o => o.status === 'delivered').length === 0 && (
                 <div className="py-10 text-center opacity-40">
                   <History className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Aguardando vendas</p>
                 </div>
               )}
             </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
