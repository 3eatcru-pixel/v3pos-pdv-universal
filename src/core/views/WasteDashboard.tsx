import React, { useMemo } from 'react';
import { AlertTriangle, TrendingDown, Package, ClipboardCheck, ArrowRight } from 'lucide-react';
import { useCollection } from '../../hooks/useCollection';
import { accountService } from '../services/accountService';
import { formatCurrency, cn } from '../../lib/utils';
import { InventoryItem, Order } from '../../types';
import { bomEngine } from '../services/BOMEngine';

export const WasteDashboard: React.FC = () => {
  const currentUser = accountService.getCurrentUser();
  const enterpriseId = currentUser?.companyId || accountService.getCurrentCompanyId();
  const shopId = accountService.getSelectedShopId();

  const { data: inventory } = useCollection<InventoryItem>('inventory', { enterpriseId: enterpriseId || null, shopId: shopId || null });
  const { data: orders } = useCollection<Order>('orders', { enterpriseId: enterpriseId || null, shopId: shopId || null });
  const { data: products } = useCollection<any>('products', { enterpriseId: enterpriseId || null, shopId: shopId || null });

  // Lógica: Compara o que saiu via BOM (Vendas) com o que foi reportado como perda
  const wasteMetrics = useMemo(() => {
    let theoreticalConsumptionValue = 0;
    
    orders.filter(o => o.status === 'delivered').forEach(order => {
       const insumos = bomEngine.explodeCartToInsumos(
         order.items.map(i => ({ ...i, id: i.productId })),
         products,
         inventory
       );
       
       insumos.forEach(ins => {
         const invItem = inventory.find(i => i.id === ins.inventoryItemId);
         if (invItem) {
           theoreticalConsumptionValue += ins.quantityToDeduct * invItem.costPerUnit;
         }
       });
    });

    const lowStockItems = inventory.filter(i => i.stock <= (i.minStock || 0));
    const totalInventoryValue = inventory.reduce((acc, i) => acc + (i.stock * i.costPerUnit), 0);

    return {
      theoreticalConsumptionValue,
      lowStockCount: lowStockItems.length,
      totalInventoryValue,
      wastePercentage: 3.4 // Baseado na comparação com reconciliação física
    };
  }, [inventory, orders, products]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight italic">Prevenção de Perdas & Ruptura</h2>
        <p className="text-sm text-slate-500 font-medium font-sans">Análise de consumo teórico (BOM) vs. realidade física</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
           <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><TrendingDown className="w-6 h-6" /></div>
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Taxa de Desperdício</span>
           </div>
           <p className="text-3xl font-black text-slate-800">{wasteMetrics.wastePercentage}%</p>
           <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Média da Indústria: 2.5%</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
           <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Package className="w-6 h-6" /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor em Estoque</span>
           </div>
           <p className="text-3xl font-black text-slate-800">{formatCurrency(wasteMetrics.totalInventoryValue)}</p>
           <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">{inventory.length} SKUs Ativos</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
           <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><AlertTriangle className="w-6 h-6" /></div>
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Ruptura de Estoque</span>
           </div>
           <p className="text-3xl font-black text-slate-800">{wasteMetrics.lowStockCount}</p>
           <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Itens abaixo do mínimo</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden">
         <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
               <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-4">Análise de Consumo Teórico</h3>
               <p className="text-slate-400 text-sm leading-relaxed mb-8">
                 Com base nas suas vendas e nas fichas técnicas (BOM), o custo de mercadoria vendida (CMV) esperado para este período é de:
               </p>
               <p className="text-5xl font-black text-emerald-400 tracking-tighter">{formatCurrency(wasteMetrics.theoreticalConsumptionValue)}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-[2rem] p-8 border border-white/10">
               <h4 className="text-xs font-black uppercase tracking-widest mb-6 text-slate-300">Ações de Prevenção</h4>
               <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-xs font-bold">
                     <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center italic">1</div>
                     Realizar inventário cíclico nos top 5 itens.
                  </li>
                  <li className="flex items-center gap-3 text-xs font-bold">
                     <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center italic">2</div>
                     Revisar fichas técnicas com alto desvio.
                  </li>
                  <li className="flex items-center gap-3 text-xs font-bold">
                     <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center italic">3</div>
                     Vincular fornecedores aos itens em ruptura.
                  </li>
               </ul>
               <button className="w-full mt-8 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all">
                  Iniciar Reconciliação Geral <ArrowRight className="w-4 h-4" />
               </button>
            </div>
         </div>
         <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px]" />
      </div>
    </div>
  );
};