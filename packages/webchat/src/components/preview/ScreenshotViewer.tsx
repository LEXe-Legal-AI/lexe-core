import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Screenshot/Image data structure
 */
export interface Screenshot {
  id: string;
  url: string;
  alt?: string;
  timestamp?: Date;
  metadata?: {
    width?: number;
    height?: number;
    source?: string;
    type?: 'screenshot' | 'image' | 'preview';
  };
}

export interface ScreenshotViewerProps {
  /** List of screenshots to display */
  screenshots: Screenshot[];
  /** Currently selected screenshot index */
  initialIndex?: number;
  /** Callback when screenshot changes */
  onScreenshotChange?: (index: number) => void;
  /** Callback when fullscreen is toggled */
  onFullscreen?: (screenshot: Screenshot) => void;
  /** Enable download functionality */
  enableDownload?: boolean;
  /** Additional class names */
  className?: string;
}

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const DEFAULT_ZOOM_INDEX = 3; // 100%

/**
 * ScreenshotViewer - Displays screenshots/images with zoom controls
 *
 * Features:
 * - Zoom in/out with multiple levels
 * - Image rotation
 * - Download capability
 * - Gallery navigation
 * - Fullscreen mode
 * - Drag to pan when zoomed
 *
 * @example
 * ```tsx
 * <ScreenshotViewer
 *   screenshots={[
 *     { id: '1', url: '/screenshot-1.png', alt: 'Homepage' },
 *     { id: '2', url: '/screenshot-2.png', alt: 'Dashboard' },
 *   ]}
 *   enableDownload
 * />
 * ```
 */
export function ScreenshotViewer({
  screenshots,
  initialIndex = 0,
  onScreenshotChange,
  onFullscreen,
  enableDownload = true,
  className,
}: ScreenshotViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const currentScreenshot = screenshots[currentIndex];
  const zoom = ZOOM_LEVELS[zoomIndex];

  const handleZoomIn = useCallback(() => {
    setZoomIndex((prev) => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomIndex((prev) => Math.max(prev - 1, 0));
    // Reset position when zooming out
    if (zoomIndex <= DEFAULT_ZOOM_INDEX) {
      setPosition({ x: 0, y: 0 });
    }
  }, [zoomIndex]);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleReset = useCallback(() => {
    setZoomIndex(DEFAULT_ZOOM_INDEX);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handlePrev = useCallback(() => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : screenshots.length - 1;
    setCurrentIndex(newIndex);
    handleReset();
    onScreenshotChange?.(newIndex);
  }, [currentIndex, screenshots.length, handleReset, onScreenshotChange]);

  const handleNext = useCallback(() => {
    const newIndex = currentIndex < screenshots.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    handleReset();
    onScreenshotChange?.(newIndex);
  }, [currentIndex, screenshots.length, handleReset, onScreenshotChange]);

  const handleDownload = useCallback(async () => {
    if (!currentScreenshot) return;

    try {
      const response = await fetch(currentScreenshot.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentScreenshot.alt || `screenshot-${currentScreenshot.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [currentScreenshot]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [zoom, position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || zoom <= 1) return;
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    },
    [isDragging, zoom]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (!screenshots.length) {
    return (
      <div className={cn('flex items-center justify-center h-full p-8', className)}>
        <p className="text-sm text-white/40 font-body">No screenshots available</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-1">
          <ToolbarButton
            icon={<ZoomOut className="w-4 h-4" />}
            onClick={handleZoomOut}
            disabled={zoomIndex === 0}
            title="Zoom out"
          />
          <span className="px-2 text-xs text-white/60 font-mono min-w-[48px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <ToolbarButton
            icon={<ZoomIn className="w-4 h-4" />}
            onClick={handleZoomIn}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            title="Zoom in"
          />
          <div className="w-px h-4 bg-white/10 mx-1" />
          <ToolbarButton
            icon={<RotateCw className="w-4 h-4" />}
            onClick={handleRotate}
            title="Rotate"
          />
          {zoom !== 1 || rotation !== 0 ? (
            <ToolbarButton
              icon={<X className="w-4 h-4" />}
              onClick={handleReset}
              title="Reset"
            />
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {enableDownload && (
            <ToolbarButton
              icon={<Download className="w-4 h-4" />}
              onClick={handleDownload}
              title="Download"
            />
          )}
          {onFullscreen && (
            <ToolbarButton
              icon={<Maximize2 className="w-4 h-4" />}
              onClick={() => onFullscreen(currentScreenshot)}
              title="Fullscreen"
            />
          )}
        </div>
      </div>

      {/* Image Container */}
      <div
        ref={containerRef}
        className={cn(
          'flex-1 relative overflow-hidden bg-black/20',
          zoom > 1 && 'cursor-grab',
          isDragging && 'cursor-grabbing'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreenshot.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <motion.img
              src={currentScreenshot.url}
              alt={currentScreenshot.alt || 'Screenshot'}
              className="max-w-full max-h-full object-contain select-none"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                transition: isDragging ? 'none' : 'transform 0.2s ease',
              }}
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {screenshots.length > 1 && (
          <>
            <NavigationButton direction="left" onClick={handlePrev} />
            <NavigationButton direction="right" onClick={handleNext} />
          </>
        )}
      </div>

      {/* Gallery Thumbnails */}
      {screenshots.length > 1 && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-white/5 overflow-x-auto">
          {screenshots.map((screenshot, index) => (
            <button
              key={screenshot.id}
              onClick={() => {
                setCurrentIndex(index);
                handleReset();
                onScreenshotChange?.(index);
              }}
              className={cn(
                'flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden',
                'border-2 transition-all duration-200',
                index === currentIndex
                  ? 'border-leo-secondary ring-2 ring-leo-secondary/30'
                  : 'border-transparent hover:border-white/20'
              )}
            >
              <img
                src={screenshot.url}
                alt={screenshot.alt || `Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Image Info */}
      {currentScreenshot.timestamp && (
        <div className="px-3 py-1.5 border-t border-white/5">
          <p className="text-[10px] text-white/40 font-mono">
            {currentScreenshot.timestamp.toLocaleString()} |{' '}
            {currentScreenshot.metadata?.source || 'Unknown source'}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Toolbar button component
 */
interface ToolbarButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
}

function ToolbarButton({ icon, onClick, disabled, title }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded-lg transition-colors',
        disabled
          ? 'text-white/20 cursor-not-allowed'
          : 'text-white/60 hover:text-white hover:bg-white/10'
      )}
    >
      {icon}
    </button>
  );
}

/**
 * Navigation button for gallery
 */
interface NavigationButtonProps {
  direction: 'left' | 'right';
  onClick: () => void;
}

function NavigationButton({ direction, onClick }: NavigationButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 p-2 rounded-full',
        'bg-black/40 backdrop-blur-sm border border-white/10',
        'text-white/70 hover:text-white hover:bg-black/60',
        'transition-all duration-200',
        'opacity-0 group-hover:opacity-100',
        direction === 'left' ? 'left-2' : 'right-2'
      )}
    >
      {direction === 'left' ? (
        <ChevronLeft className="w-5 h-5" />
      ) : (
        <ChevronRight className="w-5 h-5" />
      )}
    </button>
  );
}

export default ScreenshotViewer;
