import React from 'react';
import { format, startOfWeek, addDays, isSameDay, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Staff, Shift, RolePermissions, Shop } from '../../types';

interface ScheduleViewProps {
  selectedScheduleDate: Date;
  selectedShopId: string | null;
  staff: Staff[];
  shifts: Shift[];
  currentPermissions: RolePermissions;
  shops: Shop[];
  accessibleShopIds: string[];
  setSelectedShopId: (id: string) => void;
  setEditingShift: (shift: Shift) => void;
  setIsShiftModalOpen: (open: boolean) => void;
  areaColors: Record<string, string>;
  currentShop?: Shop;
  isRegionalView: boolean;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  selectedScheduleDate, selectedShopId, staff, shifts, currentPermissions,
  shops, accessibleShopIds, setSelectedShopId, setEditingShift, setIsShiftModalOpen,
  areaColors, currentShop, isRegionalView
}) => {
  const weekStart = startOfWeek(selectedScheduleDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  const displayStaff = selectedShopId 
    ? staff.filter(s => s.assignedShopIds?.includes(selectedShopId))
    : staff;

  const getShiftsForStaffOnDay = (staffId: string, day: Date) => {
    const relevantShifts = selectedShopId ? shifts.filter(s => s.shopId === selectedShopId) : shifts;
    return relevantShifts.filter(s => s.staffId === staffId && isSameDay(new Date(s.startTime), day));
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Escala Semanal</h2>
          <p className="text-sm text-slate-500 font-medium">
            {selectedShopId ? `Visualizando escala de: ${currentShop?.name}` : 'Visualizando escala de toda a rede'}
          </p>
        </div>
        <div className="flex items-center gap-3">
           {isRegionalView && (
             <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200">
               {shops.filter(s => accessibleShopIds.includes(s.id)).map(s => (
                 <button 
                   key={s.id}
                   onClick={() => setSelectedShopId(s.id)}
                   className={cn(
                     "px-3 py-1.5 text-[9px] font-black uppercase tracking-tight rounded-lg transition-all",
                     selectedShopId === s.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
                   )}
                 >
                   {s.name}
                 </button>
               ))}
             </div>
           )}
        </div>
      </div>

      <div className="sleek-card bg-white border-slate-100 overflow-hidden shadow-2xl">
         <div className="grid grid-cols-[200px_repeat(7,1fr)] bg-slate-50/50 border-b border-slate-100">
            <div className="p-4 border-r border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">Equipe</div>
            {weekDays.map(day => (
              <div key={day.toString()} className={cn(
                "p-4 border-r border-slate-100 last:border-r-0 text-center flex flex-col",
                isSameDay(day, new Date()) && "bg-emerald-50/50"
              )}>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{format(day, 'EEE', { locale: ptBR })}</span>
                <span className="text-sm font-black text-slate-800">{format(day, 'dd/MM')}</span>
              </div>
            ))}
         </div>
         <div className="divide-y divide-slate-50">
            {displayStaff.map(member => (
              <div key={member.id} className="grid grid-cols-[200px_repeat(7,1fr)] hover:bg-slate-50/30 transition-colors">
                <div className="p-4 border-r border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 bg-emerald-500">
                    {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <p className="text-xs font-bold text-slate-800 truncate">{member.name}</p>
                </div>
                {weekDays.map(day => {
                  const dayShifts = getShiftsForStaffOnDay(member.id, day);
                  return (
                    <div key={day.toString()} className="p-2 min-h-[80px] border-r border-slate-50 last:border-r-0 flex flex-col gap-2">
                       {dayShifts.map(shift => (
                         <div
                           key={shift.id}
                           onClick={() => currentPermissions.actions.canManageSchedule && setEditingShift(shift) && setIsShiftModalOpen(true)}
                           className="p-2 rounded-xl border border-black/5 cursor-pointer relative"
                           style={{ backgroundColor: (areaColors[shift.area] || '#ccc') + '15' }}
                         >
                            <span className="text-[9px] font-black uppercase" style={{ color: areaColors[shift.area] }}>{shift.area}</span>
                            <span className="text-[10px] font-bold block">{format(shift.startTime, 'HH:mm')} - {format(shift.endTime, 'HH:mm')}</span>
                         </div>
                       ))}
                    </div>
                  );
                })}
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};
