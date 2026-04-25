/**
 * DeviceDetectionEngine - Motor de Identificação de Hardware
 * Detecta se o usuário está em um Smartphone, Tablet ou PC para adaptar a UX.
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export class DeviceDetectionEngine {
  /**
   * Retorna o tipo de dispositivo baseado no Viewport.
   * Utiliza os breakpoints padrão do Tailwind para consistência.
   */
  static getDeviceType(): DeviceType {
    const width = window.innerWidth;
    
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    
    return 'desktop';
  }

  /**
   * Helpers de verificação rápida
   */
  static isMobile(): boolean {
    return this.getDeviceType() === 'mobile';
  }

  static isTablet(): boolean {
    return this.getDeviceType() === 'tablet';
  }
}