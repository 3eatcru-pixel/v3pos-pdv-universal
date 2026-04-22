import React, { useState } from 'react';
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Plus,
  Navigation,
  Calendar,
  Filter,
  Search,
  Box,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import { DeliveryCrate } from '../services/constructionService';

const MOCK_DELIVERIES: DeliveryCrate[] = [
  {
    id: 'del-1',
    projectId: 'proj-1',
    orderId: 'ord-881',
    items: ['Cimento', 'Areia', 'Brita'],
    status: 'dispatched',
    vehicleId: ' ट्रक-ABC-1234',
    driverName: 'Marcos Silva',
    estimatedArrival: Date.now() + 1000 * 60 * 45 // 45 mins from now
  },
  {
    id: 'del-2',
    projectId: 'proj-2',
    orderId: 'ord-902',
    items: ['Vergalhões', 'Arames'],
    status: 'preparing',
    driverName: 'André Luiz',
    estimatedArrival: Date.now() + 1000 * 60 * 60 * 3 // 3 hours from now
  },
  {
    id: 'del-3',
    projectId: 'proj-1',
    orderId: 'ord-750',
    items: ['Tubos PVC', 'Conexões'],
    status: 'delivered',
    vehicleId: 'VAN-XYZ-9876',
    driverName: 'Roberto J.',
    estimatedArrival: Date.now() - 1000 * 60 * 120 // 2 hours ago
  }
];

export const ConstructionLogistics: React.FC = () => {
  const [deliveries, setDeliveries] = useState<DeliveryCrate[]>(MOCK_DELIVERIES);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleUpdateStatus = (id: string, status: DeliveryCrate['status']) => {
    setDeliveries(deliveries.map(d => d.id === id ? { ...d, status } : d));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Logística & Entregas</h2>
          <p className="text-slate-500 font-medium">Controle de frota, despachos e entregas em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
          >
            <Plus className="w-5 h-5" /> Novo Despacho
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Em Trânsito', value: deliveries.filter(d => d.status === 'dispatched').length.toString().padStart(2, '0'), icon: <Navigation className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600' },
          { label: 'Preparando', value: deliveries.filter(d => d.status === 'preparing').length.toString().padStart(2, '0'), icon: <Package className="w-6 h-6" />, color: 'bg-amber-50 text-amber-600' },
          { label: 'Entregues Hoje', value: deliveries.filter(d => d.status === 'delivered').length.toString().padStart(2, '0'), icon: <CheckCircle2 className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:translate-y-[-2px]">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-slate-800">{stat.value}</p>
            </div>
            <div className={`p-4 rounded-2xl ${stat.color}`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden min-h-[600px]">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
           <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
             <Truck className="w-6 h-6 text-blue-600" /> Painel de Despacho
           </h3>
           <div className="flex items-center gap-2">
              <button className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all shadow-sm"><Search className="w-5 h-5" /></button>
              <button className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all shadow-sm"><Filter className="w-5 h-5" /></button>
           </div>
        </div>

        <div className="p-8">
           <div className="space-y-6">
              {deliveries.map(delivery => (
                <div key={delivery.id} className="p-6 rounded-[2rem] border border-slate-50 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all group">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="flex items-start gap-6">
                       <div className={cn(
                         "w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 transition-all duration-500",
                         delivery.status === 'dispatched' ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" :
                         delivery.status === 'delivered' ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20" : 
                         delivery.status === 'preparing' ? "bg-amber-500 text-white shadow-xl shadow-amber-500/20" : "bg-white text-slate-300"
                       )}>
                          <Truck className="w-10 h-10" />
                       </div>
                       <div>
                         <div className="flex items-center gap-3 mb-2">
                           <h4 className="text-xl font-black text-slate-800 tracking-tight uppercase group-hover:text-blue-600 transition-colors">Pedido #{delivery.orderId}</h4>
                           <span className={cn(
                             "text-[9px] font-black uppercase px-2 py-1 rounded-md",
                             delivery.status === 'dispatched' ? "bg-blue-50 text-blue-600" :
                             delivery.status === 'delivered' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                           )}>{delivery.status}</span>
                         </div>
                         <div className="flex flex-wrap items-center gap-y-2 gap-x-6">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                               <MapPin className="w-4 h-4 text-slate-400" /> Local: Rua das Flores, 123 (João Silva)
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                               <Users className="w-4 h-4 text-slate-400" /> Condutor: {delivery.driverName || 'Pendente'}
                            </div>
                         </div>
                       </div>
                    </div>

                    <div className="flex items-center gap-4">
                       {delivery.status === 'preparing' && (
                         <button 
                          onClick={() => handleUpdateStatus(delivery.id, 'dispatched')}
                          className="px-6 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                         >
                            Despachar Agora
                         </button>
                       )}
                       {delivery.status === 'dispatched' && (
                         <button 
                          onClick={() => handleUpdateStatus(delivery.id, 'delivered')}
                          className="px-6 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                         >
                            Confirmar Entrega
                         </button>
                       )}
                       <button className="p-4 bg-white text-slate-400 border border-slate-100 rounded-2xl hover:text-blue-600 transition-all shadow-sm">
                          <MoreVertical className="w-5 h-5" />
                       </button>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center gap-4">
                     <div className="flex-1 h-3 bg-white rounded-full overflow-hidden border border-slate-100 shadow-inner p-0.5">
                        <motion.div 
                          layout
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            delivery.status === 'delivered' ? "w-full bg-emerald-500" : 
                            delivery.status === 'dispatched' ? "w-2/3 bg-blue-500" : "w-1/4 bg-amber-500"
                          )}
                        />
                     </div>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[40px]">
                        {delivery.status === 'delivered' ? '100%' : delivery.status === 'dispatched' ? '65%' : '15%'}
                     </span>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};
