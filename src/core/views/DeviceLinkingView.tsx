import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link2 } from 'lucide-react';
import { accountService } from '../services/accountService';

interface DeviceLinkingViewProps {
  onLinkSuccess: () => void;
}

export const DeviceLinkingView: React.FC<DeviceLinkingViewProps> = ({ onLinkSuccess }) => {
  const [linkToken, setLinkToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLinkDevice = async () => {
    setError(null);
    // Simulação de validação de token. Em um cenário real, o token seria validado no backend.
    // Para este contexto, vamos usar um token fixo para demonstração.
    const simulatedValidToken = 'RM-XYZ-99'; 

    if (linkToken.toUpperCase() === simulatedValidToken) {
      // Simula o vínculo do dispositivo
      localStorage.setItem('rm_device_linked', 'true');
      onLinkSuccess();
    } else {
      setError('Token inválido. Verifique e tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-[200] p-4 text-white">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 text-slate-800"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-500/20 mb-6">
            <Link2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-tight leading-tight mb-2">Vincular Dispositivo</h2>
          <p className="text-sm text-slate-500 font-medium px-4">Escaneie o QR Code no painel do administrador ou digite o token de acesso.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="link-token" className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest text-center">Token da Empresa</label>
            <input 
              id="link-token"
              type="text" 
              placeholder="RM-XXX-00"
              className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all uppercase"
              value={linkToken}
              onChange={(e) => setLinkToken(e.target.value)}
            />
            {error && <p className="text-rose-500 text-xs mt-2 text-center">{error}</p>}
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button onClick={handleLinkDevice} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
              Vincular Dispositivo
            </button>
            <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest px-8">
              Ao vincular, este dispositivo terá acesso sincronizado ao estoque, pedidos e relatórios da empresa.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};