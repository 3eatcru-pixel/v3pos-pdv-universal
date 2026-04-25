import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, Wallet } from 'lucide-react';
import { useCollection } from '../../hooks/useCollection';
import { accountService } from '../services/accountService';
import { formatCurrency, cn } from '../../lib/utils';
import { Order, Staff } from '../../types';

const BusinessModelRevenueWidget: React.FC = () => {
  const enterpriseId = accountService.getCurrentCompanyId();
  const { data: staff } = useCollection<Staff>('staff', { enterpriseId });
  const { data: orders } = useCollection<Order>('orders', { enterpriseId, status: 'delivered' });

  const comparison = useMemo(() => {
    let rentalRevenue = 0;
    let commissionRevenue = 0;
    let freelancerRevenue = 0;

    // 1. Receita de Aluguéis (Taxas fixas cobradas dos profissionais)
    staff.forEach(member => {
      if (member.businessModel === 'rental' || member.businessModel === 'hybrid') {
        rentalRevenue += (member as any).serviceConfig?.rentalFee || 0;
      }
      if (member.businessModel === 'freelancer') {
        // Freelancers geralmente não pagam taxa fixa, mas podemos rastrear se houver uma taxa de agenciamento
      }
    });

    // 2. Margem de Comissões (O que sobra para a empresa após pagar o staff)
    orders.forEach(order => {
      const orderStaff = staff.find(s => s.id === order.staffId);
      if (!orderStaff || orderStaff.businessModel === 'rental') return;

      const config = (orderStaff as any).serviceConfig || { serviceRate: 50, productRate: 10 };
      
      order.items.forEach((item: any) => {
        if (item.status === 'voided') return;
        
        const isService = item.type === 'service';
        const rate = isService ? config.serviceRate : config.productRate;
        const materialCost = Number(item.unitCost || 0) * item.quantity;
        
        // Parte do profissional
        const proCommission = Math.max(0, ((item.price * item.quantity) - materialCost) * (rate / 100));
        
        // Margem da Empresa (Receita total da venda menos a comissão paga)
        commissionRevenue += (item.price * item.quantity) - proCommission;
        if (orderStaff.businessModel === 'freelancer') {
           freelancerRevenue += (item.price * item.quantity) - proCommission;
        }
      });
    });

    return [
      { name: 'Aluguel de Cadeiras', value: rentalRevenue, color: '#3b82f6' },
      { name: 'Margem de Comissões', value: commissionRevenue, color: '#10b981' },
      { name: 'Freelancers (Liquido)', value: freelancerRevenue, color: '#f59e0b' }
    ];
  }, [staff, orders]);

  const total = comparison.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm h-full flex flex-col group hover:border-blue-500 transition-all">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Rentabilidade por Modelo</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Ganhos Reais da Holding</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
          <TrendingUp className="w-5 h-5" />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="h-48 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={comparison} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {comparison.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(val: number) => formatCurrency(val)}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
             <span className="text-[9px] font-black uppercase text-slate-400">Total</span>
             <span className="text-lg font-black text-slate-900 tracking-tighter italic">{formatCurrency(total, total >= 10000)}</span>
          </div>
        </div>

        <div className="space-y-4">
           {comparison.map(item => (
             <div key={item.name} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                   <span className="text-[10px] font-black uppercase text-slate-500">{item.name}</span>
                </div>
                <span className="text-sm font-black text-slate-800 italic">{formatCurrency(item.value)}</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default BusinessModelRevenueWidget;