import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  User, 
  Users,
  Clock, 
  MapPin, 
  Trash2, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  startOfWeek, 
  addDays, 
  eachDayOfInterval, 
  isSameDay, 
  startOfMonth, 
  endOfMonth,
  isWithinInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Shift, Staff, UserRole } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { accountService } from '../services/accountService';
import { useCollection } from '../../hooks/useCollection';
import { cn } from '../../lib/utils';

interface StaffScheduleViewProps {
  module: 'restaurant' | 'market' | 'construction' | 'retail';
}

const moduleConfigs: Record<string, { title: string; areas: { id: string; label: string; color: string }[] }> = {
  restaurant: {
    title: 'Escala do Restaurante',
    areas: [
      { id: 'FOH', label: 'Salão (FOH)', color: '#10b981' },
      { id: 'BOH', label: 'Cozinha (BOH)', color: '#f59e0b' }
    ]
  },
  market: {
    title: 'Escala do Mercado',
    areas: [
      { id: 'POS', label: 'Checkouts', color: '#10b981' },
      { id: 'Hortifruti', label: 'Hortifruti', color: '#84cc16' },
      { id: 'Açougue', label: 'Açougue', color: '#ef4444' },
      { id: 'Padaria', label: 'Padaria', color: '#f59e0b' },
      { id: 'Frios', label: 'Frios/Laticínios', color: '#3b82f6' },
      { id: 'Secos', label: 'Secos/Mercearia', color: '#d97706' },
      { id: 'Bebidas', label: 'Bebidas/Adega', color: '#9333ea' },
      { id: 'Higiene', label: 'Higiene/Limpeza', color: '#06b6d4' },
      { id: 'Bazar', label: 'Bazar/Utilidades', color: '#db2777' },
      { id: 'Logística', label: 'Depósito/Logística', color: '#64748b' }
    ]
  },
  construction: {
    title: 'Escala de Construção',
    areas: [
      { id: 'Vendas', label: 'Vendas Balcão', color: '#10b981' },
      { id: 'Logística', label: 'Entregas/Carga', color: '#3b82f6' },
      { id: 'Pátio', label: 'Estoque Pátio', color: '#64748b' },
      { id: 'Admin', label: 'Escritório', color: '#8b5cf6' }
    ]
  },
  retail: {
    title: 'Escala do Varejo',
    areas: [
      { id: 'Shop', label: 'Loja/Vendas', color: '#10b981' },
      { id: 'Stock', label: 'Estoque/Recebim.', color: '#64748b' },
      { id: 'Admin', label: 'Financeiro/Admin', color: '#8b5cf6' }
    ]
  }
};

