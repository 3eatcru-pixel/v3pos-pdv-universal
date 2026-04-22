import { io, Socket } from 'socket.io-client';
import { ITransport, TransportPeer, TransportStatus } from './ITransport';

type SocketPayload = {
  companyId?: string;
  targetId?: string;
  payload: unknown;
  sourceId?: string;
};

/**
 * Adapter Socket.IO para o contrato de transporte do MeshEngine.
 */
export class SocketIoTransport implements ITransport {
  private socket: Socket | null = null;
  private status: TransportStatus = 'disconnected';
  private identity: { id: string; name: string; companyId?: string } | null = null;

  constructor(private readonly serverUrl: string) {}

  async start(identity: { id: string; name: string; companyId?: string }): Promise<void> {
    this.identity = identity;
    this.status = 'connecting';

    this.socket = io(this.serverUrl, {
      reconnectionAttempts: 10,
      timeout: 5000,
    });

    this.socket.on('connect', () => {
      this.status = 'connected';
      if (identity.companyId) {
        this.socket?.emit('mesh:join', { companyId: identity.companyId, deviceId: identity.id });
      }
    });

    this.socket.on('disconnect', () => {
      this.status = 'disconnected';
    });

    this.socket.on('connect_error', () => {
      this.status = 'error';
    });
  }

  async stop(): Promise<void> {
    this.socket?.disconnect();
    this.socket = null;
    this.status = 'disconnected';
  }

  async send(data: Uint8Array | string, targetId?: string): Promise<boolean> {
    if (!this.socket || !this.identity || !this.socket.connected) return false;
    const payload: SocketPayload = {
      companyId: this.identity.companyId,
      targetId,
      sourceId: this.identity.id,
      payload: data instanceof Uint8Array ? Array.from(data) : data,
    };
    this.socket.emit('mesh:broadcast', payload);
    return true;
  }

  getStatus(): TransportStatus {
    return this.status;
  }

  getPeers(): TransportPeer[] {
    return [];
  }
}
