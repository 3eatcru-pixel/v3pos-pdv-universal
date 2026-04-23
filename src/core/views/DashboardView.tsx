import React, { useMemo } from 'react';
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
  CheckCircle2
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
import { cn, formatCurrency } from '../../lib/utils';
import { StatCard } from '../components/CommonUI';
import { 
  Order, 
  Table, 
  InventoryItem, 
  Staff, 
  Shift, 
  IncidentReport, 
  Reservation,
  Shop
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

  const { data: orders } = useCollection<Order>('orders');
  const { data: tables } = useCollection<Table>('tables');
  const { data: inventory } = useCollection<InventoryItem>('inventory');
  const { data: staff } = useCollection<Staff>('staff');
  const { data: shifts } = useCollection<Shift>('shifts');
  const { data: incidentReports } = useCollection<IncidentReport>('incidentReports');
  const { data: reservations } = useCollection<Reservation>('reservations');
  const { data: shops } = useCollection<Shop>('shops');

  const accessibleShopIds = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'owner') return shops.map(s => s.id);
    return currentUser.assignedShopIds || [];
  }, [currentUser, shops]);

  const currentShop = shops.find(s => s.id === selectedShopId);
  const isRegionalView = currentUser?.role === 'owner' || currentUser?.role === 'regional_manager' || currentUser?.role === 'admin';

  const stats = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();
    
    const relevantOrders = (isRegionalView && !selectedShopId) ? orders : orders.filter(o => o.shopId === selectedShopId);
    const closedOrdersToday = relevantOrders.filter(o => o.status === 'delivered' && o.closedAt && o.closedAt >= todayStart);
    
    const totalSalesToday = closedOrdersToday.reduce((acc, o) => acc + o.total, 0);
    const avgTicketToday = closedOrdersToday.length > 0 ? totalSalesToday / closedOrdersToday.length : 0;
    
    const totalCostToday = closedOrdersToday.reduce((acc, o) => {
      return acc + (o.items || []).reduce((itemAcc, item) => {
        const shouldCountCost = item.status !== 'voided' || item.sentToKitchen;
        return itemAcc + (shouldCountCost ? (item.cost || 0) * item.quantity : 0);
      }, 0);
    }, 0);
    
    const profitMargin = totalSalesToday > 0 ? ((totalSalesToday - totalCostToday) / totalSalesToday) * 100 : 0;
    const activeTablesCount = (isRegionalView && !selectedShopId ? tables : tables.filter(t => t.shopId === selectedShopId)).filter(t => t.status === 'occupied').length;
    const preparingCount = relevantOrders.filter(o => o.status === 'preparing').length;

    // Hourly Data for Chart (last 12 hours)
    const hourlyDataMap: Record<number, number> = {};
    for (let i = 0; i < 12; i++) {
      const hour = new Date();
      hour.setHours(hour.getHours() - (11 - i), 0, 0, 0);
      hourlyDataMap[hour.getTime()] = 0;
    }

    closedOrdersToday.forEach(o => {
      const orderDate = new Date(o.closedAt!);
      orderDate.setMinutes(0, 0, 0);
      const timestamp = orderDate.getTime();
      if (hourlyDataMap[timestamp] !== undefined) {
        hourlyDataMap[timestamp] += o.total;
      }
    });

    const chartData = Object.entries(hourlyDataMap).sort((a, b) => Number(a[0]) - Number(b[0])).map(([ts, val]) => ({
      name: format(Number(ts), 'HH:mm'),
      sales: val
    }));

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
      totalSalesToday,
      avgTicketToday,
      profitMargin,
      activeTablesCount,
      preparingCount,
      totalHours,
      totalMinutes,
      stockAlerts,
      chartData,
      shopPerformance,
      closedOrdersTodayCount: closedOrdersToday.length,
      shiftsToday
    };
  }, [orders, tables, inventory, shifts, shops, selectedShopId, isRegionalView, accessibleShopIds]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="responsive-h2 text-slate-800 tracking-tight">
            {isRegionalView && !selectedShopId ? 'Visão Regional' : currentShop?.name || 'Dashboard'}
          </h2>
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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <StatCard 
          title="Vendas Hoje" 
          value={formatCurrency(stats.totalSalesToday)} 
          icon={<Banknote className="w-5 h-5 text-emerald-500" />} 
          trend={stats.closedOrdersTodayCount > 0 ? `+${stats.closedOrdersTodayCount} pedidos` : "Aguardando vendas"}
        />
        <StatCard 
          title="Ticket Médio" 
          value={formatCurrency(stats.avgTicketToday)} 
          icon={<Wallet className="w-5 h-5 text-blue-500" />} 
        />
        <StatCard 
          title="Margem" 
          value={`${stats.profitMargin.toFixed(1)}%`} 
          icon={<BarChart3 className="w-5 h-5 text-indigo-500" />} 
          trend="Lucro estimado"
        />
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
                <p className="text-xs text-slate-400 font-medium tracking-tight">Fluxo de vendas brutas (Últimas 12h)</p>
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
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                  <Tooltip 
                    formatter={(val: number) => [formatCurrency(val), 'Vendas']}
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
                      <span className="text-emerald-400">{formatCurrency(perf.sales)}</span>
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
                        <p className="text-[10px] text-emerald-600 font-black">{formatCurrency(order.total)}</p>
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
      </div>
    </div>
  );
};
