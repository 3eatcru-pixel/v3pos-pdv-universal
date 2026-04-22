export interface CRDTTimestamp {
  nodeId: string;
  lamportClock: number;
}

export interface CRDTOperation<T = unknown> {
  id: string;
  nodeId: string;
  type: 'insert' | 'update' | 'delete';
  key: string;
  value?: T;
  timestamp: CRDTTimestamp;
  signature: string;
}

export interface CRDTState<T = unknown> {
  data: Map<string, T>;
  tombstones: Set<string>;
  clock: number;
  nodeId: string;
}

export interface SyncMessage<T = unknown> {
  nodeId: string;
  operations: CRDTOperation<T>[];
  vector: Record<string, number>;
  timestamp: number;
}

/**
 * CRDT LWW simplificado para sincronização eventual entre nós.
 * Baseado no motor antigo, mas adaptado para o POS web.
 */
export class MeshCRDTSync<T = unknown> {
  private state: CRDTState<T>;
  private operationLog: CRDTOperation<T>[] = [];
  private vectorClock = new Map<string, number>();
  private syncListeners: Array<(msg: SyncMessage<T>) => void> = [];

  constructor(nodeId: string, initialData: Map<string, T> = new Map()) {
    this.state = {
      data: initialData,
      tombstones: new Set(),
      clock: 0,
      nodeId,
    };
    this.vectorClock.set(nodeId, 0);
  }

  put(key: string, value: T): CRDTOperation<T> {
    const op = this.createOperation('update', key, value);
    this.applyOperation(op);
    this.operationLog.push(op);
    this.broadcast(op);
    return op;
  }

  delete(key: string): CRDTOperation<T> {
    const op = this.createOperation('delete', key);
    this.applyOperation(op);
    this.operationLog.push(op);
    this.broadcast(op);
    return op;
  }

  get(key: string): T | undefined {
    if (this.state.tombstones.has(key)) return undefined;
    return this.state.data.get(key);
  }

  receiveOperation(op: CRDTOperation<T>): boolean {
    if (!this.verifySignature(op)) return false;
    if (this.operationLog.some((x) => x.id === op.id)) return false;

    this.updateVectorClock(op.nodeId, op.timestamp.lamportClock);

    const existing = this.findLatestForKey(op.key);
    if (existing && this.compareTimestamps(existing.timestamp, op.timestamp) >= 0) {
      return false;
    }

    this.applyOperation(op);
    this.operationLog.push(op);
    return true;
  }

  syncWithPeer(message: SyncMessage<T>): SyncMessage<T> {
    for (const op of message.operations) {
      this.receiveOperation(op);
    }

    return {
      nodeId: this.state.nodeId,
      operations: [...this.operationLog],
      vector: Object.fromEntries(this.vectorClock),
      timestamp: Date.now(),
    };
  }

  getState(): CRDTState<T> {
    return {
      data: new Map(this.state.data),
      tombstones: new Set(this.state.tombstones),
      clock: this.state.clock,
      nodeId: this.state.nodeId,
    };
  }

  getOperationHistory(limit?: number): CRDTOperation<T>[] {
    return limit ? this.operationLog.slice(-limit) : [...this.operationLog];
  }

  onSync(listener: (msg: SyncMessage<T>) => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter((l) => l !== listener);
    };
  }

  detectConflicts(): Array<{ key: string; versions: CRDTOperation<T>[] }> {
    const byKey = new Map<string, CRDTOperation<T>[]>();
    for (const op of this.operationLog) {
      const list = byKey.get(op.key) ?? [];
      list.push(op);
      byKey.set(op.key, list);
    }

    const conflicts: Array<{ key: string; versions: CRDTOperation<T>[] }> = [];
    for (const [key, ops] of byKey.entries()) {
      if (ops.length <= 1) continue;
      const clocks = new Set(ops.map((o) => `${o.timestamp.nodeId}:${o.timestamp.lamportClock}`));
      if (clocks.size > 1) conflicts.push({ key, versions: ops });
    }
    return conflicts;
  }

  private createOperation(
    type: CRDTOperation<T>['type'],
    key: string,
    value?: T,
  ): CRDTOperation<T> {
    this.state.clock += 1;
    const timestamp: CRDTTimestamp = {
      nodeId: this.state.nodeId,
      lamportClock: this.state.clock,
    };
    return {
      id: `${this.state.nodeId}-${this.state.clock}-${Date.now()}`,
      nodeId: this.state.nodeId,
      type,
      key,
      value,
      timestamp,
      signature: this.sign(key, value, timestamp),
    };
  }

  private applyOperation(op: CRDTOperation<T>): void {
    if (op.type === 'delete') {
      this.state.data.delete(op.key);
      this.state.tombstones.add(op.key);
      return;
    }

    if (op.value !== undefined) {
      this.state.data.set(op.key, op.value);
      this.state.tombstones.delete(op.key);
    }
  }

  private findLatestForKey(key: string): CRDTOperation<T> | undefined {
    for (let i = this.operationLog.length - 1; i >= 0; i -= 1) {
      if (this.operationLog[i].key === key) return this.operationLog[i];
    }
    return undefined;
  }

  private compareTimestamps(a: CRDTTimestamp, b: CRDTTimestamp): number {
    if (a.lamportClock !== b.lamportClock) return a.lamportClock - b.lamportClock;
    return a.nodeId.localeCompare(b.nodeId);
  }

  private updateVectorClock(nodeId: string, lamport: number): void {
    const current = this.vectorClock.get(nodeId) ?? 0;
    this.vectorClock.set(nodeId, Math.max(current, lamport));
  }

  private sign(key: string, value: T | undefined, ts: CRDTTimestamp): string {
    const base = `${key}:${JSON.stringify(value)}:${ts.nodeId}:${ts.lamportClock}`;
    let hash = 0;
    for (let i = 0; i < base.length; i += 1) {
      hash = ((hash << 5) - hash) + base.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  private verifySignature(op: CRDTOperation<T>): boolean {
    return op.signature === this.sign(op.key, op.value, op.timestamp);
  }

  private broadcast(op: CRDTOperation<T>): void {
    const msg: SyncMessage<T> = {
      nodeId: this.state.nodeId,
      operations: [op],
      vector: Object.fromEntries(this.vectorClock),
      timestamp: Date.now(),
    };
    for (const listener of this.syncListeners) {
      listener(msg);
    }
  }
}
