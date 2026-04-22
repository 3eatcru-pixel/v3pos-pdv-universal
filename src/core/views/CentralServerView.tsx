import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Cpu, 
  Database, 
  Activity, 
  ShieldCheck, 
  Wifi, 
  Terminal, 
  RefreshCw,
  HardDrive,
  CloudUpload,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings2,
  Monitor,
  Download,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { meshNetwork } from '../../services/p2pSync';
import { serverEngine } from '../../services/serverEngine';
import { cn } from '../../lib/utils';
import { ServerNode, BackupMetadata } from '../types';

export const CentralServerView: React.FC = () => {
  const [node, setNode] = useState<ServerNode | null>(serverEngine.getNodeStatus());
  const [backups, setBackups] = useState<BackupMetadata[]>(serverEngine.getBackups());
  const [logs, setLogs] = useState<{id: string, time: string, action: string, priority: 'info' | 'warn' | 'error'}[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<string[]>([]);
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const updateInterval = setInterval(() => {
      setNode(serverEngine.getNodeStatus());
      setBackups(serverEngine.getBackups());
      setConnectedDevices(serverEngine.getConnectedDevices());
    }, 1000);

    const logInterval = setInterval(() => {
      const newLog = {
        id: Math.random().toString(36),
        time: new Date().toLocaleTimeString(),
        action: `GRID_SYNC_EVENT: Validated and broadcasted block from NODE_${Math.floor(Math.random() * 5)}`,
        priority: Math.random() > 0.9 ? 'warn' : 'info' as any
      };
      setLogs(prev => [newLog, ...prev].slice(0, 50));
    }, 3000);

    return () => {
      clearInterval(updateInterval);
      clearInterval(logInterval);
    };
  }, []);

  const handleManualBackup = async () => {
    await serverEngine.createBackup('manual');
    setBackups(serverEngine.getBackups());
    alert("Backup manual concluído com sucesso.");
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-emerald-500 font-mono p-8 selection:bg-emerald-500 selection:text-black">
      {/* HUD Header */}
      <header className="border-b border-emerald-900/30 pb-8 mb-10 flex items-center justify-between">
         <div className="flex items-center gap-8">
            <div className="w-16 h-16 bg-emerald-500 text-black rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
               <Server className="w-8 h-8" />
            </div>
            <div>
               <h1 className="text-3xl font-black uppercase tracking-tighter italic">Authority Host <span className="text-white/20">{node?.id}</span></h1>
               <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                     <span className="text-[10px] uppercase font-black tracking-widest">Master Node: Online</span>
                  </div>
                  <div className="w-px h-3 bg-emerald-900" />
                  <span className="text-[10px] text-white/40 uppercase font-black tracking-widest">Uptime: {formatUptime(node?.uptime || 0)}</span>
                  <div className="w-px h-3 bg-emerald-900" />
                  <span className="text-[10px] text-blue-400 uppercase font-black tracking-widest">Mode: Host Server</span>
               </div>
            </div>
         </div>

         <div className="flex items-center gap-6">
            <div className="text-right">
               <p className="text-[10px] text-emerald-800 font-black uppercase tracking-widest">Current Database Pool</p>
               <h3 className="text-xl font-black text-white">Grid Ledger Active</h3>
            </div>
            <button className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl hover:bg-emerald-500/20 transition-all group">
               <Settings2 className="w-6 h-6 group-hover:rotate-90 transition-transform" />
            </button>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
            >
               <RefreshCw className="w-6 h-6" />
            </button>
         </div>
      </header>

      <div className="grid grid-cols-12 gap-10">
         {/* System Hardware Stats */}
         <div className="col-span-12 lg:col-span-3 space-y-6">
            <h2 className="text-[10px] font-black uppercase text-emerald-800 tracking-[0.4em] mb-4">Kernel Monitor</h2>
            
            {[
              { label: 'Authority CPU Load', val: '08%', icon: <Cpu />, color: 'text-emerald-500' },
              { label: 'Ledger Cache', val: '42 MB', icon: <Database />, color: 'text-blue-500' },
              { label: 'Grid Persistence', val: 'STABLE', icon: <HardDrive />, color: 'text-amber-500' },
              { label: 'LAN Throughput', val: '1.2 Gbps', icon: <Activity />, color: 'text-purple-500' },
            ].map((stat, i) => (
              <div key={i} className="bg-white/5 border border-white/5 border-emerald-900/20 rounded-3xl p-6 hover:bg-white/[0.08] transition-all group">
                 <div className="flex items-center justify-between mb-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-black border border-emerald-900/30", stat.color)}>
                       {React.cloneElement(stat.icon as any, { size: 18 })}
                    </div>
                    <span className="text-[10px] font-black text-white/20">A1-NODE</span>
                 </div>
                 <p className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-1">{stat.label}</p>
                 <h4 className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors">{stat.val}</h4>
              </div>
            ))}

            <div className="pt-8">
               <button 
                onClick={handleManualBackup}
                className="w-full py-6 bg-emerald-500 text-black rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
               >
                  <Download className="w-4 h-4" /> Trigger Manual Backup
               </button>
            </div>
         </div>

         {/* Network Node Topology */}
         <div className="col-span-12 lg:col-span-6 space-y-8">
            <div className="flex items-center justify-between">
               <h2 className="text-[10px] font-black uppercase text-emerald-800 tracking-[0.4em]">Connected Grid Terminals</h2>
               <div className="flex items-center gap-3 px-4 py-1.5 bg-emerald-500/5 rounded-full border border-emerald-500/10">
                  <Wifi className="w-3 h-3 text-emerald-500" />
                  <span className="text-[9px] font-black text-white/60">{connectedDevices.length} Auth Nodes Connected</span>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {connectedDevices.map((nodeId, idx) => (
                 <div key={idx} className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-emerald-500/10 transition-all relative overflow-hidden group hover:border-emerald-500/30">
                    <div className="flex items-center justify-between mb-6">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-black border border-emerald-500/20 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                             <Monitor size={20} />
                          </div>
                          <div>
                             <h4 className="text-sm font-black text-white uppercase tracking-tight">{nodeId}</h4>
                             <p className="text-[9px] text-white/30 font-black tracking-widest italic tracking-tighter">AUTHENTICATED CLIENT</p>
                          </div>
                       </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-black uppercase">
                       <span className="text-white/40">Ping</span>
                       <span className="text-emerald-500">12 ms</span>
                    </div>
                    
                    <div className="mt-4 w-full h-1 bg-black rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        className="h-full bg-emerald-500" 
                       />
                    </div>
                 </div>
               ))}
            </div>

            <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-[3rem] p-10 mt-10">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
                    <History className="w-6 h-6 text-emerald-500" /> Backup Ledger
                  </h3>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-lg">LAST SYNC: {node?.lastBackup ? new Date(node.lastBackup).toLocaleTimeString() : 'N/A'}</span>
               </div>
               
               <div className="space-y-4">
                  {backups.map(bk => (
                    <div key={bk.id} className="flex items-center justify-between p-4 bg-black/40 border border-emerald-900/20 rounded-2xl text-[10px] font-black">
                       <div className="flex items-center gap-4">
                          <CloudUpload className="w-4 h-4 text-emerald-800" />
                          <span className="text-white/60">{bk.id}</span>
                       </div>
                       <span className="text-white/20 uppercase">{bk.type} SNAPSHOT</span>
                       <span className="text-emerald-500">{new Date(bk.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         {/* Kernel Terminal Logs */}
         <div className="col-span-12 lg:col-span-3 space-y-6">
            <h2 className="text-[10px] font-black uppercase text-emerald-800 tracking-[0.4em] mb-4">Kernel Activity Log</h2>
            
            <div className="bg-black border border-emerald-900/50 p-6 rounded-3xl h-[600px] overflow-y-auto custom-scrollbar flex flex-col-reverse gap-3">
               {logs.map(log => (
                 <div key={log.id} className="text-[10px] font-medium leading-relaxed group">
                    <span className="text-emerald-900 mr-2">[{log.time}]</span>
                    <span className={cn(
                      "transition-colors",
                      log.priority === 'warn' ? 'text-amber-500' : 'text-emerald-700 group-hover:text-emerald-400'
                    )}>
                      {log.action}
                    </span>
                 </div>
               ))}
               <div className="text-emerald-500 animate-pulse mb-4">█ LISTENING_FOR_GRID_NODES...</div>
            </div>

            <div className="bg-white/5 border border-emerald-900/20 rounded-3xl p-6 space-y-4">
               <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Integrity Protocol
               </h3>
               <div className="space-y-4">
                  {[
                    { l: 'E2E Validation', s: 'ENABLED', c: 'text-emerald-500' },
                    { l: 'Fallback Engine', s: 'READY', c: 'text-emerald-500' },
                    { l: 'Encryption Layer', s: 'AES-256', c: 'text-blue-500' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-black rounded-2xl border border-emerald-900/10">
                       <span className="text-[9px] font-black uppercase text-white/40">{s.l}</span>
                       <span className={cn("text-[9px] font-black uppercase tracking-widest", s.c)}>{s.s}</span>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
