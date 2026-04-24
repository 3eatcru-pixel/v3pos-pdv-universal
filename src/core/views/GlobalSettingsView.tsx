import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Smartphone, 
  Shield, 
  Settings2, 
  Cloud, 
  Monitor, 
  Link2, 
  Copy, 
  Check, 
  ShieldCheck, 
  Zap, 
  Clock, 
  FileText, 
  Download, 
  Database,
  Lock,
  X,
  LayoutDashboard,
  CheckCircle2,
  Plus,
  Trash2,
  Settings,
  Utensils,
  ShoppingCart,
  Briefcase,
  Hammer,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../../lib/utils';
import { firebaseService } from '../../services/firebaseService';
import { BackupEngine } from '../services/BackupEngine';
import { CompanySettings, DeviceLink, RolePermissions, Shop, Product, Table, Staff, Order, InventoryItem, View, BusinessConfig } from '../../types';
import { useCollection } from '../../hooks/useCollection';

interface GlobalSettingsViewProps {
  enterpriseId: string | null;
  companySettings: CompanySettings;
  setCompanySettings: (s: CompanySettings) => void;
  isDeviceLinked: boolean;
  linkedDevices: DeviceLink[];
  linkToken: string;
}

export const GlobalSettingsView: React.FC<GlobalSettingsViewProps> = ({ 
  enterpriseId, 
  companySettings, 
  setCompanySettings,
  isDeviceLinked,
  linkedDevices,
  linkToken
}) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState<'company' | 'devices' | 'permissions' | 'system' | 'backup'>('company');
  const [backups, setBackups] = useState<any[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const { data: rolePermissions } = useCollection<RolePermissions>('rolePermissions');
  const { data: shops } = useCollection<Shop>('shops');
  const { data: products } = useCollection<Product>('products');
  const { data: tables } = useCollection<Table>('tables');
  const { data: staff } = useCollection<Staff>('staff');
  const { data: orders } = useCollection<Order>('orders');
  const { data: inventory } = useCollection<InventoryItem>('inventory');
  
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [editingRolePermissions, setEditingRolePermissions] = useState<RolePermissions | null>(null);
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  useEffect(() => {
    if (enterpriseId) {
      return firebaseService.subscribeCollection('backups', enterpriseId, null, setBackups);
    }
  }, [enterpriseId]);

  const handleCreateBackup = async () => {
    if (!enterpriseId) return;
    const key = prompt("Defina uma senha mestre para encriptar este backup (mínimo 8 caracteres):");
    if (!BackupEngine.validateMasterKey(key)) {
      alert("Senha inválida ou muito curta.");
      return;
    }

    setIsBackingUp(true);
    try {
      const fullData = {
        shops,
        products,
        tables,
        staff,
        orders: orders.slice(-100),
        inventory,
        createdAt: Date.now()
      };

      const id = await BackupEngine.createEncryptedBackup(enterpriseId, fullData, key);
      alert(`Backup criado e encriptado com sucesso! \nProtocolo: ${id}`);
    } catch (error) {
      console.error(error);
      alert("Erro ao processar backup.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    const key = prompt('Digite a senha mestre usada neste backup:');
    if (!BackupEngine.validateMasterKey(key)) return;

    try {
      const restoredData = await BackupEngine.validateAndReadBackup(backupId, key);
      if (!restoredData) {
        alert('Nao foi possivel descriptografar o backup.');
        return;
      }
      alert('Backup validado com sucesso. Restauracao completa ainda nao foi implementada nesta tela.');
    } catch (error) {
      console.error(error);
      alert('Falha ao restaurar backup. Verifique a senha e tente novamente.');
    }
  };

  const handleUpdatePermissions = async (updatedPerm: RolePermissions) => {
    await firebaseService.saveItem('rolePermissions', updatedPerm.role, updatedPerm);
  };

  const handleCreateRole = async (name: string) => {
    if (!name.trim()) return;
    const roleId = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    if (rolePermissions.some(p => p.role === roleId)) {
      alert("Este cargo já existe ou possui um ID similar.");
      return;
    }

    const newPerm: RolePermissions = {
      role: roleId,
      label: name.trim(),
      views: ['dashboard'],
      actions: { 
        canVoid: false, 
        canDiscount: false, 
        canViewSales: false, 
        canManageStaff: false, 
        canManageInventory: false, 
        canEditMenu: false, 
        canReopenTable: false, 
        canManageSchedule: false 
      }
    };

    await firebaseService.saveItem('rolePermissions', roleId, newPerm);
    setIsCreateRoleModalOpen(false);
    setNewRoleName('');
  };

  const renderPermissionModal = () => {
    if (!editingRolePermissions) return null;

    const allViews: View[] = [
      'dashboard', 'tables', 'orders', 'kitchen', 'bar', 'inventory', 
      'reports', 'history', 'staff_mgmt', 'menu_mgmt', 'schedule', 
      'reservations', 'printer_mgmt'
    ];

    const allActions = [
      { id: 'canVoid', label: 'Estornar Pedidos' },
      { id: 'canDiscount', label: 'Aplicar Descontos' },
      { id: 'canViewSales', label: 'Ver Vendas Detalhadas' },
      { id: 'canManageStaff', label: 'Gerenciar Equipe' },
      { id: 'canManageInventory', label: 'Gerenciar Estoque' },
      { id: 'canEditMenu', label: 'Editar Cardápio' },
      { id: 'canReopenTable', label: 'Reabrir Mesas' },
      { id: 'canManageSchedule', label: 'Modificar Escala' }
    ];

    const toggleView = (view: View) => {
      const currentViews = editingRolePermissions.views;
      const newViews = currentViews.includes(view)
        ? currentViews.filter(v => v !== view)
        : [...currentViews, view];
      
      const updated = { ...editingRolePermissions, views: newViews };
      handleUpdatePermissions(updated);
      setEditingRolePermissions(updated);
    };

    const toggleAction = (actionId: string) => {
      const newActions = {
        ...editingRolePermissions.actions,
        [actionId]: !editingRolePermissions.actions[actionId as keyof typeof editingRolePermissions.actions]
      };
      const updated = { ...editingRolePermissions, actions: newActions };
      handleUpdatePermissions(updated);
      setEditingRolePermissions(updated);
    };

    return (
      <AnimatePresence>
        {isPermissionModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div>
                   <h3 className="text-xl font-black text-slate-800 tracking-tight">Matriz de Permissões</h3>
                   <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">Cargo: {editingRolePermissions.role.replace('_', ' ')}</p>
                 </div>
                 <button onClick={() => setIsPermissionModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <section>
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2">
                    <LayoutDashboard className="w-3 h-3" /> Acesso às Telas (Views)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {allViews.map(view => (
                      <button
                        key={view}
                        onClick={() => toggleView(view)}
                        className={cn(
                          "px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all text-center flex items-center justify-center gap-2",
                          editingRolePermissions.views.includes(view)
                            ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20"
                            : "bg-slate-50 text-slate-400 border-slate-100 opacity-60 grayscale"
                        )}
                      >
                        {view.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3" /> Ações do Sistema
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {allActions.map(action => {
                      const isActive = editingRolePermissions.actions[action.id as keyof typeof editingRolePermissions.actions];
                      return (
                        <button
                          key={action.id}
                          onClick={() => toggleAction(action.id)}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all",
                            isActive 
                              ? "bg-white border-emerald-100 shadow-sm" 
                              : "bg-slate-50 border-slate-100 opacity-40"
                          )}
                        >
                          <span className={cn("text-[11px] font-black uppercase tracking-tight", isActive ? "text-slate-700" : "text-slate-400")}>{action.label}</span>
                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center border", isActive ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200")}>
                            {isActive && <Check className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  const renderCreateRoleModal = () => (
    <AnimatePresence>
      {isCreateRoleModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
               <h3 className="text-lg font-bold text-slate-800 tracking-tight">Novo Cargo</h3>
               <button onClick={() => setIsCreateRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
               </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Nome do Cargo</label>
                <input 
                  autoFocus
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  placeholder="Ex: Supervisor, Sommelier, Hostess..."
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700" 
                />
              </div>
              <button 
                onClick={() => handleCreateRole(newRoleName)}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Plus className="w-4 h-4" />
                Criar Cargo
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
           <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase italic">Configurações do Sistema</h2>
           <p className="text-slate-500 font-medium italic">Gestão da organização, dispositivos e segurança.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] overflow-x-auto custom-scrollbar no-scrollbar whitespace-nowrap">
           {(['company', 'devices', 'permissions', 'system', 'backup'] as const).map(tab => (
             <button 
               key={tab}
               onClick={() => setActiveSettingsTab(tab)}
               className={cn(
                 "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                 activeSettingsTab === tab ? "bg-white text-slate-900 shadow-xl shadow-slate-200" : "text-slate-400 hover:text-slate-600"
               )}
             >
               {tab === 'company' && 'Empresa'}
               {tab === 'devices' && 'Terminais'}
               {tab === 'permissions' && 'Acessos'}
               {tab === 'system' && 'Sistema'}
               {tab === 'backup' && 'Backups'}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
         {activeSettingsTab === 'company' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                 <div className="sleek-card p-10 bg-white">
                    <div className="flex items-center gap-4 mb-10">
                       <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl">
                          <Building2 className="w-6 h-6 text-white" />
                       </div>
                       <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Dados Corporativos</h3>
                    </div>

                    <form className="space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Nome Fantasia</label>
                             <input 
                              value={companySettings.name} 
                              onChange={e => setCompanySettings({...companySettings, name: e.target.value})}
                              className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold text-sm outline-none transition-all" 
                              title="Nome Fantasia"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">CNPJ / Identificação</label>
                             <input 
                              value={companySettings.cnpj} 
                              onChange={e => setCompanySettings({...companySettings, cnpj: e.target.value})}
                              className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold text-sm outline-none transition-all" 
                              placeholder="00.000.000/0000-00"
                              title="CNPJ"
                             />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Endereço Principal</label>
                          <input 
                            value={companySettings.address} 
                            onChange={e => setCompanySettings({...companySettings, address: e.target.value})}
                            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold text-sm outline-none transition-all" 
                            title="Endereço"
                          />
                       </div>
                       <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Segurança de Alergia</p>
                            <p className="text-xs text-slate-500 font-medium">Exigir dupla confirmação (garçom + cozinha/bar) antes de marcar pronto.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCompanySettings({
                              ...companySettings,
                              requireAllergyDoubleConfirmation: !companySettings.requireAllergyDoubleConfirmation
                            })}
                            className={cn(
                              "w-14 h-8 rounded-full relative transition-all",
                              companySettings.requireAllergyDoubleConfirmation ? "bg-emerald-500" : "bg-slate-300"
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm",
                                companySettings.requireAllergyDoubleConfirmation ? "left-7" : "left-1"
                              )}
                            />
                          </button>
                       </div>
                       <button type="button" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10">
                          Atualizar Informações
                       </button>
                    </form>
                 </div>
              </div>

              <div className="space-y-8">
                 <div className="sleek-card p-10 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none relative overflow-hidden">
                    <div className="relative z-10">
                       <Zap className="w-8 h-8 text-blue-400 mb-6" />
                       <h4 className="text-xl font-black uppercase italic tracking-tighter mb-2">Seu Plano: Enterprise</h4>
                       <p className="text-slate-400 text-sm font-medium mb-8 leading-tight">Você tem acesso ilimitado a todos os módulos e unidades.</p>
                       <button className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Ver Detalhes do Plano</button>
                    </div>
                    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
                 </div>
              </div>
           </div>
         )}

         {activeSettingsTab === 'devices' && (
           <div className="space-y-8">
              <div className="flex items-center justify-between">
                 <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Terminais Vinculados</h3>
                    <p className="text-slate-500 text-sm font-medium">Controle os dispositivos que acessam sua rede PDV.</p>
                 </div>
                 <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all">
                    Vincular Novo Terminal
                 </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {linkedDevices.map(device => (
                    <div key={device.id} className="sleek-card p-8 bg-white hover:border-blue-200 transition-all group">
                       <div className="flex items-start justify-between mb-8">
                          <div className={cn(
                             "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                             device.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          )}>
                             <Smartphone className="w-6 h-6" />
                          </div>
                          <div className="text-right">
                             <span className={cn(
                                "text-[9px] font-black uppercase px-2 py-1 rounded-lg",
                                device.status === 'active' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                             )}>{device.status}</span>
                          </div>
                       </div>
                       <h4 className="text-lg font-black text-slate-800 uppercase italic tracking-tighter mb-1">{device.name}</h4>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Último Acesso: {new Date(device.lastUsedAt).toLocaleString()}</p>
                       <div className="flex gap-2">
                          <button className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all">Desconectar</button>
                          <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all"><Settings2 className="w-4 h-4" /></button>
                       </div>
                    </div>
                 ))}
                 
                 <div className="sleek-card p-10 border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all">
                    <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center text-slate-300 group-hover:text-blue-500 shadow-sm mb-4 transition-colors">
                       <Link2 className="w-6 h-6" />
                    </div>
                    <p className="text-[10px] font-black uppercase text-slate-400 group-hover:text-blue-600 tracking-widest">Adicionar Dispositivo via Token</p>
                 </div>
              </div>
           </div>
         )}

         {activeSettingsTab === 'permissions' && (
           <div className="space-y-8">
              <div className="flex items-center justify-between">
                 <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Cargos & Permissões</h3>
                    <p className="text-slate-500 text-sm font-medium">Defina os níveis de acesso e privilégios da sua equipe.</p>
                 </div>
                 <button 
                  onClick={() => setIsCreateRoleModalOpen(true)}
                  className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 transition-all"
                 >
                    + Criar Novo Cargo
                 </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {rolePermissions.map(perm => (
                    <div key={perm.role} className="sleek-card p-8 bg-white border-2 border-transparent hover:border-emerald-200 transition-all group">
                       <div className="flex items-center justify-between mb-8">
                          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                             <Shield className="w-6 h-6" />
                          </div>
                          <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                            {perm.views.length} Telas
                          </span>
                       </div>
                       <h4 className="text-lg font-black text-slate-800 uppercase italic tracking-tighter mb-1">{perm.label || perm.role.replace('_', ' ')}</h4>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 italic">ID: {perm.role}</p>
                       <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setEditingRolePermissions(perm);
                              setIsPermissionModalOpen(true);
                            }}
                            className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                          >Configurar</button>
                          {perm.role !== 'owner' && (
                             <button 
                              onClick={async () => {
                                if (confirm(`Excluir o cargo "${perm.label || perm.role}"?`)) {
                                  await firebaseService.deleteItem('rolePermissions', perm.role);
                                }
                              }}
                              className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all"
                             ><Trash2 className="w-4 h-4" /></button>
                          )}
                       </div>
                    </div>
                 ))}
              </div>
           </div>
         )}
         {renderPermissionModal()}
         {renderCreateRoleModal()}

         {activeSettingsTab === 'system' && (
           <div className="space-y-8">
              <div className="sleek-card p-10 bg-white">
                 <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter mb-8">Preferências de Operação</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                       <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                          <div className="flex items-center justify-between mb-4">
                             <h4 className="text-xs font-black uppercase text-slate-800 tracking-widest">Taxa de Serviço (%)</h4>
                             <input type="number" defaultValue={10} className="w-20 bg-white border border-slate-200 rounded-xl py-2 px-3 text-center font-black text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">Aplicada automaticamente ao subtotal de pedidos em mesa.</p>
                       </div>
                       <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                          <div className="flex items-center justify-between mb-4">
                             <h4 className="text-xs font-black uppercase text-slate-800 tracking-widest">Imposto de Vendas (%)</h4>
                             <input type="number" defaultValue={0} className="w-20 bg-white border border-slate-200 rounded-xl py-2 px-3 text-center font-black text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">Calculado sobre o valor total bruto para relatórios fiscais.</p>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="p-8 bg-blue-600 rounded-[2.5rem] text-white relative overflow-hidden group">
                          <div className="relative z-10">
                             <h4 className="text-lg font-black uppercase italic tracking-tighter mb-2">Modo Offline (Híbrido)</h4>
                             <p className="text-blue-100 text-xs font-medium mb-6">Mantenha as vendas funcionando mesmo sem internet. Sincronização automática via P2P.</p>
                             <div className="flex items-center gap-3">
                                <div className="w-12 h-6 bg-blue-400/30 rounded-full relative">
                                   <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Desativado</span>
                             </div>
                          </div>
                          <Cloud className="absolute bottom-[-20%] right-[-10%] w-32 h-32 text-white/10 group-hover:scale-110 transition-transform duration-700" />
                       </div>
                    </div>
                 </div>
              </div>
           </div>
         )}

         {activeSettingsTab === 'backup' && (
           <div className="space-y-8">
              <div className="sleek-card p-10 bg-white">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20">
                          <Database className="w-6 h-6 text-white" />
                       </div>
                       <div>
                          <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Nuvem & Backup Seguro</h3>
                          <p className="text-slate-500 text-sm font-medium">Todos os backups são encriptados ponta-a-ponta (AES-256).</p>
                       </div>
                    </div>
                    <button 
                      onClick={handleCreateBackup}
                      disabled={isBackingUp}
                      className={cn(
                        "bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95",
                        isBackingUp && "opacity-50 cursor-not-allowed"
                      )}
                    >
                       <Cloud className="w-5 h-5" /> {isBackingUp ? 'Processando...' : 'Gerar Novo Backup Agora'}
                    </button>
                 </div>

                 <div className="overflow-hidden rounded-3xl border border-slate-100">
                    <table className="w-full text-left">
                       <thead className="bg-slate-50">
                          <tr>
                             <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Identificador</th>
                             <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Data / Hora</th>
                             <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipo</th>
                             <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                             <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ação</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50 font-sans">
                          {backups.map(backup => (
                            <tr key={backup.id} className="hover:bg-slate-50/50 transition-colors">
                               <td className="px-8 py-6">
                                  <div className="flex items-center gap-3">
                                     <Lock className="w-4 h-4 text-blue-500" />
                                     <span className="text-xs font-black text-slate-700 font-mono tracking-tight">{backup.id.substring(0, 16)}...</span>
                                  </div>
                               </td>
                               <td className="px-8 py-6">
                                  <div className="flex flex-col">
                                     <span className="text-xs font-bold text-slate-800">{new Date(backup.createdAt).toLocaleDateString()}</span>
                                     <span className="text-[10px] font-bold text-slate-400">{new Date(backup.createdAt).toLocaleTimeString()}</span>
                                  </div>
                               </td>
                               <td className="px-8 py-6">
                                  <span className="text-[10px] font-black uppercase bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg">Full Snapshot</span>
                               </td>
                               <td className="px-8 py-6">
                                  <div className="flex items-center gap-2">
                                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                     <span className="text-[10px] font-black uppercase text-emerald-600">Verificado</span>
                                  </div>
                               </td>
                               <td className="px-8 py-6 text-right">
                                  <button 
                                    onClick={() => handleRestoreBackup(backup.id)}
                                    className="px-4 py-2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-all"
                                  >Restaurar</button>
                               </td>
                            </tr>
                          ))}
                          {backups.length === 0 && (
                            <tr>
                               <td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic text-sm">Nenhum backup encontrado na nuvem para esta empresa.</td>
                            </tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
         )}
      </div>
    </div>
  );
};

interface CustomizationViewProps {
  enterpriseId: string | null;
}

export const CustomizationView: React.FC<CustomizationViewProps> = ({ enterpriseId }) => {
  const [customizationTab, setCustomizationTab] = useState<'modules' | 'roles' | 'workflows' | 'fields' | 'schedule'>('modules');
  const { data: businessConfigs } = useCollection<BusinessConfig>('businessConfigs');
  
  const config = businessConfigs.find(c => c.enterpriseId === enterpriseId) || {
    id: `cfg-${enterpriseId || 'local'}`,
    enterpriseId: enterpriseId || 'local',
    enabledModules: ['restaurant'],
    roles: [],
    workflows: {},
    customFields: []
  } as BusinessConfig;

  const handleSaveConfig = async (newConfig: Partial<BusinessConfig>) => {
    await firebaseService.saveItem('businessConfigs', config.id, { ...config, ...newConfig, enterpriseId });
  };

  const modules = [
    { id: 'restaurant', label: 'Restaurante', icon: <Utensils /> },
    { id: 'market', label: 'Mercado', icon: <ShoppingCart /> },
    { id: 'service', label: 'Serviços Master', icon: <Briefcase /> },
    { id: 'construction', label: 'Construção', icon: <Hammer /> },
    { id: 'retail', label: 'Varejo', icon: <Tag /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Personalização Global</h2>
          <p className="text-slate-500 font-medium">Adapte a plataforma para o seu modelo de negócio</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          {(['modules', 'roles', 'workflows', 'fields', 'schedule'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setCustomizationTab(tab)}
              className={cn(
                "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                customizationTab === tab ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {tab === 'modules' && 'Módulos'}
              {tab === 'roles' && 'Cargos'}
              {tab === 'workflows' && 'Fluxos'}
              {tab === 'fields' && 'Campos'}
              {tab === 'schedule' && 'Agenda'}
            </button>
          ))}
        </div>
      </div>

      {customizationTab === 'modules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map(mod => {
            const isEnabled = config.enabledModules.includes(mod.id);
            return (
              <div 
                key={mod.id} 
                onClick={() => {
                  const newModules = isEnabled 
                    ? config.enabledModules.filter(id => id !== mod.id)
                    : [...config.enabledModules, mod.id];
                  handleSaveConfig({ enabledModules: newModules });
                }}
                className={cn(
                  "sleek-card p-8 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] border-2",
                  isEnabled ? "bg-emerald-50 border-emerald-500 shadow-xl shadow-emerald-500/10" : "bg-white border-transparent grayscale opacity-60 hover:grayscale-0 hover:opacity-100"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg",
                  isEnabled ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                )}>
                  {mod.icon}
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter mb-2">{mod.label}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isEnabled ? 'Ativado' : 'Desativado'}</span>
                  <div className={cn(
                    "w-10 h-5 rounded-full relative transition-colors duration-300",
                    isEnabled ? "bg-emerald-500" : "bg-slate-200"
                  )}>
                    <div className={cn(
                      "w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all duration-300 shadow-sm",
                      isEnabled ? "left-5.5" : "left-0.5"
                    )} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {customizationTab !== 'modules' && (
        <div className="sleek-card p-20 bg-slate-50 border-2 border-dashed border-slate-200 text-center">
           <Settings2 className="w-16 h-16 text-slate-200 mx-auto mb-6" />
           <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter italic">Personalização Avançada</h3>
           <p className="text-slate-400 max-w-sm mx-auto mt-4 font-medium italic">Esta funcionalidade está sendo migrada para o novo motor de regras do sistema. Em breve você poderá criar fluxos customizados.</p>
        </div>
      )}
    </div>
  );
};
