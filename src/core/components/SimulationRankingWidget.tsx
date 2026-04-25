import React, { useMemo } from 'react';
import { Trophy, Medal, Star, TrendingUp, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useCollection } from '../../hooks/useCollection';
import { accountService } from '../services/accountService';
import { Order, Staff } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';

const SimulationRankingWidget: React.FC = () => {
  const enterpriseId = accountService.getCurrentCompanyId();
  const shopId = accountService.getSelectedShopId();

  const { data: staff } = useCollection<Staff>('staff', { enterpriseId });
  const { data: orders } = useCollection<Order>('orders', { 
    enterpriseId, 
    shopId: shopId || null,
    status: 'delivered' 
  });

  const ranking = useMemo(() => {
    // Filtrar apenas staff de simulação (IDs mock-staff)
    const mockStaff = staff.filter(s => s.id.startsWith('mock-staff'));
    
    const performance = mockStaff.map(member => {
      const memberOrders = orders.filter(o => o.staffId === member.id);
      const totalGenerated = memberOrders.reduce((sum, o) => sum + o.total, 0);
      
      return {
        id: member.id,
        name: member.name,
        role: member.role,
        total: totalGenerated,
        count: memberOrders.length
      };
    });

    return performance.sort((a, b) => b.total - a.total).slice(0, 3);
  }, [staff, orders]);

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm h-full flex flex-col group hover:border-blue-500 transition-all">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 italic leading-none">Ranking Simulation</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-tighter">Top Performers do Modo Jogo</p>
        </div>
        <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/10">
          <Trophy className="w-5 h-5" />
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {ranking.length > 0 ? (
          ranking.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "p-4 rounded-2xl flex items-center justify-between border-2 transition-all",
                idx === 0 ? "bg-blue-50 border-blue-100 shadow-blue-500/5" : "bg-slate-50 border-transparent"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs italic",
                  idx === 0 ? "bg-blue-600 text-white" : "bg-white text-slate-400 border border-slate-200"
                )}>
                  {idx + 1}º
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase italic leading-none">{item.name}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{item.role}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-slate-900 italic tracking-tighter">{formatCurrency(item.total)}</p>
                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{item.count} vendas</p>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-10">
            <Star className="w-10 h-10 text-slate-300 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Inicie o Modo Jogo para ver o ranking</p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-center gap-2">
         <TrendingUp className="w-3 h-3 text-blue-500" />
         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Atualização P2P em tempo real</span>
      </div>
    </div>
  );
};

export default SimulationRankingWidget;