import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MapPin, 
  Phone, 
  Star, 
  Clock, 
  MoreVertical,
  Mail,
  UserPlus,
  ArrowUpRight,
  Target,
  MessageSquare,
  Gift,
  Tag
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatCurrency } from '../../../lib/utils';
import { RetailCustomer } from '../services/retailService';

const MOCK_CUSTOMERS: RetailCustomer[] = [
  {
    id: 'c1',
    name: 'Ana Maria Ferreira',
    email: 'ana.ferreira@email.com',
    phone: '(11) 98877-6655',
    points: 1250,
    tags: ['VIP', 'Premium'],
    lastPurchase: Date.now() - 1000 * 60 * 60 * 24 * 3,
    totalSpent: 4250.80,
    preferences: ['Moda Feminina', 'Sustentabilidade'],
    emergencyContact: { name: 'João Ferreira', phone: '(11) 91234-5678', relation: 'Irmão' },
    returnHistory: [{ date: Date.now() - 1000 * 60 * 60 * 24 * 30, reason: 'Tamanho incorreto', productId: 'p-1' }]
  },
  {
    id: 'c2',
    name: 'Carlos Eduardo Santos',
    email: 'cadu.santos@email.com',
    phone: '(11) 97766-5544',
    points: 450,
    tags: ['Novo', 'Eletrônicos'],
    lastPurchase: Date.now() - 1000 * 60 * 60 * 24 * 15,
    totalSpent: 890.00,
    preferences: ['Gadgets', 'Home Office'],
    emergencyContact: { name: 'Maria Santos', phone: '(11) 98765-4321', relation: 'Esposa' }
  },
  {
    id: 'c3',
    name: 'Beatriz Luiza Oliveira',
    email: 'bia.oliveira@email.com',
    phone: '(11) 96655-4433',
    points: 8900,
    tags: ['Diamond', 'Influencer'],
    lastPurchase: Date.now() - 1000 * 60 * 60 * 2,
    totalSpent: 21450.00,
    preferences: ['Coleção Especial', 'Esportes'],
    returnHistory: []
  },
];

