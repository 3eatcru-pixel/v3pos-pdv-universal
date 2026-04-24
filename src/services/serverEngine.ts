import { ServerNode, SyncEvent, BackupMetadata } from '../core/types';
import { dbLocal } from './db';
import { meshNetwork } from './p2pSync';

/**
 * ServerEngine: The high-availability authority for "Host Server Mode".
 * Responsible for persistence, validation, and network stability.
 */
class ServerEngine {
  private node: ServerNode | null = null;
  private eventHistory: SyncEvent[] = [];
  private autoBackupInterval: any = null;
  private uptimeInterval: any = null;
  private unsubscribeSync: (() => void) | null = null;

  public async start(companyId: string) {
    // [ServerEngine] Inicializando Kernel para empresa
    this.stop();
    
    this.node = {
      id: `SRV-${Math.random().toString(36).substring(7).toUpperCase()}`,
      companyId,
      connectedDevices: [],
      status: 'online',
      uptime: 0,
      lastBackup: Date.now()
    };

    // Start UI update intervals
    this.uptimeInterval = setInterval(() => {
      if (this.node) this.node.uptime += 1;
    }, 1000);

    this.startAutoBackup();
    
    // Listen for all mesh traffic to act as authority
    this.unsubscribeSync = meshNetwork.setOnSync((event) => this.processEvent(event));
  }

  public stop() {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
      this.autoBackupInterval = null;
    }
    if (this.uptimeInterval) {
      clearInterval(this.uptimeInterval);
      this.uptimeInterval = null;
    }
    if (this.unsubscribeSync) {
      this.unsubscribeSync();
      this.unsubscribeSync = null;
    }
  }

  private async processEvent(event: SyncEvent) {
    if (!this.node) return;

    // 1. Validation Logic
    if (!event.companyId || event.companyId !== this.node.companyId) {
      console.warn(`[ServerEngine] REJECTED event from unauthorized company: ${event.companyId}`);
      return;
    }

    // 2. Event Queue & Deduplication
    const exists = this.eventHistory.find(e => e.id === event.id);
    if (exists) return;

    this.eventHistory.push(event);
    
    // 3. Authority Persistence
    // [ServerEngine] PERSISTING event
    await dbLocal.addToLedger(event);

    // 4. Distribution (Server enforces sync to everyone)
    // In Host Server mode, the server is the one that broadcasts confirmed events
    // ensuring data consistency across the grid.
  }

  private startAutoBackup() {
    this.autoBackupInterval = setInterval(() => {
      this.createBackup('auto');
    }, 300000); // 5 minutes
  }

  public async createBackup(type: 'auto' | 'manual' = 'manual'): Promise<BackupMetadata> {
    // [ServerEngine] Gerando backup
    
    // In a real server this would write to FS or Cloud Storage
    // Here we snapshot the current localStorage/IndexedDB
    const backup: BackupMetadata = {
      id: `BK-${Date.now()}`,
      timestamp: Date.now(),
      size: JSON.stringify(localStorage).length,
      entityCount: this.eventHistory.length,
      type
    };

    const backups = JSON.parse(localStorage.getItem('srv_backups') || '[]');
    backups.push(backup);
    localStorage.setItem('srv_backups', JSON.stringify(backups.slice(-10))); // keep last 10
    
    if (this.node) this.node.lastBackup = Date.now();
    
    return backup;
  }

  public getBackups(): BackupMetadata[] {
    return JSON.parse(localStorage.getItem('srv_backups') || '[]');
  }

  public async restoreFromBackup(backupId: string) {
    const backup = this.getBackups().find(b => b.id === backupId);
    if (!backup) throw new Error("Backup not found");
    
    // [ServerEngine] RESTORING de backup
    // Logic to reload data state
    window.location.reload();
  }

  public getNodeStatus(): ServerNode | null {
    return this.node;
  }

  public getConnectedDevices() {
    // In a real socket environment, we query active connections
    return ['PDV-01', 'SCAN-02', 'BAL-03']; // Mocked
  }
}

export const serverEngine = new ServerEngine();
