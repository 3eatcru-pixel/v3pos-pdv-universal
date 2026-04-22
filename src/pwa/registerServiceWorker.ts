import { registerSW } from 'virtual:pwa-register';

export function registerServiceWorker() {
  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(swScriptUrl) {
      console.log('SW registrado:', swScriptUrl);
    },
    onOfflineReady() {
      console.log('App pronto para uso offline');
    },
    onNeedRefresh() {
      console.log('Nova versao detectada, atualizando app');
      void updateSW(true);
    },
    onRegisterError(error) {
      console.error('Erro SW:', error);
    },
  });
}
