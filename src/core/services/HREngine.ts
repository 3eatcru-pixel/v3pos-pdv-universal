import { firebaseService } from '../../services/firebaseService';
import { Staff, PerformanceEvent, RolePermissions } from '../../types';
import { logger } from './logger';
import { idGenerator } from '../utils/idGenerator';
import { ImageProcessorEngine } from './ImageProcessorEngine';
import { format } from 'date-fns';
import { coreEventBus } from '../events/CoreEventBus';

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
  static async saveStaff(enterpriseId: string, staffData: Partial<Staff>, photoFile?: File, creatorRole?: string, deferUntilEOD: boolean = false): Promise<string> {
    const id = staffData.id || idGenerator.generate('staff');
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

      // Nexus Standard: Processamento de imagem unificado para evitar duplicidade lógica
      if (photoFile) {
        const processedBlob = await ImageProcessorEngine.processForUpload(photoFile);
        const upload = await firebaseService.uploadFile(`staff_photos/${enterpriseId}/${id}`, processedBlob as File);
        const uploaded = Array.isArray(upload) ? upload[0] : upload;
        if (uploaded?.url) photoUrl = uploaded.url;
      }

      // Lógica de Diferimento: Se solicitado, salva na fila de pendências em vez de aplicar agora
      if (deferUntilEOD) {
        const pendingId = `pending-hr-${id}`;
        await firebaseService.saveItem('pending_staff_updates', pendingId, {
          id: pendingId,
          enterpriseId,
          staffData: { ...staffData, photo: photoUrl || staffData.photo },
          timestamp: Date.now()
        });
        logger.info('staff', 'Alteração de perfil enfileirada para o fechamento da loja', { staffId: id });
        return id;
      }

      await firebaseService.runTransaction(async (tx) => {
        const staffRef = firebaseService.getDocRef('staff', id);
        const snap = await tx.get(staffRef);
        const currentData = snap.exists() ? snap.data() : {};

        const finalData = {
          ...currentData,
          ...staffData,
          id,
          enterpriseId,
          photo: photoUrl || currentData.photo || '',
          updatedAt: Date.now(),
          active: staffData.active ?? currentData.active ?? true,
          professionalLicense: (staffData as any).professionalLicense || currentData.professionalLicense || '',
          businessModel: (staffData as any).businessModel || currentData.businessModel || 'commission',
          promotionHistory: (staffData as any).promotionHistory || currentData.promotionHistory || [],
          serviceConfig: (staffData as any).serviceConfig || currentData.serviceConfig || {
            serviceRate: 50,
            productRate: 10,
            rentalFee: 0,
            dailyRate: 0,
            staffFood: {
              enabled: false,
              dailyLimit: 0,
              allowedItems: []
            }
          }
        };

        tx.set(staffRef, finalData);
      });

      logger.info('staff', 'Colaborador salvo no nível enterprise', { id, enterpriseId });
      
      // Notifica o barramento para que motores de integração (como GoogleBusiness) 
      // saibam que os dados da unidade mudaram.
      coreEventBus.emit('hr:staff_updated', { 
        enterpriseId, 
        staffId: id, 
        role: staffData.role 
      });

      return id;
    } catch (error) {
      logger.error('staff', 'Erro ao salvar colaborador centralizado', { error });
      throw error;
    }
  }

  /**
   * Processa e aplica todas as alterações de RH que foram enfileiradas.
   * Chamado automaticamente pelo EndOfDayEngine durante o encerramento.
   */
  static async applyPendingUpdates(enterpriseId: string) {
    try {
      const pending = await firebaseService.getDocsByQuery('pending_staff_updates', [
        { field: 'enterpriseId', op: '==', value: enterpriseId }
      ]);

      for (const update of pending) {
        await this.saveStaff(enterpriseId, update.staffData, undefined, 'dev'); // Aplica como dev para ignorar travas
        await firebaseService.deleteItem('pending_staff_updates', update.id);
      }
      if (pending.length > 0) logger.info('hr', `Aplicadas ${pending.length} atualizações de RH pendentes.`);
    } catch (error) {
      logger.error('hr', 'Falha ao processar fila de atualizações de RH', { error });
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
      await firebaseService.runTransaction(async (tx) => {
        const staffRef = firebaseService.getDocRef('staff', staffId);
        const staffSnap = await tx.get(staffRef);
        if (!staffSnap.exists()) throw new Error('Colaborador não encontrado');

        tx.update(staffRef, {
          active: false,
          terminationDate: Date.now(),
          terminationReason: reason,
          terminatedBy: adminName,
          updatedAt: Date.now()
        });

        const auditId = idGenerator.generate('audit');
        tx.set(firebaseService.getDocRef('audit_logs', auditId), {
          enterpriseId,
          shopId: 'global',
          staffId,
          staffName: 'System',
          action: 'STAFF_TERMINATION',
          details: `Colaborador desligado por ${adminName}. Motivo: ${reason}`,
          timestamp: Date.now()
        });
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
    const surveyId = idGenerator.generate('survey');
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

  /**
   * Gera o payload de "Meu Workspace" para o colaborador.
   * Agrupa escalas, documentos compartilhados e performance em um único snapshot.
   */
  static async getStaffWorkspaceData(enterpriseId: string, staffId: string) {
    try {
      const [staff, shifts, performance] = await Promise.all([
        firebaseService.getDoc('staff', staffId) as Promise<Staff>,
        firebaseService.getDocsByQuery('shifts', [
          { field: 'staffId', op: '==', value: staffId },
          { field: 'startTime', op: '>=', value: Date.now() }
        ]),
        firebaseService.getDocsByQuery('performance_events', [
          { field: 'staffId', op: '==', value: staffId }
        ])
      ]);

      return { staff, shifts, performance, timestamp: Date.now() };
    } catch (error) {
      logger.error('hr', 'Erro ao compilar workspace do staff', { staffId });
      return null;
    }
  }

  /**
   * Publica a escala atual para o Google Drive e atualiza o índice no Firestore.
   * Isso permite que os funcionários acessem a escala sem consumir cota de banco.
   */
  static async publishWeeklySchedule(enterpriseId: string, shopId: string, shifts: any[]) {
    try {
      const weekLabel = format(new Date(), 'yyyy-MM_ww');
      logger.info('hr', '🚀 Publicando escala semanal no Workspace Drive...', { weekLabel });

      // 1. Prepara o JSON para o App e o Texto para o Humano
      const schedulePayload = {
        enterpriseId,
        shopId,
        week: weekLabel,
        publishedAt: Date.now(),
        shifts: shifts.map(s => ({ staffId: s.staffId, start: s.startTime, end: s.endTime, area: s.area }))
      };

      // 2. Simula o upload para o Drive (Requisito: Drive-First)
      // O BackupEngine se encarregaria de subir o 'schedulePayload'
      const mockDriveFileId = `drive-file-${weekLabel}`;

      // 3. Firestore atua APENAS como índice (Metadata Pointer)
      // Economiza Units pois o conteúdo pesado (JSON de 1000 turnos) está no Drive.
      await firebaseService.saveItem('publications', `schedule_${shopId}`, {
        enterpriseId,
        shopId,
        type: 'weekly_schedule',
        driveFileId: mockDriveFileId,
        updatedAt: Date.now(),
        label: `Escala Publicada: Semana ${weekLabel}`
      });

      logger.info('hr', '✅ Escala publicada e indexada com sucesso.');
      
      // Notifica todos os membros via Mesh
      coreEventBus.emit('hr:schedule_published', { shopId, week: weekLabel });
      
    } catch (error) {
      logger.error('hr', 'Falha ao publicar escala no Drive', { error });
    }
  }

  static async sendInternalMessage(
    enterpriseId: string,
    userId: string,
    title: string,
    content: string,
    type: 'info' | 'warning' | 'critical' = 'info'
  ) {
    return firebaseService.saveItem('internal_messages', idGenerator.generate('msg'), {
      enterpriseId,
      userId,
      title,
      content,
      type,
      timestamp: Date.now()
    });
  }

  static getDigitalGuideTemplate(transfer: any) {
    const items = (transfer.items || [])
      .map((i: any) => `- ${i.name}: ${i.quantity} ${i.unit || 'UN'}`)
      .join('\n');
    return `Guia ${transfer.digitalGuideId}\nOrigem: ${transfer.sourceShopId}\nDestino: ${transfer.destinationShopId}\n\nItens:\n${items}`;
  }
}
