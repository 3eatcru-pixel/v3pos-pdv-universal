import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  UserPlus, 
  LayoutGrid, 
  Table as TableIcon,
  Filter,
  CheckCircle2,
  MoreHorizontal,
  Mail,
  Phone,
  FileText,
  DollarSign,
  Shield,
  Briefcase,
  ChevronRight,
  TrendingUp,
  X,
  CreditCard,
  Building,
  Target,
  Award,
  AlertTriangle,
  History,
  Trash2,
  Calendar,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../../lib/utils';
import { StatCard } from '../components/CommonUI';
import { Staff, PerformanceEvent, RolePermissions, View } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { accountService } from '../services/accountService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCollection } from '../../hooks/useCollection';

interface StaffManagementViewProps {
  module: 'restaurant' | 'market' | 'construction' | 'retail';
}

export const GeneralStaffView: React.FC<StaffManagementViewProps> = ({ module }) => {
  const [activeMainTab, setActiveMainTab] = useState<'members' | 'roles'>('members');
  const { data: staff, loading: loadingStaff } = useCollection<Staff>('staff');
  const { data: performanceEvents, loading: loadingEvents } = useCollection<PerformanceEvent>('performance_events');
  const { data: roles, loading: loadingRoles } = useCollection<RolePermissions>('rolePermissions');

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedRole, setSelectedRole] = useState<RolePermissions | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'Resumo' | 'Contratual' | 'Documentação' | 'Performance'>('Resumo');

  const loading = loadingStaff || loadingEvents || loadingRoles;

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este colaborador permanentemente?')) return;
    try {
      await firebaseService.deleteItem('staff', id);
      setSelectedStaff(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleSaveRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const roleId = formData.get('role') as string;
    
    // Get checked views
    const selectedViews: View[] = [];
    const viewCheckboxes = e.currentTarget.querySelectorAll('input[name="view"]:checked');
    viewCheckboxes.forEach((cb: any) => selectedViews.push(cb.value));

    const roleData: RolePermissions = {
      role: roleId.toLowerCase().replace(/\s+/g, '_'),
      label: formData.get('label') as string,
      enterpriseId: companyId,
      views: selectedViews,
      actions: {
        canVoid: (formData.get('canVoid') === 'on'),
        canDiscount: (formData.get('canDiscount') === 'on'),
        canViewSales: (formData.get('canViewSales') === 'on'),
        canManageStaff: (formData.get('canManageStaff') === 'on'),
        canManageInventory: (formData.get('canManageInventory') === 'on'),
        canEditMenu: (formData.get('canEditMenu') === 'on'),
        canReopenTable: (formData.get('canReopenTable') === 'on'),
        canManageSchedule: (formData.get('canManageSchedule') === 'on'),
      }
    };

    try {
      await firebaseService.saveItem('rolePermissions', roleData.role, roleData);
      setIsRoleModalOpen(false);
      setSelectedRole(null);
      loadData();
    } catch (err) {
      console.error('Save role failed:', err);
    }
  };

  const handleSaveStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const staffId = selectedStaff?.id || `staff-${Math.random().toString(36).substr(2, 9)}`;
    
    const staffData: Partial<Staff> = {
      name: formData.get('name') as string,
      role: formData.get('role') as any,
      cpf: formData.get('cpf') as string,
      phone: formData.get('phone') as string,
      salary: parseFloat(formData.get('salary') as string),
      contractType: formData.get('contractType') as any,
      admissionDate: new Date(formData.get('admissionDate') as string).getTime(),
      active: true,
      enterpriseId: companyId,
      assignedShopIds: ['main-shop'],
      bankInfo: {
        bankName: formData.get('bankName') as string,
        agency: formData.get('agency') as string,
        account: formData.get('account') as string,
      }
    };

    try {
      await firebaseService.saveItem('staff', staffId, { ...selectedStaff, ...staffData, id: staffId });
      setIsStaffModalOpen(false);
      setSelectedStaff(null);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleAddPerformanceEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStaff) return;
    const formData = new FormData(e.currentTarget);
    const eventId = `perf-${Math.random().toString(36).substr(2, 9)}`;
    
    const event: PerformanceEvent = {
      id: eventId,
      staffId: selectedStaff.id,
      enterpriseId: companyId,
      type: formData.get('type') as any,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      points: parseInt(formData.get('points') as string),
      timestamp: Date.now(),
      createdBy: currentUser?.name || 'Sistema'
    };

    try {
      await firebaseService.saveItem('performance_events', eventId, event);
      const currentScore = selectedStaff.performanceScore || 100;
      const newScore = currentScore + event.points;
      await firebaseService.saveItem('staff', selectedStaff.id, { ...selectedStaff, performanceScore: newScore });
      setIsEventModalOpen(false);
      loadData();
      setSelectedStaff(prev => prev ? { ...prev, performanceScore: newScore } : null);
    } catch (err) {
      console.error('Event save failed:', err);
    }
  };


  const staffEvents = performanceEvents.filter(e => e.staffId === selectedStaff?.id).sort((a,b) => b.timestamp - a.timestamp);
  const totalPayroll = staff.reduce((acc, curr) => acc + (curr.salary || 0), 0);

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 font-sans">
      {/* View Switcher Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveMainTab('members')}
          className={cn(
            "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeMainTab === 'members' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
          )}
        >
          Membros do Time
        </button>
        <button 
          onClick={() => setActiveMainTab('roles')}
          className={cn(
            "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeMainTab === 'roles' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
          )}
        >
          Cargos & Permissões
        </button>
      </div>

      {activeMainTab === 'members' ? (
        <>
          {/* Header & Main Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
               <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Central do Colaborador</h2>
               <p className="text-slate-500 font-medium italic">Gestão estratégica de capital humano ({module.toUpperCase()}).</p>
            </div>
            <div className="flex gap-4">
               <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={cn("p-3 rounded-xl transition-all", viewMode === 'grid' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={cn("p-3 rounded-xl transition-all", viewMode === 'list' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50")}
                  >
                    <TableIcon className="w-4 h-4" />
                  </button>
               </div>
               <button 
                 onClick={() => { setSelectedStaff(null); setIsStaffModalOpen(true); }}
                 className="px-10 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-3 active:scale-95"
               >
                  <UserPlus className="w-4 h-4" /> Adicionar Staff
               </button>
            </div>
          </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
         <StatCard 
            title="Payroll Mensal"
            value={formatCurrency(totalPayroll)}
            icon={<DollarSign />}
            variant="dark"
            accentColor="blue"
            subtitle="Empresa Total"
         />

         <StatCard 
            title="Efetivo Total"
            value={staff.length.toString().padStart(2, '0')}
            icon={<Users />}
            accentColor="indigo"
            subtitle="Membros Ativos"
         />

         <StatCard 
            title="Performance Média"
            value={(staff.reduce((a,b) => a + (b.performanceScore || 100), 0) / (staff.length || 1)).toFixed(1)}
            icon={<TrendingUp />}
            accentColor="emerald"
            subtitle="Média Global"
         />

         <StatCard 
            title="Alertas HR"
            value="04"
            icon={<AlertTriangle />}
            accentColor="amber"
            subtitle="Pendências"
         />
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, cargo ou CPF..."
              className="w-full bg-slate-50 border-none rounded-[1.5rem] py-5 pl-16 pr-8 font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all italic placeholder:text-slate-300"
            />
         </div>
         <div className="flex gap-4 w-full md:w-auto">
            <button className="flex-1 md:flex-none px-8 py-5 bg-slate-50 text-slate-600 rounded-2xl font-black uppercase text-[9px] tracking-widest border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-3">
               <Filter className="w-4 h-4" /> Filtros Avançados
            </button>
            <button className="p-5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-90">
               <History className="w-5 h-5" />
            </button>
         </div>
      </div>

      {/* Staff Display */}
      <div className={cn(
        "grid gap-8",
        viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
      )}>
        {filteredStaff.map((emp, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={emp.id}
            onClick={() => { setSelectedStaff(emp); setActiveTab('Resumo'); }}
            className={cn(
              "bg-white group cursor-pointer transition-all",
              viewMode === 'grid' 
                ? "p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:border-blue-500 hover:shadow-2xl" 
                : "p-6 rounded-3xl border border-slate-100 flex items-center justify-between"
            )}
          >
             <div className="flex items-center gap-6">
                <div className="relative">
                   <div className="w-20 h-20 rounded-[2rem] bg-slate-100 border-4 border-white shadow-xl overflow-hidden group-hover:scale-105 transition-transform duration-500">
                      <img src={emp.photo || `https://i.pravatar.cc/150?u=${emp.id}`} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                   </div>
                   <div className={cn(
                     "absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white shadow-lg",
                     emp.active ? "bg-emerald-500" : "bg-rose-500"
                   )} />
                </div>
                <div>
                   <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic leading-none truncate max-w-[150px]">{emp.name}</h4>
                   <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{emp.role?.replace('_', ' ')}</span>
                      <div className="w-1 h-1 bg-slate-200 rounded-full" />
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">ID: {emp.id.slice(-6).toUpperCase()}</span>
                   </div>
                </div>
             </div>

             <div className={cn(
                "flex items-center gap-8",
                viewMode === 'grid' ? "mt-12 justify-between" : ""
             )}>
                <div className="space-y-1">
                   <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                      <Briefcase className="w-3 h-3" /> Contrato
                   </span>
                   <span className="text-xs font-black text-slate-700 italic uppercase">{(emp.contractType || 'CLT')}</span>
                </div>

                <div className="text-right space-y-1">
                   <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Salário</span>
                   <p className="text-lg font-black text-slate-900 italic tracking-tighter">{formatCurrency(emp.salary)}</p>
                </div>
             </div>
          </motion.div>
        ))}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
           <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4" />
           <p className="text-[10px] font-black uppercase tracking-widest italic animate-pulse">Sincronizando Mesh RH...</p>
        </div>
      )}

        </>
      ) : (
        /* Role Management UI */
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
           <div className="flex items-center justify-between">
              <div>
                 <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Cargos & Permissões</h2>
                 <p className="text-slate-500 font-medium italic">Defina as chaves de acesso e responsabilidades por cargo.</p>
              </div>
              <button 
                onClick={() => { setSelectedRole(null); setIsRoleModalOpen(true); }}
                className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl flex items-center gap-2"
              >
                <Plus className="w-5 h-5" /> Novo Cargo
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles.map(role => (
                 <div key={role.role} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-blue-500 transition-all">
                    <div className="flex items-center justify-between mb-6">
                       <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                          <Shield className="w-6 h-6" />
                       </div>
                       <div className="flex gap-2">
                          <button 
                            onClick={() => { setSelectedRole(role); setIsRoleModalOpen(true); }}
                            className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                          >
                             <MoreHorizontal className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm('Deletar este cargo?')) await firebaseService.deleteItem('rolePermissions', role.role);
                              loadData();
                            }}
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                             <Trash2 className="w-5 h-5" />
                          </button>
                       </div>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic mb-2">{role.label}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">ID Interno: {role.role}</p>
                    
                    <div className="space-y-4">
                       <div className="flex flex-wrap gap-2">
                          {role.views.slice(0, 4).map(v => (
                             <span key={v} className="px-2 py-1 bg-slate-50 text-[8px] font-black text-slate-500 uppercase rounded border border-slate-100">{v}</span>
                          ))}
                          {role.views.length > 4 && <span className="text-[8px] font-black text-slate-400 uppercase">+{role.views.length - 4} mais</span>}
                       </div>
                       <div className="pt-4 border-t border-slate-50 grid grid-cols-2 gap-2 text-[8px] font-black uppercase text-slate-400">
                          <div className="flex items-center gap-1">
                             <CheckCircle2 className={cn("w-3 h-3", role.actions.canManageStaff ? "text-emerald-500" : "text-slate-200")} /> RH
                          </div>
                          <div className="flex items-center gap-1">
                             <CheckCircle2 className={cn("w-3 h-3", role.actions.canManageInventory ? "text-emerald-500" : "text-slate-200")} /> Estoque
                          </div>
                          <div className="flex items-center gap-1">
                             <CheckCircle2 className={cn("w-3 h-3", role.actions.canDiscount ? "text-emerald-500" : "text-slate-200")} /> Descontos
                          </div>
                          <div className="flex items-center gap-1">
                             <CheckCircle2 className={cn("w-3 h-3", role.actions.canVoid ? "text-emerald-500" : "text-slate-200")} /> Estornos
                          </div>
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* Existing Modals */}
      <AnimatePresence>
        {selectedStaff && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="w-full max-w-6xl bg-white rounded-[4rem] shadow-4xl overflow-hidden flex flex-col md:flex-row h-[90vh]"
            >
               {/* Sidebar Perfil */}
               <div className="w-full md:w-80 bg-slate-900 p-12 text-white flex flex-col items-center shrink-0">
                  <div className="relative mb-8">
                     <div className="w-32 h-32 rounded-[2.8rem] border-8 border-white/5 overflow-hidden shadow-2xl scale-110">
                        <img src={selectedStaff.photo || `https://i.pravatar.cc/150?u=${selectedStaff.id}`} alt="" referrerPolicy="no-referrer" />
                     </div>
                     <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-500 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-xl">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                     </div>
                  </div>
                  
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter text-center mb-2">{selectedStaff.name}</h3>
                  <span className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-400 border border-white/5 italic">{selectedStaff.role}</span>

                  <div className="w-full h-px bg-white/10 my-10" />

                  <div className="w-full space-y-6">
                     <div className="flex items-center gap-4 text-slate-400 hover:text-white transition-colors cursor-pointer group">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                           <Mail className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold truncate">{selectedStaff.email || 'e-mail@naodefinido.com'}</span>
                     </div>
                     <div className="flex items-center gap-4 text-slate-400 hover:text-white transition-colors cursor-pointer group">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                           <Phone className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold">{selectedStaff.phone || '(00) 00000-0000'}</span>
                     </div>
                     <div className="flex items-center gap-4 text-slate-400 hover:text-white transition-colors cursor-pointer group">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                           <Target className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold truncate italic">UNIDADE CENTRAL</span>
                     </div>
                  </div>

                  <div className="mt-auto w-full space-y-4">
                     <button 
                       onClick={() => setIsStaffModalOpen(true)}
                       className="w-full py-5 bg-white/10 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-white/20 transition-all active:scale-95 border border-white/10"
                     >
                        Editar Cadastro
                     </button>
                     <button 
                       onClick={() => handleDeleteStaff(selectedStaff.id)}
                       className="w-full py-5 bg-rose-500/10 text-rose-500 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-rose-500/20"
                     >
                        Remover Colaborador
                     </button>
                     <button 
                       onClick={() => setIsEventModalOpen(true)}
                       className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95"
                     >
                        Performance Log
                     </button>
                  </div>
               </div>

               {/* Painel Principal */}
               <div className="flex-1 overflow-y-auto responsive-padding custom-scrollbar bg-slate-50/30 bottom-safe-area">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-16">
                     <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
                        {['Resumo', 'Contratual', 'Documentação', 'Performance'].map((tab) => (
                           <button 
                             key={tab} 
                             onClick={() => setActiveTab(tab as any)}
                             className={cn(
                                "px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 -mb-[1px]",
                                activeTab === tab ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
                             )}
                           >
                              {tab}
                           </button>
                        ))}
                     </div>
                     <button onClick={() => setSelectedStaff(null)} className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-rose-500 transition-all group">
                        <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                     </button>
                  </div>

                  {activeTab === 'Performance' ? (
                     <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                           <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Histórico de Talentos</h4>
                           <div className="flex items-center gap-3 bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100">
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Score Atual</span>
                              <span className="text-2xl font-black text-emerald-700 italic tracking-tighter">{selectedStaff.performanceScore || 100}</span>
                           </div>
                        </div>

                        <div className="space-y-4">
                           {staffEvents.length > 0 ? staffEvents.map((event) => (
                              <div key={event.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-slate-200 transition-all">
                                 <div className="flex items-center gap-6">
                                    <div className={cn(
                                       "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                                       event.type === 'praise' ? 'bg-emerald-500 text-white' : 
                                       event.type === 'reprimand' ? 'bg-rose-500 text-white' : 'bg-blue-500 text-white'
                                    )}>
                                       {event.type === 'praise' ? <Award className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                                    </div>
                                    <div>
                                       <div className="flex items-center gap-3">
                                          <p className="font-black text-slate-900 uppercase text-sm tracking-tight italic">{event.title}</p>
                                          <span className="px-2 py-0.5 bg-slate-100 text-[8px] font-black text-slate-400 rounded uppercase">{format(event.timestamp, 'dd MMM yyyy', { locale: ptBR })}</span>
                                       </div>
                                       <p className="text-sm text-slate-500 font-medium mt-1 italic">{event.description}</p>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <span className={cn(
                                       "text-xl font-black italic tracking-tighter",
                                       event.points > 0 ? 'text-emerald-500' : 'text-rose-500'
                                    )}>{event.points > 0 ? `+${event.points}` : event.points}</span>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">por {event.createdBy}</p>
                                 </div>
                              </div>
                           )) : (
                              <div className="py-20 text-center space-y-4 opacity-30">
                                 <History className="w-12 h-12 mx-auto text-slate-300" />
                                 <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sem eventos registrados para este ciclo.</p>
                              </div>
                           )}
                        </div>
                     </div>
                  ) : activeTab === 'Contratual' ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in slide-in-from-left-4 duration-500">
                        <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-10">
                           <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic border-b border-slate-50 pb-4">Condições Atuais</h5>
                           
                           <div className="grid grid-cols-2 gap-10">
                              <div className="space-y-1">
                                 <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Admissão</p>
                                 <p className="text-xl font-black text-slate-900 italic tracking-tighter">{selectedStaff.admissionDate ? format(selectedStaff.admissionDate, 'dd/MM/yyyy') : '---'}</p>
                              </div>
                              <div className="space-y-1">
                                 <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Tipo Vínculo</p>
                                 <p className="text-xl font-black text-slate-900 italic tracking-tighter uppercase">{selectedStaff.contractType || 'CLT'}</p>
                              </div>
                              <div className="space-y-1">
                                 <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Carga Horária</p>
                                 <p className="text-xl font-black text-slate-900 italic tracking-tighter">44h Semanais</p>
                              </div>
                              <div className="space-y-1">
                                 <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Remuneração</p>
                                 <p className="text-xl font-black text-emerald-600 italic tracking-tighter">{formatCurrency(selectedStaff.salary)}</p>
                              </div>
                           </div>

                           <div className="flex bg-slate-50 p-6 rounded-3xl border border-slate-100 items-center justify-between">
                              <div className="flex items-center gap-4">
                                 <DollarSign className="w-5 h-5 text-slate-400" />
                                 <span className="text-[10px] font-black uppercase text-slate-500">Próximo Reajuste Previsto</span>
                              </div>
                              <span className="text-xs font-black text-slate-400 italic">Julho / 2024</span>
                           </div>
                        </div>

                        <div className="space-y-10">
                           <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
                              <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic border-b border-slate-50 pb-4 mb-8">Dados Bancários para Payroll</h5>
                              <div className="flex items-center gap-6 p-8 bg-blue-50/50 rounded-3xl border border-blue-100">
                                 <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-600">
                                    <Building className="w-8 h-8" />
                                 </div>
                                 <div className="space-y-1">
                                    <p className="text-lg font-black text-slate-900 italic tracking-tighter leading-none">{selectedStaff.bankInfo?.bankName || 'Não Informado'}</p>
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.1em]">Ag: {selectedStaff.bankInfo?.agency} • CC: {selectedStaff.bankInfo?.account}</p>
                                 </div>
                              </div>
                           </div>

                           <div className="bg-slate-900 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex items-center justify-between group">
                              <div className="relative z-10">
                                 <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Impostos & Encargos (Aprox.)</h5>
                                 <p className="text-3xl font-black italic tracking-tighter text-white">R$ 1.150,00</p>
                              </div>
                              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                                 <Shield className="w-8 h-8 text-slate-400" />
                              </div>
                           </div>
                        </div>
                     </div>
                  ) : activeTab === 'Documentação' ? (
                    <div className="animate-in fade-in zoom-in-95 duration-500">
                       <div className="mb-10 flex items-center justify-between">
                          <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Portfólio de Documentos</h4>
                          <button className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                             <Plus className="w-4 h-4" /> Novo Upload
                          </button>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          {[
                            { name: 'Contrato_CLT_Digital.pdf', size: '1.2MB', date: '12/03/2021', icon: <FileText /> },
                            { name: 'Exame_Medico_ASO.pdf', size: '450KB', date: '05/01/2024', icon: <History /> },
                            { name: 'Comprovante_Residencia.jpg', size: '2.1MB', date: '10/01/2024', icon: <MapPin /> },
                            { name: 'Titulo_Eleitor_Verso.png', size: '890KB', date: '05/01/2021', icon: <Shield /> },
                          ].map((doc, i) => (
                             <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-blue-500 transition-all cursor-pointer group">
                                <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                                   {React.cloneElement(doc.icon as React.ReactElement, { className: 'w-6 h-6' })}
                                </div>
                                <h5 className="font-black text-slate-900 uppercase text-xs tracking-tight italic truncate mb-1">{doc.name}</h5>
                                <div className="flex items-center gap-3">
                                   <span className="text-[9px] font-bold text-slate-400">{doc.size}</span>
                                   <div className="w-1 h-1 bg-slate-100 rounded-full" />
                                   <span className="text-[9px] font-bold text-slate-400">{doc.date}</span>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-10 animate-in fade-in duration-700">
                        <div className="col-span-2 space-y-10">
                           <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden">
                              <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic mb-10 pb-4 border-b border-slate-50">Resumo de Atividades</h5>
                              <div className="flex items-end gap-10 overflow-x-auto pb-6 scrollbar-hide">
                                 {[65, 80, 45, 90, 70, 85, 100].map((v, i) => (
                                    <div key={i} className="flex flex-col items-center gap-4 group">
                                       <div className="w-12 bg-slate-50 rounded-2xl relative flex flex-col justify-end overflow-hidden" style={{ height: '180px' }}>
                                          <motion.div 
                                             initial={{ height: 0 }}
                                             animate={{ height: `${v}%` }}
                                             className="w-full bg-blue-500 rounded-t-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                                          />
                                       </div>
                                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Seg</span>
                                    </div>
                                 ))}
                              </div>
                           </div>

                           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                              <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic mb-6">Últimas Interações System</h5>
                              <div className="space-y-4">
                                 <div className="flex items-start gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><CheckCircle2 className="w-5 h-5" /></div>
                                    <div>
                                       <p className="text-xs font-black text-slate-800 uppercase tracking-tight italic">Checkpoint: Pontualidade</p>
                                       <p className="text-[10px] font-medium text-slate-500 mt-1">Staff chegou 15 min adiantado todos os dias na última semana.</p>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-10">
                           <div className="bg-slate-900 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
                              <div className="relative z-10 text-center space-y-6">
                                 <h5 className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em]">Efficiency Rating</h5>
                                 <div className="text-6xl font-black italic tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">92%</div>
                                 <p className="text-[10px] font-medium text-slate-400 italic">O colaborador está performando acima da média do setor ({module.toUpperCase()}).</p>
                                 <button className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 transition-transform active:scale-95">Ver Auditoria</button>
                              </div>
                              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
                           </div>

                           <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                              <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Skills Monitor</h5>
                              <div className="space-y-6">
                                 {[
                                   { label: 'Atendimento', val: 95, color: 'bg-blue-500' },
                                   { label: 'Agilidade', val: 80, color: 'bg-emerald-500' },
                                   { label: 'Trabalho em Equipe', val: 70, color: 'bg-indigo-500' },
                                 ].map((skill, i) => (
                                    <div key={i} className="space-y-2">
                                       <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                          <span className="text-slate-500">{skill.label}</span>
                                          <span className="text-slate-900">{skill.val}%</span>
                                       </div>
                                       <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                                          <motion.div 
                                             initial={{ width: 0 }}
                                             animate={{ width: `${skill.val}%` }}
                                             className={cn("h-full rounded-full", skill.color)} 
                                          />
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                     </div>
                  )}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Cadastro de Staff (Add/Edit) */}
      <AnimatePresence>
        {isStaffModalOpen && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
             <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-3xl bg-white responsive-rounded shadow-4xl modal-p relative overflow-y-auto max-h-[90vh]"
             >
                <button onClick={() => setIsStaffModalOpen(false)} className="absolute top-4 right-4 sm:top-10 sm:right-10 p-4 text-slate-400 hover:text-rose-500 transition-all active:scale-90">
                   <X className="w-8 h-8" />
                </button>

                <div className="mb-12">
                   <h3 className="responsive-h2 text-slate-900 tracking-tighter italic">{selectedStaff ? 'Editar Perfil' : 'Novo Colaborador'}</h3>
                   <p className="text-slate-500 font-medium italic mt-2">Preencha os dados estratégicos para ativação do terminal P2P.</p>
                </div>

                <form onSubmit={handleSaveStaff} className="space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Nome de Exibição / Guerra</label>
                         <input name="name" defaultValue={selectedStaff?.name} required className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-5 font-bold italic focus:border-blue-500 outline-none transition-all" placeholder="Ex: Ana Silva" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Cargo Específico ({module.toUpperCase()})</label>
                         <select name="role" defaultValue={selectedStaff?.role} required className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-5 font-bold italic focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer">
                            <option value="">Selecione um Cargo</option>
                            {roles.map(r => (
                               <option key={r.role} value={r.role}>{r.label}</option>
                            ))}
                            <option value="owner">Proprietário (Admin)</option>
                         </select>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Documento (CPF)</label>
                         <input name="cpf" defaultValue={selectedStaff?.cpf} className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-5 font-bold italic focus:border-blue-500 outline-none transition-all" placeholder="000.000.000-00" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Contato WhatsApp</label>
                         <input name="phone" defaultValue={selectedStaff?.phone} className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-5 font-bold italic focus:border-blue-500 outline-none transition-all" placeholder="(11) 99999-9999" />
                      </div>
                   </div>

                   <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 space-y-8">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 pb-4 italic">Estrutura de Custo & Contrato</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Remuneração Base</label>
                            <input name="salary" type="number" step="0.01" defaultValue={selectedStaff?.salary} className="w-full bg-white border-2 border-transparent rounded-2xl p-5 font-bold italic focus:border-emerald-500 outline-none transition-all" placeholder="R$ 0,00" />
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Regime de Trabalho</label>
                            <select name="contractType" defaultValue={selectedStaff?.contractType || 'clt'} className="w-full bg-white border-2 border-transparent rounded-2xl p-5 font-bold italic focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer">
                               <option value="clt">CLT (Efetivo)</option>
                               <option value="pj">PJ (Empresarial)</option>
                               <option value="freelancer">Freelancer / Horista</option>
                               <option value="intern">Estagiário / Aprendiz</option>
                            </select>
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Data de Admissão</label>
                            <input name="admissionDate" type="date" defaultValue={selectedStaff?.admissionDate ? format(selectedStaff.admissionDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')} className="w-full bg-white border-2 border-transparent rounded-2xl p-5 font-bold italic focus:border-blue-500 outline-none transition-all" />
                         </div>
                      </div>
                   </div>

                   <div className="space-y-8">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic border-b border-slate-100 pb-4">Dados Bancários</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <input name="bankName" defaultValue={selectedStaff?.bankInfo?.bankName} placeholder="Nome do Banco" className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-4 text-xs font-bold italic focus:border-blue-500 outline-none transition-all" />
                         <input name="agency" defaultValue={selectedStaff?.bankInfo?.agency} placeholder="Agência" className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-4 text-xs font-bold italic focus:border-blue-500 outline-none transition-all" />
                         <input name="account" defaultValue={selectedStaff?.bankInfo?.account} placeholder="Conta Corrente" className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-4 text-xs font-bold italic focus:border-blue-500 outline-none transition-all" />
                      </div>
                   </div>

                   <div className="flex gap-4 pt-6">
                      <button type="button" onClick={() => setIsStaffModalOpen(false)} className="flex-1 py-6 bg-slate-50 text-slate-900 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-slate-100 transition-all border border-slate-100">Cancelar</button>
                      <button type="submit" className="flex-[2] py-6 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-black transition-all shadow-2xl active:scale-[0.98]">Validar e Salvar Cadastro</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

     {/* Modal de Performance Event (Add Action) */}
      <AnimatePresence>
        {isEventModalOpen && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
             <motion.div 
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 30 }}
               className="w-full max-w-xl bg-white rounded-[3rem] p-12 shadow-4xl relative"
             >
                <div className="flex items-center gap-6 mb-10">
                   <div className="w-16 h-16 rounded-[1.5rem] bg-blue-100 text-blue-600 flex items-center justify-center">
                      <TrendingUp className="w-8 h-8" />
                   </div>
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Novo Registro de Performance</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Impacto direto no Score de {selectedStaff?.name}.</p>
                   </div>
                </div>

                <form onSubmit={handleAddPerformanceEvent} className="space-y-8">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipo de Evento</label>
                      <div className="grid grid-cols-2 gap-4">
                         {['praise', 'reprimand', 'error', 'training'].map((type) => (
                            <label key={type} className="relative group cursor-pointer">
                               <input type="radio" name="type" value={type} required className="peer sr-only" defaultChecked={type === 'praise'} />
                               <div className={cn(
                                 "p-5 rounded-2xl border-2 border-slate-100 flex flex-col items-center gap-2 transition-all group-hover:bg-slate-50 peer-checked:border-blue-500 peer-checked:bg-blue-50",
                                 type === 'reprimand' && "peer-checked:border-rose-500 peer-checked:bg-rose-50",
                                 type === 'training' && "peer-checked:border-indigo-500 peer-checked:bg-indigo-50"
                               )}>
                                  <span className="text-[10px] font-black uppercase text-slate-900 tracking-widest italic">{type.replace('praise', 'Elogio').replace('reprimand', 'Advertência').replace('error', 'Falha').replace('training', 'Treinamento')}</span>
                               </div>
                            </label>
                         ))}
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Título do Acontecimento</label>
                         <input name="title" required className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 font-bold italic focus:border-blue-500 outline-none transition-all" placeholder="Ex: Excelência no Atendimento ao Cliente" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Descrição Detalhada (Privada)</label>
                         <textarea name="description" required className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 font-bold italic focus:border-blue-500 outline-none transition-all h-32 resize-none" placeholder="O colaborador demonstrou proatividade ao..." />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Impacto de Pontos ({selectedStaff?.name})</label>
                         <input name="points" type="number" defaultValue={5} className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 font-black text-2xl italic tracking-tighter focus:border-blue-500 outline-none transition-all" />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 pt-4">
                      <button type="button" onClick={() => setIsEventModalOpen(false)} className="py-6 bg-slate-50 text-slate-400 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all active:scale-95">Descartar</button>
                      <button type="submit" className="py-6 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98]">Confirmar e Impactar Score</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal de Cargo (Add/Edit) */}
      <AnimatePresence>
        {isRoleModalOpen && (
          <div className="fixed inset-0 z-[800] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="w-full max-w-4xl bg-white rounded-[3rem] p-12 shadow-4xl relative overflow-y-auto max-h-[90vh]"
             >
                <button onClick={() => setIsRoleModalOpen(false)} className="absolute top-10 right-10 p-4 text-slate-400 hover:text-rose-500 transition-all">
                   <X className="w-8 h-8" />
                </button>

                <div className="mb-12">
                   <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{selectedRole ? 'Configurar Cargo' : 'Criar Novo Cargo'}</h3>
                   <p className="text-slate-500 font-medium italic mt-2">Defina os privilégios de acesso às telas e ações do sistema.</p>
                </div>

                <form onSubmit={handleSaveRole} className="space-y-12">
                   <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Identificador Interno (Sem Espaços)</label>
                         <input name="role" defaultValue={selectedRole?.role} required={!selectedRole} readOnly={!!selectedRole} className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-5 font-mono font-bold italic focus:border-blue-500 outline-none transition-all" placeholder="ex: gerente_loja" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Nome Público do Cargo</label>
                         <input name="label" defaultValue={selectedRole?.label} required className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-5 font-bold italic focus:border-blue-500 outline-none transition-all" placeholder="ex: Gerente de Loja" />
                      </div>
                   </div>

                   <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 border-b border-slate-100 pb-4">Telas Acessíveis (Views)</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         {[
                           'dashboard', 'tables', 'orders', 'kitchen', 'bar', 'inventory', 
                           'reports', 'history', 'staff_mgmt', 'menu_mgmt', 'schedule', 
                           'reservations', 'printer_mgmt', 'safety', 'settings', 
                           'finance_mgmt', 'supplier_mgmt', 'service_mgmt', 'company_mgmt', 'pending_orders'
                         ].map(v => (
                            <label key={v} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all group">
                               <input type="checkbox" name="view" value={v} defaultChecked={selectedRole?.views.includes(v as any)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                               <span className="text-[10px] font-black uppercase text-slate-600 group-hover:text-slate-900 transition-colors uppercase italic font-bold">{v.replace('_', ' ')}</span>
                            </label>
                         ))}
                      </div>
                   </div>

                   <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 border-b border-slate-100 pb-4">Ações Específicas</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                         {[
                           { name: 'canVoid', label: 'Estornar Vendas' },
                           { name: 'canDiscount', label: 'Aplicar Desconto' },
                           { name: 'canViewSales', label: 'Ver Vendas' },
                           { name: 'canManageStaff', label: 'Gerenciar RH' },
                           { name: 'canManageInventory', label: 'Ver Estoque' },
                           { name: 'canEditMenu', label: 'Mudar Preços' },
                           { name: 'canReopenTable', label: 'Reabrir Contas' },
                           { name: 'canManageSchedule', label: 'Escalas' },
                         ].map(action => (
                            <label key={action.name} className="relative flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all">
                               <span className="text-[10px] font-black uppercase text-slate-700">{action.label}</span>
                               <input type="checkbox" name={action.name} defaultChecked={(selectedRole?.actions as any)?.[action.name]} className="sr-only peer" />
                               <div className="w-10 h-6 bg-slate-200 rounded-full peer-checked:bg-emerald-500 transition-all relative flex items-center px-1">
                                  <div className="w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-4 shadow-sm" />
                               </div>
                            </label>
                         ))}
                      </div>
                   </div>

                   <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl active:scale-[0.98]">
                      Salvar Protocolo de Cargo
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
