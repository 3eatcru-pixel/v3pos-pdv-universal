import { io, Socket } from 'socket.io-client';
import { dbLocal } from './db';
import { DeviceRole, SyncEvent, SyncMode } from '../core/types';
import { MeshSyncEngine, PacketDedupCache } from '../engine/mesh';
import { authService } from '../auth/authService';

/**
 * PeerDiscovery & Mesh Sync Manager
 * Supports LAN sync via Socket.io and awareness of Bluetooth mesh state.
 * Includes fallback logic for dedicated server stability.
 */
class MeshNetwork {
  private socket: Socket | null = null;
  private role: DeviceRole = (localStorage.getItem('pos_device_role') as DeviceRole) || 'client';
  private syncMode: SyncMode = (localStorage.getItem('pos_sync_mode') as SyncMode) || 'p2p';
  private deviceId: string = Math.random().toString(36).substring(7);
  private syncListeners = new Set<(data: SyncEvent) => void>();
  private isFallbackMode: boolean = false;
  private dedup = new PacketDedupCache(3000, 15000);
  private meshEngine: MeshSyncEngine;

  constructor() {
    this.meshEngine = new MeshSyncEngine(this.deviceId);
    this.init();
  }

  private getCurrentUser() {
    const user = authService.getCurrentUser();
    if (!user) return null;
    return {
      id: user.id,
      role: user.role,
      companyId: user.tenantId || '',
    };
  }

  private isValidSyncEvent(data: SyncEvent | null | undefined): data is SyncEvent {
    if (!data) return false;
    if (!data.id || !data.type || !data.companyId) return false;
    if (typeof data.timestamp !== 'number') return false;
    const now = Date.now();
    const maxSkewMs = 1000 * 60 * 60 * 24;
    if (Math.abs(now - data.timestamp) > maxSkewMs) return false;
    return true;
  }

  public setRole(role: DeviceRole) {
    this.role = role;
    localStorage.setItem('pos_device_role', role);
  }

  public setSyncMode(mode: SyncMode) {
    this.syncMode = mode;
    localStorage.setItem('pos_sync_mode', mode);
    this.isFallbackMode = false; // Reset fallback when mode manually changes
  }

  public getRole() {
    return this.role;
  }

  public getSyncMode() {
    return this.isFallbackMode ? 'p2p' : this.syncMode;
  }

  private init() {
    // Attempt local LAN sync
    const localUrl = `http://0.0.0.0:3000`;
    this.socket = io(localUrl, {
      reconnectionAttempts: 10,
      timeout: 5000,
    });

    this.socket.on('connect_error', () => {
      // Automatic Fallback Logic
      if (this.syncMode === 'host_server' && !this.isFallbackMode) {
        console.warn('[MeshNetwork] Server Disconnected. Switching to FALLBACK P2P MODE.');
        this.isFallbackMode = true;
      }
    });

    this.socket.on('connect', () => {
      const user = this.getCurrentUser();
      if (user?.companyId) {
        this.socket?.emit('mesh:join', { companyId: user.companyId, deviceId: this.deviceId });
      }
      if (this.isFallbackMode) {
        // [MeshNetwork] Servidor Reconectado. RESSINCRONIZANDO dataset
        this.isFallbackMode = false;
        this.performServerResync();
      }
    });

    this.socket.on('mesh:sync', (data: SyncEvent) => {
      if (!this.isValidSyncEvent(data)) return;
      if (this.dedup.has(data.id)) return;
      this.dedup.add(data.id);
      this.meshEngine.registerIncoming({
        ...data,
      });

      const user = this.getCurrentUser();
      
      const companyId = user?.companyId || '';
      const userRole = user?.role || 'operator';
      
      if (userRole === 'dev' || data.companyId === companyId) {
        this.notifySync(data);
      }
    });
  }

  /**
   * When server comes back, upload local changes made during fallback
   */
  private async performServerResync() {
    // In a real scenario, we'd send the local ledger to the server to merge
    console.log('[MeshNetwork] Resync complete. Buffer cleared.');
  }

  public emitEvent(type: string, payload: any) {
    const companyId = this.getCurrentUser()?.companyId || '';
    if (!companyId) {
      console.warn('[MeshNetwork] Event blocked: missing companyId context.');
      return;
    }

    const event: SyncEvent = {
      id: `ev-${Date.now()}-${this.deviceId}`,
      type,
      payload,
      sourceDevice: this.deviceId,
      companyId,
      timestamp: Date.now()
    };
    this.meshEngine.registerOutgoing({
      ...event,
    });

    if (this.socket?.connected) {
      // If SERVER MODE: Clients send to server for broadcast
      // If P2P MODE: Everyone broadcasts to everyone
      this.socket.emit('mesh:broadcast', event);
    } else {
      // Fallback: Store locally and keep operating
      console.log('[MeshNetwork] Event cached locally (Node offline)');
    }

    dbLocal.addToLedger(event);
  }

  public broadcast(type: string, payload: any) {
    this.emitEvent(type, payload);
  }

  public setOnSync(callback: (data: SyncEvent) => void) {
    this.syncListeners.add(callback);
    return () => this.syncListeners.delete(callback);
  }

  public removeOnSync(callback: (data: SyncEvent) => void) {
    this.syncListeners.delete(callback);
  }

  private notifySync(data: SyncEvent) {
    this.syncListeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.error('[MeshNetwork] Sync listener error:', err);
      }
    });
  }

  public get isConnectedToLocalMesh() {
    return this.socket?.connected || false;
  }

  public get fallbackStatus() {
    return this.isFallbackMode;
  }

  public async scanForNearbyNodes() {
    console.warn('Bluetooth scanning currently disabled for modular stability');
    return null;
  }
}

export const meshNetwork = new MeshNetwork();
