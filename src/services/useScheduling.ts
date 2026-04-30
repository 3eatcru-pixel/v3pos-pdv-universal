import { useState, useEffect, useCallback, useRef } from 'react';
import { schedulingService } from '../services/schedulingService';
import { ServiceAppointment, AppointmentStatus } from '../types';
import { logger } from '../../../core/services/logger';

export const useScheduling = (enterpriseId: string | undefined, shopId: string | null = null) => {
  const [appointments, setAppointments] = useState<ServiceAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!enterpriseId) return;

    const init = async () => {
      setIsLoading(true);
      try {
        if (!isInitialized.current) {
          await schedulingService.initialize(enterpriseId, shopId);
          isInitialized.current = true;
        }
        
        const unsubscribe = schedulingService.subscribe((data) => {
          const filtered = schedulingService.getAppointments(enterpriseId, { shopId: shopId || undefined });
          setAppointments(filtered);
          setIsLoading(false);
        });

        return unsubscribe;

      } catch (err) {
        logger.error('hooks', 'Erro ao carregar agendamentos', { error: err });
        setError('Não foi possível carregar a agenda.');
        setIsLoading(false);
      }
    };

    init();
  }, [enterpriseId, shopId]);

  const updateStatus = useCallback(async (id: string, status: AppointmentStatus) => {
    try {
      await schedulingService.updateAppointmentStatus(id, status);
    } catch (err) {
      setError('Erro ao atualizar status do agendamento.');
      throw err;
    }
  }, []);

  return {
    appointments,
    isLoading,
    error,
    updateStatus,
    createAppointment: schedulingService.createAppointment.bind(schedulingService)
  };
};