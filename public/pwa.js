(() => {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

  const installButton = document.querySelector('[data-pwa-install]');
  const iosButton = document.querySelector('[data-pwa-ios]');
  const iosHelp = document.querySelector('[data-pwa-ios-help]');
  const updatePrompt = document.querySelector('[data-pwa-update]');
  let deferredInstall = null;
  let refreshing = false;
  let updateAccepted = false;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  const hideInstall = () => { if (installButton) installButton.hidden = true; if (iosButton) iosButton.hidden = true; };
  const isIosSafari = /iP(?:hone|ad|od)/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/(?:CriOS|FxiOS|EdgiOS)/.test(navigator.userAgent);

  if (!standalone() && isIosSafari && iosButton) iosButton.hidden = false;
  iosButton?.addEventListener('click', () => { if (iosHelp) iosHelp.hidden = !iosHelp.hidden; });

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    if (standalone()) return;
    deferredInstall = event;
    if (installButton) installButton.hidden = false;
  });
  installButton?.addEventListener('click', async () => {
    if (!deferredInstall) return;
    const prompt = deferredInstall;
    deferredInstall = null;
    installButton.hidden = true;
    await prompt.prompt();
    await prompt.userChoice;
  });
  window.addEventListener('appinstalled', hideInstall);

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updateAccepted && !refreshing) { refreshing = true; window.location.reload(); }
  });

  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(registration => {
    const offerUpdate = () => {
      if (!registration.waiting || !navigator.serviceWorker.controller || !updatePrompt) return;
      updatePrompt.hidden = false;
      updatePrompt.querySelector('button')?.addEventListener('click', () => {
        updateAccepted = true;
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        updatePrompt.hidden = true;
      }, { once: true });
    };
    offerUpdate();
    registration.addEventListener('updatefound', () => {
      registration.installing?.addEventListener('statechange', offerUpdate);
    });
  }).catch(() => {
    // The site remains usable if offline support is unavailable.
  });
})();
