import { logger } from './logger';

export interface BusinessHours {
  day: number; // 0-6 (Sunday-Saturday)
  open: string; // "08:00"
  close: string; // "22:00"
  closed: boolean;
}

class BusinessHoursEngine {
  /**
   * Valida se o PDV pode operar agora
   */
  isBusinessOpen(config: BusinessHours[]): { isOpen: boolean; reason?: string } {
    const now = new Date();
    const day = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const todayConfig = config.find(c => c.day === day);

    if (!todayConfig || todayConfig.closed) {
      logger.debug('business_hours', 'Estabelecimento fechado hoje', { day, todayConfig });
      return { isOpen: false, reason: 'Estabelecimento fechado hoje.' };
    }

    const [openH, openM] = todayConfig.open.split(':').map(Number);
    const [closeH, closeM] = todayConfig.close.split(':').map(Number);
    
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    if (currentTime < openMinutes || currentTime > closeMinutes) {
      logger.debug('business_hours', 'Fora do horário de funcionamento', { currentTime, openMinutes, closeMinutes });
      return { isOpen: false, reason: `Fora do horário: Abre às ${todayConfig.open} e fecha às ${todayConfig.close}` };
    }

    logger.debug('business_hours', 'Estabelecimento aberto', { currentTime });
    return { isOpen: true };
  }
}

export const businessHoursEngine = new BusinessHoursEngine();