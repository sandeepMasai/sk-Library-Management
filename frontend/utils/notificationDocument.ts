const LEGACY_PDF_LINE_RE = /📎\s*PDF:\s*(https?:\/\/\S+)/i;
const PDF_LABEL_RE = /PDF\s*:?\s*(https?:\/\/\S+)/i;
const PDF_URL_RE = /(https?:\/\/[^\s<>"']+\.pdf(?:\?[^\s<>"']*)?)/i;
const CLOUDINARY_RAW_RE = /(https?:\/\/res\.cloudinary\.com\/[^\s<>"']+\/raw\/upload\/[^\s<>"']+)/i;
const PLAIN_URL_RE = /^https?:\/\/\S+$/i;

function cleanUrl(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/[),.;]+$/g, '');
}

export function extractLegacyPdfUrl(message: string): string | null {
  const text = String(message || '');

  const legacy = LEGACY_PDF_LINE_RE.exec(text);
  if (legacy?.[1]) return cleanUrl(legacy[1]);

  const labeled = PDF_LABEL_RE.exec(text);
  if (labeled?.[1]) return cleanUrl(labeled[1]);

  const pdfUrl = PDF_URL_RE.exec(text);
  if (pdfUrl?.[1]) return cleanUrl(pdfUrl[1]);

  const cloudinaryRaw = CLOUDINARY_RAW_RE.exec(text);
  if (cloudinaryRaw?.[1]) return cleanUrl(cloudinaryRaw[1]);

  const trimmed = text.trim();
  if (PLAIN_URL_RE.test(trimmed)) return cleanUrl(trimmed);

  return null;
}

export function stripLegacyPdfLine(message: string): string {
  let next = String(message || '');
  next = next.replace(LEGACY_PDF_LINE_RE, '');
  next = next.replace(PDF_LABEL_RE, '');
  next = next.replace(PDF_URL_RE, '');
  next = next.replace(CLOUDINARY_RAW_RE, '');
  if (PLAIN_URL_RE.test(next.trim())) return '';
  return next.replace(/\n{3,}/g, '\n\n').trim();
}

export function resolveNotificationDocumentUrl(input: {
  documentUrl?: string | null;
  message?: string;
  title?: string;
  messageType?: string;
}): string | null {
  const direct = cleanUrl(String(input.documentUrl || ''));
  if (direct) return direct;

  const fromMessage = extractLegacyPdfUrl(String(input.message || ''));
  if (fromMessage) return fromMessage;

  const fromTitle = extractLegacyPdfUrl(String(input.title || ''));
  if (fromTitle) return fromTitle;

  const type = String(input.messageType || '').toLowerCase();
  if (type === 'pdf' || type === 'text_pdf') {
    const fallback = extractLegacyPdfUrl(String(input.message || ''));
    if (fallback) return fallback;
  }

  return null;
}

export function resolveNotificationDisplayMessage(input: {
  message?: string;
  documentUrl?: string | null;
  title?: string;
}): string {
  const message = String(input.message || '');
  if (input.documentUrl) return stripLegacyPdfLine(message);
  const cleaned = stripLegacyPdfLine(message);
  if (cleaned) return cleaned;
  if (extractLegacyPdfUrl(message) || extractLegacyPdfUrl(String(input.title || ''))) {
    return 'PDF document attached — tap View to open.';
  }
  return cleaned;
}

export function notificationHasPdf(input: {
  documentUrl?: string | null;
  message?: string;
  title?: string;
  messageType?: string;
}): boolean {
  if (resolveNotificationDocumentUrl(input)) return true;
  const type = String(input.messageType || '').toLowerCase();
  return type === 'pdf' || type === 'text_pdf';
}
