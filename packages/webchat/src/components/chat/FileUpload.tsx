import { useCallback, useRef, memo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  X,
  FileText,
  Image as ImageIcon,
  Code,
  AlertCircle,
  Loader2,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAttachmentStore, type PendingAttachment } from '@/stores/attachmentStore';
import {
  validateFile,
  formatFileSize,
  getFileCategory,
  ALL_SUPPORTED_TYPES,
} from '@/services/api/upload';

/**
 * File upload trigger button (hidden input + click handler)
 */
interface FileUploadTriggerProps {
  onFilesSelected: (files: FileList) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export const FileUploadTrigger = memo(function FileUploadTrigger({
  onFilesSelected,
  disabled,
  children,
}: FileUploadTriggerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      // Reset input for re-selection
      e.target.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALL_SUPPORTED_TYPES.join(',')}
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
      <div onClick={handleClick}>{children}</div>
    </>
  );
});

/**
 * Attachment preview card
 */
interface AttachmentPreviewProps {
  attachment: PendingAttachment;
  onRemove: (id: string) => void;
}

const AttachmentPreview = memo(forwardRef<HTMLDivElement, AttachmentPreviewProps>(function AttachmentPreview({
  attachment,
  onRemove,
}, ref) {
  const { t } = useTranslation();
  const category = getFileCategory(attachment.mimeType);

  const getIcon = () => {
    switch (category) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      case 'code':
        return <Code className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const isUploading = attachment.status === 'uploading';
  const isFailed = attachment.status === 'failed';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      className={cn(
        'relative group flex items-center gap-2',
        'bg-white/5 backdrop-blur-sm rounded-xl',
        'border border-white/10',
        'p-2 pr-8',
        isFailed && 'border-red-500/50 bg-red-500/10'
      )}
    >
      {/* Thumbnail or icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
        {category === 'image' && attachment.previewUrl ? (
          <img
            src={attachment.previewUrl}
            alt={attachment.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-white/60">{getIcon()}</div>
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{attachment.filename}</p>
        <div className="flex items-center gap-2 text-xs text-white/50">
          {isUploading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{attachment.progress}%</span>
            </>
          ) : isFailed ? (
            <>
              <AlertCircle className="w-3 h-3 text-red-400" />
              <span className="text-red-400">{attachment.error || t('upload.failed')}</span>
            </>
          ) : (
            <span>{formatFileSize(attachment.size)}</span>
          )}
        </div>

        {/* Progress bar */}
        {isUploading && (
          <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${attachment.progress}%` }}
              className="h-full bg-leo-accent"
            />
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(attachment.id)}
        className={cn(
          'absolute top-1 right-1 p-1 rounded-lg',
          'bg-white/10 hover:bg-white/20',
          'opacity-0 group-hover:opacity-100',
          'transition-all duration-200'
        )}
        title={t('common.remove')}
      >
        <X className="w-3.5 h-3.5 text-white/70" />
      </button>
    </motion.div>
  );
}));

/**
 * Pending attachments bar (shows above input)
 */
export const PendingAttachmentsBar = memo(function PendingAttachmentsBar() {
  const { pendingAttachments, removeFile } = useAttachmentStore();

  if (pendingAttachments.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="px-4 pb-2"
    >
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {pendingAttachments.map((attachment) => (
            <AttachmentPreview
              key={attachment.id}
              attachment={attachment}
              onRemove={removeFile}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

/**
 * Drag and drop overlay
 */
interface DropZoneOverlayProps {
  isOver: boolean;
}

export const DropZoneOverlay = memo(function DropZoneOverlay({
  isOver,
}: DropZoneOverlayProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOver && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-leo-dark/90 backdrop-blur-sm border-2 border-dashed border-leo-accent rounded-2xl"
        >
          <div className="text-center">
            <Upload className="w-12 h-12 mx-auto mb-3 text-leo-accent" />
            <p className="text-lg font-medium text-white">
              {t('upload.drop_here', 'Drop files here')}
            </p>
            <p className="text-sm text-white/60">
              {t('upload.supported_formats', 'Images, documents, and code files')}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

/**
 * Hook for file drop handling
 */
export function useFileDrop() {
  const { addFile } = useAttachmentStore();

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        const validation = validateFile(file);
        if (validation.valid) {
          await addFile(file);
        } else {
          console.warn(`File rejected: ${file.name} - ${validation.error}`);
        }
      }
    },
    [addFile]
  );

  return { handleFiles };
}

export default FileUploadTrigger;
