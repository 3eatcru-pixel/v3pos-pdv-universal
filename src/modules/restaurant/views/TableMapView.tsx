import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Zap, 
  Layout, 
  ClipboardList, 
  Settings, 
  Plus, 
  Check, 
  Bell, 
  Settings2, 
  Trash2, 
  X, 
  Table as TableIcon,
  GripHorizontal,
  History,
  MousePointer2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, cn } from '../../../lib/utils';
import { useCollection } from '../../../hooks/useCollection';
import { accountService } from '../../../core/services/accountService';
import { firebaseService } from '../../../services/firebaseService';
import { Table, Order, Staff } from '../../../types';

interface TableMapViewProps {
  onOpenTable: (table: Table) => void;
  systemMode?: 'restaurant' | 'distributor' | 'service';
}

export const TableMapView: React.FC<TableMapViewProps> = ({ 
  onOpenTable,
  systemMode = 'restaurant'
}) => {
  const currentUser = accountService.getCurrentUser();
  const selectedShopId = accountService.getSelectedShopId();
  const enterpriseId = accountService.getCurrentCompanyId();

  const { data: tables } = useCollection<Table>('tables');
  const { data: orders } = useCollection<Order>('orders');
  const { data: staff } = useCollection<Staff>('staff');

  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('Salão Principal');
  const [isTableManagementMode, setIsTableManagementMode] = useState(false);
  const [isTableListView, setIsTableListView] = useState(false);
  const [isEditTableModalOpen, setIsEditTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  const filteredTables = useMemo(() => {
    return tables.filter(t => 
      t.shopId === selectedShopId &&
      (t.number.toString().includes(tableSearchQuery) || 
       (t.area || '').toLowerCase().includes(tableSearchQuery.toLowerCase()))
    );
  }, [tables, selectedShopId, tableSearchQuery]);

  const tableAreas = useMemo(() => {
    const areas = Array.from(new Set(filteredTables.map(t => t.area || 'Salão Principal')));
    if (areas.length === 0) return ['Salão Principal'];
    return areas;
  }, [filteredTables]);

  const tablesInArea = useMemo(() => 
    filteredTables.filter(t => (t.area || 'Salão Principal') === selectedArea)
  , [filteredTables, selectedArea]);

  const isAdmin = currentUser?.role === 'owner' || currentUser?.role === 'manager_foh' || currentUser?.role === 'admin';

  const handleUpdateTable = async (tableId: string, updates: Partial<Table>) => {
    await firebaseService.updateItem('tables', tableId, updates);
  };

  const handleAddTable = async (capacity: number) => {
    const id = `tbl-${Math.random().toString(36).substr(2, 9)}`;
    const newTable: Table = {
      id,
      enterpriseId: enterpriseId || 'local-ent',
      shopId: selectedShopId || 'shop-1',
      number: tables.filter(t => t.shopId === (selectedShopId || 'shop-1')).length + 1,
      status: 'free',
      capacity,
      position: { x: 100, y: 100 },
      area: selectedArea
    };
    await firebaseService.saveItem('tables', id, newTable);
  };

  const handleRemoveTable = async (id: string) => {
    if (orders.find(o => o.tableId === id && o.status !== 'delivered')) {
      alert("Não é possível remover uma mesa com pedidos ativos.");
      return;
    }
    await firebaseService.deleteItem('tables', id);
  };

  const handleSeedTablesForCurrentShop = async () => {
    if (!selectedShopId) return;
    const areas = ['Salão Principal', 'Varanda', 'VIP'];
    for (let i = 1; i <= 12; i++) {
      const area = areas[Math.floor((i-1)/4)];
      const id = `tbl-${selectedShopId}-${i}`;
      const table: Table = {
        id,
        enterpriseId: enterpriseId || 'local-ent',
        shopId: selectedShopId,
        number: i,
        status: 'free',
        capacity: i % 2 === 0 ? 4 : 2,
        position: { x: 150 + ((i-1)%4)*150, y: 150 + Math.floor((i-1)/4)*150 },
        area
      };
      await firebaseService.saveItem('tables', id, table);
    }
  };

  const handleAddArea = () => {
    const name = prompt("Nome do novo ambiente (Ex: Rooftop, Deck, Vip):");
    if (name && name.trim()) {
      setSelectedArea(name.trim());
    }
  };

  const renderTableEditModal = () => {
    if (!editingTable) return null;

    return (
      <AnimatePresence>
        {isEditTableModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                      <TableIcon className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Editar Mesa {editingTable.number}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configurações e Localização</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsEditTableModalOpen(false)} 
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Número da Mesa</label>
                      <input
                        type="number"
                        value={editingTable.number}
                        onChange={(e) => setEditingTable({ ...editingTable, number: parseInt(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Capacidade (Pessoas)</label>
                      <input
                        type="number"
                        value={editingTable.capacity}
                        onChange={(e) => setEditingTable({ ...editingTable, capacity: parseInt(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Área / Ambiente</label>
                    <select
                      value={editingTable.area || 'Salão Principal'}
                      onChange={(e) => setEditingTable({ ...editingTable, area: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none"
                    >
                      {tableAreas.map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={async () => {
                        await handleUpdateTable(editingTable.id, {
                          number: editingTable.number,
                          capacity: editingTable.capacity,
                          area: editingTable.area
                        });
                        setIsEditTableModalOpen(false);
                      }}
                      className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-500 transition-all shadow-xl shadow-slate-900/20"
                    >
                      Salvar Alterações
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir a mesa ${editingTable.number}?`)) {
                          handleRemoveTable(editingTable.id);
                          setIsEditTableModalOpen(false);
                        }
                      }}
                      className="w-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-inner">
               <TableIcon className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Mapa de Mesas</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("w-2 h-2 rounded-full animate-pulse", isTableManagementMode ? "bg-blue-500" : "bg-emerald-500")} />
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  {isTableManagementMode ? "Edição" : `Ativas: ${filteredTables.filter(t => t.status === 'occupied').length}`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 group w-full sm:w-auto">
             {systemMode === 'distributor' && (
               <button 
                onClick={() => {
                  // handle takeaway logic or fast pdv
                }}
                className="px-6 py-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2 group whitespace-nowrap"
               >
                 <Zap className="w-4 h-4 text-amber-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Venda Rápida (PDV)</span>
               </button>
             )}
             <div className="relative flex-1 sm:flex-none">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                   <Search className="w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <input 
                   type="text"
                   placeholder="Nº DA MESA..."
                   className="pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 outline-none w-full sm:w-32 transition-all"
                   value={tableSearchQuery}
                   onChange={(e) => setTableSearchQuery(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && tableSearchQuery) {
                        const found = filteredTables.find(t => t.number.toString() === tableSearchQuery);
                        if (found) {
                           onOpenTable(found);
                           setTableSearchQuery('');
                        }
                     }
                   }}
                />
             </div>
             <button 
               onClick={() => {
                 if (tableSearchQuery) {
                    const found = filteredTables.find(t => t.number.toString() === tableSearchQuery);
                    if (found) {
                       onOpenTable(found);
                       setTableSearchQuery('');
                    }
                 }
               }}
               className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl hover:bg-emerald-500 transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2"
             >
               <Search className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Buscar Mesa</span>
             </button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
           <div className="bg-slate-100/50 p-1.5 rounded-2xl flex border border-slate-200 shadow-inner">
              <button 
                onClick={() => setIsTableListView(false)}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  !isTableListView ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <Layout className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsTableListView(true)}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  isTableListView ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <ClipboardList className="w-4 h-4" />
              </button>
           </div>

           <div className="h-10 w-px bg-slate-200 hidden md:block" />

           <div className="flex-1 lg:flex-none overflow-x-auto custom-scrollbar whitespace-nowrap bg-slate-100/50 p-1.5 rounded-2xl flex border border-slate-200">
             {tableAreas.map(area => (
               <button 
                 key={area}
                 onClick={() => setSelectedArea(area)}
                 className={cn(
                   "px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex-shrink-0",
                   selectedArea === area ? "bg-white text-slate-900 shadow-md ring-1 ring-black/5" : "text-slate-400 hover:text-slate-600"
                 )}
               >
                 {area}
               </button>
             ))}
             {isAdmin && isTableManagementMode && (
               <button 
                  onClick={handleAddArea}
                  className="w-10 h-10 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
               >
                  <Plus className="w-4 h-4" />
               </button>
             )}
           </div>
           
           <div className="h-10 w-px bg-slate-200 hidden md:block" />

           {isAdmin && (
             <button 
               onClick={() => setIsTableManagementMode(!isTableManagementMode)}
               className={cn(
                 "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl",
                 isTableManagementMode 
                  ? "bg-slate-900 text-white shadow-slate-900/20" 
                  : "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-sm"
               )}
             >
               {isTableManagementMode ? (
                 <> <Check className="w-4 h-4 text-emerald-400" /> Sair da Edição </>
               ) : (
                 <> <Settings className="w-4 h-4" /> Gerenciar Mesas </>
               )}
             </button>
           )}

           {isAdmin && isTableManagementMode && (
             <button 
               onClick={() => handleAddTable(4)}
               className="bg-emerald-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20"
             >
               <Plus className="w-4 h-4" /> Nova Mesa
             </button>
           )}
        </div>
      </div>

      <div className={cn(
        "relative min-h-[500px] sm:min-h-[700px] bg-slate-50 rounded-[2rem] sm:rounded-[3rem] border-4 border-white shadow-2xl overflow-auto group transition-all duration-500 custom-scrollbar",
        isTableManagementMode ? "ring-8 ring-blue-500/10 cursor-crosshair" : "ring-1 ring-slate-200/50"
      )}>
        {isTableListView ? (
          <div className="p-8 animate-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tablesInArea.map(table => {
                  const tableOrder = orders.find(o => o.tableId === table.id && o.status !== 'delivered');
                  return (
                    <motion.button
                      key={table.id}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (isTableManagementMode) {
                          setEditingTable(table);
                          setIsEditTableModalOpen(true);
                        } else {
                          onOpenTable(table);
                        }
                      }}
                      className={cn(
                        "sleek-card p-6 flex items-center justify-between group border-2 transition-all",
                        table.status === 'free' ? "bg-white border-slate-100" :
                        table.status === 'reserved' ? "bg-amber-50 border-amber-200" :
                        "bg-emerald-50 border-emerald-200"
                      )}
                    >
                      <div className="flex items-center gap-4">
                         <div className={cn(
                           "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner",
                           table.status === 'free' ? "bg-slate-100 text-slate-400" :
                           table.status === 'reserved' ? "bg-amber-400 text-white" :
                           "bg-emerald-500 text-white"
                         )}>
                           {table.number}
                         </div>
                         <div className="text-left">
                            <p className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none mb-1">Mesa {table.number}</p>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "w-2 h-2 rounded-full",
                                table.status === 'free' ? "bg-slate-300" :
                                table.status === 'reserved' ? "bg-amber-400" :
                                "bg-emerald-500"
                              )} />
                              <span className={cn(
                                "text-[9px] font-bold uppercase tracking-tight",
                                table.status === 'free' ? "text-slate-400" : "text-slate-600"
                              )}>
                                {table.status === 'free' ? 'Livre' : table.status === 'occupied' ? `Ativa • ${formatCurrency(tableOrder?.total || 0)}` : 'Reservada'}
                              </span>
                            </div>
                         </div>
                      </div>
                      <div className="flex flex-col items-end">
                         <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider">{table.capacity}p</span>
                         {isTableManagementMode && <Settings2 className="w-3.5 h-3.5 text-blue-500 mt-1" />}
                         {!isTableManagementMode && table.hasReadyItems && <Bell className="w-4 h-4 text-amber-500 animate-bounce" />}
                      </div>
                    </motion.button>
                  );
                })}
             </div>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-20" />
            {isTableManagementMode && (
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] [background-size:100px_100px] opacity-10" />
            )}
            
            <div className="absolute inset-0 pointer-events-none border-[24px] border-white/40 rounded-[2.5rem] z-0" />

            {tablesInArea.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl mb-6 ring-8 ring-slate-100">
                  <Layout className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Nenhuma mesa nesta área</h3>
                <p className="text-sm text-slate-400 mt-2 font-medium max-w-xs">Parece que não há mesas cadastradas para o {selectedArea} nesta unidade.</p>
                {isAdmin && (
                  <button 
                    onClick={handleSeedTablesForCurrentShop}
                    className="mt-8 bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Gerar Mesas Padrão
                  </button>
                )}
              </div>
            ) : (
              <div className="relative w-full h-full p-12">
                {tablesInArea.map(table => {
                  const tableOrder = orders.find(o => o.tableId === table.id && o.status !== 'delivered');
                  return (
                  <motion.div
                    key={table.id}
                    drag={isTableManagementMode}
                    dragMomentum={false}
                    onDragEnd={async (_, info) => {
                      const newX = table.position.x + info.offset.x;
                      const newY = table.position.y + info.offset.y;
                      await handleUpdateTable(table.id, { position: { x: newX, y: newY } });
                    }}
                    style={{ 
                      left: table.position.x, 
                      top: table.position.y, 
                      width: 110,
                      height: 110,
                      position: 'absolute'
                    }}
                    className={cn(
                      "sleek-card flex flex-col items-center justify-center transition-all border-2 z-10",
                      isTableManagementMode 
                        ? "border-blue-400 border-dashed bg-white/80 backdrop-blur-sm cursor-grab active:cursor-grabbing shadow-lg shadow-blue-500/10" 
                        : (table.status === 'free' ? "bg-white border-slate-100 text-slate-600 hover:border-emerald-300 shadow-sm cursor-pointer" : 
                           table.status === 'reserved' ? "bg-amber-400 border-amber-500 text-white shadow-amber-200 shadow-xl cursor-pointer" :
                           "bg-emerald-500 border-emerald-400 text-white shadow-emerald-200 shadow-2xl cursor-pointer"),
                      table.hasReadyItems && !isTableManagementMode && "ring-8 ring-amber-400/30 ring-offset-0 animate-pulse"
                    )}
                    onClick={() => {
                      if (isTableManagementMode) {
                        setEditingTable(table);
                        setIsEditTableModalOpen(true);
                      } else {
                        onOpenTable(table);
                      }
                    }}
                  >
                    {isTableManagementMode && (
                      <div className="absolute -top-3 -right-3 bg-blue-500 text-white p-2 rounded-xl shadow-lg shadow-blue-500/30">
                        <GripHorizontal className="w-3 h-3" />
                      </div>
                    )}

                    {table.hasReadyItems && !isTableManagementMode && (
                       <div className="absolute -top-4 -right-4 bg-amber-400 text-white p-2 rounded-2xl shadow-xl border-2 border-white animate-bounce">
                          <Bell className="w-4 h-4" />
                       </div>
                    )}
                    
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] font-black uppercase opacity-40 tracking-widest">
                        {isTableManagementMode ? `Cap: ${table.capacity}` : (table.status === 'occupied' ? 'Ocupada' : 'Mesa')}
                      </span>
                      <span className="text-3xl font-black">{table.number < 10 ? `0${table.number}` : table.number}</span>
                    </div>

                    {!isTableManagementMode && table.status === 'occupied' && (
                      <div className="mt-2 flex flex-col items-center">
                        <span className="text-[9px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full">
                          {staff.find(s => tableOrder?.staffId === s.id)?.name.split(' ')[0] || 'Atendendo'}
                        </span>
                        <div className="flex items-center gap-1 mt-1 text-[10px] font-bold">
                          <History className="w-2.5 h-2.5 opacity-60" />
                          {tableOrder ? Math.floor((Date.now() - tableOrder.startTime) / 60000) : 0}m
                        </div>
                      </div>
                    )}

                    {!isTableManagementMode && table.status === 'free' && (
                      <div className="mt-2 text-[9px] font-black uppercase text-slate-300 tracking-[0.2em]">Livre</div>
                    )}

                    {!isTableManagementMode && table.status === 'occupied' && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-emerald-600 font-black text-[10px] px-3 py-1 rounded-full shadow-lg border border-slate-100 whitespace-nowrap">
                         {formatCurrency(tableOrder?.total || 0)}
                      </div>
                    )}
                    
                    {isTableManagementMode && (
                      <div className="mt-2 text-[8px] font-black uppercase text-blue-500 tracking-wider bg-blue-50 px-2 py-1 rounded-md">Configurar</div>
                    )}
                  </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      
      {isTableManagementMode && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-8 z-[100] border border-slate-800 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 pr-8 border-r border-slate-800">
             <div className="p-2 bg-blue-500/20 rounded-xl">
               <MousePointer2 className="w-5 h-5 text-blue-400" />
             </div>
             <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Arraste</span>
               <span className="text-xs font-bold">Para reposicionar mesas</span>
             </div>
          </div>
          <div className="flex items-center gap-3 pr-8 border-r border-slate-800">
             <div className="p-2 bg-emerald-500/20 rounded-xl">
               <Settings2 className="w-5 h-5 text-emerald-400" />
             </div>
             <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clique</span>
               <span className="text-xs font-bold">Para editar detalhes</span>
             </div>
          </div>
           <button 
             onClick={() => setIsTableManagementMode(false)}
             className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-400 transition-all flex items-center gap-2"
           >
             <Check className="w-4 h-4" /> Concluído
           </button>
        </motion.div>
      )}

      {renderTableEditModal()}
    </div>
  );
};
