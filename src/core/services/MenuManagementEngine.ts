import { firebaseService } from '../../services/firebaseService';
import { Product } from '../../types';
import { logger } from './logger';
import { ImageProcessorEngine } from './ImageProcessorEngine';
import { BackupEngine } from './BackupEngine';
import { GoogleBusinessEngine } from './GoogleBusinessEngine';

export interface MenuDraft {
  items: Partial<Product>[];
  lastModified: number;
  enterpriseId: string;
  version: string;
}

/**
 * MenuManagementEngine - Gestor de Cardápio e Deploy Multi-plataforma.
 * Permite edição offline/rascunho e sincronização em massa (Push).
 */
export class MenuManagementEngine {
  private static readonly DRAFT_KEY = 'pos_menu_draft';

  /**
   * Salva o rascunho do menu localmente e no Google Drive (Eco-Mode).
   */
  static async saveDraft(enterpriseId: string, draftItems: Partial<Product>[]) {
    const draft: MenuDraft = {
      items: draftItems,
      lastModified: Date.now(),
      enterpriseId,
      version: new Date().toISOString()
    };

    localStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft));
    
    // Backup silencioso no Drive para segurança (Custo Zero Firestore)
    await BackupEngine.saveDocumentDraft(enterpriseId, 'menu_draft_active', draft);
    logger.info('menu', 'Rascunho de menu salvo com sucesso.');
  }

  /**
   * Importa o menu de outra unidade para servir de base para o rascunho.
   */
  static async importFromUnit(enterpriseId: string, sourceShopId: string) {
    logger.info('menu', 'Importando catálogo de unidade externa...', { sourceShopId });
    const items = await firebaseService.getDocsByQuery('products', [
      { field: 'enterpriseId', op: '==', value: enterpriseId },
      { field: 'shopId', op: '==', value: sourceShopId }
    ]) as Product[];
    
    // Remove IDs originais para criar novos como rascunho
    const draftItems = items.map(({ id, ...rest }) => ({ ...rest }));
    await this.saveDraft(enterpriseId, draftItems);
    return draftItems;
  }

  /**
   * Processa fotos de pratos/produtos para o padrão de economia.
   */
  static async processMenuPhoto(file: File) {
    return await ImageProcessorEngine.processForUpload(file);
  }

  /**
   * Aplica multiplicadores para preços de Delivery (iFood/UberEats).
   */
  static applyDeliveryMarkup(items: Partial<Product>[], percentage: number) {
    return items.map(item => ({
      ...item,
      deliveryPrice: (item.price || 0) * (1 + percentage / 100)
    }));
  }

  /**
   * PUSH: Transforma o rascunho em menu oficial e atualiza Google e Parceiros.
   */
  static async publishMenu(enterpriseId: string, shopId: string) {
    try {
      const rawDraft = localStorage.getItem(this.DRAFT_KEY);
      if (!rawDraft) throw new Error('Nenhum rascunho encontrado para publicação.');

      const draft: MenuDraft = JSON.parse(rawDraft);
      logger.warn('menu', '🚀 Iniciando PUSH GLOBAL de menu...', { itemCount: draft.items.length });

      await firebaseService.runTransaction(async (tx) => {
        // 1. Atualiza Firestore (Preços e Itens Oficiais)
        for (const item of draft.items) {
          const ref = item.id 
            ? firebaseService.getDocRef('products', item.id) 
            : firebaseService.getDocRef('products', `prod-${Date.now()}-${Math.random().toString(36).slice(2)}`);
          
          tx.set(ref, { 
            ...item, 
            enterpriseId, 
            shopId, 
            updatedAt: Date.now() 
          }, { merge: true });
        }
      });

      // 2. Sincroniza com Google Business se habilitado
      await GoogleBusinessEngine.syncProductsToGoogle(enterpriseId, draft.items as Product[]);

      // 3. Log de Auditoria
      await firebaseService.addAuditLog({
        enterpriseId,
        shopId,
        staffId: 'owner',
        staffName: 'Owner',
        action: 'MENU_PUSH_SUCCESS',
        details: `Novo catálogo publicado com ${draft.items.length} itens. Sincronismo externo disparado.`
      });

      return true;
    } catch (error) {
      logger.error('menu', 'Falha ao publicar menu', { error });
      return false;
    }
  }
}