import { Product } from '../../types';
import { logger } from './logger';

export type AllergenType = 'gluten' | 'lactose' | 'peanuts' | 'shellfish' | 'onions' | 'eggs';

export interface AllergyAudit {
  isSafe: boolean;
  conflictingIngredients: string[];
  requiredModifications: string[]; // O que o garçom deve remover
  isLethalRisk: boolean; // Se não pode ser modificado de jeito nenhum
}

/**
 * AllergyEngine - Motor de Segurança Alimentar
 * Cruza fichas técnicas com restrições de clientes.
 */
export class AllergyEngine {
  /**
   * Analisa um produto para uma alergia específica e retorna o protocolo de segurança.
   */
  static checkProductSafety(product: Product, userAllergy: AllergenType): AllergyAudit {
    const matrix = (product as any).allergyMatrix || {};
    const allergens = matrix.contains || [];
    const removable = matrix.removable || [];

    if (!allergens.includes(userAllergy)) {
      return { isSafe: true, conflictingIngredients: [], requiredModifications: [], isLethalRisk: false };
    }

    // Se o alérgeno está presente e NÃO é removível (ex: Farinha no Bolo)
    if (!removable.includes(userAllergy)) {
      return { 
        isSafe: false, 
        conflictingIngredients: [userAllergy], 
        requiredModifications: [], 
        isLethalRisk: true 
      };
    }

    // Se é removível (ex: Cebola no Burger)
    return {
      isSafe: true,
      conflictingIngredients: [userAllergy],
      requiredModifications: [`Remover ${userAllergy.toUpperCase()}`],
      isLethalRisk: false
    };
  }

  /**
   * Injeta avisos de alergia no KDS (Cozinha) automaticamente.
   */
  static getKitchenWarning(items: any[]): string[] {
    const warnings: string[] = [];
    items.forEach(item => {
      if (item.modifiers?.some((m: string) => m.toLowerCase().includes('alergia') || m.toLowerCase().includes('sem'))) {
        warnings.push(`⚠️ ATENÇÃO ALERGIA: ${item.name} (${item.modifiers.join(', ')})`);
      }
    });
    return warnings;
  }
}