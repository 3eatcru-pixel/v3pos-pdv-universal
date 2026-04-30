import React from 'react';

interface ActiveLockOverlayProps {
  isLocked?: boolean;
  lockOwnerName?: string;
  lockMessage?: string;
}

export const ActiveLockOverlay: React.FC<ActiveLockOverlayProps> = ({
  isLocked = false,
  lockOwnerName,
  lockMessage,
}) => {
  if (!isLocked) return null;

  return (
    <div className="absolute inset-0 z-40 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl px-5 py-4 text-center max-w-sm">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Documento em Edição</p>
        <p className="text-sm font-bold text-slate-800">
          {lockMessage || `Bloqueado por ${lockOwnerName || 'outro usuário'}.`}
        </p>
      </div>
    </div>
  );
};
