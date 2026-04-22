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
    const nonce = Math.random().toString(36).slice(2, 8);
    return `str_${this.hashHex(`${this.seed}:${roomId}:${Date.now()}:${nonce}`).slice(0, 20)}`;
  }

  private ensureSeed(): void {
    if (!this.seed) {
      throw new Error('IdentityService seed not initialized');
    }
  }

  private hashHex(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

export const identityService = IdentityService.getInstance();
