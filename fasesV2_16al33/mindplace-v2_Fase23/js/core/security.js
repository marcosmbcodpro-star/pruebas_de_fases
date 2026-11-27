export const SECURITY_LIMITS = Object.freeze({
  maxCases: 500,
  maxNodesPerCase: 2000,
  maxEdgesPerCase: 4000,
  maxHistoryPerCase: 500,
  maxAttachmentsPerNode: 10,
  maxTagsPerNode: 50,
  maxTagLength: 80,
  maxTitleLength: 160,
  maxDescriptionLength: 10000,
  maxTextLength: 50000,
  maxCategoryLength: 80,
  maxUrlLength: 2048,
  maxImportBytes: 200 * 1024 * 1024,
  maxFileNameLength: 180,
  maxExtensionLength: 15
});

export function sanitizePlainText(value, maxLength = SECURITY_LIMITS.maxTextLength) {
  if (typeof value !== 'string') return '';
  return value.replace(/\u0000/g, '').slice(0, maxLength);
}

export function sanitizeUrl(value) {
  if (typeof value !== 'string') return '';
  const raw = value.trim().slice(0, SECURITY_LIMITS.maxUrlLength);
  if (!raw) return '';
  try {
    const base = typeof window !== 'undefined' && window.location?.href ? window.location.href : 'http://localhost/';
    const url = new URL(raw, base);
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) return '';
    return raw;
  } catch {
    return '';
  }
}

export function sanitizeFileName(value) {
  const raw = sanitizePlainText(value, SECURITY_LIMITS.maxFileNameLength)
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return raw || 'Adjunto';
}

export function sanitizeExtension(value) {
  return sanitizePlainText(value, SECURITY_LIMITS.maxExtensionLength)
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

export function isSafeExternalUrl(value) {
  return !!sanitizeUrl(value);
}
