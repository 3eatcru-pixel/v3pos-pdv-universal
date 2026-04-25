import { firebaseService } from '../../services/firebaseService';
import { Staff, PerformanceEvent, RolePermissions } from '../../types';
import { logger } from './logger';
import { generateSafeId } from '../lib/utils'; // Assumindo que moveremos a utilidade para cá

export const ROLE_HIERARCHY: Record<string, number> = {
  'staff': 1,
  'manager': 2,
  'owner': 3,
  'dev': 4
};

export interface StaffSurveyEntry {
  id: string;
  enterpriseId: string;
  shopId: string;
  staffId: string;
  staffName: string;
  rating: number; // 1-5 scale
  comment: string;
  timestamp: number;
}

export class HREngine {
  /**
   * Salva ou atualiza um colaborador no nível da Empresa.
   * Garante que o vínculo seja com a EnterpriseId para visibilidade global.
   */
  static async saveStaff(enterpriseId: string, staffData: Partial<Staff>, photoFile?: File, creatorRole?: string): Promise<string> {
    const id = staffData.id || `staff-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let photoUrl = staffData.photo || '';

    try {
      // Trava de Segurança: Validação de Hierarquia de Poder
      if (creatorRole && staffData.role) {
        const creatorPower = ROLE_HIERARCHY[creatorRole] || 1;
        const targetPower = ROLE_HIERARCHY[staffData.role] || 1;

        if (targetPower > creatorPower) {
          logger.error('security', 'Tentativa de escalada de privilégios bloqueada', { creatorRole, targetRole: staffData.role });
          throw new Error('Acesso Negado: Você não tem autoridade para criar ou gerenciar um colaborador com nível superior ao seu.');
        }
      }

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
          rentalFee: 0,
          dailyRate: 0, // Adicionado para freelancers
          staffFood: {
            enabled: (staffData as any).serviceConfig?.staffFood?.enabled ?? false,
            dailyLimit: (staffData as any).serviceConfig?.staffFood?.dailyLimit ?? 0,
            allowedItems: (staffData as any).serviceConfig?.staffFood?.allowedItems || [] // Opcional: lista de IDs
          }
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
      await firebaseService.runTransaction(async (tx) => {
        const staffRef = firebaseService.getDocRef('staff', event.staffId);
        const staffSnap = await tx.get(staffRef);
        
        if (staffSnap.exists()) {
          const currentScore = staffSnap.data().performanceScore || 100;
          tx.update(staffRef, { performanceScore: currentScore + event.points });
        }

        // Salva o log do evento dentro da mesma transação
        tx.set(firebaseService.getDocRef('performance_events', eventId), fullEvent);
      });
      
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
    adminName: string,
    adminRole?: string
  ) {
    try {
      // Auditoria: Impede que um gerente promova alguém para um cargo acima da sua própria autoridade
      if (adminRole) {
        const adminPower = ROLE_HIERARCHY[adminRole] || 1;
        const targetPower = ROLE_HIERARCHY[newRole] || 1;

        if (targetPower > adminPower) {
          throw new Error('Operação negada: Seu nível de autoridade não permite conceder este cargo.');
        }
      }

      await firebaseService.runTransaction(async (tx) => {
        const staffRef = firebaseService.getDocRef('staff', staffId);
        const staffSnap = await tx.get(staffRef);
        if (!staffSnap.exists()) throw new Error('staff_not_found');
        const staff = staffSnap.data() as Staff;

        const promotionEntry = {
          date: Date.now(),
          fromRole: staff.role,
          toRole: newRole,
          fromSalary: staff.salary || 0,
          toSalary: newSalary,
          approvedBy: adminName
        };

        tx.update(staffRef, {
          role: newRole,
          salary: newSalary,
          promotionHistory: [...((staff as any).promotionHistory || []), promotionEntry],
          updatedAt: Date.now()
        });
      });

      logger.info('hr', 'Colaborador promovido com sucesso', { staffId, newRole });
    } catch (error) {
      logger.error('hr', 'Falha ao processar promoção', { error });
      throw error;
    }
  }

  /**
   * Registra o feedback de satisfação de um colaborador.
   */
  static async recordStaffSurvey(params: Omit<StaffSurveyEntry, 'id' | 'timestamp'>): Promise<string> {
    const surveyId = generateSafeId('survey');
    const survey: StaffSurveyEntry = {
      ...params,
      id: surveyId,
      timestamp: Date.now()
    };

    try {
      await firebaseService.saveItem('staff_surveys', surveyId, survey);
      logger.info('hr', 'Pesquisa de satisfação registrada', { staffId: params.staffId, rating: params.rating });
      return surveyId;
    } catch (error) {
      logger.error('hr', 'Falha ao registrar pesquisa de satisfação', { error });
      throw error;
    }
  }
}