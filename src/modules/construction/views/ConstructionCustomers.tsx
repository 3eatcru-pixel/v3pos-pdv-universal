import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  MoreVertical,
  Building2,
  User,
  X,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { constructionService, Customer } from '../services/constructionService';

export const ConstructionCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Omit<Customer, 'id' | 'createdAt'>>({
    name: '',
    address: '',
    phone: '',
    email: '',
    notes: '',
    type: 'individual',
    document: ''
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const data = await constructionService.getCustomers();
    setCustomers(data);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    await constructionService.addCustomer(newCustomer);
    setIsModalOpen(false);
    loadCustomers();
    setNewCustomer({
      name: '',
      address: '',
      phone: '',
      email: '',
      notes: '',
      type: 'individual',
      document: ''
    });
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Cadastro de Clientes</h2>
          <p className="text-slate-500 font-medium">Gestão de contatos, endereços de entrega e históricos</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
        >
          <Plus className="w-5 h-5" /> Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome, endereço ou CPF/CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-transparent focus:border-blue-500 rounded-xl py-3 pl-12 pr-6 font-medium outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCustomers.map(customer => (
              <motion.div 
                layout
                key={customer.id}
                className="p-6 rounded-[2rem] border border-slate-100 bg-slate-50/30 hover:bg-white hover:border-blue-200 hover:shadow-xl transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    customer.type === 'company' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                  )}>
                    {customer.type === 'company' ? <Building2 className="w-6 h-6" /> : <User className="w-6 h-6" />}
                  </div>
                  <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-black text-slate-800 text-lg leading-tight uppercase tracking-tight">{customer.name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      {customer.type === 'company' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                      {customer.document && ` • ${customer.document}`}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-3 text-xs font-bold text-slate-500">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{customer.address}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{customer.phone}</span>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                  </div>

                  {customer.notes && (
                    <div className="p-4 bg-white rounded-xl border border-slate-100 italic text-[11px] text-slate-500 leading-relaxed">
                      "{customer.notes}"
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button className="text-[10px] font-black uppercase text-blue-600 hover:underline">Ver Histórico</button>
                    <div className="flex items-center gap-1 text-[8px] font-black text-slate-300 uppercase">
                       <Clock className="w-2.5 h-2.5" /> {new Date(customer.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* New Customer Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-white rounded-[3rem] shadow-3xl relative z-10 overflow-hidden"
            >
              <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Novo Cliente</h3>
                  <p className="text-slate-500 font-medium text-sm">Preencha os dados básicos para entrega.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-rose-500 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-2 rounded-2xl mb-8">
                  <button 
                    type="button"
                    onClick={() => setNewCustomer({...newCustomer, type: 'individual'})}
                    className={cn(
                      "py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      newCustomer.type === 'individual' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"
                    )}
                  >
                    Pessoa Física
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewCustomer({...newCustomer, type: 'company'})}
                    className={cn(
                      "py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      newCustomer.type === 'company' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"
                    )}
                  >
                    Pessoa Jurídica
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Nome Completo / Razão Social</label>
                    <input 
                      required
                      type="text" 
                      value={newCustomer.name}
                      onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                      placeholder="Ex: João da Silva ou Construtora ABC"
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Documento (CPF/CNPJ)</label>
                      <input 
                        type="text" 
                        value={newCustomer.document}
                        onChange={e => setNewCustomer({...newCustomer, document: e.target.value})}
                        placeholder="000.000.000-00"
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Telefone de Contato</label>
                      <input 
                        required
                        type="text" 
                        value={newCustomer.phone}
                        onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                        placeholder="(00) 00000-0000"
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Endereço de Entrega</label>
                    <input 
                      required
                      type="text" 
                      value={newCustomer.address}
                      onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                      placeholder="Rua, Número, Bairro, Cidade..."
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Observações Adicionais</label>
                    <textarea 
                      rows={3}
                      value={newCustomer.notes}
                      onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})}
                      placeholder="Pontos de referência, horários de entrega, etc..."
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-200 transition-all"
                  >
                    Descartar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
                  >
                    Salvar Cliente
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
