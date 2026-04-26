import React, { useState } from 'react';
import { X, User, Phone, FileText, MapPin, Save, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { CustomerEngine, Customer } from '../services/CustomerEngine';
import { accountService } from '../services/accountService';
import { cn } from '../../lib/utils';

interface CustomerRegistrationFormProps {
  onClose: () => void;
  initialData?: Partial<Customer>;
}

export const CustomerRegistrationForm: React.FC<CustomerRegistrationFormProps> = ({ onClose, initialData }) => {
  const enterpriseId = accountService.getCurrentCompanyId() || '';
  const [mode, setMode] = useState<'simple' | 'full'>(initialData?.registrationMode || 'simple');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const customerData: Partial<Customer> = {
      id: initialData?.id,
      registrationMode: mode,
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      document: formData.get('document') as string,
      creditLimit: Number(formData.get('creditLimit')) || 0,
      notes: formData.get('notes') as string,
      address: mode === 'full' ? {
        street: formData.get('street') as string,
        number: formData.get('number') as string,
        neighborhood: formData.get('neighborhood') as string,
        city: formData.get('city') as string,
        zipCode: formData.get('zipCode') as string,
      } : undefined
    };

    try {
      await CustomerEngine.saveCustomer(enterpriseId, customerData);
      onClose();
    } catch (error) {
      alert('Falha ao salvar cliente. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-[3rem] shadow-4xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Cadastro de Cliente</h3>
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => setMode('simple')}
                className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all", mode === 'simple' ? "bg-blue-600 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-200")}
              >
                Confiança (Simples)
              </button>
              <button 
                onClick={() => setMode('full')}
                className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all", mode === 'full' ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-200")}
              >
                Controle Formal
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-4 text-slate-300 hover:text-rose-500 transition-colors"><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input name="name" defaultValue={initialData?.name} required className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-12 pr-6 font-bold text-sm outline-none transition-all" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">WhatsApp / Telefone</label>
              <div className="relative">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input name="phone" defaultValue={initialData?.phone} required className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-12 pr-6 font-bold text-sm outline-none transition-all" />
              </div>
            </div>
          </div>

          {mode === 'full' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-8 pt-4 border-t border-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">CPF / CNPJ</label>
                  <div className="relative">
                    <FileText className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input name="document" defaultValue={initialData?.document} className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-12 pr-6 font-bold text-sm outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Limite de Crédito</label>
                  <input name="creditLimit" type="number" step="0.01" defaultValue={initialData?.creditLimit} className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 px-6 font-black text-emerald-600 outline-none transition-all" placeholder="R$ 0,00" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Endereço de Cobrança</span>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <input name="street" placeholder="Rua / Logradouro" className="col-span-3 bg-slate-50 p-4 rounded-xl text-xs font-bold" defaultValue={initialData?.address?.street} />
                  <input name="number" placeholder="Nº" className="col-span-1 bg-slate-50 p-4 rounded-xl text-xs font-bold text-center" defaultValue={initialData?.address?.number} />
                  <input name="neighborhood" placeholder="Bairro" className="col-span-2 bg-slate-50 p-4 rounded-xl text-xs font-bold" defaultValue={initialData?.address?.neighborhood} />
                  <input name="city" placeholder="Cidade" className="col-span-2 bg-slate-50 p-4 rounded-xl text-xs font-bold" defaultValue={initialData?.address?.city} />
                </div>
              </div>
            </motion.div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Observações do Vendedor</label>
            <textarea name="notes" defaultValue={initialData?.notes} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl p-6 font-medium italic text-xs h-24 resize-none outline-none transition-all" placeholder="Ex: Mora perto da escola, paga sempre no dia 10..." />
          </div>
        </form>

        <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button onClick={onClose} className="flex-1 py-5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all">Cancelar</button>
          <button 
            form="reg-form" 
            type="submit" 
            disabled={loading}
            className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            {loading ? <Zap className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Validar e Salvar
          </button>
        </div>
      </motion.div>
    </div>
  );
};