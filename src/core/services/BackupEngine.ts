import { firebaseService } from '../../services/firebaseService';

interface BackupDataset {
  shops: unknown[];
  products: unknown[];
  tables: unknown[];
  staff: unknown[];
  orders: unknown[];
  inventory: unknown[];
  createdAt: number;
}

export class BackupEngine {
  static validateMasterKey(key: string | null): key is string {
    return Boolean(key && key.length >= 8);
  }

  static async createEncryptedBackup(enterpriseId: string, data: BackupDataset, key: string): Promise<string> {
    const result = await firebaseService.saveSecureBackup(enterpriseId, data, key);
    if (typeof result !== 'string') {
      throw new Error('Falha ao criar backup seguro.');
    }
    return result;
  }

  static async validateAndReadBackup(backupId: string, key: string): Promise<unknown> {
    return firebaseService.getSecureBackup(backupId, key);
  }
}
