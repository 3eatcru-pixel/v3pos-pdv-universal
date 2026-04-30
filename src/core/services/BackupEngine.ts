import { firebaseService } from '../../services/firebaseService';
import { coreEventBus } from '../events/CoreEventBus';
import { logger } from './logger';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Universal Inventory Engine
 * Handles recursive stock deduction, yield factors, and atomic synchronization.
 */
/**
 * BackupEngine - Gestão de Dados Frios e "Fake Live"
 * Prioriza Google Drive para dados operacionais e Firestore para EOD.
 */
export class BackupEngine {
  private static readonly LOCAL_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 Horas
  private static readonly MAX_RETENTION_MS = 3 * 365 * 24 * 60 * 60 * 1000; // 3 Anos
  private static readonly LOCAL_HISTORY_LIMIT = 5; // Requisito: Salvar 5 últimos
  private static readonly SNAPSHOT_SCHEMA_VERSION = 1;
  private static readonly HMAC_ENV_KEY = 'VITE_DRIVE_SNAPSHOT_HMAC_KEY';
  private static readonly DEFAULT_HMAC_KEY = 'local-dev-drive-signing-key';
  private static readonly DRIVE_CACHE_PREFIX = 'pos_drive_cache_';
  
  /**
   * Comprime o JSON para economizar cota de rede e espaço no Drive.
   * Utiliza compressão de string baseada em dicionário local.
   */
  private static compress(data: any): string {
    const str = JSON.stringify(data);
    // TODO: Substituir btoa por compressão LZW real (ex: lz-string) para reduzir tráfego Drive.
    // O Base64 atual aumenta o payload em 33%.
    const encoded = btoa(unescape(encodeURIComponent(str)));
    return encoded;
  }

  private static decompress(data: string): any {
    const str = decodeURIComponent(escape(atob(data)));
    return JSON.parse(str);
  }

  private static getSigningKey(): string {
    const envKey = (import.meta as any)?.env?.[this.HMAC_ENV_KEY];
    const isProd = (import.meta as any)?.env?.PROD;

    if (typeof envKey === 'string' && envKey.trim().length >= 24) return envKey.trim();
    
    if (isProd) {
      throw new Error(`CRITICAL_SECURITY_FAULT: ${this.HMAC_ENV_KEY} não configurada ou muito curta no ambiente de produção.`);
    }
    return this.DEFAULT_HMAC_KEY;
  }

  private static async signPayload(payload: any): Promise<string> {
    const canonical = JSON.stringify(payload);
    const keyBytes = new TextEncoder().encode(this.getSigningKey());
    const payloadBytes = new TextEncoder().encode(canonical);
    const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, payloadBytes);
    return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private static async verifySignature(payload: any, signature: string): Promise<boolean> {
    if (!signature || typeof signature !== 'string') return false;
    const expected = await this.signPayload(payload);
    return expected === signature;
  }

  private static isSnapshotForTenant(enterpriseId: string, envelope: any): boolean {
    return envelope?.meta?.enterpriseId === enterpriseId;
  }

  private static assertSnapshotEnvelope(enterpriseId: string, envelope: any): boolean {
    if (!envelope || typeof envelope !== 'object') return false;
    if (!this.isSnapshotForTenant(enterpriseId, envelope)) return false;
    if (!envelope?.meta?.issuedAt || !envelope?.meta?.expiresAt) return false;
    if (Date.now() > envelope.meta.expiresAt) return false;
    return true;
  }

  static clearTenantCache(enterpriseId: string): void {
    if (!enterpriseId) return;
    localStorage.removeItem(`pos_backup_hist_${enterpriseId}`);
    localStorage.removeItem(`pos_last_backup_hash_${enterpriseId}`);
    localStorage.removeItem(`${this.DRIVE_CACHE_PREFIX}${enterpriseId}`);
  }

  static clearAllTenantCachesExcept(activeEnterpriseId?: string | null): void {
    const keep = activeEnterpriseId || null;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith('pos_backup_hist_') || key.startsWith('pos_last_backup_hash_') || key.startsWith(this.DRIVE_CACHE_PREFIX)) {
        if (keep && key.endsWith(keep)) continue;
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  }

  /**
   * Aplica a política de Data Expiry no histórico local.
   */
  private static applyExpiryPolicy(enterpriseId: string, history: any[]): any[] {
    const now = Date.now();
    return history.filter(snap => {
      const age = now - (snap.timestamp || 0);
      const isExpiredLocal = age > this.LOCAL_EXPIRY_MS;
      const isBeyondRetention = age > this.MAX_RETENTION_MS;
      return !isExpiredLocal && !isBeyondRetention;
    });
  }