export const RetailCRM: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-3xl font-black text-slate-800 tracking-tight">Relacionamento & CRM</h2>
           <p className="text-slate-500 font-medium">Gestão de clientes, pontos de fidelidade e campanhas</p>
        </div>
        <button className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200">
          <UserPlus className="w-5 h-5" /> Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Clientes', value: '2,4k', icon: <Users className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Conversão LTV', value: 'R$ 840', icon: <Target className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Ativos 30d', value: '840', icon: <Clock className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600' },
          { label: 'Pontos Gerados', value: '145k', icon: <Gift className="w-6 h-6" />, color: 'bg-amber-50 text-amber-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.color}`}>{stat.icon}</div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
             </div>
             <p className="text-2xl font-black text-slate-800">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
         <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-50 relative">
                  <Search className="absolute left-14 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nome, email, telefone ou CPF..."
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] py-4 pl-14 pr-6 font-bold outline-none transition-all"
                  />
               </div>

               <div className="p-4 space-y-4">
                  {MOCK_CUSTOMERS.map(cust => (
                    <div key={cust.id} className="p-8 rounded-[2.5rem] border border-slate-50 bg-slate-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-2xl transition-all group relative overflow-hidden">
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                          <div className="flex items-center gap-6">
                             <div className="w-20 h-20 rounded-3xl bg-white border-4 border-slate-100 overflow-hidden shadow-lg group-hover:border-indigo-500 transition-all">
                                <img src={`https://i.pravatar.cc/100?u=${cust.id}`} alt={cust.name} referrerPolicy="no-referrer" />
                             </div>
                             <div>
                                <h4 className="text-2xl font-black text-slate-800 tracking-tight uppercase group-hover:text-indigo-600 mb-1">{cust.name}</h4>
                                <div className="flex flex-wrap items-center gap-4">
                                   <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-tight">
                                      <Mail className="w-4 h-4" /> {cust.email}
                                   </div>
                                   <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-tight">
                                      <Phone className="w-4 h-4" /> {cust.phone}
                                   </div>
                                </div>
                                <div className="flex items-center gap-2 mt-4">
                                   {cust.tags.map(t => (
                                     <span key={t} className="text-[9px] font-black uppercase px-2 py-1 bg-indigo-600 text-white rounded-md shadow-sm">{t}</span>
                                   ))}
                                </div>

                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {cust.preferences && cust.preferences.length > 0 && (
                                     <div className="bg-slate-100/50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Preferências</p>
                                        <div className="flex flex-wrap gap-1">
                                           {cust.preferences.map(p => (
                                              <span key={p} className="text-[9px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-100">{p}</span>
                                           ))}
                                        </div>
                                     </div>
                                  )}
                                  {cust.emergencyContact && (
                                     <div className="bg-rose-50/30 p-3 rounded-xl border border-rose-100/50">
                                        <p className="text-[8px] font-black uppercase text-rose-400 mb-1 tracking-widest">Contato de Emergência</p>
                                        <p className="text-[10px] font-black text-rose-600 uppercase mb-0.5">{cust.emergencyContact.name}</p>
                                        <p className="text-[9px] font-bold text-rose-400">{cust.emergencyContact.relation} • {cust.emergencyContact.phone}</p>
                                     </div>
                                  )}
                               </div>
                               
                               {cust.returnHistory && cust.returnHistory.length > 0 && (
                                  <div className="mt-3 flex items-center gap-2">
                                     <div className="px-3 py-1 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-2">
                                        <Tag className="w-3 h-3 text-amber-500" />
                                        <span className="text-[9px] font-black text-amber-600 uppercase">Histórico de Devoluções: {cust.returnHistory.length} registros</span>
                                     </div>
                                  </div>
                               )}
                             </div>
                          </div>

                          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-8">
                             <div className="text-center md:text-right">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Pontos Fidelidade</p>
                                <div className="flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-2 rounded-xl border border-amber-100">
                                   <Star className="w-4 h-4 fill-amber-500" />
                                   <span className="text-xl font-black">{cust.points}</span>
                                </div>
                             </div>
                             
                             <div className="text-center md:text-right">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Consumido</p>
                                <p className="text-xl font-black text-slate-800">{formatCurrency(cust.totalSpent)}</p>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             <button className="p-4 bg-white text-slate-400 rounded-2xl hover:text-indigo-600 shadow-sm border border-slate-100 transition-all"><MessageSquare className="w-5 h-5" /></button>
                             <button className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"><ArrowUpRight className="w-5 h-5" /></button>
                          </div>
                       </div>
                       <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
               </div>
            </div>
         </div>

         <div className="space-y-8">
            <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl">
               <h3 className="text-2xl font-black mb-6 uppercase tracking-tight italic">Próximas Campanhas</h3>
               <div className="space-y-6">
                  {[
                    { name: 'Dia das Mães 20% OFF', date: '12 Maio', reach: '1,2k clientes' },
                    { name: 'Saldão Inverno', date: '01 Junho', reach: '840 clientes' },
                    { name: 'Aniversariantes Junho', date: '01-30 Junho', reach: '120 clientes' },
                  ].map((camp, i) => (
                    <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                       <p className="font-black text-indigo-400 text-[10px] uppercase tracking-widest mb-2">{camp.date}</p>
                       <h4 className="font-black uppercase text-sm mb-2">{camp.name}</h4>
                       <p className="text-xs text-white/50 font-medium tracking-tight flex items-center gap-2">
                          <Users className="w-3 h-3" /> Alcance: {camp.reach}
                       </p>
                    </div>
                  ))}
               </div>
               <button className="w-full mt-8 py-5 bg-indigo-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-500 transition-all">Criar Nova Campanha</button>
            </div>

            <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
               <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-tight flex items-center gap-3">
                  <Star className="w-5 h-5 text-amber-500" /> Benefícios Ativos
               </h3>
               <div className="space-y-4">
                  {[
                    { label: '1000 pts = R$ 10,00', status: 'Ativo' },
                    { label: 'Brinde Aniversário', status: 'Ativo' },
                    { label: 'Frete Grátis Diamond', status: 'Pausado' },
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                       <span className="text-xs font-bold text-slate-800">{benefit.label}</span>
                       <span className={cn(
                         "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                         benefit.status === 'Ativo' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                       )}>{benefit.status}</span>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
