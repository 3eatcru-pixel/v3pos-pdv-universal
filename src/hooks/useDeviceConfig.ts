import { useState, useEffect } from 'react';
import { DeviceRole, DeviceMode } from '../core/types';
import { meshNetwork } from '../services/p2pSync';

export function useDeviceConfig() {
  const [role, setRole] = useState<DeviceRole | null>(() => {
    return localStorage.getItem('pos_device_role') as DeviceRole || null;
  });
  const [mode, setMode] = useState<DeviceMode | 'management' | null>(() => {
    return localStorage.getItem('pos_device_mode') as any || null;
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(meshNetwork.isConnectedToLocalMesh);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const updateRole = (newRole: DeviceRole) => {
    localStorage.setItem('pos_device_role', newRole);
    meshNetwork.setRole(newRole);
    setRole(newRole);
  };

  const updateMode = (newMode: DeviceMode | 'management') => {
    localStorage.setItem('pos_device_mode', newMode);
    setMode(newMode);
  };

  const resetConfig = () => {
    localStorage.removeItem('pos_device_role');
    localStorage.removeItem('pos_device_mode');
    setRole(null);
    setMode(null);
  };

  return {
    role,
    mode,
    isConnected,
    updateRole,
    updateMode,
    resetConfig
  };
}
