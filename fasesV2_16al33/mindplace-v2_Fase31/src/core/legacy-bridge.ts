import type { LegacyMessage } from '../types/legacy';
import { isLegacyMessage } from '../types/legacy';

export function installLegacyBridge(onMessage: (message: LegacyMessage) => void): () => void {
  const listener = (event: MessageEvent<unknown>) => {
    if (event.source !== window) return;
    if (!isLegacyMessage(event.data)) return;
    onMessage(event.data);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

export function notifyParentReady(version: string): void {
  if (window.parent === window) return;
  window.parent.postMessage({ type: 'mindplace:legacy-ready', phase: 16, version }, window.location.origin);
}

export function notifyParentError(message: string): void {
  if (window.parent === window) return;
  window.parent.postMessage({ type: 'mindplace:legacy-error', message }, window.location.origin);
}
