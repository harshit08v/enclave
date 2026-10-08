/**
 * ENCLAVE Media Configuration & Safety Rules
 * Enforces strict client and server limits on image and video payloads.
 */

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB max image size
export const MAX_VIDEO_SIZE = 25 * 1024 * 1024; // 25 MB max video size

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime'
];

export interface MediaValidationResult {
  valid: boolean;
  error?: string;
  mediaType?: 'image' | 'video';
}

export function validateMediaFile(file: { size: number; type: string; name?: string }): MediaValidationResult {
  const mime = file.type.toLowerCase();

  const isImage = ALLOWED_IMAGE_TYPES.includes(mime);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(mime);

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: 'Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM.'
    };
  }

  if (isImage) {
    if (file.size > MAX_IMAGE_SIZE) {
      return {
        valid: false,
        error: `Image exceeds maximum allowed size (${Math.round(MAX_IMAGE_SIZE / (1024 * 1024))}MB).`
      };
    }
    return { valid: true, mediaType: 'image' };
  }

  if (isVideo) {
    if (file.size > MAX_VIDEO_SIZE) {
      return {
        valid: false,
        error: `Video exceeds maximum allowed size (${Math.round(MAX_VIDEO_SIZE / (1024 * 1024))}MB).`
      };
    }
    return { valid: true, mediaType: 'video' };
  }

  return { valid: false, error: 'Invalid media upload.' };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

