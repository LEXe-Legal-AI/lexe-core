/**
 * App Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Mock all stores before importing App
const mockAuthStore = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  checkAuth: vi.fn(),
  setUser: vi.fn(),
  setToken: vi.fn(),
  setLoading: vi.fn(),
};

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}));

const mockInitTheme = vi.fn();

vi.mock('@/stores/uiStore', () => ({
  useUIStore: vi.fn((selector) => {
    const state = {
      sidebarOpen: true,
      theme: 'system',
      initTheme: mockInitTheme,
      toggleSidebar: vi.fn(),
      setTheme: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('@/stores/agentStore', () => ({
  useAgentStore: vi.fn(() => ({
    agents: [],
    events: [],
    updateAgentStatus: vi.fn(),
    updateAgentTask: vi.fn(),
    addEvent: vi.fn(),
  })),
}));

vi.mock('@/stores/realtimeStore', () => ({
  useRealtimeStore: vi.fn(() => ({
    notifications: [],
    addNotificationFromAlert: vi.fn(),
  })),
}));

// Mock WebSocket hooks
vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(() => ({
    isConnected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  useAgentStatusUpdates: vi.fn(),
  useAgentTaskUpdates: vi.fn(),
  useSystemAlerts: vi.fn(),
  useWebSocketChannel: vi.fn(),
}));

// Mock toast hook completely
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: vi.fn(() => ({
    toast: vi.fn(),
    toasts: [],
    dismiss: vi.fn(),
  })),
}));

// Mock queries
vi.mock('@/hooks/queries', () => ({
  useDashboardData: vi.fn(() => ({
    data: { agents: null, pipeline: null, memory: null },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    lastUpdated: null,
  })),
}));

// Import App after all mocks are set up
import App from './App';
import { useAuthStore } from '@/stores/authStore';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth state
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);
  });

  describe('routing', () => {
    it('redirects unauthenticated users to login', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('LEO')).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });
    });

    it('shows login page at /login route', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('LLM Enhanced Orchestrator')).toBeInTheDocument();
      });
    });
  });

  describe('protected routes', () => {
    it('requires authentication to access protected routes', async () => {
      // Default mock is unauthenticated, so should redirect to login
      render(<App />);

      await waitFor(() => {
        // Should show login page
        expect(screen.getByText('LEO')).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });
    });
  });

  describe('theme initialization', () => {
    it('calls initTheme on mount', () => {
      render(<App />);

      expect(mockInitTheme).toHaveBeenCalled();
    });
  });

  describe('query client configuration', () => {
    it('provides QueryClientProvider to children', () => {
      // This test verifies the app renders without query client errors
      render(<App />);

      expect(screen.getByText('LEO')).toBeInTheDocument();
    });
  });
});
