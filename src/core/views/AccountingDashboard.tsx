import React, { useMemo, useState } from 'react';
import { FileText, Download, ShieldCheck, TrendingUp, Landmark, Calculator, Receipt, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatCurrency } from '../../lib/utils';
import { useCollection } from '../../hooks/useCollection';
import { accountService } from '../services/accountService';
import { localeEngine } from '../services/LocaleEngine';
import { StatCard } from '../components/CommonUI';
import { FiscalSAFTGenerator } from './FiscalSAFTGenerator';

export const AccountingDashboard: React.FC = () => {
  const enterpriseId = accountService.getCurrentCompanyId();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();

  const { data: summaries } = useCollection<any>('dailySummaries', { enterpriseId, dateRange: { field: 'date', start: startOfMonth, end: endOfMonth } });
  const { data: transactions } = useCollection<any>('transactions', { enterpriseId, dateRange: { field: 'timestamp', start: startOfMonth, end: endOfMonth } });

  const [isExporting, setIsExporting] = useState(false);

  const handleExportSAFT = async () => {
    if (!enterpriseId) return;
    setIsExporting(true);
    
    // Regra Fiscal: O SAFT-PT deve ser gerado para o mês completo de competência.
    const now = new Date();
    const month = now.getMonth(); 
    const year = now.getFullYear();
    
    try {
      const xml = await FiscalSAFTGenerator.generateSAFT(enterpriseId, month, year);
      const filename = `SAFT_PT_${year}_${String(month + 1).padStart(2, '0')}.xml`;
      FiscalSAFTGenerator.downloadFile(xml, filename);
    } catch (error) {
      alert('Erro ao gerar arquivo SAFT. Verifique se o NIF da empresa e os dados dos produtos estão corretos.');
    } finally {
      setIsExporting(false);
    }
  };

  const accountingMetrics = useMemo(() => {
    const totalRevenue = summaries.reduce((acc, s) => acc + (s.totalSales || 0), 0);
    const totalTax = summaries.reduce((acc, s) => acc + (s.totalTax || 0), 0);
    const totalOpExpenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const ebitda = totalRevenue - totalTax - totalOpExpenses;

    return {
      totalRevenue,
      totalTax,
      totalOpExpenses,
      ebitda,
      margin: totalRevenue > 0 ? (ebitda / totalRevenue) * 100 : 0
    };
  }, [summaries, transactions]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Controladoria & Fiscal</h2>
          <p className="text-slate-500 font-medium italic">Consolidação contábil, tributária e fechamento de competência.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleExportSAFT}
            disabled={isExporting}
            className={cn(
              "px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm",
              isExporting && "opacity-50 cursor-wait"
            )}
          >
            <FileText className="w-4 h-4" /> {isExporting ? 'Gerando...' : 'Exportar SAFT/XML'}
          </button>
          <button className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl flex items-center gap-3">
            <Calculator className="w-4 h-4" /> Conciliação Bancária
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="EBITDA" value={formatCurrency(accountingMetrics.ebitda)} icon={<TrendingUp />} accentColor="emerald" />
        <StatCard title={localeEngine.settings.taxLabel} value={formatCurrency(accountingMetrics.totalTax)} icon={<Receipt />} accentColor="rose" />
        <StatCard title="OpEx (Despesas)" value={formatCurrency(accountingMetrics.totalOpExpenses)} icon={<Landmark />} accentColor="blue" />
        <StatCard title="Margem Líquida" value={`${accountingMetrics.margin.toFixed(1)}%`} icon={<ShieldCheck />} accentColor="indigo" />
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex items-center justify-between">
           <h3 className="text-xl font-black uppercase italic tracking-tight">Livro Razão por Unidade</h3>
           <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full">Balanço Auditado</span>
        </div>
        <div className="p-10">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                 <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Provisão de Folha (Payroll)</h4>
                 <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 italic">Salários + Encargos Sociais</span>
                    <span className="text-lg font-black text-slate-900">{formatCurrency(12450.00, true)}</span>
                 </div>
                 <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 italic">Comissões Acumuladas</span>
                    <span className="text-lg font-black text-emerald-600">{formatCurrency(3120.50, true)}</span>
                 </div>
              </div>
              <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
                 <div className="relative z-10">
                    <h4 className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em] mb-8">Saúde Fiscal</h4>
                    <div className="space-y-6">
                       <div className="flex justify-between items-center text-sm border-b border-white/5 pb-4">
                          <span className="text-slate-400">Pendências de Emissão</span>
                          <span className="font-black text-rose-400">03 (Urgente)</span>
                       </div>
                       <div className="flex justify-between items-center text-sm border-b border-white/5 pb-4">
                          <span className="text-slate-400">Créditos de IVA/ICMS</span>
                          <span className="font-black text-emerald-400">{formatCurrency(1240.00)}</span>
                       </div>
                       <button className="w-full mt-6 py-4 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all">
                          Gerar Relatório Anual
                       </button>
                    </div>
                 </div>
                 <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
              </div>
           </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-[2.5rem] p-8 flex items-center gap-6">
        <div className="p-4 bg-white rounded-2xl text-amber-500 shadow-sm"><AlertCircle /></div>
        <p className="text-xs font-medium text-amber-800 italic leading-relaxed">
           **Atenção:** O fechamento contábil deste mês exige a validação manual de 2 reconciliações de estoque com impacto acima de 5% no CMV.
        </p>
      </div>
    </div>
  );
};