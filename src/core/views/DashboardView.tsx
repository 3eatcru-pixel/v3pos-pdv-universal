import React, { useMemo } from 'react';
import { BarChart3, Table as TableIcon, Clock, AlertTriangle } from 'lucide-react';
import { useCollection } from '../../hooks/useCollection';
import { accountService } from '../services/accountService';
import { formatCurrency } from '../../lib/utils';
import { Order, Table, InventoryItem, Shift, IncidentReport } from '../../types';

interface DashboardViewProps {
  setCurrentView: (view: any) => void;
  setSelectedShopId: (id: string | null) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setCurrentView }) => {
  const currentUser = accountService.getCurrentUser();
  const selectedShopId = accountService.getSelectedShopId();
  const enterpriseId = currentUser?.companyId || accountService.getCurrentCompanyId();

  const { data: orders } = useCollection<Order>('orders', { enterpriseId: enterpriseId || null, shopId: selectedShopId || null });
  const { data: tables } = useCollection<Table>('tables', { enterpriseId: enterpriseId || null, shopId: selectedShopId || null });
  const { data: inventory } = useCollection<InventoryItem>('inventory', { enterpriseId: enterpriseId || null, shopId: selectedShopId || null });
  const { data: shifts } = useCollection<Shift>('shifts', { enterpriseId: enterpriseId || null, shopId: selectedShopId || null });
  const { data: incidentReports } = useCollection<IncidentReport>('incidentReports', { enterpriseId: enterpriseId || null, shopId: selectedShopId || null });

  const stats = useMemo(() => {
    const delivered = orders.filter((o) => o.status === 'delivered');
    const totalSales = delivered.reduce((acc, o) => acc + (o.total || 0), 0);
    const activeTables = tables.filter((t) => t.status === 'occupied').length;
    const stockAlerts = inventory.filter((i: any) => (i.currentStock ?? i.stock ?? 0) <= (i.minStock ?? 0)).length;
    const openIncidents = incidentReports.filter((i) => i.status === 'open').length;
    const activeShifts = shifts.filter((s) => Date.now() >= s.startTime && Date.now() <= s.endTime).length;
    return { totalSales, activeTables, stockAlerts, openIncidents, activeShifts };
  }, [orders, tables, inventory, incidentReports, shifts]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard</h2>
        <button
          onClick={() => setCurrentView('reports')}
          className="px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-[11px] font-black uppercase tracking-widest"
        >
          Relatórios
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-widest">
            <BarChart3 className="w-4 h-4" /> Vendas
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">{formatCurrency(stats.totalSales)}</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-widest">
            <TableIcon className="w-4 h-4" /> Mesas
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">{stats.activeTables}</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-widest">
            <Clock className="w-4 h-4" /> Turnos
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">{stats.activeShifts}</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-widest">
            <AlertTriangle className="w-4 h-4" /> Estoque
          </div>
          <p className="text-xl font-black text-amber-600 mt-2">{stats.stockAlerts}</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-widest">
            <AlertTriangle className="w-4 h-4" /> Incidentes
          </div>
          <p className="text-xl font-black text-rose-600 mt-2">{stats.openIncidents}</p>
        </div>
      </div>
    </div>
  );
};
