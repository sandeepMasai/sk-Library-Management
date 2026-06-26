import type { CommunicationAudience, CommunicationMessageType } from '../store';

export type BulkMode = 'one' | 'multiple' | 'all' | 'active' | 'expired' | 'shift';

export function resolveMessageType(
  text: string,
  hasImage: boolean,
  hasPdf: boolean
): CommunicationMessageType {
  if (hasPdf && text) return 'text_pdf';
  if (hasPdf) return 'pdf';
  if (hasImage && text) return 'text_image';
  if (hasImage) return 'image';
  return 'text';
}

export function resolveSendAudience(
  bulkMode: BulkMode,
  selectedStudentId: string | null,
  multiIds: string[],
  shiftId: string | null
): { audience: CommunicationAudience; studentIds: string[]; shiftId: string | null } {
  if (bulkMode === 'all') return { audience: 'all', studentIds: [], shiftId: null };
  if (bulkMode === 'active') return { audience: 'active', studentIds: [], shiftId: null };
  if (bulkMode === 'expired') return { audience: 'expired', studentIds: [], shiftId: null };
  if (bulkMode === 'shift') return { audience: 'shift', studentIds: [], shiftId };
  if (bulkMode === 'multiple') return { audience: 'selected', studentIds: multiIds, shiftId: null };
  return {
    audience: 'selected',
    studentIds: selectedStudentId ? [selectedStudentId] : [],
    shiftId: null,
  };
}

export function canSendToAudience(
  bulkMode: BulkMode,
  selectedStudentId: string | null,
  multiIds: string[],
  shiftId: string | null
): boolean {
  if (bulkMode === 'all' || bulkMode === 'active' || bulkMode === 'expired') return true;
  if (bulkMode === 'shift') return Boolean(shiftId);
  if (bulkMode === 'multiple') return multiIds.length > 0;
  if (bulkMode === 'one') return Boolean(selectedStudentId);
  return false;
}

export function audiencePreviewParams(
  bulkMode: BulkMode,
  selectedStudentId: string | null,
  multiIds: string[],
  shiftId: string | null
): { audience: CommunicationAudience; studentIds?: string[]; shiftId?: string | null } {
  const resolved = resolveSendAudience(bulkMode, selectedStudentId, multiIds, shiftId);
  return {
    audience: resolved.audience,
    ...(resolved.studentIds.length ? { studentIds: resolved.studentIds } : {}),
    ...(resolved.shiftId ? { shiftId: resolved.shiftId } : {}),
  };
}
