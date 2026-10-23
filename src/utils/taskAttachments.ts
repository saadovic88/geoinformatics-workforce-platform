/** Small, work-safe files that may accompany a task. Keep this list in sync
 * with the private Supabase bucket configured in migration 0023. */
export const MAX_TASK_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_TASK_ATTACHMENTS_PER_UPLOAD = 5;
export const TASK_ATTACHMENT_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.ppt,.pptx,.xls,.xlsx';

const fileKinds: Record<string, 'image' | 'document' | 'presentation' | 'spreadsheet'> = {
  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image', gif: 'image',
  doc: 'document', docx: 'document', ppt: 'presentation', pptx: 'presentation',
  xls: 'spreadsheet', xlsx: 'spreadsheet',
};

export function taskAttachmentKind(fileName: string) {
  return fileKinds[fileName.split('.').pop()?.toLowerCase() || ''];
}

export function validateTaskAttachment(file: File): string | undefined {
  if (!taskAttachmentKind(file.name)) return 'Only images, Word, PowerPoint, and Excel files are allowed.';
  if (file.size <= 0) return 'The selected file is empty.';
  if (file.size > MAX_TASK_ATTACHMENT_BYTES) return 'Each attachment must be 5 MB or smaller.';
  return undefined;
}

export function formatTaskAttachmentSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 1 : 2)} MB`;
}

export function safeTaskAttachmentName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^_+/, '').slice(-120) || 'attachment';
}
