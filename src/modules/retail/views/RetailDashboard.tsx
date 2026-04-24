import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Users,
  Package,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Wifi,
  WifiOff,
  RefreshCw,
  Zap,
  ShoppingBag,
} from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { saleRepository } from '../../../core/storage/repositories/saleRepository';
import { productRepository } from '../../../core/storage/repositories/productRepository';
import { retailService, RetailSyncHistoryEvent, RetailSyncStatus } from '../services/retailService';
import { firebaseService } from '../../../services/firebaseService';
import { accountService } from '../../../core/services/accountService';

interface RetailRealtimeMetrics {
  salesTodayTotal: number;
  salesTodayCount: number;
  activeCustomersTodayCount: number;
  averageTicket: number;
  lowStockCount: number;
  recentSales: Array<{
    id: string;
    createdAt: string;
    total: number;
    itemsCount: number;
  }>;
  topProducts: Array<{
    productName: string;
    quantity: number;
  }>;
}

interface RetailAuditMetrics {
  openBlindSessions: number;
  highImpactAdjustments: number;
  negativeImpactValue: number;
  topRecountOperators: Array<{ name: string; count: number }>;
}

export const RetailDashboard: React.FC = () => {
  const [syncFilter, setSyncFilter] = useState<'ALL' | RetailSyncHistoryEvent['type']>('ALL');
  const [metrics, setMetrics] = useState<RetailRealtimeMetrics>({
    salesTodayTotal: 0,
    salesTodayCount: 0,
    activeCustomersTodayCount: 0,
    averageTicket: 0,
    lowStockCount: 0,
    recentSales: [],
    topProducts: [],
  });
  const [syncStatus, setSyncStatus] = useState<RetailSyncStatus>({
    connected: false,
    pendingCount: 0,
    lastAttemptAt: null,
    lastSuccessAt: null,
    isRetrying: false,
    resentInSession: 0,
    recentEvents: [],
  });
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [auditMetrics, setAuditMetrics] = useState<RetailAuditMetrics>({
    openBlindSessions: 0,
    highImpactAdjustments: 0,
    negativeImpactValue: 0,
    topRecountOperators: [],
  });

  useEffect(() => {
    let isMounted = true;

    const loadMetrics = async () => {
      const [sales, products] = await Promise.all([
        saleRepository.findAll(),
        productRepository.findAll(),
      ]);

      const currentUser = accountService.getCurrentUser();
      const enterpriseId = currentUser?.companyId || accountService.getCurrentCompanyId();
      const shopId = accountService.getSelectedShopId();
      const customers = enterpriseId && shopId
        ? await firebaseService.getAllDocs('customers', enterpriseId, shopId)
        : [];

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const salesToday = sales.filter((sale) => {
        const timestamp = Date.parse(sale.createdAt);
        return Number.isFinite(timestamp) && timestamp >= startOfDay && sale.kind !== 'return';
      });

      const salesTodayTotal = salesToday.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
      const salesTodayCount = salesToday.length;
      const averageTicket = salesTodayCount > 0 ? salesTodayTotal / salesTodayCount : 0;
      const lowStockCount = products.filter((product) => Number(product.stock || 0) <= 5).length;
      const activeCustomersTodayCount = customers.filter((customer: any) => {
        const reference = Number(customer.lastPurchase || customer.updatedAt || customer.createdAt || 0);
        return Number.isFinite(reference) && reference >= startOfDay;
      }).length;

      const recentSales = [...sales]
        .filter((sale) => sale.kind !== 'return')
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 4)
        .map((sale) => ({
          id: sale.id,
          createdAt: sale.createdAt,
          total: Number(sale.total || 0),
          itemsCount: Array.isArray(sale.items) ? sale.items.length : 0,
        }));

      const productNameById = new Map<string, string>(
        products.map((product) => [String(product.id), String(product.name || 'Produto')]),
      );
      const topProductMap = sales.reduce<Record<string, number>>((acc, sale) => {
        if (sale.kind === 'return') return acc;
        (sale.items || []).forEach((item) => {
          const key = String(item.productId || item.name || 'unknown');
          acc[key] = (acc[key] || 0) + Number(item.quantity || 0);
        });
        return acc;
      }, {});
      const topProducts = Object.entries(topProductMap)
        .map(([productId, quantity]) => ({
          productName: productNameById.get(productId) || productId,
          quantity: Number(quantity),
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 3);

      if (isMounted) {
        setMetrics({
          salesTodayTotal,
          salesTodayCount,
          activeCustomersTodayCount,
          averageTicket,
          lowStockCount,
          recentSales,
          topProducts,
        });
      }
    };

    const loadSyncStatus = async () => {
      const status = await retailService.getSyncQueueStatus();
      if (isMounted) {
        setSyncStatus(status);
      }
    };

    const loadAuditMetrics = async () => {
      const currentUser = accountService.getCurrentUser();
      const enterpriseId = currentUser?.companyId || accountService.getCurrentCompanyId();
      const shopId = accountService.getSelectedShopId();
      if (!enterpriseId || !shopId) return;

      const [sessions, recounts] = await Promise.all([
        firebaseService.getAllDocs('stockCountSessions', enterpriseId, shopId),
        firebaseService.getAllDocs('recountRequests', enterpriseId, shopId),
      ]);

      const openBlindSessions = sessions.filter((s: any) => s.status === 'open').length;
      const highImpactAdjustments = recounts.filter((r: any) => Number(r.adjustmentPercent || 0) >= 5).length;
      const negativeImpactValue = recounts.reduce((sum: number, r: any) => sum + Math.min(0, Number(r.varianceValue || 0)), 0);
      const operatorMap = recounts.reduce<Record<string, number>>((acc: Record<string, number>, r: any) => {
        const key = String(r.staffName || r.approvedByName || 'Sem operador');
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      const topRecountOperators = Object.entries(operatorMap)
        .map(([name, count]) => ({ name, count: Number(count) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      if (isMounted) {
        setAuditMetrics({
          openBlindSessions,
          highImpactAdjustments,
          negativeImpactValue,
          topRecountOperators,
        });
      }
    };

    const onSaleUpdated = () => {
      void loadMetrics();
      void loadSyncStatus();
      void loadAuditMetrics();
    };

    const onSyncStatus = (event: Event) => {
      const detail = (event as CustomEvent<RetailSyncStatus>).detail;
      if (!isMounted || !detail) return;
      setSyncStatus(detail);
    };

    void loadMetrics();
    void loadSyncStatus();
    void loadAuditMetrics();
    window.addEventListener('retail:sale-updated', onSaleUpdated);
    window.addEventListener('retail:sync-status', onSyncStatus as EventListener);
    const syncPolling = window.setInterval(() => {
      void loadSyncStatus();
    }, 5000);

    return () => {
      isMounted = false;
      window.removeEventListener('retail:sale-updated', onSaleUpdated);
      window.removeEventListener('retail:sync-status', onSyncStatus as EventListener);
      window.clearInterval(syncPolling);
    };
  }, []);

  const handleManualSync = async () => {
    if (isManualSyncing) return;
    setIsManualSyncing(true);
    try {
      const status = await retailService.syncNow();
      setSyncStatus(status);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleClearSyncHistory = async () => {
    if (isClearingHistory) return;
    setIsClearingHistory(true);
    try {
      const status = await retailService.clearSyncHistory();
      setSyncStatus(status);
    } finally {
      setIsClearingHistory(false);
    }
  };

  const filteredSyncEvents =
    syncFilter === 'ALL'
      ? syncStatus.recentEvents
      : syncStatus.recentEvents.filter((event) => event.type === syncFilter);

  const topProductMax = Math.max(1, ...metrics.topProducts.map((item) => item.quantity));
  const getMinutesAgo = (isoDate: string) => {
    const timestamp = Date.parse(isoDate);
    if (!Number.isFinite(timestamp)) return '--';
    const diffMin = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    return `${diffMin} min`;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Varejo Intelligence</h2>
          <p className="text-slate-500 font-medium font-sans">Desempenho de vendas, fidelidade e gestao de estoque em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all flex items-center gap-2">
            Relatorio Semanal <ArrowUpRight className="w-4 h-4" />
          </button>
          <button className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200">
            Nova Venda (PDV)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Vendas Hoje', value: formatCurrency(metrics.salesTodayTotal), change: `${metrics.salesTodayCount} vendas`, trend: 'up', icon: <TrendingUp />, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Clientes Ativos Hoje', value: String(metrics.activeCustomersTodayCount), change: 'atividade no CRM', trend: metrics.activeCustomersTodayCount > 0 ? 'up' : 'down', icon: <Users />, color: 'bg-blue-50 text-blue-600' },
          { label: 'Ticket Medio', value: formatCurrency(metrics.averageTicket), change: metrics.salesTodayCount > 0 ? 'Atualizado' : 'Sem vendas', trend: metrics.salesTodayCount > 0 ? 'up' : 'down', icon: <CreditCard />, color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Itens em Falta', value: String(metrics.lowStockCount).padStart(2, '0'), change: metrics.lowStockCount > 0 ? 'Critico' : 'Estavel', trend: metrics.lowStockCount > 0 ? 'down' : 'up', icon: <Package />, color: 'bg-rose-50 text-rose-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className={`p-4 rounded-2xl ${stat.color} w-fit mb-6 shadow-sm group-hover:scale-110 transition-transform duration-500`}>
              {stat.icon}
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{stat.label}</p>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-black text-slate-800 tracking-tighter">{stat.value}</p>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md mb-1 flex items-center gap-0.5 ${stat.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Sessoes Cegas Abertas</p>
          <p className="text-3xl font-black text-slate-800">{auditMetrics.openBlindSessions}</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Ajustes Criticos ({'>=5%'})</p>
          <p className="text-3xl font-black text-amber-600">{auditMetrics.highImpactAdjustments}</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Impacto Negativo Ajustes</p>
          <p className="text-3xl font-black text-rose-600">{formatCurrency(auditMetrics.negativeImpactValue)}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Reconciliacoes por Operador</p>
        <div className="space-y-2">
          {auditMetrics.topRecountOperators.length === 0 ? (
            <p className="text-xs font-bold text-slate-400">Sem reconciliacoes registradas.</p>
          ) : (
            auditMetrics.topRecountOperators.map((operator) => (
              <div key={operator.name} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                <span className="text-xs font-bold text-slate-700">{operator.name}</span>
                <span className="text-[10px] font-black uppercase text-indigo-600">{operator.count} ajustes</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${syncStatus.connected ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {syncStatus.connected ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sync em Tempo Real</p>
              <p className="text-xl font-black text-slate-800 uppercase tracking-tight">
                {syncStatus.connected ? 'Malha Online' : 'Malha Offline'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 rounded-2xl px-5 py-4">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fila Pendente</p>
              <p className="text-2xl font-black text-slate-800">{syncStatus.pendingCount}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl px-5 py-4">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ultima Tentativa</p>
              <p className="text-sm font-black text-slate-800">
                {syncStatus.lastAttemptAt ? new Date(syncStatus.lastAttemptAt).toLocaleTimeString('pt-BR') : '--:--:--'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl px-5 py-4">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ultimo Sucesso</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-slate-800">
                  {syncStatus.lastSuccessAt ? new Date(syncStatus.lastSuccessAt).toLocaleTimeString('pt-BR') : '--:--:--'}
                </p>
                {syncStatus.isRetrying && <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            Reenvios na sessao: {syncStatus.resentInSession}
          </p>
          <button
            onClick={() => void handleManualSync()}
            disabled={isManualSyncing || syncStatus.isRetrying}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${(isManualSyncing || syncStatus.isRetrying) ? 'animate-spin' : ''}`} />
            Sincronizar Agora
          </button>
        </div>
        <div className="mt-6 bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ultimos Eventos de Sync</p>
            <div className="flex items-center gap-2">
              <select
                value={syncFilter}
                onChange={(event) => setSyncFilter(event.target.value as 'ALL' | RetailSyncHistoryEvent['type'])}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600"
              >
                <option value="ALL">Todos</option>
                <option value="SEND">Send</option>
                <option value="RECEIVE">Receive</option>
                <option value="DUPLICATE">Duplicate</option>
                <option value="RETRY">Retry</option>
                <option value="MANUAL_SYNC">Manual Sync</option>
              </select>
              <button
                onClick={() => void handleClearSyncHistory()}
                disabled={isClearingHistory || syncStatus.recentEvents.length === 0}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Limpar Historico
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {filteredSyncEvents.length === 0 ? (
              <p className="text-xs font-bold text-slate-400">Nenhum evento de sincronizacao ainda.</p>
            ) : (
              filteredSyncEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{event.type}</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${event.status === 'success' ? 'text-emerald-600 bg-emerald-50' : event.status === 'ignored' ? 'text-amber-600 bg-amber-50' : 'text-slate-600 bg-slate-100'}`}>{event.status}</span>
                    <span className="text-xs font-bold text-slate-600">{event.message}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-400">
                    {new Date(event.timestamp).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase flex items-center gap-3">
              <Zap className="w-6 h-6 text-indigo-600" /> Vendas Recentes
            </h3>
            <button className="text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all">Ver Historico</button>
          </div>

          <div className="space-y-6">
            {metrics.recentSales.length === 0 ? (
              <p className="text-xs font-bold text-slate-400">Sem vendas registradas.</p>
            ) : (
              metrics.recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 border border-slate-50 hover:bg-white hover:border-indigo-100 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      #{sale.id.slice(-4)}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 uppercase text-xs tracking-tight">Venda {sale.id.slice(0, 12)}</p>
                      <p className="text-[10px] font-bold text-slate-400">Ha {getMinutesAgo(sale.createdAt)} - {sale.itemsCount} itens</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-800">{formatCurrency(sale.total)}</p>
                    <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Pago</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter italic">Controle de Varejo</h3>
              <p className="text-slate-400 text-sm font-medium mb-8">Indicadores alimentados por vendas, CRM e reconciliacao de estoque.</p>
              <p className="text-xs font-black uppercase text-slate-300 tracking-widest">Modulo pronto para auditoria operacional</p>
            </div>
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-600 rounded-full blur-[100px] opacity-20" />
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-tight flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-emerald-500" /> Top Produtos
            </h3>
            <div className="space-y-6">
              {metrics.topProducts.length === 0 ? (
                <p className="text-xs font-bold text-slate-400">Sem dados de produtos vendidos.</p>
              ) : (
                metrics.topProducts.map((item, i) => (
                  <div key={`${item.productName}-${i}`} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-800 text-xs uppercase tracking-tight">{item.productName}</span>
                      <span className="text-[10px] font-black text-slate-400">{item.quantity} un</span>
                    </div>
                    <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${i === 0 ? 'bg-blue-600' : i === 1 ? 'bg-emerald-600' : 'bg-indigo-600'} rounded-full`}
                        style={{ width: `${Math.max(8, (item.quantity / topProductMax) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
