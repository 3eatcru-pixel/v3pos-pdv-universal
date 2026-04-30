import React, { useState } from 'react';
import { useCommissionReport } from '../hooks/useCommissionReport';
import { accountService } from '../../../core/services/accountService';
import { formatCurrency } from '../../../lib/utils';
import { DollarSign, Users, TrendingUp, AlertCircle, RefreshCw, CalendarDays } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, getUnixTime } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const CommissionReportView: React.FC = () => {
  const enterpriseId = accountService.getCurrentCompanyId();
  const shopId = accountService.getSelectedShopId();

  // Padrão para o mês atual
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));

  const { report, isLoading, error } = useCommissionReport(
    enterpriseId || undefined,
    shopId,
    getUnixTime(startDate) * 1000, // Converte para milissegundos
    getUnixTime(endDate) * 1000
  );

  if (!enterpriseId) {
    return (
      <div className="p-6 text-center text-slate-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
        <p className="text-lg font-semibold">Nenhuma empresa selecionada.</p>
        <p className="text-sm">Por favor, selecione uma empresa para visualizar o relatório de comissões.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center text-slate-500">
        <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
        <p className="text-lg font-semibold">Carregando relatório de comissões...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-rose-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
        <p className="text-lg font-semibold">Erro ao carregar relatório:</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Relatório de Comissões</h2>
          <p className="text-slate-600">Visão geral das comissões por profissional.</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-slate-500" />
          <label htmlFor="startDate" className="sr-only">Data Inicial</label>
          <input
            type="date"
            id="startDate"
            value={format(startDate, 'yyyy-MM-dd')}
            onChange={(e) => setStartDate(new Date(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-slate-500">-</span>
          <label htmlFor="endDate" className="sr-only">Data Final</label>
          <input
            type="date"
            id="endDate"
            value={format(endDate, 'yyyy-MM-dd')}
            onChange={(e) => setEndDate(new Date(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={() => {
              setStartDate(startOfMonth(new Date()));
              setEndDate(endOfMonth(new Date()));
            }}
            className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Mês Atual
          </button>
          <button
            onClick={() => {
              const prevMonth = subMonths(new Date(), 1);
              setStartDate(startOfMonth(prevMonth));
              setEndDate(endOfMonth(prevMonth));
            }}
            className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Mês Passado
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Relatório para o período de{' '}
        <span className="font-semibold">{format(startDate, 'dd/MM/yyyy', { locale: ptBR })}</span> a{' '}
        <span className="font-semibold">{format(endDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total de Profissionais</p>
            <p className="text-3xl font-bold text-slate-900">{report.length}</p>
          </div>
          <Users className="w-8 h-8 text-blue-500 opacity-70" />
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Vendas Totais (Período)</p>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(report.reduce((sum, r) => sum + r.totalSales, 0))}</p>
          </div>
          <TrendingUp className="w-8 h-8 text-emerald-500 opacity-70" />
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Comissão Total (Período)</p>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(report.reduce((sum, r) => sum + r.commissionEarned, 0))}</p>
          </div>
          <DollarSign className="w-8 h-8 text-purple-500 opacity-70" />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-xl font-black text-slate-800 mb-4">Detalhes por Profissional</h3>
        {report.length === 0 ? (
          <p className="text-slate-500">Nenhum dado de comissão disponível para o período selecionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Profissional</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ordens Atendidas</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vendas Totais</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Comissão Ganhada</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {report.map((entry) => (
                  <tr key={entry.providerId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{entry.providerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{entry.ordersHandled}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatCurrency(entry.totalSales)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">{formatCurrency(entry.commissionEarned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};