import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Terminal,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Server,
  Key,
  Mail,
  Building2,
} from 'lucide-react';
import { accountService } from '../services/accountService';

export const LoginView: React.FC = () => {
  const [tab, setTab] = useState<'staff' | 'dev' | 'server'>('staff');
  const [staffMode, setStaffMode] = useState<'credentials' | 'pin'>('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devTapCount, setDevTapCount] = useState(0);
  const [devTapWindowStart, setDevTapWindowStart] = useState<number | null>(null);
  const [devBootstrapUnlocked, setDevBootstrapUnlocked] = useState(false);
  const [devBootstrapCode, setDevBootstrapCode] = useState('');

  const [tenantId, setTenantId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');

  const [devEmail, setDevEmail] = useState('');
  const [devPassword, setDevPassword] = useState('');

  const [serverAccessCode, setServerAccessCode] = useState('');

  const fail = (message: string) => {
    setError(message);
    setLoading(false);
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let success = false;
    if (staffMode === 'credentials') {
      if (!email || !password) return fail('Informe email e senha.');
      success = await accountService.loginWithCredentials(email, password, tenantId || undefined);
    } else {
      if (!tenantId || !pin) return fail('Informe empresa e PIN.');
      success = await accountService.loginWithPIN(pin, tenantId);
    }

    if (!success) return fail('Credenciais inválidas para esta empresa.');
    window.location.reload();
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const success = await accountService.loginAsDev(devEmail, devPassword);
    if (!success) return fail('Acesso DEV negado.');
    window.location.reload();
  };

  const handleUnlockDevBootstrap = () => {
    const now = Date.now();
    const inWindow = devTapWindowStart && now - devTapWindowStart <= 10000;
    const nextCount = inWindow ? devTapCount + 1 : 1;

    setDevTapCount(nextCount);
    setDevTapWindowStart(inWindow ? devTapWindowStart : now);

    if (nextCount >= 7) {
      setDevBootstrapUnlocked(true);
      setDevTapCount(0);
      setDevTapWindowStart(null);
    }
  };

  const handleDevBootstrapLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const success = await accountService.loginWithDevBootstrap(devBootstrapCode);
    if (!success) return fail('Bootstrap DEV negado. Verifique o código ou crie um usuário DEV.');
    window.location.reload();
  };

  const handleServerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const success = await accountService.loginAsServer(serverAccessCode);
    if (!success) return fail('Código de servidor inválido.');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden relative z-10"
      >
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setTab('staff')}
            className={`flex-1 py-8 font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2 ${tab === 'staff' ? 'bg-slate-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Users className="w-4 h-4" />
            Owner / Staff
          </button>
          <button
            onClick={() => setTab('dev')}
            className={`flex-1 py-8 font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2 ${tab === 'dev' ? 'bg-slate-50 text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <ShieldCheck className="w-4 h-4" />
            Developer
          </button>
          <button
            onClick={() => setTab('server')}
            className={`flex-1 py-8 font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2 ${tab === 'server' ? 'bg-slate-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Server className="w-4 h-4" />
            Servidor
          </button>
        </div>

        <div className="p-12 md:p-16">
          <AnimatePresence mode="wait">
            {tab === 'staff' && (
              <motion.div key="staff" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <h1 className="text-3xl font-black text-slate-800 mb-2">Login Global</h1>
                <p className="text-slate-500 mb-8 font-medium">Acesso centralizado por empresa (tenant).</p>

                <div className="mb-6 flex items-center gap-2 bg-slate-50 rounded-2xl p-1.5">
                  <button
                    type="button"
                    onClick={() => setStaffMode('credentials')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${staffMode === 'credentials' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    Email + Senha
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffMode('pin')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${staffMode === 'pin' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    PIN Rápido
                  </button>
                </div>

                <form onSubmit={handleStaffLogin} className="space-y-5">
                  <div className="relative">
                    <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input
                        value={tenantId}
                        onChange={(e) => setTenantId(e.target.value)}
                        placeholder="ID da empresa (opcional para donos)"
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-[1.5rem] py-5 pl-14 pr-6 font-bold outline-none transition-all"
                      />
                  </div>

                  {staffMode === 'credentials' ? (
                    <>
                      <div className="relative">
                        <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <input
                          required
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="email@empresa.com"
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-[1.5rem] py-5 pl-14 pr-6 font-bold outline-none transition-all"
                        />
                      </div>
                      <div className="relative">
                        <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <input
                          required
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Senha"
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-[1.5rem] py-5 pl-14 pr-6 font-bold outline-none transition-all"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="relative">
                      <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input
                        required
                        value={pin}
                        maxLength={6}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="PIN (4-6 dígitos)"
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-[1.5rem] py-5 pl-14 pr-6 font-mono font-black text-xl tracking-[0.2em] outline-none transition-all"
                      />
                    </div>
                  )}

                  {error && (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button
                    disabled={loading}
                    className="w-full bg-emerald-500 text-white py-6 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Validando...' : 'Entrar'}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              </motion.div>
            )}

            {tab === 'dev' && (
              <motion.div key="dev" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <button
                  type="button"
                  onClick={handleUnlockDevBootstrap}
                  className="bg-rose-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                >
                  <Terminal className="text-white w-8 h-8" />
                </button>
                <h1 className="text-3xl font-black text-slate-800 mb-2">Painel Developer</h1>
                <p className="text-slate-500 mb-10 font-medium">Provisionamento de tenants e owners.</p>

                <form onSubmit={handleDevLogin} className="space-y-5">
                  <input
                    required
                    type="email"
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    placeholder="dev@pos.com"
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-500 rounded-[1.5rem] py-5 px-6 font-bold outline-none transition-all"
                  />
                  <input
                    required
                    type="password"
                    value={devPassword}
                    onChange={(e) => setDevPassword(e.target.value)}
                    placeholder="Senha DEV"
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-500 rounded-[1.5rem] py-5 px-6 font-bold outline-none transition-all"
                  />

                  {error && (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button
                    disabled={loading}
                    className="w-full bg-slate-900 text-white py-6 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Autenticando...' : 'Acessar Console Dev'}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </form>

                {devBootstrapUnlocked && (
                  <form onSubmit={handleDevBootstrapLogin} className="space-y-4 mt-8 p-5 rounded-2xl bg-rose-50 border border-rose-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">
                      Acesso local de emergência
                    </p>
                    <input
                      required
                      value={devBootstrapCode}
                      onChange={(e) => setDevBootstrapCode(e.target.value)}
                      placeholder="Código bootstrap (ex: code-22)"
                      className="w-full bg-white border-2 border-transparent focus:border-rose-500 rounded-2xl py-4 px-5 font-bold outline-none transition-all"
                    />
                    <button
                      disabled={loading}
                      className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-rose-700 transition-all disabled:opacity-50"
                    >
                      Entrar via Bootstrap
                    </button>
                  </form>
                )}
              </motion.div>
            )}

            {tab === 'server' && (
              <motion.div key="server" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <div className="bg-blue-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <Server className="text-white w-8 h-8" />
                </div>
                <h1 className="text-3xl font-black text-slate-800 mb-2">Servidor Central</h1>
                <p className="text-slate-500 mb-10 font-medium">Ativar dispositivo host por código da empresa.</p>

                <form onSubmit={handleServerLogin} className="space-y-5">
                  <input
                    required
                    value={serverAccessCode}
                    onChange={(e) => setServerAccessCode(e.target.value)}
                    placeholder="Código da empresa"
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] py-5 px-6 font-mono font-black text-xl tracking-[0.2em] outline-none transition-all"
                  />

                  {error && (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-6 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Inicializando...' : 'Ativar Servidor'}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

