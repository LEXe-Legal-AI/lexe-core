import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// Context for Tabs state management
interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

// Tabs Root
export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The value of the currently active tab */
  value?: string;
  /** Default value for uncontrolled mode */
  defaultValue?: string;
  /** Callback when tab changes */
  onValueChange?: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, value: controlledValue, defaultValue, onValueChange, children, ...props }, ref) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || '');

    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    const handleValueChange = React.useCallback(
      (newValue: string) => {
        if (!isControlled) {
          setUncontrolledValue(newValue);
        }
        onValueChange?.(newValue);
      },
      [isControlled, onValueChange]
    );

    return (
      <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
        <div ref={ref} className={cn('w-full', className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);

Tabs.displayName = 'Tabs';

// TabsList variants
const tabsListVariants = cva(
  [
    'inline-flex items-center justify-center',
    'p-1',
    'rounded-lg',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-leo-gray/10',
          'dark:bg-leo-dark/50',
        ],
        outline: [
          'border-2 border-leo-gray/20',
          'bg-transparent',
        ],
        pills: [
          'bg-transparent',
          'gap-2',
          'p-0',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface TabsListProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tabsListVariants> {}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="tablist"
        className={cn(tabsListVariants({ variant, className }))}
        {...props}
      />
    );
  }
);

TabsList.displayName = 'TabsList';

// TabsTrigger variants
const tabsTriggerVariants = cva(
  [
    'inline-flex items-center justify-center',
    'whitespace-nowrap',
    'font-heading text-sm font-medium',
    'transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leo-primary/50',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        default: [
          'px-4 py-2',
          'rounded-md',
          'text-leo-gray',
          'hover:text-leo-dark dark:hover:text-leo-light',
          'data-[state=active]:bg-white dark:data-[state=active]:bg-leo-dark',
          'data-[state=active]:text-leo-primary',
          'data-[state=active]:shadow-sm',
        ],
        outline: [
          'px-4 py-2',
          'rounded-md',
          'text-leo-gray',
          'hover:text-leo-dark dark:hover:text-leo-light',
          'data-[state=active]:bg-leo-primary/10',
          'data-[state=active]:text-leo-primary',
        ],
        pills: [
          'px-4 py-2',
          'rounded-full',
          'text-leo-gray',
          'hover:bg-leo-gray/10',
          'data-[state=active]:bg-leo-primary',
          'data-[state=active]:text-white',
          'data-[state=active]:shadow-md data-[state=active]:shadow-leo-primary/25',
        ],
        underline: [
          'px-4 py-2',
          'border-b-2 border-transparent',
          'rounded-none',
          'text-leo-gray',
          'hover:text-leo-dark dark:hover:text-leo-light',
          'data-[state=active]:border-leo-primary',
          'data-[state=active]:text-leo-primary',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof tabsTriggerVariants> {
  /** Value that identifies this tab */
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, variant, value, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useTabsContext();
    const isSelected = selectedValue === value;

    return (
      <button
        ref={ref}
        role="tab"
        type="button"
        aria-selected={isSelected}
        data-state={isSelected ? 'active' : 'inactive'}
        onClick={() => onValueChange(value)}
        className={cn(tabsTriggerVariants({ variant, className }))}
        {...props}
      />
    );
  }
);

TabsTrigger.displayName = 'TabsTrigger';

// TabsContent
export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Value that identifies this content panel */
  value: string;
  /** Force mount (useful for animations) */
  forceMount?: boolean;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, forceMount = false, children, ...props }, ref) => {
    const { value: selectedValue } = useTabsContext();
    const isSelected = selectedValue === value;

    if (!isSelected && !forceMount) {
      return null;
    }

    return (
      <div
        ref={ref}
        role="tabpanel"
        hidden={!isSelected}
        data-state={isSelected ? 'active' : 'inactive'}
        className={cn(
          'mt-4',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leo-primary/50',
          'animate-fade-in',
          !isSelected && 'hidden',
          className
        )}
        tabIndex={0}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants, tabsTriggerVariants };
