import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Layers, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Monitor,
  Map as MapIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCollection } from '../../hooks/useCollection';
import { accountService } from '../services/accountService';
import { PhysicalResource, ResourceBooking } from '../services/ResourceSchedulerEngine';
import { Staff, Shift } from '../../types';
import { cn } from '../../lib/utils';
import { format, addHours, startOfDay, eachHourOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const StaffScheduleView: React.FC = () => {
  const enterpriseId = accountService.getCurrentCompanyId() || 'default';
  const shopId = accountService.getSelectedShopId() || 'main';
  
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));

  // Carregamento de dados cruzados
  const { data: resources } = useCollection<PhysicalResource>('physical_resources', { enterpriseId, shopId });
  const { data: bookings } = useCollection<ResourceBooking>('resource_bookings', { enterpriseId, shopId, status: 'confirmed' });
  const { data: shifts } = useCollection<Shift>('shifts', { enterpriseId, shopId });
  const { data: staff } = useCollection<Staff>('staff', { enterpriseId });

  // Grade de Horários (08:00 às 22:00)
  const timeSlots = useMemo(() => {
    const start = addHours(selectedDate, 8);
    const end = addHours(selectedDate, 22);
    return eachHourOfInterval({ start, end });
  }, [selectedDate]);

  const getStaffName = (id: string) => staff.find(s => s.id === id)?.name || 'Profissional';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      {/* Header com Seletor de Data */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Mapa de Ocupação</h2>
          <p className="text-slate-500 font-medium italic">Gestão visual de cadeiras, salas e equipamentos.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm">
           <button className="p-4 hover:bg-slate-50 rounded-2xl transition-all text-slate-400"><ChevronLeft /></button>
           <div className="px-6 flex flex-col items-center">
              <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{format(selectedDate, 'eeee', { locale: ptBR })}</span>
              <span className="text-lg font-black text-slate-900 italic tracking-tighter">{format(selectedDate, 'dd MMMM, yyyy', { locale: ptBR })}</span>
           </div>
           <button className="p-4 hover:bg-slate-50 rounded-2xl transition-all text-slate-400"><ChevronRight /></button>
        </div>
      </div>

      {/* Grid de Agendamento de Recursos */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="sticky left-0 z-20 bg-slate-50 p-8 border-r border-slate-100 min-w-[250px] text-left">
                   <div className="flex items-center gap-3 text-slate-400">
                      <Layers className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Recurso / Ativo</span>
                   </div>
                </th>
                {timeSlots.map(hour => (
                  <th key={hour.getTime()} className="p-6 border-r border-slate-100 min-w-[120px] text-center">
                    <span className="text-xs font-black text-slate-800 italic">{format(hour, 'HH:mm')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map(resource => (
                <tr key={resource.id} className="border-t border-slate-100 group">
                  <td className="sticky left-0 z-20 bg-white p-8 border-r border-slate-100 group-hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg uppercase font-black text-[10px]">
                          {resource.name.slice(0, 2)}
                       </div>
                       <div>
                          <p className="font-black text-slate-900 uppercase text-xs tracking-tight italic">{resource.name}</p>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{resource.type}</span>
                       </div>
                    </div>
                  </td>
                  
                  {timeSlots.map(hour => {
                    const hourTs = hour.getTime();
                    const nextHourTs = hourTs + (60 * 60 * 1000);
                    
                    // Busca se existe reserva para este recurso nesta hora
                    const activeBooking = bookings.find(b => 
                      b.resourceId === resource.id && 
                      (hourTs < b.endTime && nextHourTs > b.startTime)
                    );

                    return (
                      <td key={hourTs} className="p-2 border-r border-slate-50 relative h-24">
                        {activeBooking ? (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-2 bg-blue-600 rounded-2xl p-3 shadow-lg shadow-blue-500/20 flex flex-col justify-center"
                          >
                             <p className="text-[8px] font-black text-blue-100 uppercase tracking-widest truncate">Ocupado por</p>
                             <p className="text-[10px] font-black text-white uppercase italic truncate">{getStaffName(activeBooking.staffId)}</p>
                          </motion.div>
                        ) : (
                          <button className="w-full h-full rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-100 hover:text-blue-200 transition-all group/btn">
                             <Plus className="w-4 h-4 opacity-0 group-hover/btn:opacity-100" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
           <div className="flex gap-6">
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                 <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Reserva Confirmada</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-white border-2 border-slate-200 rounded-full" />
                 <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Livre / Disponível</span>
              </div>
           </div>
           <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Grid OS Resource Scheduler v1.0</p>
        </div>
      </div>
    </div>
  );
};