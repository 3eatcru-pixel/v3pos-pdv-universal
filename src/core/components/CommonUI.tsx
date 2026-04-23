import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: number;
  subtitle?: string;
  isWarning?: boolean;
  variant?: 'white' | 'dark' | 'glass';
  accentColor?: 'blue' | 'emerald' | 'rose' | 'amber' | 'indigo';
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  trend, 
  subtitle, 
  isWarning,
  variant = 'white',
  accentColor = 'blue'
}) => {
  const accentClasses = {
    blue: 'text-blue-500 bg-blue-50 shadow-blue-500/10',
    emerald: 'text-emerald-500 bg-emerald-50 shadow-emerald-500/10',
    rose: 'text-rose-500 bg-rose-50 shadow-rose-500/10',
    amber: 'text-amber-500 bg-amber-50 shadow-amber-500/10',
    indigo: 'text-indigo-500 bg-indigo-50 shadow-indigo-500/10',
  };

  const darkAccentClasses = {
    blue: 'text-blue-400 border-blue-500/20',
    emerald: 'text-emerald-400 border-emerald-500/20',
    rose: 'text-rose-400 border-rose-500/20',
    amber: 'text-amber-400 border-amber-500/20',
    indigo: 'text-indigo-400 border-indigo-500/20',
  };

  return (
    <div className={cn(
      "p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] transition-all group relative overflow-hidden",
      variant === 'white' && "bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50",
      variant === 'dark' && "bg-slate-900 text-white shadow-2xl",
      variant === 'glass' && "bg-white/10 backdrop-blur-xl border border-white/10 text-white",
      isWarning && "border-rose-200 bg-rose-50/30"
    )}>
      <div className="flex items-center justify-between mb-8 sm:mb-12">
        <div className={cn(
          "w-12 h-12 sm:w-16 h-16 rounded-2xl sm:rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg",
          variant === 'dark' ? "bg-white/5 text-white" : accentClasses[accentColor]
        )}>
          {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6 sm:w-8 h-8" })}
        </div>
        {trend !== undefined && (
          <span className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black tracking-widest",
            trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="relative z-10">
        <h5 className={cn(
          "text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-2 sm:mb-4 italic",
          variant === 'dark' ? darkAccentClasses[accentColor] : "text-slate-400"
        )}>
          {title}
        </h5>
        <div className="space-y-1 sm:space-y-2">
          <p className="text-3xl sm:text-4xl font-black tracking-tighter italic leading-none">{value}</p>
          {subtitle && (
            <p className={cn(
              "text-[9px] sm:text-[10px] font-bold uppercase tracking-widest",
              variant === 'dark' ? "text-slate-500" : "text-slate-400"
            )}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      {variant === 'dark' && (
        <div className={cn(
          "absolute -right-10 -bottom-10 w-48 h-48 sm:w-64 h-64 rounded-full blur-[80px] opacity-20",
          accentColor === 'blue' && "bg-blue-500",
          accentColor === 'emerald' && "bg-emerald-500",
          accentColor === 'rose' && "bg-rose-500",
          accentColor === 'amber' && "bg-amber-500",
          accentColor === 'indigo' && "bg-indigo-500",
        )} />
      )}
    </div>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  isCollapsed?: boolean;
  badge?: number;
}

export const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, isCollapsed, badge }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative",
      active ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20" : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
    )}
  >
    <div className={cn(
      "shrink-0",
      active ? "text-emerald-400" : "group-hover:text-slate-900"
    )}>
      {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
    </div>
    {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest flex-1 text-left">{label}</span>}
    
    {badge !== undefined && badge > 0 && (
      <span className="absolute top-2 right-2 min-w-4 h-4 bg-emerald-500 text-white text-[8px] font-black flex items-center justify-center rounded-full px-1 border-2 border-white group-hover:scale-110 transition-transform">
        {badge}
      </span>
    )}
    
    {active && !isCollapsed && (
      <motion.div 
        layoutId="active-nav-indicator"
        className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] ml-2" 
      />
    )}
  </button>
);
