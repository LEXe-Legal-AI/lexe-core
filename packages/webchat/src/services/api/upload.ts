/**
 * File Upload Service for LEO Webchat
 *
 * Handles file uploads, progress tracking, and preview generation.
 */

import { getApiClient } from './client';
import type { Attachment } from '@/types';

/**
 * Supported file types
 */
export const SUPPORTED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'text/plain', 'text/markdown'],
  code: [
    'text/javascript',
    'application/json',
    'text/typescript',
    'text/html',
    'text/css',
  ],
} as const;

/**
 * All supported MIME types
 */
export const ALL_SUPPORTED_TYPES = [
  ...SUPPORTED_FILE_TYPES.image,
  ...SUPPORTED_FILE_TYPES.document,
  ...SUPPORTED_FILE_TYPES.code,
];

/**
 * File size limits
 */
export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  document: 20 * 1024 * 1024, // 20MB
  code: 1 * 1024 * 1024, // 1MB
  default: 10 * 1024 * 1024, // 10MB
} as const;

/**
 * Get file category from MIME type
 */
export function getFileCategory(
  mimeType: string
): 'image' | 'document' | 'code' | 'unknown' {
  if (SUPPORTED_FILE_TYPES.image.includes(mimeType as never)) return 'image';
  if (SUPPORTED_FILE_TYPES.document.includes(mimeType as never))
    return 'document';
  if (SUPPORTED_FILE_TYPES.code.includes(mimeType as never)) return 'code';
  return 'unknown';
}

/**
 * Validate file for upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const category = getFileCategory(file.type);

  if (category === 'unknown') {
    return {
      valid: false,
      error: `File type "${file.type || 'unknown'}" is not supported`,
    };
  }

  const maxSize = FILE_SIZE_LIMITS[category];
  if (file.size > maxSize) {
    const sizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File size exceeds ${sizeMB}MB limit`,
    };
  }

  return { valid: true };
}

/**
 * Generate a local preview URL for a file
 */
export function generatePreviewUrl(file: File): string | null {
  const category = getFileCategory(file.type);
  if (category === 'image') {
    return URL.createObjectURL(file);
  }
  return null;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Upload progress callback
 */
export type UploadProgressCallback = (progress: number) => void;

/**
 * Upload a file to the server
 */
export async function uploadFile(
  file: File,
  conversationId?: string,
  onProgress?: UploadProgressCallback
): Promise<Attachment> {
  const client = getApiClient();

  // Validate first
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Create FormData
  const formData = new FormData();
  formData.append('file', file);
  if (conversationId) {
    formData.append('conversation_id', conversationId);
  }

  // Create attachment object
  const attachmentId = `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const attachment: Attachment = {
    id: attachmentId,
    filename: file.name,
    size: file.size,
    mimeType: file.type,
    status: 'uploading',
  };

  try {
    // Ensure authenticated
    await client.ensureAuthenticated();

    // Use XMLHttpRequest for progress tracking
    const response = await new Promise<Attachment>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          resolve({
            ...attachment,
            url: data.url,
            status: 'uploaded',
          });
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.detail || error.message || 'Upload failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      const baseUrl =
        import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      xhr.open('POST', `${baseUrl}/gateway/upload`);

      // Add auth headers
      const token = client.getAccessToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });

    return response;
  } catch (error) {
    return {
      ...attachment,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete an uploaded file
 */
export async function deleteFile(attachmentId: string): Promise<void> {
  const client = getApiClient();
  await client.delete(`/gateway/files/${attachmentId}`);
}

/**
 * Create a mock attachment for demo mode
 */
export function createMockAttachment(file: File): Attachment {
  return {
    id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    filename: file.name,
    size: file.size,
    mimeType: file.type,
    url: generatePreviewUrl(file) || undefined,
    status: 'ready',
  };
}
