import { create } from 'zustand';
import type { Attachment } from '@/types';
import {
  uploadFile,
  createMockAttachment,
  generatePreviewUrl,
  type UploadProgressCallback,
} from '@/services/api/upload';

/**
 * Pending attachment with preview and progress
 */
export interface PendingAttachment extends Attachment {
  file: File;
  previewUrl?: string;
  progress: number;
}

/**
 * Attachment store state
 */
interface AttachmentState {
  // Pending attachments (not yet sent with message)
  pendingAttachments: PendingAttachment[];

  // Upload queue status
  isUploading: boolean;

  // Demo mode (skip real upload)
  demoMode: boolean;

  // Actions
  addFile: (file: File) => Promise<void>;
  removeFile: (id: string) => void;
  clearPending: () => void;
  updateProgress: (id: string, progress: number) => void;
  updateStatus: (id: string, status: Attachment['status'], error?: string) => void;
  getPendingAttachments: () => PendingAttachment[];
  getAttachmentsForMessage: () => Attachment[];
  setDemoMode: (demo: boolean) => void;
}

/**
 * Attachment store
 */
export const useAttachmentStore = create<AttachmentState>((set, get) => ({
  pendingAttachments: [],
  isUploading: false,
  demoMode: true,

  addFile: async (file: File) => {
    const { demoMode } = get();

    // Create pending attachment
    const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const previewUrl = generatePreviewUrl(file);

    const pending: PendingAttachment = {
      id: pendingId,
      file,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      status: 'uploading',
      progress: 0,
      previewUrl: previewUrl || undefined,
    };

    // Add to pending
    set((state) => ({
      pendingAttachments: [...state.pendingAttachments, pending],
      isUploading: true,
    }));

    if (demoMode) {
      // Demo mode: simulate upload
      await simulateUpload(pendingId, set);
      const mockAttachment = createMockAttachment(file);
      set((state) => ({
        pendingAttachments: state.pendingAttachments.map((p) =>
          p.id === pendingId
            ? {
                ...p,
                ...mockAttachment,
                id: pendingId,
                status: 'ready' as const,
                progress: 100,
              }
            : p
        ),
        isUploading: false,
      }));
    } else {
      // Real upload
      try {
        const onProgress: UploadProgressCallback = (progress) => {
          set((state) => ({
            pendingAttachments: state.pendingAttachments.map((p) =>
              p.id === pendingId ? { ...p, progress } : p
            ),
          }));
        };

        const uploaded = await uploadFile(file, undefined, onProgress);

        set((state) => ({
          pendingAttachments: state.pendingAttachments.map((p) =>
            p.id === pendingId
              ? {
                  ...p,
                  ...uploaded,
                  id: pendingId,
                  status: uploaded.status,
                  progress: 100,
                }
              : p
          ),
          isUploading: false,
        }));
      } catch (error) {
        set((state) => ({
          pendingAttachments: state.pendingAttachments.map((p) =>
            p.id === pendingId
              ? {
                  ...p,
                  status: 'failed' as const,
                  error: error instanceof Error ? error.message : 'Upload failed',
                }
              : p
          ),
          isUploading: false,
        }));
      }
    }
  },

  removeFile: (id: string) => {
    set((state) => {
      const pending = state.pendingAttachments.find((p) => p.id === id);
      if (pending?.previewUrl) {
        URL.revokeObjectURL(pending.previewUrl);
      }
      return {
        pendingAttachments: state.pendingAttachments.filter((p) => p.id !== id),
      };
    });
  },

  clearPending: () => {
    const { pendingAttachments } = get();
    // Clean up preview URLs
    pendingAttachments.forEach((p) => {
      if (p.previewUrl) {
        URL.revokeObjectURL(p.previewUrl);
      }
    });
    set({ pendingAttachments: [], isUploading: false });
  },

  updateProgress: (id: string, progress: number) => {
    set((state) => ({
      pendingAttachments: state.pendingAttachments.map((p) =>
        p.id === id ? { ...p, progress } : p
      ),
    }));
  },

  updateStatus: (id: string, status: Attachment['status'], error?: string) => {
    set((state) => ({
      pendingAttachments: state.pendingAttachments.map((p) =>
        p.id === id ? { ...p, status, error } : p
      ),
    }));
  },

  getPendingAttachments: () => {
    return get().pendingAttachments;
  },

  getAttachmentsForMessage: () => {
    return get().pendingAttachments.map(({ file: _file, previewUrl: _previewUrl, progress: _progress, ...rest }) => rest);
  },

  setDemoMode: (demo: boolean) => {
    set({ demoMode: demo });
  },
}));

/**
 * Simulate upload progress for demo mode
 */
async function simulateUpload(
  id: string,
  set: (fn: (state: AttachmentState) => Partial<AttachmentState>) => void
): Promise<void> {
  const steps = [10, 30, 50, 70, 90, 100];
  for (const progress of steps) {
    await new Promise((r) => setTimeout(r, 100 + Math.random() * 100));
    set((state) => ({
      pendingAttachments: state.pendingAttachments.map((p) =>
        p.id === id ? { ...p, progress } : p
      ),
    }));
  }
}

export default useAttachmentStore;
