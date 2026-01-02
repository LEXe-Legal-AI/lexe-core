/**
 * LEO Frontend - Realtime Store
 * Zustand store for WebSocket connection state and real-time updates
 *
 * Manages:
 * - WebSocket connection state
 * - Last received messages
 * - Notification queue for system alerts
 * - Connection error tracking
 */

import { create } from 'zustand';
import type { ConnectionState, SystemAlertPayload, WebSocketMessage } from '@/api/websocket';

// ============================================================================
// Types
// ============================================================================

/**
 * Notification derived from WebSocket system alerts
 */
export interface RealtimeNotification {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source?: string;
  timestamp: string;
  read: boolean;
  actionRequired?: boolean;
}

/**
 * Realtime store state
 */
interface RealtimeState {
  /** Current WebSocket connection state */
  connectionState: ConnectionState;
  /** Last received WebSocket message */
  lastMessage: WebSocketMessage | null;
  /** Timestamp of last message received */
  lastMessageAt: string | null;
  /** Queue of unread notifications */
  notifications: RealtimeNotification[];
  /** Count of unread notifications */
  unreadCount: number;
  /** Last connection error message */
  lastError: string | null;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
  /** Whether we're in maintenance mode */
  maintenanceMode: boolean;
}

/**
 * Realtime store actions
 */
interface RealtimeActions {
  // Connection state
  setConnectionState: (state: ConnectionState) => void;
  setLastError: (error: string | null) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;

  // Messages
  setLastMessage: (message: WebSocketMessage) => void;

  // Notifications
  addNotification: (notification: Omit<RealtimeNotification, 'id' | 'timestamp' | 'read'>) => void;
  addNotificationFromAlert: (alert: SystemAlertPayload) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Maintenance
  setMaintenanceMode: (enabled: boolean) => void;

  // Utility
  resetStore: () => void;
}

type RealtimeStore = RealtimeState & RealtimeActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: RealtimeState = {
  connectionState: 'disconnected',
  lastMessage: null,
  lastMessageAt: null,
  notifications: [],
  unreadCount: 0,
  lastError: null,
  reconnectAttempts: 0,
  maintenanceMode: false,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate unique ID for notifications
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculate unread count from notifications array
 */
function calculateUnreadCount(notifications: RealtimeNotification[]): number {
  return notifications.filter((n) => !n.read).length;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useRealtimeStore = create<RealtimeStore>()((set, _get) => ({
  ...initialState,

  // --------------------------------------------------------------------------
  // Connection State Actions
  // --------------------------------------------------------------------------

  setConnectionState: (connectionState) => {
    set({ connectionState });

    // Reset error on successful connection
    if (connectionState === 'connected') {
      set({ lastError: null, reconnectAttempts: 0 });
    }
  },

  setLastError: (lastError) => {
    set({ lastError });
  },

  incrementReconnectAttempts: () => {
    set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 }));
  },

  resetReconnectAttempts: () => {
    set({ reconnectAttempts: 0 });
  },

  // --------------------------------------------------------------------------
  // Message Actions
  // --------------------------------------------------------------------------

  setLastMessage: (message) => {
    set({
      lastMessage: message,
      lastMessageAt: new Date().toISOString(),
    });
  },

  // --------------------------------------------------------------------------
  // Notification Actions
  // --------------------------------------------------------------------------

  addNotification: (notification) => {
    const newNotification: RealtimeNotification = {
      ...notification,
      id: generateId(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    set((state) => {
      const notifications = [newNotification, ...state.notifications].slice(0, 100);
      return {
        notifications,
        unreadCount: calculateUnreadCount(notifications),
      };
    });
  },

  addNotificationFromAlert: (alert) => {
    const newNotification: RealtimeNotification = {
      id: alert.alertId || generateId(),
      level: alert.level,
      title: alert.title,
      message: alert.message,
      source: alert.source,
      actionRequired: alert.actionRequired,
      timestamp: new Date().toISOString(),
      read: false,
    };

    set((state) => {
      // Check for duplicate by alertId
      if (state.notifications.some((n) => n.id === newNotification.id)) {
        return state;
      }

      const notifications = [newNotification, ...state.notifications].slice(0, 100);
      return {
        notifications,
        unreadCount: calculateUnreadCount(notifications),
      };
    });
  },

  markNotificationRead: (id) => {
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications,
        unreadCount: calculateUnreadCount(notifications),
      };
    });
  },

  markAllNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  removeNotification: (id) => {
    set((state) => {
      const notifications = state.notifications.filter((n) => n.id !== id);
      return {
        notifications,
        unreadCount: calculateUnreadCount(notifications),
      };
    });
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  // --------------------------------------------------------------------------
  // Maintenance Actions
  // --------------------------------------------------------------------------

  setMaintenanceMode: (maintenanceMode) => {
    set({ maintenanceMode });
  },

  // --------------------------------------------------------------------------
  // Utility Actions
  // --------------------------------------------------------------------------

  resetStore: () => {
    set(initialState);
  },
}));

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Select connection state
 */
export const useConnectionState = () =>
  useRealtimeStore((state) => state.connectionState);

/**
 * Select whether connected
 */
export const useIsConnected = () =>
  useRealtimeStore((state) => state.connectionState === 'connected');

/**
 * Select whether reconnecting
 */
export const useIsReconnecting = () =>
  useRealtimeStore((state) => state.connectionState === 'reconnecting');

/**
 * Select last message
 */
export const useLastMessage = () =>
  useRealtimeStore((state) => state.lastMessage);

/**
 * Select notifications
 */
export const useNotifications = () =>
  useRealtimeStore((state) => state.notifications);

/**
 * Select unread notification count
 */
export const useUnreadCount = () =>
  useRealtimeStore((state) => state.unreadCount);

/**
 * Select last error
 */
export const useLastError = () =>
  useRealtimeStore((state) => state.lastError);

/**
 * Select maintenance mode
 */
export const useMaintenanceMode = () =>
  useRealtimeStore((state) => state.maintenanceMode);

/**
 * Select critical notifications (unread + action required)
 */
export const useCriticalNotifications = () =>
  useRealtimeStore((state) =>
    state.notifications.filter((n) => !n.read && n.actionRequired)
  );

export default useRealtimeStore;