export const StaffScheduleView: React.FC<StaffScheduleViewProps> = ({ module }) => {
  const { data: shifts } = useCollection<Shift>('shifts');
  const { data: staff } = useCollection<Staff>('staff');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  const currentUser = accountService.getCurrentUser();
  const companyId = currentUser?.companyId || 'default';
  const config = moduleConfigs[module] || moduleConfigs.restaurant;

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6)
  });

  const getShiftsForStaffOnDay = (staffId: string, day: Date) => {
    return shifts.filter(s => s.staffId === staffId && isSameDay(new Date(s.startTime), day));
  };

  const handleSaveShift = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dateStr = formData.get('date') as string;
    const startTimeStr = formData.get('startTime') as string;
    const endTimeStr = formData.get('endTime') as string;
    
    const start = new Date(`${dateStr}T${startTimeStr}:00`).getTime();
    const end = new Date(`${dateStr}T${endTimeStr}:00`).getTime();

    const shiftData = {
      staffId: formData.get('staffId') as string,
      area: formData.get('area') as string,
      startTime: start,
      endTime: end,
      shopId: localStorage.getItem('rm_selected_shop_id') || 'main-shop',
      enterpriseId: companyId
    };

    try {
      if (editingShift?.id) {
        await firebaseService.saveItem('shifts', editingShift.id, { ...editingShift, ...shiftData });
      } else {
        const id = `shift-${Math.random().toString(36).substr(2, 9)}`;
        await firebaseService.saveItem('shifts', id, { ...shiftData, id });
      }
      setIsModalOpen(false);
      setEditingShift(null);
    } catch (error) {
      console.error('Error saving shift:', error);
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (confirm('Deseja remover este turno?')) {
      try {
        await firebaseService.deleteItem('shifts', id);
        setIsModalOpen(false);
        setEditingShift(null);
      } catch (error) {
        console.error('Error deleting shift:', error);
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans pb-20 lg:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase italic">{config.title}</h2>
           <p className="text-slate-500 font-medium">Gestão de turnos e alocação de equipe por setor.</p>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
           <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                <ChevronLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div className="text-center min-w-[120px] sm:min-w-[150px]">
                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Semana</p>
                 <p className="text-xs font-bold text-slate-800 uppercase italic tracking-tighter whitespace-nowrap">
                   {format(weekStart, "dd MMM", { locale: ptBR })} - {format(addDays(weekStart, 6), "dd MMM", { locale: ptBR })}
                 </p>
              </div>
              <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
           </div>
           
           <button 
             onClick={() => { setEditingShift(null); setIsModalOpen(true); }}
             className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
           >
             <Plus className="w-5 h-5" /> Adicionar Turno
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px] sm:min-h-[600px]">
         <div className="overflow-x-auto custom-scrollbar overflow-y-hidden">
            <div className="min-w-[900px] lg:min-w-full">
               {/* Grid Header */}
               <div className="grid grid-cols-[280px_repeat(7,1fr)] bg-slate-50/50 border-b border-slate-100">
                  <div className="p-8 border-r border-slate-100 flex items-center">
                     <Users className="w-5 h-5 text-slate-300 mr-3" />
                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Colaborador</span>
                  </div>
                  {weekDays.map(day => (
                    <div key={day.toString()} className="p-6 text-center border-r border-slate-50 last:border-r-0">
                       <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 italic">{format(day, 'eee', { locale: ptBR })}</p>
                       <div className={cn(
                         "w-10 h-10 mx-auto flex items-center justify-center rounded-2xl transition-all text-sm font-black italic",
                         isSameDay(day, new Date()) ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-white text-slate-800 shadow-sm border border-slate-100"
                       )}>
                         {format(day, 'dd')}
                       </div>
                    </div>
                  ))}
               </div>

               {/* Grid Body */}
               <div className="divide-y divide-slate-50">
                  {staff.length === 0 && (
                    <div className="py-32 text-center">
                       <User className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                       <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest italic">Nenhum funcionário encontrado</p>
                    </div>
                  )}
                  {staff.map(member => (
                    <div key={member.id} className="grid grid-cols-[280px_repeat(7,1fr)] hover:bg-slate-50/20 transition-all group">
                       <div className="p-6 border-r border-slate-100 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-[1.2rem] bg-slate-900 border-4 border-white shadow-xl flex items-center justify-center text-white font-black text-xs italic shrink-0 overflow-hidden">
                             <img src={`https://i.pravatar.cc/150?u=${member.id}`} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </div>
                          <div className="overflow-hidden">
                             <p className="text-sm font-black text-slate-800 uppercase italic truncate tracking-tighter leading-none">{member.name}</p>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{member.role}</p>
                          </div>
                       </div>

                       {weekDays.map(day => {
                         const dayShifts = getShiftsForStaffOnDay(member.id, day);
                         return (
                           <div key={day.toString()} className="p-3 min-h-[120px] border-r border-slate-50 last:border-r-0 flex flex-col gap-2">
                              {dayShifts.map(shift => {
                                const areaConfig = config.areas.find(a => a.id === shift.area) || { color: '#64748b', label: shift.area };
                                return (
                                  <motion.div 
                                    layout
                                    key={shift.id}
                                    onClick={() => { setEditingShift(shift); setIsModalOpen(true); }}
                                    className="p-3 rounded-2xl shadow-sm border border-transparent hover:border-slate-200 cursor-pointer relative overflow-hidden group/shift transition-all"
                                    style={{ backgroundColor: `${areaConfig.color}15`, borderLeftColor: areaConfig.color, borderLeftWidth: '4px' }}
                                  >
                                     <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: areaConfig.color }}>{areaConfig.label}</span>
                                        <span className="text-[11px] font-black text-slate-800 tracking-tighter italic whitespace-nowrap">
                                          {format(shift.startTime, 'HH:mm')} - {format(shift.endTime, 'HH:mm')}
                                        </span>
                                     </div>
                                  </motion.div>
                                );
                              })}
                              <button 
                                onClick={() => {
                                  setEditingShift({
                                    id: '',
                                    staffId: member.id,
                                    startTime: day.setHours(8,0,0,0),
                                    endTime: day.setHours(16,0,0,0),
                                    area: config.areas[0].id,
                                    shopId: 'main-shop',
                                    enterpriseId: companyId
                                  } as Shift);
                                  setIsModalOpen(true);
                                }}
                                className="mt-auto opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-all self-center"
                              >
                                 <Plus className="w-5 h-5" />
                              </button>
                           </div>
                         );
                       })}
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
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
              className="w-full max-w-lg bg-white rounded-[3rem] shadow-3xl overflow-hidden relative z-10"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                       <Clock className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">
                      {editingShift?.id ? 'Editar Turno' : 'Alocar Turno'}
                    </h3>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                   <X className="w-6 h-6" />
                 </button>
              </div>

              <form onSubmit={handleSaveShift} className="p-10 space-y-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Funcionário</label>
                    <select 
                      name="staffId"
                      defaultValue={editingShift?.staffId}
                      required
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold text-sm outline-none transition-all appearance-none"
                    >
                       {staff.map(s => (
                         <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                       ))}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Setor / Área</label>
                       <select 
                        name="area"
                        defaultValue={editingShift?.area}
                        required
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold text-sm outline-none transition-all appearance-none"
                       >
                          {config.areas.map(a => (
                            <option key={a.id} value={a.id}>{a.label}</option>
                          ))}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Data</label>
                       <input 
                        type="date"
                        name="date"
                        defaultValue={editingShift ? format(editingShift.startTime, 'yyyy-MM-dd') : format(selectedDate, 'yyyy-MM-dd')}
                        required
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold text-sm outline-none transition-all"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Hora Início</label>
                       <input 
                        type="time"
                        name="startTime"
                        defaultValue={editingShift ? format(editingShift.startTime, 'HH:mm') : '08:00'}
                        required
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold text-sm outline-none transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Hora Término</label>
                       <input 
                        type="time"
                        name="endTime"
                        defaultValue={editingShift ? format(editingShift.endTime, 'HH:mm') : '16:00'}
                        required
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold text-sm outline-none transition-all"
                       />
                    </div>
                 </div>

                 <div className="pt-6 border-t border-slate-100 flex gap-4">
                    {editingShift?.id && (
                      <button 
                        type="button"
                        onClick={() => handleDeleteShift(editingShift.id)}
                        className="p-4 bg-rose-50 text-rose-500 rounded-[1.5rem] hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                      >
                         <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                    <button 
                      type="submit"
                      className="flex-1 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10"
                    >
                      {editingShift?.id ? 'Atualizar Turno' : 'Confirmar Alocação'}
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
