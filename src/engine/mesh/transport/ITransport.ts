export type TransportStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface TransportPeer {
  id: string;
  name: string;
  transport: string;
}

export interface ITransport {
  start(identity: { id: string; name: string; companyId?: string }): Promise<void>;
  stop(): Promise<void>;
  send(data: Uint8Array | string, targetId?: string): Promise<boolean>;
  getStatus(): TransportStatus;
  getPeers(): TransportPeer[];
}
