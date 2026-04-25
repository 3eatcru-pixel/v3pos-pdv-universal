import { firebaseService } from '../../services/firebaseService';
import { Staff, PerformanceEvent, RolePermissions } from '../../types';
import { logger } from './logger';
import { generateSafeId } from '../lib/utils'; // Assumindo que moveremos a utilidade para cá

export class HREngine {
  /**
   * Salva ou atualiza um colaborador no nível da Empresa.
   * Garante que o vínculo seja com a EnterpriseId para visibilidade global.
   */
  static async saveStaff(enterpriseId: string, staffData: Partial<Staff>, photoFile?: File): Promise<string> {
    const id = staffData.id || `staff-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let photoUrl = staffData.photo || '';

    try {
      if (photoFile) {
        const upload = await firebaseService.uploadFile(`staff_photos/${enterpriseId}/${id}`, photoFile);
        if (upload) photoUrl = upload.url;
      }

      const finalData = {
        ...staffData,
        id,
        enterpriseId,
        photo: photoUrl,
        updatedAt: Date.now(),
        active: staffData.active ?? true,
        // Metadados de Serviços para Auditoria Internacional
        professionalLicense: (staffData as any).professionalLicense || '', // Ex: Bloodborne Pathogens (US)
        businessModel: (staffData as any).businessModel || 'commission', // 'commission' | 'rental' | 'hybrid'
        promotionHistory: (staffData as any).promotionHistory || [],
        serviceConfig: (staffData as any).serviceConfig || {
          serviceRate: 50,
          productRate: 10,
          rentalFee: 0
        }
      };

      await firebaseService.saveItem('staff', id, finalData);
      logger.info('staff', 'Colaborador salvo no nível enterprise', { id, enterpriseId });
      return id;
    } catch (error) {
      logger.error('staff', 'Erro ao salvar colaborador centralizado', { error });
      throw error;
    }
  }

  /**
   * Registra eventos de performance que impactam o Score global do colaborador.
   */
  static async recordPerformance(enterpriseId: string, event: Omit<PerformanceEvent, 'id' | 'timestamp'>) {
    const eventId = `perf-${Date.now()}`;
    const fullEvent: PerformanceEvent = {
      ...event,
      id: eventId,
      timestamp: Date.now(),
      enterpriseId
    };

    try {
      await firebaseService.saveItem('performance_events', eventId, fullEvent);
      
      // Atualiza o score no documento do staff de forma atômica/reativa
      const staff = await firebaseService.getDoc('staff', event.staffId) as Staff;
      if (staff) {
        const newScore = (staff.performanceScore || 100) + event.points;
        await firebaseService.updateItem('staff', event.staffId, { performanceScore: newScore });
      }
      
      logger.info('staff', 'Evento de performance registrado', { staffId: event.staffId, points: event.points });
    } catch (error) {
      logger.error('staff', 'Falha ao processar performance', { error });
    }
  }

  /**
   * Gerencia Checklists de conformidade (onboarding/treinamento) centralizados.
   */
  static async updateChecklist(enterpriseId: string, staffId: string, itemId: string, completedBy: string) {
    const docId = `checklist_${staffId}`;
    try {
      await firebaseService.runTransaction(async (tx) => {
        const ref = firebaseService.getDocRef('hr_checklists', docId);
        const snap = await tx.get(ref);
        const currentData = snap.exists() ? snap.data() : { items: {} };
        
        const isCompleted = !currentData.items[itemId]?.completed;
        
        tx.set(ref, {
          enterpriseId,
          staffId,
          items: {
            ...currentData.items,
            [itemId]: {
              completed: isCompleted,
              completedAt: Date.now(),
              completedBy
            }
          },
          updatedAt: Date.now()
        }, { merge: true });
      });
    } catch (error) {
      logger.error('staff', 'Erro ao atualizar checklist centralizado', { staffId, itemId });
    }
  }

  /**
   * Realiza o desligamento formal de um colaborador.
   * Em vez de deletar, marca como inativo e salva o motivo para auditoria futura.
   */
  static async terminateStaff(enterpriseId: string, staffId: string, reason: string, adminName: string) {
    try {
      const terminationData = {
        active: false,
        terminationDate: Date.now(),
        terminationReason: reason,
        terminatedBy: adminName,
        updatedAt: Date.now()
      };

      await firebaseService.updateItem('staff', staffId, terminationData);
      
      await firebaseService.addAuditLog({
        enterpriseId,
        shopId: 'global',
        staffId,
        staffName: 'System',
        action: 'STAFF_TERMINATION',
        details: `Colaborador desligado por ${adminName}. Motivo: ${reason}`
      });

      logger.warn('staff', 'Desligamento processado', { staffId, reason });
    } catch (error) {
      logger.error('staff', 'Erro ao processar desligamento', { error });
      throw error;
    }
  }

  /**
   * Executa a promoção de um colaborador com registro histórico.
   */
  static async promoteStaff(
    enterpriseId: string, 
    staffId: string, 
    newRole: string, 
    newSalary: number, 
    adminName: string
  ) {
    try {
      const staff = await firebaseService.getDoc('staff', staffId) as Staff;
      if (!staff) throw new Error('staff_not_found');

      const promotionEntry = {
        date: Date.now(),
        fromRole: staff.role,
        toRole: newRole,
        fromSalary: staff.salary || 0,
        toSalary: newSalary,
        approvedBy: adminName
      };

      await firebaseService.updateItem('staff', staffId, {
        role: newRole,
        salary: newSalary,
        promotionHistory: [...((staff as any).promotionHistory || []), promotionEntry],
        updatedAt: Date.now()
      });

      logger.info('hr', 'Colaborador promovido com sucesso', { staffId, newRole });
    } catch (error) {
      logger.error('hr', 'Falha ao processar promoção', { error });
      throw error;
    }
  }
}