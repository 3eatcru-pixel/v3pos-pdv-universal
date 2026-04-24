import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  UserPlus,
  Star,
  X,
  ShieldCheck,
} from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';
import { RetailCustomer } from '../services/retailService';
import { accountService } from '../../../core/services/accountService';
import { firebaseService } from '../../../services/firebaseService';
import { AnimatePresence } from 'motion/react';

type RetailCustomerRecord = RetailCustomer & {
  enterpriseId: string;
  shopId: string;
  consentMarketing?: boolean;
  consentUpdatedAt?: number;
};

export const RetailCRM: React.FC = () => {
  const [customers, setCustomers] = useState<RetailCustomerRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const currentUser = accountService.getCurrentUser();
  const enterpriseId = currentUser?.companyId || accountService.getCurrentCompanyId();
  const shopId = accountService.getSelectedShopId();

  useEffect(() => {
    if (!enterpriseId || !shopId) return;
    const unsub = firebaseService.subscribeCollection('customers', enterpriseId, shopId, (data) => {
      setCustomers((data as RetailCustomerRecord[]).sort((a, b) => (b.lastPurchase || 0) - (a.lastPurchase || 0)));
    });
    return () => unsub();
  }, [enterpriseId, shopId]);

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((cust) =>
      String(cust.name || '').toLowerCase().includes(term) ||
      String(cust.email || '').toLowerCase().includes(term) ||
      String(cust.phone || '').toLowerCase().includes(term),
    );
  }, [customers, searchTerm]);

  const totalSpent = customers.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0);
  const avgLtv = customers.length > 0 ? totalSpent / customers.length : 0;
  const consentedCount = customers.filter((c) => c.consentMarketing).length;

  const handleCreateCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!enterpriseId || !shopId) {
      alert('Contexto de empresa/loja nao encontrado.');
      return;
    }
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const consentMarketing = formData.get('consentMarketing') === 'on';
    if (!name || !email || !phone) return;

    setIsSavingCustomer(true);
    try {
      const customerId = `cust-${Date.now()}`;
      const payload: RetailCustomerRecord = {
        id: customerId,
        enterpriseId,
        shopId,
        name,
        email,
        phone,
        points: 0,
        tags: ['Novo'],
        totalSpent: 0,
        lastPurchase: Date.now(),
        consentMarketing,
        consentUpdatedAt: Date.now(),
      };

      await firebaseService.saveItem('customers', customerId, payload);
      await firebaseService.addAuditLog({
        enterpriseId,
        shopId,
        staffId: currentUser?.id || 'manual',
        staffName: currentUser?.name || 'Manual',
        action: 'crm_customer_created',
        details: `Cliente ${name} criado com consentimento marketing=${consentMarketing}.`,
        referenceId: customerId,
      });
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      alert('Nao foi possivel criar cliente.');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Relacionamento & CRM</h2>
          <p className="text-slate-500 font-medium">Clientes reais da base com trilha de consentimento.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200"
        >
          <UserPlus className="w-5 h-5" /> Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Clientes</p>
          <p className="text-2xl font-black text-slate-800">{customers.length}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LTV Medio</p>
          <p className="text-2xl font-black text-emerald-600">{formatCurrency(avgLtv)}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pontos Totais</p>
          <p className="text-2xl font-black text-amber-600">{customers.reduce((sum, c) => sum + Number(c.points || 0), 0)}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consentimento Marketing</p>
          <p className="text-2xl font-black text-indigo-600">{consentedCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 relative">
          <Search className="absolute left-14 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, email ou telefone..."
            className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] py-4 pl-14 pr-6 font-bold outline-none transition-all"
          />
        </div>

        <div className="p-4 space-y-4">
          {filteredCustomers.map((cust) => (
            <div key={cust.id} className="p-6 rounded-[2rem] border border-slate-100 bg-slate-50/60">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">{cust.name}</h4>
                  <div className="flex flex-wrap items-center gap-4 mt-1">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Mail className="w-4 h-4" /> {cust.email}</span>
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Phone className="w-4 h-4" /> {cust.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] font-black uppercase bg-amber-50 text-amber-600 px-2 py-1 rounded-md flex items-center gap-1"><Star className="w-3 h-3" /> {cust.points} pts</span>
                    <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md">{formatCurrency(cust.totalSpent || 0)}</span>
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1",
                      cust.consentMarketing ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                    )}>
                      <ShieldCheck className="w-3 h-3" />
                      {cust.consentMarketing ? 'Consentimento OK' : 'Sem consentimento'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ultima compra</p>
                  <p className="text-xs font-bold text-slate-700">{cust.lastPurchase ? new Date(cust.lastPurchase).toLocaleDateString('pt-BR') : '--'}</p>
                </div>
              </div>
            </div>
          ))}
          {filteredCustomers.length === 0 && (
            <div className="p-10 text-center text-sm font-bold text-slate-400">Nenhum cliente encontrado.</div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[220] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-xl rounded-[2rem] p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Novo Cliente</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <input name="name" required placeholder="Nome completo" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
                <input name="email" type="email" required placeholder="Email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
                <input name="phone" required placeholder="Telefone" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <input name="consentMarketing" type="checkbox" className="w-4 h-4" />
                  Autoriza comunicacoes de marketing
                </label>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className={cn(
                    "w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all",
                    isSavingCustomer ? "bg-slate-400 text-white cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700"
                  )}
                >
                  {isSavingCustomer ? 'Salvando...' : 'Salvar cliente'}
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
