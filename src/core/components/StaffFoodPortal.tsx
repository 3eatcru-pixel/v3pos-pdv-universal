import React, { useState } from 'react';
import { Utensils, ShieldCheck, CreditCard } from 'lucide-react';
import { motion } from 'motion/react';
import { EndOfDayEngine } from '../services/EndOfDayEngine';
import { formatCurrency, cn } from '../../lib/utils';

export const StaffFoodPortal: React.FC<{ sessionId: string; staff: any }> = ({ sessionId, staff }) => {
  const [cart, setCart] = useState<{name: string, price: number}[]>([]);
  const config = staff.serviceConfig?.staffFood;

  if (!config?.enabled) return null;

  const total = cart.reduce((acc, i) => acc + i.price, 0);
  const remaining = (config?.dailyLimit || 0) - total;

  const handleConfirm = async () => {
    const pin = prompt('AUTORIZAÇÃO REQUERIDA: Digite o PIN do Gerente:');
    if (!pin) return;

    try {
      await EndOfDayEngine.recordStaffMeal(sessionId, {
        staffId: staff.id,
        staffName: staff.name,
        totalAmount: total,
        authorizedBy: `STAFF_ADMIN`, 
        items: cart.map(i => ({ name: i.name, quantity: 1, cost: i.price }))
      }, pin); 

      // Registra como despesa no financeiro para auditoria de CMV
      await EndOfDayEngine.recordStaffMealAsExpense(staff.enterpriseId, staff.assignedShopIds?.[0] || 'main', {
        staffId: staff.id,
        staffName: staff.name,
        totalAmount: total,
        authorizedBy: 'Manager',
        timestamp: Date.now(),
        items: cart.map(i => ({ name: i.name, quantity: 1, cost: i.price }))
      });

      setCart([]);
      alert('Refeição registrada e descontada do balanço diário.');
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
       <div className="relative z-10">
          <div className="flex items-center justify-between mb-10">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center"><Utensils className="text-blue-400" /></div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">Staff Food</h3>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Balanço Disponível</p>
                <p className={cn("text-2xl font-black italic", remaining < 0 ? "text-rose-500" : "text-emerald-400")}>
                  {formatCurrency(remaining)}
                </p>
             </div>
          </div>

          <div className="space-y-6 mb-10">
             {/* Lista de Itens do Menu Staff (Exemplo simplificado) */}
             <button onClick={() => setCart([...cart, { name: 'Refeição Padrão', price: 15.00 }])} className="w-full p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all flex justify-between items-center">
                <span className="font-bold uppercase tracking-tight">Refeição Padrão Staff</span>
                <span className="font-black text-blue-400">{formatCurrency(15.00)}</span>
             </button>
          </div>

          <button 
            disabled={cart.length === 0 || remaining < 0}
            onClick={handleConfirm}
            className="w-full py-6 bg-blue-600 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 disabled:opacity-30 flex items-center justify-center gap-3"
          >
             <ShieldCheck className="w-5 h-5" /> Autorizar Consumo
          </button>
       </div>
    </div>
  );
};