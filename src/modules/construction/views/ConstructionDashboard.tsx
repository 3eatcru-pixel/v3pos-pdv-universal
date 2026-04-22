import React from 'react';
import { Package, Truck, FileText, Users, ShoppingCart } from 'lucide-react';

export const ConstructionDashboard: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">Painel de Materiais</h1>
          <p className="text-slate-500 font-medium font-sans">Gestão inteligente de canteiro, estoque e logística</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Cotações Ativas', value: '12', icon: <FileText className="w-6 h-6" />, color: 'bg-blue-600 text-white shadow-blue-200' },
          { label: 'Entregas Hoje', value: '08', icon: <Truck className="w-6 h-6" />, color: 'bg-amber-500 text-white shadow-amber-200' },
          { label: 'Estoque Baixo', value: '45', icon: <Package className="w-6 h-6" />, color: 'bg-rose-500 text-white shadow-rose-200' },
          { label: 'Vendas Mês', value: 'R$ 142k', icon: <ShoppingCart className="w-6 h-6" />, color: 'bg-emerald-500 text-white shadow-emerald-200' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:translate-y-[-4px] hover:shadow-xl group">
            <div className={`w-14 h-14 ${stat.color} rounded-[1.5rem] flex items-center justify-center mb-6 shadow-2xl group-hover:scale-110 transition-transform`}>
              {stat.icon}
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-slate-800">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-500" /> Fornecedores Recentes
          </h3>
          <div className="space-y-4">
            {['Votorantim Cimentos', 'Gerdau S.A.', 'Amanco Wavin', 'Tigre S.A.'].map((f, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-50 hover:border-blue-200 transition-colors cursor-pointer">
                <span className="font-bold text-slate-700">{f}</span>
                <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">Ver Detalhes</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
            <Truck className="w-5 h-5 text-amber-500" /> Status de Logística
          </h3>
          <div className="space-y-4">
             <div className="p-5 rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center py-10">
                <p className="text-slate-400 text-sm font-medium">Nenhuma carga pendente de saída no momento.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
