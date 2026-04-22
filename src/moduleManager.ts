import { BusinessMode } from './core/types';
import { logger } from './core/services/logger';

class ModuleManager {
  private currentMode: BusinessMode = 'generic';

  initialize(mode: BusinessMode) {
    this.currentMode = mode;
    logger.log('system', `Initialized ModuleManager in ${mode} mode`);
    localStorage.setItem('pos_business_mode', mode);
  }

  getMode() {
    return this.currentMode || localStorage.getItem('pos_business_mode') as BusinessMode || 'generic';
  }

  isModuleActive(moduleName: string) {
    const mode = this.getMode();
    if (mode === 'restaurant' && moduleName === 'restaurant') return true;
    if (mode === 'construction' && moduleName === 'construction') return true;
    if (mode === 'retail' && moduleName === 'retail') return true;
    if (mode === 'market' && moduleName === 'market') return true;
    return false;
  }
}

export const moduleManager = new ModuleManager();
