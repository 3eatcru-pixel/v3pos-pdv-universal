import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';

export interface VehicleCompatibility {
  make: string;      // Ex: Volkswagen
  model: string;     // Ex: Golf
  engine: string;    // Ex: 1.4 TSI
  yearStart: number; // Ex: 2014
  yearEnd?: number;  // Ex: 2019
}

export interface AutoPart {
  id: string;
  name: string;
  brand: string;
  oemCodes: string[];        // Códigos originais das montadoras
  manufacturerCode: string;  // Código do fabricante da peça (Ex: Bosch, Mahle)
  compatibility: VehicleCompatibility[];
  technicalDetails?: Record<string, string>;
  enterpriseId: string;
}

/**
 * AutoPartsCatalogEngine - Motor de busca técnica para o setor de autopeças.
 * Focado em precisão por códigos e compatibilidade de montadoras.
 */
export class AutoPartsCatalogEngine {
  /**
   * Busca peças pelo código (Original, Fabricante ou SKU).
   */
  static async searchByCode(enterpriseId: string, searchCode: string): Promise<AutoPart[]> {
    const normalizedCode = searchCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    try {
      logger.info('autoparts', 'Iniciando busca técnica por código', { searchCode: normalizedCode });

      const allParts = await firebaseService.getDocsByQuery('products', [
        { field: 'enterpriseId', op: '==', value: enterpriseId }
      ]) as AutoPart[];
      
      return allParts.filter(part => {
        // Normalização rigorosa para evitar que "ABC-12" ignore a busca por "ABC12"
        const codes = [
          part.manufacturerCode,
          ...(part.oemCodes || [])
        ].filter(Boolean).map(c => c.replace(/[^a-zA-Z0-9]/g, '').toUpperCase());
        
        return codes.some(c => c && c.includes(normalizedCode));
      });
    } catch (error) {
      logger.error('autoparts', 'Falha na busca por código', { error });
      return [];
    }
  }

  /**
   * Busca peças compatíveis com um veículo específico.
   */
  static async searchByVehicle(enterpriseId: string, params: {
    make: string;
    model: string;
    year: number;
    engine?: string;
  }): Promise<AutoPart[]> {
    try {
      logger.info('autoparts', 'Filtrando catálogo por compatibilidade veicular', params);

      const allParts = await firebaseService.getDocsByQuery('products', [
        { field: 'enterpriseId', op: '==', value: enterpriseId }
      ]) as AutoPart[];

      return allParts.filter(part => {
        if (!part.compatibility || !Array.isArray(part.compatibility)) return false;

        return part.compatibility.some((comp: VehicleCompatibility) => {
          const matchMake = comp.make.toLowerCase() === params.make.toLowerCase();
          const matchModel = comp.model.toLowerCase() === params.model.toLowerCase();
          const matchYear = params.year >= comp.yearStart && (!comp.yearEnd || params.year <= comp.yearEnd);
          const matchEngine = !params.engine || !comp.engine || 
                             comp.engine.toLowerCase().includes(params.engine.toLowerCase());

          return matchMake && matchModel && matchYear && matchEngine;
        });
      });
    } catch (error) {
      logger.error('autoparts', 'Erro ao buscar compatibilidade', { error });
      return [];
    }
  }

  /**
   * Retorna informações de Cross-Reference (Peças equivalentes de outras marcas).
   */
  static async findCrossReferences(enterpriseId: string, oemCode: string): Promise<AutoPart[]> {
    // Busca outras marcas que atendem o mesmo código OEM
    return this.searchByCode(enterpriseId, oemCode);
  }
}