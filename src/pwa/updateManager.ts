export function setupUpdateListener() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // App atualizado, recarregando página
      window.location.reload();
    });
  }
}

