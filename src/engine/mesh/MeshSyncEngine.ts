import { EventBus } from './EventBus';
import { MeshCRDTSync } from './crdt/MeshCRDTSync';
import { PacketDedupCache } from './network/PacketDedupCache';

export interface MeshEnvelope<T = unknown> {
  id: string;
  type: string;
  companyId: string;
  sourceDevice: string;
  timestamp: number;
  payload: T;
}

type MeshEvents = {
  'mesh:incoming': MeshEnvelope;
  'mesh:outgoing': MeshEnvelope;
  'mesh:applied': MeshEnvelope;
};

/**
 * Motor de sincronização incremental para o POS.
 * Usa dedup + CRDT + event bus para preparar migração completa do p2p legado.
 */
export class MeshSyncEngine {
  private bus = new EventBus<MeshEvents>();
  private dedup = new PacketDedupCache(5000, 20000);
  private crdt: MeshCRDTSync<MeshEnvelope>;

  constructor(nodeId: string) {
    this.crdt = new MeshCRDTSync<MeshEnvelope>(nodeId);

    this.bus.on('mesh:incoming', (env) => {
      if (this.dedup.has(env.id)) return;
      this.dedup.add(env.id);
      this.crdt.put(`event:${env.id}`, env);
      this.bus.emit('mesh:applied', env, { origin: 'mesh-engine' });
    });

    this.bus.on('mesh:outgoing', (env) => {
      if (this.dedup.has(env.id)) return;
      this.dedup.add(env.id);
      this.crdt.put(`event:${env.id}`, env);
      this.bus.emit('mesh:applied', env, { origin: 'mesh-engine' });
    });
  }

  onApplied(listener: (env: MeshEnvelope) => void): () => void {
    return this.bus.on('mesh:applied', (env) => listener(env));
  }

  registerIncoming(env: MeshEnvelope): void {
    this.bus.emit('mesh:incoming', env, { origin: 'transport' });
  }

  registerOutgoing(env: MeshEnvelope): void {
    this.bus.emit('mesh:outgoing', env, { origin: 'transport' });
  }

  getSnapshot(limit = 200): MeshEnvelope[] {
    return this.crdt
      .getOperationHistory(limit)
      .map((op) => op.value)
      .filter((v): v is MeshEnvelope => !!v);
  }
}
