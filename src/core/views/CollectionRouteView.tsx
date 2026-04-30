import React, { useMemo } from 'react';
import { MapPin, ChevronRight, Wallet, User, Phone, Navigation, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCollection } from '../../hooks/useCollection';
import { accountService } from '../services/accountService';
import { Customer } from '../services/CustomerEngine';
import { cn, formatCurrency } from '../../lib/utils';

export const CollectionRouteView: React.FC = () => {
  const enterpriseId = accountService.getCurrentCompanyId();
  const { data: customers, loading } = useCollection<Customer>('customers', { enterpriseId });

  // Lógica de Roteirização: Agrupa devedores por bairro
  const neighborhoodGroups = useMemo(() => {
    const debtors = customers.filter(c => c.currentDebt > 0);
    const groups: Record<string, { customers: Customer[], totalDebt: number }> = {};

    debtors.forEach(c => {
      const neighborhood = c.address?.neighborhood || 'Círculo de Confiança';
      if (!groups[neighborhood]) groups[neighborhood] = { customers: [], totalDebt: 0 };
      groups[neighborhood].customers.push(c);
      groups[neighborhood].totalDebt += c.currentDebt;
    });

    return Object.entries(groups).sort((a, b) => b[1].totalDebt - a[1].totalDebt);
  }, [customers]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 font-sans pb-20">
      <div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Roteiro de Cobrança</h2>
        <p className="text-slate-500 font-medium italic">Visão logística de recebíveis agrupada por bairro.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {neighborhoodGroups.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 opacity-40">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Nenhum débito pendente na rede</p>
          </div>
        ) : (
          neighborhoodGroups.map(([neighborhood, group], idx) => (
            <motion.div 
              key={neighborhood}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                    <MapPin className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">{neighborhood}</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{group.customers.length} clientes na rota</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Total a Receber</p>
                  <p className="text-2xl font-black italic tracking-tighter">{formatCurrency(group.totalDebt)}</p>
                </div>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.customers.map(customer => (
                  <div key={customer.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-blue-500 transition-all group cursor-pointer">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-400 group-hover:text-blue-600 transition-colors">
                          <User size={18} />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 text-sm uppercase italic leading-none">{customer.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">{customer.phone}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-rose-600 italic">{formatCurrency(customer.currentDebt)}</span>
                    </div>

                    {customer.address && (
                      <div className="mb-6 p-3 bg-white/50 rounded-xl text-[10px] text-slate-500 font-medium leading-tight">
                        <p className="font-black text-slate-400 uppercase text-[8px] mb-1">Localização</p>
                        {customer.address.street}, {customer.address.number}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-500 flex items-center justify-center gap-2 hover:bg-blue-50 transition-all">
                        <Navigation size={10} /> Rota
                      </button>
                      <button className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all">
                        <Wallet size={10} /> Baixar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
