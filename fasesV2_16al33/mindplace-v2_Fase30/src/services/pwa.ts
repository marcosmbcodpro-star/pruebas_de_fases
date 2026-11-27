export interface PwaSnapshot {
  supported: boolean;
  installed: boolean;
  canInstall: boolean;
  updateReady: boolean;
  controllerPresent: boolean;
}

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

let registration: ServiceWorkerRegistration | null = null;
let deferredPrompt: InstallPromptEvent | null = null;
let reloadOnControllerChange = false;

function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function emit() {
  window.dispatchEvent(new CustomEvent('mindplace:pwa-state'));
}

export function getPwaSnapshot(): PwaSnapshot {
  return {
    supported: 'serviceWorker' in navigator,
    installed: isStandalone(),
    canInstall: Boolean(deferredPrompt),
    updateReady: Boolean(registration?.waiting),
    controllerPresent: Boolean(navigator.serviceWorker?.controller)
  };
}

export async function registerPwa(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('beforeinstallprompt', (event) => {
    // Conservamos el evento para poder ofrecer una instalación explícita
    // desde MindPlace, pero no cancelamos el comportamiento nativo del navegador.
    // Así Chrome no genera el aviso de consola causado por preventDefault().
    deferredPrompt = event as InstallPromptEvent;
    emit();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
  });

  try {
    registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    registration.addEventListener('updatefound', () => {
      const worker = registration?.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) emit();
      });
      emit();
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      emit();
      if (reloadOnControllerChange) {
        reloadOnControllerChange = false;
        window.location.reload();
      }
    });

    await registration.update();
    emit();
  } catch (error) {
    console.warn('[MindPlace PWA] No se pudo registrar el service worker.', error);
  }
}

export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice;
  deferredPrompt = null;
  emit();
  return result.outcome === 'accepted';
}

export function updatePwa(): void {
  const waiting = registration?.waiting;
  if (!waiting) return;
  reloadOnControllerChange = true;
  waiting.postMessage({ type: 'mindplace:pwa-skip-waiting' });
}
