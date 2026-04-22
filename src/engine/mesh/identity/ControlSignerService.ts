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
    for (let i = 0; i < expected.length; i += 1) {
      if (expected[i] !== signature[i]) return false;
    }
    return true;
  }

  private computeSignature(payload: Uint8Array, token: string): Uint8Array {
    const data = `${token}:${Array.from(payload).join(',')}`;
    let hash = 2166136261;
    for (let i = 0; i < data.length; i += 1) {
      hash ^= data.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    const sig = new Uint8Array(8);
    const hex = (hash >>> 0).toString(16).padStart(8, '0');
    for (let i = 0; i < 4; i += 1) {
      sig[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      sig[i + 4] = sig[i];
    }
    return sig;
  }
}

export const controlSigner = ControlSignerService.getInstance();
