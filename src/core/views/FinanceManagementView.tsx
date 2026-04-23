import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Filter, 
  Search, 
  Plus, 
  PieChart, 
  Download,
  AlertCircle,
  Clock,
  MoreVertical,
  CheckCircle2,
  X,
  FileText,
  Briefcase,
  Boxes,
  ClipboardCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../../lib/utils';
import { StatCard } from '../components/CommonUI';
import { InventoryItem, RecountRequest, Transaction } from '../../types';
import { accountService } from '../services/accountService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FinanceEngine } from '../services/FinanceEngine';
import { StockReconciliationEngine } from '../services/StockReconciliationEngine';

interface FinanceManagementViewProps {
  module: 'restaurant' | 'market' | 'construction' | 'retail';
  shopId: string | null;
}

const CATEGORIES = [
  'Fornecedores', 
  'Salários / Encargos', 
  'Aluguel / Condomínio', 
  'Marketing / Social', 
  'Impostos / Taxas', 
  'Manutenção / Obras', 
  'Venda de Produtos', 
  'Serviços Prestados', 
  'Outros'
];

export const FinanceManagementView: React.FC<FinanceManagementViewProps> = ({ module, shopId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [recountRequests, setRecountRequests] = useState<RecountRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [saving, setSaving] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [countedStock, setCountedStock] = useState('');
  const [reconcileComment, setReconcileComment] = useState('');

  const currentUser = accountService.getCurrentUser();
  const companyId = currentUser?.companyId || 'default';

  useEffect(() => {
    loadTransactions();
    loadInventoryData();
  }, [companyId, shopId]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await FinanceEngine.listTransactions(companyId, shopId);
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryData = async () => {
    try {
      const [items, recounts] = await Promise.all([
        StockReconciliationEngine.listInventory(companyId, shopId),
        StockReconciliationEngine.listRecountRequests(companyId, shopId),
      ]);
      setInventoryItems(items);
      setRecountRequests(recounts.slice(0, 8));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);

    try {
      await FinanceEngine.createTransaction({
        enterpriseId: companyId,
        shopId,
        module: module as any,
        staffId: currentUser?.id || 'manual',
        staffName: currentUser?.name || 'Manual',
        type: formData.get('type') as 'income' | 'expense',
        amount: parseFloat(formData.get('amount') as string),
        category: formData.get('category') as string,
        description: formData.get('description') as string,
        date: formData.get('date') as string,
      });
      setIsAddModalOpen(false);
      loadTransactions();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleReconcileStock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInventoryId) return;
    const selectedItem = inventoryItems.find((item) => item.id === selectedInventoryId);
    if (!selectedItem) return;

    setReconciling(true);
    try {
      await StockReconciliationEngine.reconcileStock({
        enterpriseId: companyId,
        shopId,
        item: selectedItem,
        newStock: Number(countedStock),
        comment: reconcileComment,
        staffId: currentUser?.id || 'manual',
        staffName: currentUser?.name || 'Manual',
      });
      setIsReconcileModalOpen(false);
      setSelectedInventoryId('');
      setCountedStock('');
      setReconcileComment('');
      await loadInventoryData();
    } catch (err) {
      console.error(err);
      alert('Falha ao aplicar reconciliação de estoque.');
    } finally {
      setReconciling(false);
    }
  };

  const { totalIncome, totalExpense, balance } = FinanceEngine.summarize(transactions);
  const filteredTransactions = FinanceEngine.filterTransactions(transactions, filterType, searchTerm);
  const selectedInventoryItem = inventoryItems.find((item) => item.id === selectedInventoryId) || null;
  const inventoryCostMap = inventoryItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.id] = Number(item.costPerUnit) || 0;
    return acc;
  }, {});
  const dre = FinanceEngine.summarizeDre(transactions, recountRequests, inventoryCostMap);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Finanças & Cash Flow</h2>
           <p className="text-slate-500 font-medium italic">Monitoramento estratégico do patrimônio e fluxos operacionais.</p>
        </div>
        <div className="flex gap-4">
           <button className="px-8 py-5 bg-white border border-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm">
              <Download className="w-4 h-4" /> Exportar Balanço
           </button>
           <button 
             onClick={() => setIsAddModalOpen(true)}
             className="px-10 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl flex items-center gap-3 active:scale-95"
           >
              <Plus className="w-4 h-4" /> Novo Lançamento
           </button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <StatCard 
            title="Saldo Disponível"
            value={formatCurrency(balance)}
            icon={<Wallet />}
            variant="dark"
            accentColor="blue"
            subtitle="Consolidado Empresa"
         />

         <StatCard 
            title="Entradas / Receita"
            value={formatCurrency(totalIncome)}
            icon={<TrendingUp />}
            accentColor="emerald"
            subtitle="Fluxo Mensal"
         />

         <StatCard 
            title="Saídas / Despesas"
            value={formatCurrency(totalExpense)}
            icon={<TrendingDown />}
            accentColor="rose"
            subtitle="Fluxo Mensal"
         />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <StatCard title="DRE Receita Bruta" value={formatCurrency(dre.receitaBruta)} icon={<TrendingUp />} accentColor="emerald" subtitle="Período filtrado" />
         <StatCard title="DRE Despesas" value={formatCurrency(dre.despesasOperacionais)} icon={<TrendingDown />} accentColor="rose" subtitle="Período filtrado" />
         <StatCard title="Impacto Reconciliação" value={formatCurrency(dre.impactoReconciliacao)} icon={<ClipboardCheck />} accentColor="amber" subtitle="Diferença x custo unitário" />
         <StatCard title="Resultado Líquido" value={formatCurrency(dre.resultadoLiquido)} icon={<DollarSign />} accentColor="blue" subtitle="Receita - Despesa + Ajustes" />
      </div>

      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Contagem & Reconciliação de Estoque</h3>
              <p className="text-sm text-slate-500 font-medium">Valide contagens físicas e aplique ajustes com trilha de auditoria.</p>
            </div>
            <button
              onClick={() => setIsReconcileModalOpen(true)}
              className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-3"
            >
              <ClipboardCheck className="w-4 h-4" /> Nova Contagem
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Itens em Estoque"
              value={String(inventoryItems.length)}
              icon={<Boxes />}
              accentColor="blue"
              subtitle="Inventário monitorado"
            />
            <StatCard
              title="Reconciliações"
              value={String(recountRequests.length)}
              icon={<CheckCircle2 />}
              accentColor="emerald"
              subtitle="Últimos registros"
            />
            <StatCard
              title="Última Contagem"
              value={recountRequests[0] ? format(recountRequests[0].date, 'dd/MM HH:mm') : '--'}
              icon={<Clock />}
              accentColor="amber"
              subtitle="Data da última aplicação"
            />
         </div>

         <div className="overflow-x-auto">
           <table className="w-full border-separate border-spacing-y-3">
             <thead>
               <tr className="text-left">
                 <th className="px-5 pb-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Item</th>
                 <th className="px-5 pb-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Anterior</th>
                 <th className="px-5 pb-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Novo</th>
                 <th className="px-5 pb-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Diferença</th>
                 <th className="px-5 pb-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Data</th>
               </tr>
             </thead>
             <tbody>
               {recountRequests.map((row) => {
                 const diff = row.newStock - row.previousStock;
                 return (
                   <tr key={row.id} className="bg-slate-50">
                     <td className="px-5 py-4 rounded-l-xl">
                       <div className="font-black text-slate-800 text-xs">{row.itemName}</div>
                       <div className="text-[10px] text-slate-400">{row.comment}</div>
                     </td>
                     <td className="px-5 py-4 text-sm font-bold text-slate-700">{row.previousStock}</td>
                     <td className="px-5 py-4 text-sm font-bold text-slate-700">{row.newStock}</td>
                     <td className={cn("px-5 py-4 text-sm font-black", diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-500')}>
                       {diff > 0 ? '+' : ''}{diff}
                     </td>
                     <td className="px-5 py-4 rounded-r-xl text-xs font-bold text-slate-500">{format(row.date, 'dd/MM/yyyy HH:mm')}</td>
                   </tr>
                 );
               })}
               {recountRequests.length === 0 && (
                 <tr>
                   <td colSpan={5} className="py-10 text-center text-sm text-slate-400 italic">Nenhuma reconciliação aplicada ainda.</td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
      </div>

      {/* Filter & Inventory View */}
      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10">
         <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative flex-1 w-full">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
               <input 
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
                 placeholder="Filtrar por descrição ou categoria..."
                 className="w-full bg-slate-50 border-none rounded-[1.5rem] py-6 pl-16 pr-8 font-bold text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all italic"
               />
            </div>
            <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
               {['all', 'income', 'expense'].map((t) => (
                 <button 
                   key={t}
                   onClick={() => setFilterType(t as any)}
                   className={cn(
                     "px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                     filterType === t ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                   )}
                 >
                   {t === 'all' ? 'Tudo' : t === 'income' ? 'Entradas' : 'Saídas'}
                 </button>
               ))}
            </div>
         </div>

         {/* Transactions Grid/Table */}
         <div className="overflow-x-auto pb-4">
            <table className="w-full border-separate border-spacing-y-4">
               <thead>
                  <tr className="text-left">
                     <th className="px-6 pb-2 text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Data & Status</th>
                     <th className="px-6 pb-2 text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Descrição</th>
                     <th className="px-6 pb-2 text-[10px] font-black uppercase text-slate-400 tracking-widest italic text-center">Forma</th>
                     <th className="px-6 pb-2 text-[10px] font-black uppercase text-slate-400 tracking-widest italic text-right">Valor Bruto</th>
                  </tr>
               </thead>
               <tbody>
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="group hover:scale-[1.01] transition-transform cursor-pointer">
                       <td className="px-6 py-6 bg-slate-50 group-hover:bg-white rounded-l-[1.5rem] transition-colors border-y border-transparent group-hover:border-slate-100 border-l">
                          <div className="flex items-center gap-4">
                             <div className={cn(
                               "w-12 h-12 rounded-[1rem] flex items-center justify-center shadow-sm",
                               t.type === 'income' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                             )}>
                                {t.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                             </div>
                             <div>
                                <p className="font-black text-slate-900 text-sm tracking-tight italic leading-none">{format(t.timestamp, 'dd MMM', { locale: ptBR })}</p>
                                <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest mt-1">Liquidado</span>
                             </div>
                          </div>
                       </td>
                       <td className="px-6 py-6 bg-slate-50 group-hover:bg-white transition-colors border-y border-transparent group-hover:border-slate-100">
                          <div>
                             <p className="font-black text-slate-800 uppercase text-xs tracking-tight italic">{t.description}</p>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-100 px-2 py-0.5 rounded-md mt-1">{t.category}</span>
                          </div>
                       </td>
                       <td className="px-6 py-6 bg-slate-50 group-hover:bg-white transition-colors text-center border-y border-transparent group-hover:border-slate-100">
                          <div className="flex flex-col items-center">
                             <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                <CreditCard className="w-4 h-4" />
                             </div>
                             <span className="text-[8px] font-black uppercase text-slate-300 mt-1">DIGITAL</span>
                          </div>
                       </td>
                       <td className="px-6 py-6 bg-slate-50 group-hover:bg-white rounded-r-[1.5rem] transition-colors text-right border-y border-transparent group-hover:border-slate-100 border-r">
                          <span className={cn(
                            "text-xl font-black italic tracking-tighter",
                            t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                          )}>
                             {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                          </span>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>

            {filteredTransactions.length === 0 && (
               <div className="py-32 flex flex-col items-center justify-center grayscale opacity-30 text-center space-y-6">
                  <Wallet className="w-16 h-16 text-slate-300" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhum fluxo registrado neste período estratégico.</p>
               </div>
            )}
         </div>
      </div>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {isReconcileModalOpen && (
          <div className="fixed inset-0 z-[720] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white rounded-[3rem] shadow-4xl p-12 relative"
            >
              <button onClick={() => setIsReconcileModalOpen(false)} className="absolute top-8 right-8 p-3 text-slate-400 hover:text-rose-500 transition-all">
                <X className="w-7 h-7" />
              </button>
              <div className="mb-8">
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Reconciliação de Estoque</h3>
                <p className="text-slate-500 font-medium italic mt-2">Registre a contagem física e aplique o ajuste auditável.</p>
              </div>

              <form onSubmit={handleReconcileStock} className="space-y-6">
                <div>
                  <label htmlFor="inventory-item" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Item do estoque</label>
                  <select
                    id="inventory-item"
                    value={selectedInventoryId}
                    onChange={(e) => setSelectedInventoryId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 font-bold focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="">Selecione um item</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.currentStock} {item.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="previous-stock" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Estoque atual</label>
                    <input
                      id="previous-stock"
                      value={selectedInventoryItem ? `${selectedInventoryItem.currentStock} ${selectedInventoryItem.unit}` : '--'}
                      readOnly
                      className="w-full bg-slate-100 rounded-2xl p-5 font-bold text-slate-600"
                    />
                  </div>
                  <div>
                    <label htmlFor="counted-stock" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Contagem física</label>
                    <input
                      id="counted-stock"
                      type="number"
                      min="0"
                      step="0.001"
                      value={countedStock}
                      onChange={(e) => setCountedStock(e.target.value)}
                      required
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 font-black text-slate-900 focus:border-emerald-500 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reconcile-comment" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Motivo / observação</label>
                  <textarea
                    id="reconcile-comment"
                    value={reconcileComment}
                    onChange={(e) => setReconcileComment(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 font-bold focus:border-emerald-500 outline-none transition-all"
                    placeholder="Ex: contagem de fechamento de turno"
                  />
                </div>

                <button
                  type="submit"
                  disabled={reconciling}
                  className={cn(
                    "w-full py-5 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest transition-all",
                    reconciling ? "bg-slate-400 text-white cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700"
                  )}
                >
                  {reconciling ? 'Aplicando...' : 'Aplicar Reconciliação'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isAddModalOpen && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
             <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-xl bg-white rounded-[3rem] shadow-4xl p-16 relative"
             >
                <button onClick={() => setIsAddModalOpen(false)} className="absolute top-10 right-10 p-4 text-slate-400 hover:text-rose-500 transition-all active:scale-90">
                   <X className="w-8 h-8" />
                </button>

                <div className="mb-12">
                   <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Novo Lançamento</h3>
                   <p className="text-slate-500 font-medium italic mt-2">Classifique a movimentação para auditagem contábil.</p>
                </div>

                <form onSubmit={handleAddTransaction} className="space-y-10">
                   <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                      {['income', 'expense'].map((type) => (
                        <label key={type} className="flex-1 relative cursor-pointer">
                           <input type="radio" name="type" value={type} defaultChecked={type === 'income'} className="sr-only peer" />
                           <div className={cn(
                             "py-4 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                             "peer-checked:bg-slate-900 peer-checked:text-white peer-checked:shadow-xl",
                             "text-slate-400 hover:text-slate-600"
                           )}>
                              {type === 'income' ? 'Entrada / Receita' : 'Saída / Despesa'}
                           </div>
                        </label>
                      ))}
                   </div>

                   <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Valor da Operação (BRL)</label>
                           <input name="amount" type="number" step="0.01" required className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-6 font-black text-3xl italic tracking-tighter text-slate-900 focus:border-blue-500 outline-none transition-all" placeholder="0,00" />
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Data Lançamento</label>
                           <input name="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-6 font-black text-xl italic text-slate-900 focus:border-blue-500 outline-none transition-all" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Categoria</label>
                            <select name="category" required className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 font-bold italic focus:border-blue-500 outline-none transition-all appearance-none">
                               {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Descrição Curta</label>
                            <input name="description" required className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 font-bold italic focus:border-blue-500 outline-none transition-all" placeholder="Ex: Pagamento Ambev s/m..." />
                         </div>
                      </div>
                   </div>

                   <button 
                     type="submit" 
                     disabled={saving}
                     className={cn(
                       "w-full py-6 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest transition-all shadow-2xl active:scale-[0.98]",
                       saving ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 text-white hover:bg-black"
                     )}
                   >
                     {saving ? 'Processando...' : 'Confirmar Transação'}
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
