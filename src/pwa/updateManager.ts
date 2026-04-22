export function setupUpdateListener() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('App atualizado');
      window.location.reload();
    });
  }
}

