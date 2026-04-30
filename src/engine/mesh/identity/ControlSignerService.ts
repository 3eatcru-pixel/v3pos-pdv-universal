/**
 * Assinador de controle simplificado (Fase 1).
 * Assina payloads de controle com token local para validação básica de integridade.
 */
export class ControlSignerService {
  private static instance: ControlSignerService;
  private token: string | null = null;

  static getInstance(): ControlSignerService {
    if (!ControlSignerService.instance) {
      ControlSignerService.instance = new ControlSignerService();
    }
    return ControlSignerService.instance;
  }

  initialize(token: string): void {
    this.token = token;
  }

  get isReady(): boolean {
    return !!this.token;
  }

  sign(payload: Uint8Array): Uint8Array {
    if (!this.token) throw new Error('ControlSignerService not initialized');
    const sig = this.computeSignature(payload, this.token);
    const out = new Uint8Array(payload.length + sig.length);
    out.set(payload);
    out.set(sig, payload.length);
    return out;
  }

  verify(signedPayload: Uint8Array): boolean {
    if (!this.token || signedPayload.length < 8) return false;
    const payload = signedPayload.slice(0, -8);
    const signature = signedPayload.slice(-8);
    
    const expected = this.computeSignature(payload, this.token);
    if (expected.length !== signature.length) return false;
    
    // Fase 5: Comparação em tempo constante para evitar ataques de temporização
    let result = 0;
    for (let i = 0; i < expected.length; i += 1) {
      result |= expected[i] ^ signature[i];
    }
    return result === 0;
  }

  private computeSignature(payload: Uint8Array, token: string): Uint8Array {
    // Fase 5: Melhoria do hash para assinatura local
    // Simula um comportamento de HMAC-lite
    const salt = "nexus-v3-mesh";
    const data = `${token}:${salt}:${Array.from(payload).join(',')}`;
    
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0, ch; i < data.length; i++) {
        ch = data.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    
    const sig = new Uint8Array(8);
    const view = new DataView(sig.buffer);
    view.setUint32(0, h1 >>> 0);
    view.setUint32(4, h2 >>> 0);
    
    return sig;
  }
}

export const controlSigner = ControlSignerService.getInstance();
