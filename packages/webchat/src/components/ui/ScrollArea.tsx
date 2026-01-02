import * as React from 'react';
import { cn } from '../../lib/utils';

// Custom ScrollArea without Radix dependency

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Orientation of the scrollbar */
  orientation?: 'vertical' | 'horizontal' | 'both';
  /** Whether to show scrollbar always or only on hover */
  scrollbarVisibility?: 'always' | 'hover' | 'auto';
  /** Custom scrollbar size */
  scrollbarSize?: 'thin' | 'default' | 'thick';
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    {
      className,
      children,
      orientation = 'vertical',
      scrollbarVisibility = 'auto',
      scrollbarSize = 'default',
      ...props
    },
    ref
  ) => {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [showScrollbar, setShowScrollbar] = React.useState(
      scrollbarVisibility === 'always'
    );

    // Combine refs
    React.useImperativeHandle(ref, () => scrollContainerRef.current!);

    // Handle hover visibility
    const handleMouseEnter = () => {
      if (scrollbarVisibility === 'hover') {
        setShowScrollbar(true);
      }
    };

    const handleMouseLeave = () => {
      if (scrollbarVisibility === 'hover') {
        setShowScrollbar(false);
      }
    };

    // Scrollbar size classes
    const scrollbarSizeClass = {
      thin: 'scrollbar-thin',
      default: 'scrollbar-default',
      thick: 'scrollbar-thick',
    }[scrollbarSize];

    // Overflow classes based on orientation
    const overflowClass = {
      vertical: 'overflow-y-auto overflow-x-hidden',
      horizontal: 'overflow-x-auto overflow-y-hidden',
      both: 'overflow-auto',
    }[orientation];

    return (
      <div
        ref={scrollContainerRef}
        className={cn(
          'relative',
          overflowClass,
          // Custom scrollbar styles
          'scrollbar',
          scrollbarSizeClass,
          showScrollbar || scrollbarVisibility !== 'hover'
            ? 'scrollbar-visible'
            : 'scrollbar-hidden',
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

// ScrollBar component for more control (optional enhancement)
export interface ScrollBarProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal';
}

const ScrollBar = React.forwardRef<HTMLDivElement, ScrollBarProps>(
  ({ className, orientation = 'vertical', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex touch-none select-none transition-colors',
          orientation === 'vertical' &&
            'h-full w-2.5 border-l border-l-transparent p-[1px]',
          orientation === 'horizontal' &&
            'h-2.5 flex-col border-t border-t-transparent p-[1px]',
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'relative flex-1 rounded-full',
            'bg-leo-gray/30 hover:bg-leo-gray/50',
            'transition-colors duration-150'
          )}
        />
      </div>
    );
  }
);

ScrollBar.displayName = 'ScrollBar';

// CSS-in-JS styles for custom scrollbar (to be added to global CSS)
export const scrollAreaStyles = `
  /* Custom scrollbar base */
  .scrollbar {
    scrollbar-color: rgba(108, 117, 125, 0.3) transparent;
    scrollbar-width: auto;
  }

  /* Webkit scrollbar */
  .scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .scrollbar::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 9999px;
  }

  .scrollbar::-webkit-scrollbar-thumb {
    background: rgba(108, 117, 125, 0.3);
    border-radius: 9999px;
    border: 2px solid transparent;
    background-clip: content-box;
    transition: background 0.2s ease;
  }

  .scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(108, 117, 125, 0.5);
    background-clip: content-box;
  }

  .scrollbar::-webkit-scrollbar-corner {
    background: transparent;
  }

  /* Size variants */
  .scrollbar-thin::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }

  .scrollbar-thick::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }

  /* Visibility */
  .scrollbar-hidden::-webkit-scrollbar {
    opacity: 0;
  }

  .scrollbar-visible::-webkit-scrollbar {
    opacity: 1;
  }

  /* Firefox */
  .scrollbar-thin {
    scrollbar-width: thin;
  }

  .scrollbar-thick {
    scrollbar-width: auto;
  }
`;

export { ScrollArea, ScrollBar };
