import { logger } from '../core/services/logger';

export function registerServiceWorker() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          logger.info('system', 'ServiceWorker registrado com sucesso', { scope: registration.scope });
        })
        .catch(error => {
          logger.error('system', 'Falha ao registrar ServiceWorker', { error });
        });
    });
  }
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => registration.unregister());
  }
}