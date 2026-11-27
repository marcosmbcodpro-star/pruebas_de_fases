export interface LegacyReadyMessage {
  type: 'mindplace:legacy-ready';
  phase: 16;
  version: string;
}

export interface LegacyErrorMessage {
  type: 'mindplace:legacy-error';
  message: string;
}

export type LegacyMessage = LegacyReadyMessage | LegacyErrorMessage;

export const isLegacyMessage = (value: unknown): value is LegacyMessage => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.type === 'mindplace:legacy-ready' && candidate.phase === 16
  ) || candidate.type === 'mindplace:legacy-error';
};