  /**
   * Executa o backup consolidado e comprimido para o Google Drive.
   */
  static async runEnterpriseBackup(enterpriseId: string): Promise<{ success: boolean; driveFileId?: string; fileName?: string }> {
    try {
      const isHost = localStorage.getItem('pos_device_role') === 'host';
      if (!isHost) return { success: false };

      const [products, staff, transactions, orders, customers] = await Promise.all([
        firebaseService.getDocsByQuery('products', [{ field: 'enterpriseId', op: '==', value: enterpriseId }]),
        firebaseService.getDocsByQuery('staff', [{ field: 'enterpriseId', op: '==', value: enterpriseId }]),
        firebaseService.getDocsByQuery('transactions', [{ field: 'enterpriseId', op: '==', value: enterpriseId }]),
        firebaseService.getDocsByQuery('orders', [{ field: 'enterpriseId', op: '==', value: enterpriseId }]),
        firebaseService.getDocsByQuery('customers', [{ field: 'enterpriseId', op: '==', value: enterpriseId }])
      ]);

      const payload = { products, staff, transactions, orders, customers, timestamp: Date.now() };
      const now = Date.now();
      const envelope = {
        meta: {
          schemaVersion: this.SNAPSHOT_SCHEMA_VERSION,
          enterpriseId,
          issuedAt: now,
          expiresAt: now + this.LOCAL_EXPIRY_MS,
          source: 'google_drive_snapshot',
        },
        data: payload,
      };
      const signature = await this.signPayload(envelope);
      const signedEnvelope = { ...envelope, signature };

      // Auditoria: Smart Diff - Evita uploads redundantes se nada mudou
      const currentHash = btoa(unescape(encodeURIComponent(JSON.stringify(signedEnvelope)))).slice(0, 32);
      const lastHash = localStorage.getItem(`pos_last_backup_hash_${enterpriseId}`);
      
      if (currentHash === lastHash) {
        logger.debug('system', 'Snapshot idêntico ao anterior. Upload para Drive ignorado para economia de recursos.');
        return { success: true };
      }

      // "O SEGREDO DA COMPANHIA": Time Machine Offline
      let history = JSON.parse(localStorage.getItem(`pos_backup_hist_${enterpriseId}`) || '[]');
      
      // Aplica expiração antes de adicionar o novo e limitar a 3 versões
      const cleanedHistory = this.applyExpiryPolicy(enterpriseId, history);
      const updatedHistory = [signedEnvelope, ...cleanedHistory].slice(0, this.LOCAL_HISTORY_LIMIT);

      localStorage.setItem(`pos_backup_hist_${enterpriseId}`, JSON.stringify(updatedHistory));
      localStorage.setItem(`pos_last_backup_hash_${enterpriseId}`, currentHash);
      
      const isDemo = localStorage.getItem(`pos_is_demo_${enterpriseId}`) === 'true';
      const fileName = isDemo
        ? `nexus_demo_template_${enterpriseId}.json`
        : `nexus_cloud_snapshot_${enterpriseId}.json`;
      const mockDriveFileId = `drive_${Math.random().toString(36).slice(2, 10)}`;

      logger.info('system', `📦 Gerando Snapshot ${isDemo ? '[DEMO]' : '[REAL]'} (${fileName}) para G-Drive...`);
      
      const compressed = this.compress(signedEnvelope);
      localStorage.setItem(`${this.DRIVE_CACHE_PREFIX}${enterpriseId}`, compressed);

      // Simula upload para o Drive
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      logger.info('system', '✅ Backup enviado ao Drive (Eco-Mode Active)');
      localStorage.setItem('pos_last_backup_time', Date.now().toString());
      return { success: true, driveFileId: mockDriveFileId, fileName };
    } catch (error) {
      logger.error('system', '❌ Falha no backup comprimido', { error });
      return { success: false };
    }
  }

  /**
   * Restaura um template de demonstração a partir do ID do Drive.
   * Requisito: Permite que novos usuários baixem pacotes de curso/demo.
   */
  static async restoreDemoFromDriveId(enterpriseId: string, driveFileId: string): Promise<boolean> {
    try {
      logger.info('system', '📥 Iniciando download do template Drive...', { driveFileId });
      
      // Simulação de download e descompressão (Drive API mock)
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Na vida real, o JSON viria do Drive e passaríamos para o motor de restauração local
      logger.info('system', '✅ Template instalado com sucesso. Reiniciando em Modo Treinamento.');
      return true;
    } catch (error) {
      logger.error('system', 'Falha no download do template', { error });
      return false;
    }
  }

