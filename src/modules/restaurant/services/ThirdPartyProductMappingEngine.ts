import { firebaseService } from '../../../services/firebaseService';
import type { ThirdPartyProductMapping, ThirdPartyProvider } from '../../../types';

interface SaveMappingInput {
  enterpriseId: string;
  shopId: string;
  userId: string;
  provider: ThirdPartyProvider;
  productId: string;
  externalSku: string;
  externalName?: string;
  active?: boolean;
}

export class ThirdPartyProductMappingEngine {
  static async saveMapping(input: SaveMappingInput): Promise<ThirdPartyProductMapping> {
    const mappingId = `tp-map-${input.provider}-${input.enterpriseId}-${input.shopId}-${input.productId}`;
    const payload: ThirdPartyProductMapping = {
      id: mappingId,
      enterpriseId: input.enterpriseId,
      shopId: input.shopId,
      userId: input.userId,
      provider: input.provider,
      productId: input.productId.trim(),
      externalSku: input.externalSku.trim(),
      externalName: input.externalName?.trim() || undefined,
      active: input.active !== false,
      updatedAt: Date.now(),
    };
    await firebaseService.saveItem('thirdPartyProductMappings', mappingId, payload);
    return payload;
  }

  static async listMappings(enterpriseId: string, shopId: string, userId: string): Promise<ThirdPartyProductMapping[]> {
    const all = (await firebaseService.getAllDocs('thirdPartyProductMappings', enterpriseId, shopId)) as ThirdPartyProductMapping[];
    return all.filter((m) => m.userId === userId && m.active).sort((a, b) => b.updatedAt - a.updatedAt);
  }
}
