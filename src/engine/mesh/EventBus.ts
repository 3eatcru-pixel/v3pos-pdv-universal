export interface EventMetadata {
  traceId: string;
  timestamp: number;
  origin?: string;
}

type Listener<T> = (payload: T, meta: EventMetadata) => void;
type AnyListener = (event: string, payload: unknown, meta: EventMetadata) => void;

/**
 * EventBus leve para orquestrar fluxos assíncronos do motor de malha.
 * Mantém suporte a metadados de rastreio (traceId/timestamp).
 */
export class EventBus<TEvents extends Record<string, unknown>> {
  private listeners = new Map<keyof TEvents, Listener<unknown>[]>();
  private anyListeners: AnyListener[] = [];

  on<K extends keyof TEvents>(event: K, cb: Listener<TEvents[K]>): () => void {
    const list = this.listeners.get(event) ?? [];
    list.push(cb as Listener<unknown>);
    this.listeners.set(event, list);
    return () => {
      const current = this.listeners.get(event) ?? [];
      this.listeners.set(
        event,
        current.filter((l) => l !== (cb as Listener<unknown>)),
      );
    };
  }

  onAny(cb: AnyListener): () => void {
    this.anyListeners.push(cb);
    return () => {
      this.anyListeners = this.anyListeners.filter((l) => l !== cb);
    };
  }

  emit<K extends keyof TEvents>(
    event: K,
    payload: TEvents[K],
    meta?: Partial<EventMetadata>,
  ): void {
    const fullMeta: EventMetadata = {
      traceId: meta?.traceId ?? `tr-${Math.random().toString(36).slice(2, 10)}`,
      timestamp: meta?.timestamp ?? Date.now(),
      origin: meta?.origin ?? 'mesh-core',
    };

    const list = this.listeners.get(event) ?? [];
    for (const listener of list) {
      try {
        (listener as Listener<TEvents[K]>)(payload, fullMeta);
      } catch (err) {
        console.error(`[EventBus] listener error on ${String(event)}`, err);
      }
    }

    for (const listener of this.anyListeners) {
      try {
        listener(String(event), payload, fullMeta);
      } catch {
        // Observabilidade não pode derrubar fluxo principal.
      }
    }
  }
}