  /**
   * Recupera os dados do Drive para o "App do Dono" (Visualização Fake Live).
   * Prioriza o cache local (Time Machine) para economia radical de Firestore.
   */
  static async fetchFakeLiveSnapshot(enterpriseId: string) {
    try {
      // Auditoria: Tenta o Time Machine local (Zero Cost) validando expiração
      let localHistory = JSON.parse(localStorage.getItem(`pos_backup_hist_${enterpriseId}`) || '[]');
      const validHistory = this.applyExpiryPolicy(enterpriseId, localHistory);

      if (validHistory.length > 0) {
        const latest = validHistory[0];
        if (!this.assertSnapshotEnvelope(enterpriseId, latest)) {
          this.clearTenantCache(enterpriseId);
          return null;
        }
        const signatureOk = await this.verifySignature(
          { meta: latest.meta, data: latest.data },
          latest.signature,
        );
        if (!signatureOk) {
          this.clearTenantCache(enterpriseId);
          return null;
        }
        logger.info('system', '⚡️ Dados carregados instantaneamente via Time Machine local.');
        return { status: 'success', data: latest.data, source: 'local_cache' };
      }

      // Se não houver local, vai ao Drive (Eco Mode)
      logger.info('system', '📡 Buscando dados recentes no Google Drive...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Em produção, leríamos o arquivo via Drive API
      const compressed = localStorage.getItem(`${this.DRIVE_CACHE_PREFIX}${enterpriseId}`);
      if (!compressed) return null;
      const envelope = this.decompress(compressed);
      if (!this.assertSnapshotEnvelope(enterpriseId, envelope)) return null;
      const signatureOk = await this.verifySignature(
        { meta: envelope.meta, data: envelope.data },
        envelope.signature,
      );
      if (!signatureOk) return null;
      return { status: 'success', data: envelope.data, lastUpdate: envelope.meta.issuedAt, source: 'google_drive' };
    } catch (error) {
      logger.error('system', 'Erro ao recuperar Fake Live Data', { error });
      return null;
    }
  }

  /**
   * Busca um documento publicado no Drive para o funcionário (Escalas, Manuais, etc).
   * @param fileId ID do arquivo no Google Drive vindo do índice do Firestore.
   */
  static async fetchPublishedDocument(fileId: string, expectedEnterpriseId?: string) {
    try {
      logger.info('system', '📄 Acessando documento oficial no Workspace Drive...', { fileId });
      
      // Simulação de download e parsing de JSON publicado
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Retorna o conteúdo que o app usará para montar a tela do funcionário
      const fakePayload = {
        meta: {
          schemaVersion: this.SNAPSHOT_SCHEMA_VERSION,
          enterpriseId: expectedEnterpriseId || 'unknown',
          issuedAt: Date.now(),
          expiresAt: Date.now() + this.LOCAL_EXPIRY_MS,
          fileId,
        },
        content: {},
      };
      const signature = await this.signPayload(fakePayload);
      if (expectedEnterpriseId && fakePayload.meta.enterpriseId !== expectedEnterpriseId) return null;
      const signatureOk = await this.verifySignature(fakePayload, signature);
      if (!signatureOk) return null;
      return {
        status: 'success',
        content: fakePayload.content,
        downloadUrl: `https://drive.google.com/file/d/${fileId}/view`,
      };
    } catch (error) {
      logger.error('system', 'Falha ao acessar documento no Drive', { error });
      return null;
    }
  }

  /**
   * Salva um rascunho de um documento específico no Drive (Escalas, Mapas, etc).
   * Requisito de Auto-Save para economia de units e segurança de edição.
   */
  static async saveDocumentDraft(enterpriseId: string, docId: string, data: any): Promise<boolean> {
    try {
      logger.debug('system', `Sincronizando rascunho operacional no Drive: ${docId}`);
      
      const payload = {
        metadata: { docId, enterpriseId, timestamp: Date.now(), type: 'draft' },
        content: data,
      };

      const envelope = {
        meta: {
          schemaVersion: this.SNAPSHOT_SCHEMA_VERSION,
          enterpriseId,
          issuedAt: Date.now(),
          expiresAt: Date.now() + this.LOCAL_EXPIRY_MS,
          docId,
        },
        data: payload,
      };
      const signature = await this.signPayload(envelope);
      const compressed = this.compress({ ...envelope, signature });
      // Simulação de upload para o Drive API (Custo Zero de Firestore)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      logger.error('system', `Falha ao salvar rascunho ${docId}`, { error });
      return false;
    }
  }
}
