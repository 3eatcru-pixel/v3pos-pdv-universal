import React from 'react';
import { 
  Table as TableIcon, 
  GripHorizontal, 
  Bell 
} from 'lucide-react';
import { motion } from 'motion/react';
import { Table, Staff } from '../../../types';
import { cn } from '../../../lib/utils';

interface TableMapProps {
  tables: Table[];
  selectedArea: string;
  isTableManagementMode: boolean;
  currentUser: Staff | null;
  onTableClick: (table: Table) => void;
  onEditTable: (table: Table) => void;
}

export const TableMap: React.FC<TableMapProps> = ({
  tables,
  selectedArea,
  isTableManagementMode,
  currentUser,
  onTableClick,
  onEditTable
}) => {
  const tablesInArea = tables.filter(t => (t.area || 'Salão Principal') === selectedArea);
  
  return (
    <div className="relative min-h-[600px] bg-slate-50/50 rounded-[3rem] p-10 border-2 border-dashed border-slate-200 overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-10">
        {tablesInArea.map((table) => (
          <motion.div
            key={table.id}
            layoutId={table.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className={cn(
              "relative group cursor-pointer",
              isTableManagementMode && "cursor-move"
            )}
            onClick={() => {
              if (isTableManagementMode) {
                onEditTable(table);
              } else {
                onTableClick(table);
              }
            }}
          >
            {/* Table Shadow/Depth */}
            <div className="absolute inset-x-4 -bottom-2 h-4 bg-slate-900/10 blur-xl rounded-full" />

            <div className={cn(
              "aspect-square rounded-[2.5rem] flex flex-col items-center justify-center gap-3 transition-all duration-500 border-4 relative overflow-hidden",
              table.status === 'free' ? "bg-white border-slate-100 text-slate-400 hover:border-emerald-200" :
              table.status === 'occupied' ? "bg-emerald-500 border-emerald-400 text-white shadow-2xl shadow-emerald-500/30" :
              table.status === 'reserved' ? "bg-amber-400 border-amber-300 text-white shadow-xl shadow-amber-500/20" :
              "bg-slate-800 border-slate-700 text-slate-400"
            )}>
              {/* Glass Effect for occupied */}
              {table.status === 'occupied' && (
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10" />
              )}

              <TableIcon className={cn(
                "w-10 h-10 transition-transform group-hover:scale-110 duration-500",
                table.status === 'free' ? "text-slate-200" : "text-white/80"
              )} />
              
              <div className="text-center">
                <span className="block text-2xl font-black tracking-tighter leading-none">
                  {table.number}
                </span>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-[0.2em]",
                  table.status === 'free' ? "text-slate-300" : "text-white/60"
                )}>
                  {table.status === 'free' ? `${table.capacity} Lugares` : 
                   table.status === 'occupied' ? 'Em Uso' : 'Reservada'}
                </span>
              </div>

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
            </div>

            {/* Waiter Badge */}
            {table.waiterId && table.status === 'occupied' && (
               <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-white border border-emerald-100 rounded-full shadow-lg">
                  <p className="text-[8px] font-black uppercase text-emerald-600 tracking-widest whitespace-nowrap">
                     Atendente: {table.waiterId}
                  </p>
               </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
