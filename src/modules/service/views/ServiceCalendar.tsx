import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  Search,
  Scissors, 
  MoreVertical,
  Filter,
  CheckCircle2,
  X,
  AlertCircle,
  Smartphone,
  MapPin,
  Monitor,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../../../lib/utils';
import { paymentService } from '../../../services/paymentService';
import { accountService } from '../../../core/services/accountService';
import { schedulingService } from '../services/schedulingService';
import { serviceManagementService } from '../services/serviceManagementService';
import { ServiceAppointment, ServiceDefinition, ServiceProvider, ServiceResource } from '../types';

// Time slots from 08:00 to 20:00 every 30 mins
const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

export const ServiceCalendar: React.FC = () => {
  const enterpriseId = accountService.getCurrentCompanyId() || '';
  const shopId = accountService.getSelectedShopId() || '';
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [appointments, setAppointments] = useState<ServiceAppointment[]>([]);
  const [staff, setStaff] = useState<ServiceProvider[]>([]);
  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [resources, setResources] = useState<ServiceResource[]>([]);
  
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ time: string, employeeId: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedDate, enterpriseId]);

  const loadData = () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    setAppointments(schedulingService.getAppointments(enterpriseId, shopId, startOfDay.getTime(), endOfDay.getTime()));
    setStaff(serviceManagementService.getProviders(enterpriseId, shopId));
    setServices(serviceManagementService.getServices(enterpriseId, shopId));
    setResources(serviceManagementService.getResources(enterpriseId, shopId));
  };

  const getAppointmentsForProfessional = (employeeId: string, time: string) => {
    return appointments.find(a => {
      const apptDate = new Date(a.startTime);
      const apptTime = `${apptDate.getHours().toString().padStart(2, '0')}:${apptDate.getMinutes().toString().padStart(2, '0')}`;
      return a.providerId === employeeId && apptTime === time;
    });
  };

  const handleRegisterPayment = async (appt: ServiceAppointment, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent opening another modal or cell click
    
    try {
      await paymentService.processPayment({
        amount: appt.totalPrice,
        method: 'other', // Default for Service if no method selector
        module: 'service',
        orderId: appt.id
      });

      schedulingService.updateAppointmentStatus(appt.id, 'completed');
      alert(`Pagamento de ${formatCurrency(appt.totalPrice)} registrado com sucesso!`);
      loadData();
    } catch (err) {
      alert('Erro ao processar pagamento');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     
     if (!selectedSlot || !selectedSlot.employeeId) {
        alert("Preencha os dados do agendamento corretamente.");
        return;
     }

     const startOfDay = new Date(selectedDate);
     const [h, m] = selectedSlot.time.split(':');
     startOfDay.setHours(Number(h), Number(m), 0, 0);

     try {
       schedulingService.createAppointment({
          enterpriseId,
          shopId,
          clientId: 'cli-demo', // Mock client for simple UI
          providerId: selectedSlot.employeeId,
          serviceId: services[0]?.id || 'srv-demo', 
          resourceIds: [],
          startTime: startOfDay.getTime(),
          endTime: startOfDay.getTime() + (30 * 60000), // fixed 30 mins demo time
          status: 'scheduled',
          totalPrice: services[0]?.price || 0
       });
       setShowAppointmentForm(false);
       loadData();
     } catch (err: any) {
       alert(err.message || 'Erro ao criar agendamento');
     }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
         <div className="flex items-center gap-6">
            <div className="flex items-center bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm">
               <button 
                onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}
                className="p-4 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900"
               >
                  <ChevronLeft className="w-5 h-5" />
               </button>
               <div className="px-8 text-center min-w-[200px]">
                  <h3 className="text-sm font-black uppercase tracking-tighter italic text-slate-900">
                    {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
               </div>
               <button 
                onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))}
                className="p-4 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900"
               >
                  <ChevronRight className="w-5 h-5" />
               </button>
            </div>
            <button className="p-5 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-sm">
               <Filter className="w-5 h-5" />
            </button>
         </div>

         <button 
           onClick={() => {
             setSelectedSlot(null);
             setShowAppointmentForm(true);
           }}
           className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 transition-all shadow-2xl shadow-slate-200 flex items-center gap-4"
         >
            <Plus className="w-5 h-5" /> Novo Agendamento
         </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[700px]">
         <div className="overflow-x-auto overflow-y-auto custom-scrollbar">
            <table className="w-full table-fixed border-separate border-spacing-0">
               <thead className="sticky top-0 z-20">
                  <tr>
                     <th className="w-24 p-6 bg-slate-50 border-b border-slate-100"></th>
                     {staff.map(pro => (
                       <th key={pro.id} className="p-8 bg-white border-b border-l border-slate-100 min-w-[280px]">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-xs font-black">
                                {pro.name.charAt(0)}
                             </div>
                             <div className="text-left">
                                <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-tight leading-none mb-1">{pro.name}</h4>
                                <div className="flex items-center gap-2">
                                   <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Disponível</span>
                                </div>
                             </div>
                          </div>
                       </th>
                     ))}
                  </tr>
               </thead>
               <tbody>
                  {TIME_SLOTS.map(time => (
                    <tr key={time}>
                       <td className="p-6 text-center bg-slate-50/50 border-b border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{time}</span>
                       </td>
                       {staff.map(pro => {
                         const appt = getAppointmentsForProfessional(pro.id, time);
                         const service = services.find(s => s.id === appt?.serviceId);
                         
                         return (
                           <td 
                            key={`${pro.id}-${time}`}
                            onClick={() => {
                              if (!appt) {
                                setSelectedSlot({ time, employeeId: pro.id });
                                setShowAppointmentForm(true);
                              }
                            }}
                            className={cn(
                              "relative p-1 border-b border-l border-slate-50 transition-all group cursor-pointer",
                              !appt && "hover:bg-slate-50 flex items-center justify-center"
                            )}
                           >
                              {!appt && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                   <Plus className="w-4 h-4 text-slate-300" />
                                </div>
                              )}
                              
                              {appt && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className={cn(
                                    "absolute inset-1 p-4 rounded-2xl shadow-sm border border-transparent overflow-hidden z-10 flex flex-col justify-between",
                                    appt.status === 'completed' ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
                                    appt.status === 'in_progress' ? "bg-indigo-50 border-indigo-100 text-indigo-800" :
                                    "bg-slate-100 border-slate-200 text-slate-600"
                                  )}
                                >
                                   <div>
                                      <div className="flex items-center justify-between gap-2">
                                         <p className="text-[9px] font-black uppercase tracking-tight leading-none truncate flex-1">
                                           Cliente {appt.clientId.slice(-4)}
                                         </p>
                                         {appt.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                      </div>
                                      <p className="text-[8px] font-bold opacity-60 uppercase mt-1 truncate">{service?.name || 'Serviço Personalizado'}</p>
                                   </div>

                                   {appt.status !== 'completed' && (
                                      <button
                                         onClick={(e) => handleRegisterPayment(appt, e)}
                                         className="mt-2 text-[8px] font-black uppercase tracking-widest flex items-center gap-1 justify-center w-full py-2 bg-white/50 border border-white hover:bg-white rounded-lg transition-colors z-20 relative"
                                      >
                                         <DollarSign className="w-3 h-3" />
                                         Registrar Pagamento
                                      </button>
                                   )}
                                   
                                   <div className="absolute -right-2 -bottom-2 opacity-5 pointer-events-none z-0">
                                      <Scissors className="w-12 h-12" />
                                   </div>
                                </motion.div>
                              )}
                           </td>
                         );
                       })}
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* Appointment Form Modal */}
      <AnimatePresence>
        {showAppointmentForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden font-sans"
            >
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-900 rounded-2xl text-white">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter italic leading-none mb-1">Novo Agendamento</h3>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Preencha os detalhes do serviço</span>
                  </div>
                </div>
                <button onClick={() => setShowAppointmentForm(false)} className="p-3 text-slate-400 hover:text-rose-500 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-10 space-y-8 h-[500px] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-8">
                  <div className="col-span-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Cliente</label>
                     <div className="relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type="text" 
                          placeholder="Pesquisar por nome ou celular..."
                          className="w-full bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 rounded-[1.5rem] py-5 pl-14 pr-6 font-bold outline-none transition-all"
                        />
                     </div>
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Profissional Selecionado</label>
                     <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-[10px] font-black uppercase">
                          {staff.find(s => s.id === selectedSlot?.employeeId)?.name.charAt(0) || 'P'}
                        </div>
                        <span className="text-xs font-black uppercase text-slate-900">{staff.find(s => s.id === selectedSlot?.employeeId)?.name || 'Nenhum'}</span>
                     </div>
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Horário</label>
                     <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-black uppercase text-slate-900">{selectedSlot?.time || '00:00'}</span>
                     </div>
                  </div>

                  <div className="col-span-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 block">Selecione o Serviço</label>
                     <div className="grid grid-cols-2 gap-4">
                        {services.length === 0 ? (
                           <div className="col-span-2 p-8 border-2 border-dashed border-slate-100 rounded-[2rem] text-center opacity-40">
                              <Scissors className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Nenhum serviço cadastrado</p>
                           </div>
                        ) : (
                           services.map(s => (
                             <button 
                              key={s.id}
                              className="p-6 bg-white border-2 border-slate-100 rounded-[2rem] hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-lg transition-all text-left group"
                             >
                                <div className="flex justify-between items-start mb-2">
                                   <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-tight group-hover:text-emerald-600 transition-colors">{s.name}</h4>
                                   <span className="text-[9px] font-black text-emerald-500">{formatCurrency(s.price)}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                   <Clock className="w-3 h-3 text-slate-300" />
                                   <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.duration} min</span>
                                </div>
                             </button>
                           ))
                        )}
                     </div>
                  </div>

                  <div className="col-span-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 block">Recurso Necessário (Opcional)</label>
                     <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                        {resources.map(r => (
                          <button 
                            key={r.id}
                            className={cn(
                              "px-8 py-4 rounded-2xl border-2 transition-all whitespace-nowrap text-[10px] font-black uppercase tracking-widest",
                              "border-slate-100 hover:border-slate-900 text-slate-400 hover:text-slate-900"
                            )}
                          >
                             {r.name}
                          </button>
                        ))}
                     </div>
                  </div>
                </div>
              </div>

              <div className="p-10 pt-0">
                <button 
                  onClick={handleSubmit}
                  className="w-full py-8 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-sm hover:bg-black transition-all shadow-2xl flex items-center justify-center gap-6"
                >
                  Confirmar Agendamento <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
