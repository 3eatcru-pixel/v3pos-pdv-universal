import React, { useState } from 'react';
import { 
  Plus, 
  Calendar, 
  Table as TableIcon, 
  Trash2, 
  X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../../lib/utils';
import { useCollection } from '../../../hooks/useCollection';
import { accountService } from '../../../core/services/accountService';
import { firebaseService } from '../../../services/firebaseService';
import { Reservation } from '../../../types';

export const ReservationManagementView: React.FC = () => {
  const selectedShopId = accountService.getSelectedShopId();
  const enterpriseId = accountService.getCurrentCompanyId();

  const { data: reservations } = useCollection<Reservation>('reservations');

  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  const handleSaveReservation = async (resData: Partial<Reservation>) => {
    if (editingReservation) {
      await firebaseService.updateItem('reservations', editingReservation.id, resData);
    } else {
      const id = `res-${Date.now()}`;
      const newRes: Reservation = {
        id,
        enterpriseId: enterpriseId!,
        shopId: selectedShopId || 'shop-1',
        ...resData
      } as Reservation;
      await firebaseService.saveItem('reservations', id, newRes);
    }
    setIsReservationModalOpen(false);
    setEditingReservation(null);
  };

  const handleDeleteReservation = async (id: string) => {
    if (confirm("Cancelar esta reserva?")) {
      await firebaseService.updateItem('reservations', id, { status: 'cancelled' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Reservas</h2>
          <p className="text-sm text-slate-500 font-medium">Controle de agendamentos e mesas</p>
        </div>
        <button 
          onClick={() => { setEditingReservation(null); setIsReservationModalOpen(true); }}
          className="bg-emerald-500 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" /> Nova Reserva
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...reservations].sort((a,b) => a.dateTime - b.dateTime).map(res => (
          <motion.div 
            key={res.id} 
            layout
            className="sleek-card p-6 border-l-4 overflow-hidden relative"
            style={{ borderLeftColor: res.status === 'confirmed' ? '#10b981' : res.status === 'pending' ? '#f59e0b' : '#ef4444' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg leading-tight">{res.customerName}</h3>
                <p className="text-[10px] font-black uppercase text-slate-400 mt-1">{res.customerPhone}</p>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm",
                res.status === 'confirmed' ? "bg-emerald-100 text-emerald-600" : res.status === 'pending' ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
              )}>
                {res.status}
              </span>
            </div>

            <div className="space-y-3 mb-6">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-tighter leading-none mb-1">Data & Hora</p>
                    <p className="text-xs font-bold text-slate-700">{format(res.dateTime, "dd/MM/yyyy 'às' HH:mm 'hs'", { locale: ptBR })}</p>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                    <TableIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-tighter leading-none mb-1">Mesa & Pessoas</p>
                    <p className="text-xs font-bold text-slate-700">Mesa {res.tableNumber < 10 ? `0${res.tableNumber}` : res.tableNumber} • {res.guestsCount} Pessoas</p>
                  </div>
               </div>
            </div>

            <div className="flex gap-2">
               <button 
                onClick={() => { setEditingReservation(res); setIsReservationModalOpen(true); }}
                className="flex-1 bg-slate-50 text-slate-600 font-bold py-2 rounded-xl text-[10px] uppercase border border-slate-100 hover:bg-slate-100 transition-all"
               >
                 Editar
               </button>
               {res.status === 'pending' && (
                 <button 
                  onClick={() => handleSaveReservation({ ...res, status: 'confirmed' })}
                  className="flex-1 bg-emerald-500 text-white font-bold py-2 rounded-xl text-[10px] uppercase hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                 >
                   Confirmar
                 </button>
               )}
               <button 
                onClick={() => handleDeleteReservation(res.id)}
                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isReservationModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <h3 className="text-xl font-black text-slate-800 tracking-tight">{editingReservation ? 'Editar Reserva' : 'Nova Reserva'}</h3>
                 <button onClick={() => setIsReservationModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleSaveReservation({
                    customerName: formData.get('name') as string,
                    customerPhone: formData.get('phone') as string,
                    tableNumber: parseInt(formData.get('table') as string),
                    guestsCount: parseInt(formData.get('guests') as string),
                    dateTime: new Date(formData.get('date') as string).getTime(),
                    status: (formData.get('status') as any) || 'pending'
                  });
                }}
                className="p-8 space-y-5"
              >
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Cliente</label>
                  <input name="name" defaultValue={editingReservation?.customerName} required placeholder="Nome Completo" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700 tracking-tight" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Telefone / WhatsApp</label>
                  <input name="phone" defaultValue={editingReservation?.customerPhone} required placeholder="(00) 00000-0000" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700 tracking-tight" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Mesa</label>
                    <input name="table" type="number" defaultValue={editingReservation?.tableNumber} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Convidados</label>
                    <input name="guests" type="number" defaultValue={editingReservation?.guestsCount} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold" />
                  </div>
                </div>
                <div>
                   <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Data & Horário</label>
                   <input name="date" type="datetime-local" defaultValue={editingReservation ? format(editingReservation.dateTime, "yyyy-MM-dd'T'HH:mm") : ''} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold" />
                </div>
                
                <button type="submit" className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/30 hover:bg-emerald-400 transition-all mt-4">
                   Salvar Reserva
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
