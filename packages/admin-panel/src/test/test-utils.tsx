/**
 * Test Utilities
 * Custom render function with providers
 */

import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a fresh query client for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperProps {
  children: ReactNode;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  useMemoryRouter?: boolean;
}

/**
 * Custom render with all providers
 */
function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): ReturnType<typeof render> {
  const { route = '/', useMemoryRouter = true, ...renderOptions } = options;

  const queryClient = createTestQueryClient();

  function AllProviders({ children }: WrapperProps) {
    const Router = useMemoryRouter ? MemoryRouter : BrowserRouter;
    const routerProps = useMemoryRouter ? { initialEntries: [route] } : {};

    return (
      <QueryClientProvider client={queryClient}>
        <Router {...routerProps}>{children}</Router>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: AllProviders, ...renderOptions });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';

// Override render with custom render
export { customRender as render };

// Export query client creator for advanced use cases
export { createTestQueryClient };

/**
 * Mock authenticated state for tests
 */
export function mockAuthenticatedUser() {
  const { useAuthStore } = require('@/stores/authStore');
  useAuthStore.setState({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
    },
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
  });
}

/**
 * Mock unauthenticated state for tests
 */
export function mockUnauthenticatedUser() {
  const { useAuthStore } = require('@/stores/authStore');
  useAuthStore.setState({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
  });
}

/**
 * Reset all stores to initial state
 */
export function resetStores() {
  // Reset auth store
  try {
    const { useAuthStore } = require('@/stores/authStore');
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  } catch {
    // Store might not exist
  }

  // Reset UI store
  try {
    const { useUIStore } = require('@/stores/uiStore');
    useUIStore.setState({
      sidebarOpen: true,
      theme: 'system',
    });
  } catch {
    // Store might not exist
  }
}
