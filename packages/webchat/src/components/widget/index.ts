/**
 * Widget Components
 *
 * Embeddable widget for third-party websites.
 * Lightweight bundle (~50KB) with full chat functionality.
 *
 * @example
 * ```tsx
 * import { WidgetLauncher, WidgetWindow } from '@/components/widget';
 *
 * function Widget() {
 *   const [isOpen, setIsOpen] = useState(false);
 *
 *   return (
 *     <>
 *       <WidgetLauncher
 *         isOpen={isOpen}
 *         onClick={() => setIsOpen(!isOpen)}
 *         unreadCount={unreadMessages}
 *       />
 *       <WidgetWindow
 *         isOpen={isOpen}
 *         onClose={() => setIsOpen(false)}
 *         title="LEO Assistant"
 *         apiEndpoint="/api/v1/chat/stream"
 *       />
 *     </>
 *   );
 * }
 * ```
 */

export { WidgetLauncher, type WidgetLauncherProps } from './WidgetLauncher';
export { WidgetWindow, type WidgetWindowProps } from './WidgetWindow';
export { WidgetChat, type WidgetChatProps } from './WidgetChat';

// Default export for convenience
export { WidgetLauncher as default } from './WidgetLauncher';
