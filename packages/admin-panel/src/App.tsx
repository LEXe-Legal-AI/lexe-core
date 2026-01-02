import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useEffect, useCallback } from 'react';
import { useAuthStore } from './stores/authStore';
import { useUIStore } from './stores/uiStore';
import { useAgentStore } from './stores/agentStore';
import { useRealtimeStore } from './stores/realtimeStore';
import { MainLayout } from './components/layout/MainLayout';
import { Toaster } from './components/ui/toaster';
import { toast } from './hooks/use-toast';

// WebSocket hooks
import {
  useWebSocket,
  useAgentStatusUpdates,
  useAgentTaskUpdates,
  useSystemAlerts,
  useWebSocketChannel,
} from './hooks/useWebSocket';
import type {
  AgentStatusPayload,
  AgentTaskPayload,
  SystemAlertPayload,
} from './api/websocket';

// Pages
import Dashboard from './pages/Dashboard';
import Conversations from './pages/Conversations';
import Contacts from './pages/Contacts';
import Settings from './pages/Settings';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Agents from './pages/Agents';
import Pipeline from './pages/Pipeline';
import Memory from './pages/Memory';
import Users from './pages/Users';
import ReviewQueue from './pages/ReviewQueue';
import Tenants from './pages/Tenants';
import Channels from './pages/Channels';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ============================================================================
// WebSocket Message Handler Component
// ============================================================================

/**
 * Component that handles WebSocket messages and dispatches to stores
 * This is rendered inside the authenticated context
 */
function WebSocketMessageHandler() {
  const { updateAgentStatus, updateAgentTask, addEvent } = useAgentStore();
  const { addNotificationFromAlert } = useRealtimeStore();

  // Subscribe to channels
  useWebSocketChannel('agents');
  useWebSocketChannel('pipeline');
  useWebSocketChannel('system');

  // Handle agent status updates
  const handleAgentStatus = useCallback(
    (payload: AgentStatusPayload) => {
      updateAgentStatus(payload.agentId, payload.status);

      // Add event for activity log
      addEvent({
        id: `status-${Date.now()}`,
        agentId: payload.agentId,
        agentName: payload.agentId, // Will be resolved by component
        type: 'status_change',
        message: `Status changed to ${payload.status}`,
        details: { previousStatus: payload.previousStatus, reason: payload.reason },
        timestamp: new Date().toISOString(),
      });
    },
    [updateAgentStatus, addEvent]
  );

  // Handle agent task updates
  const handleAgentTask = useCallback(
    (payload: AgentTaskPayload) => {
      if (payload.status === 'running') {
        updateAgentTask(payload.agentId, {
          id: payload.taskId,
          name: payload.name,
          progress: payload.progress || 0,
        });
      } else if (payload.status === 'completed' || payload.status === 'failed') {
        updateAgentTask(payload.agentId, undefined);
      }

      // Add event for activity log
      const eventType =
        payload.status === 'completed'
          ? 'task_completed'
          : payload.status === 'failed'
            ? 'task_failed'
            : 'task_started';

      addEvent({
        id: `task-${payload.taskId}-${Date.now()}`,
        agentId: payload.agentId,
        agentName: payload.agentId,
        type: eventType,
        message: `Task "${payload.name}" ${payload.status}`,
        details: {
          taskId: payload.taskId,
          progress: payload.progress,
          error: payload.error,
        },
        timestamp: new Date().toISOString(),
      });
    },
    [updateAgentTask, addEvent]
  );

  // Handle system alerts
  const handleSystemAlert = useCallback(
    (payload: SystemAlertPayload) => {
      // Add to notification queue
      addNotificationFromAlert(payload);

      // Show toast for important alerts
      if (payload.level === 'error' || payload.level === 'critical') {
        toast({
          title: payload.title,
          description: payload.message,
          variant: 'destructive',
        });
      } else if (payload.level === 'warning') {
        toast({
          title: payload.title,
          description: payload.message,
        });
      }
    },
    [addNotificationFromAlert]
  );

  // Subscribe to message types
  useAgentStatusUpdates(handleAgentStatus);
  useAgentTaskUpdates(handleAgentTask);
  useSystemAlerts(handleSystemAlert);

  return null;
}

// ============================================================================
// Protected Route Component
// ============================================================================

interface ProtectedRouteProps {
  children: ReactNode;
  title?: string;
}

function ProtectedRoute({ children, title }: ProtectedRouteProps) {
  const { isAuthenticated, logout } = useAuthStore();

  // Initialize WebSocket connection for authenticated users
  useWebSocket({
    autoConnect: true,
    enabled: isAuthenticated,
  });

  // Listen for auth:logout events (from API client on 401)
  useEffect(() => {
    const handleLogout = () => logout();
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [logout]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MainLayout title={title}>
      {/* WebSocket message handler */}
      <WebSocketMessageHandler />
      {children}
    </MainLayout>
  );
}

// ============================================================================
// Theme Initializer Component
// ============================================================================

function ThemeInitializer() {
  const initTheme = useUIStore((state) => state.initTheme);

  useEffect(() => {
    // Initialize theme on app mount
    initTheme();
  }, [initTheme]);

  return null;
}

// ============================================================================
// App Component
// ============================================================================

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected routes with MainLayout */}
          <Route
            path="/"
            element={
              <ProtectedRoute title="Dashboard">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/conversations"
            element={
              <ProtectedRoute title="Conversazioni">
                <Conversations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts"
            element={
              <ProtectedRoute title="Contatti">
                <Contacts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute title="Impostazioni">
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents"
            element={
              <ProtectedRoute title="Gestione Agenti">
                <Agents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pipeline"
            element={
              <ProtectedRoute title="Pipeline ORCHIDEA">
                <Pipeline />
              </ProtectedRoute>
            }
          />
          <Route
            path="/memory"
            element={
              <ProtectedRoute title="Sistema Memoria">
                <Memory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute title="Gestione Utenti">
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/review"
            element={
              <ProtectedRoute title="Coda Revisione">
                <ReviewQueue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenants"
            element={
              <ProtectedRoute title="Gestione Tenant">
                <Tenants />
              </ProtectedRoute>
            }
          />
          <Route
            path="/channels"
            element={
              <ProtectedRoute title="Configurazione Canali">
                <Channels />
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
