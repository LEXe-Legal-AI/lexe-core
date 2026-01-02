/**
 * LEO UI Components
 *
 * Shadcn-style components with LEO brand styling.
 * Built with class-variance-authority for variant management.
 *
 * Brand Colors:
 * - Primary: #1E3A5F (Deep Navy)
 * - Secondary: #F7931E (Vibrant Orange)
 * - Accent: #00A896 (Teal Green)
 * - Dark: #0D1B2A (Almost Black)
 * - Light: #F8F9FA (Off White)
 */

// Button
export { Button, buttonVariants } from './Button';
export type { ButtonProps } from './Button';

// Input
export { Input, inputVariants } from './Input';
export type { InputProps } from './Input';

// Badge
export { Badge, badgeVariants } from './Badge';
export type { BadgeProps } from './Badge';

// Card
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
} from './Card';
export type { CardProps } from './Card';

// Tabs
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  tabsListVariants,
  tabsTriggerVariants,
} from './Tabs';
export type {
  TabsProps,
  TabsListProps,
  TabsTriggerProps,
  TabsContentProps,
} from './Tabs';

// ScrollArea
export { ScrollArea, ScrollBar, scrollAreaStyles } from './ScrollArea';
export type { ScrollAreaProps, ScrollBarProps } from './ScrollArea';

// Avatar
export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  avatarVariants,
  getInitials,
} from './Avatar';
export type {
  AvatarProps,
  AvatarImageProps,
  AvatarFallbackProps,
} from './Avatar';

// Tooltip
export {
  Tooltip,
  TooltipProvider,
  tooltipVariants,
  useTooltipContext,
} from './Tooltip';
export type { TooltipProps } from './Tooltip';
