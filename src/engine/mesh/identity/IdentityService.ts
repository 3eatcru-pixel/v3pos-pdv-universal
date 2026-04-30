/**
 * Serviço de identidade leve para o motor de malha do POS.
 * Fase 1: usa derivação determinística simples e IDs estáveis por seed local.
 */
export class IdentityService {
  private static instance: IdentityService;
  private seed: string | null = null;

  static getInstance(): IdentityService {
    if (!IdentityService.instance) {
      IdentityService.instance = new IdentityService();
    }
    return IdentityService.instance;
  }

  setSeed(seed: string): void {
    this.seed = seed;
  }

  generatePeerId(): string {
    this.ensureSeed();
    return `peer_${this.hashHex(`${this.seed}:peer`).slice(0, 20)}`;
  }

  generateRoomId(roomName: string, isPrivate = false): string {
    this.ensureSeed();
    const prefix = isPrivate ? 'rpriv' : 'rpub';
    return `${prefix}_${this.hashHex(`${this.seed}:room:${roomName}`).slice(0, 20)}`;
  }

  generateStreamId(roomId: string): string {
    this.ensureSeed();
    const deviceSeed = localStorage.getItem('pos_device_id') || 'gen';
    const nonce = typeof crypto !== 'undefined' && 'getRandomValues' in crypto ? crypto.getRandomValues(new Uint32Array(1))[0].toString(36) : Math.random().toString(36).slice(2, 8);
    return `str_${this.hashHex(`${this.seed}:${deviceSeed}:${roomId}:${Date.now()}:${nonce}`).slice(0, 24)}`;
  }

  private ensureSeed(): void {
    if (!this.seed) {
      throw new Error('IdentityService seed not initialized');
    }
  }

  private hashHex(input: string): string {
    // Implementação de um hash de 32-bit leve (FNV-1a) para IDs estáveis
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
      hash |= 0;
    }
    // Adicionamos um sufixo de timestamp para garantir unicidade em janelas de tempo
    return (hash >>> 0).toString(16).padStart(8, '0') + Date.now().toString(36).slice(-4);
  }
}

export const identityService = IdentityService.getInstance();
