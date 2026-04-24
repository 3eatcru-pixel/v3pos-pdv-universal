import { registerSW } from 'virtual:pwa-register';

export function registerServiceWorker() {
  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(swScriptUrl) {
      log('SW registrado:', swScriptUrl);
    },
    onOfflineReady() {
      log('App pronto para uso offline');
    },
    onNeedRefresh() {
      log('Nova versão detectada, atualizando app');
      void updateSW(true);
    },
    onRegisterError(error) {
      console.error('Erro SW:', error);
    },
  });
}
