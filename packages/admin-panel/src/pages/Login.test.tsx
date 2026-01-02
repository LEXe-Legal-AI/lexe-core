/**
 * Login Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { Login } from './Login';

// Mock the auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    login: vi.fn(),
    isLoading: false,
  })),
}));

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders login form', () => {
      render(<Login />);

      expect(screen.getByText('LEO')).toBeInTheDocument();
      expect(screen.getByText('LLM Enhanced Orchestrator')).toBeInTheDocument();
    });

    it('renders email input', () => {
      render(<Login />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/nome@azienda.it/i)).toBeInTheDocument();
    });

    it('renders password input', () => {
      render(<Login />);

      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/inserisci la password/i)).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<Login />);

      expect(screen.getByRole('button', { name: /accedi/i })).toBeInTheDocument();
    });

    it('renders remember me checkbox', () => {
      render(<Login />);

      expect(screen.getByLabelText(/ricordami/i)).toBeInTheDocument();
    });

    it('renders forgot password link', () => {
      render(<Login />);

      expect(screen.getByRole('button', { name: /password dimenticata/i })).toBeInTheDocument();
    });

    it('renders terms and privacy links', () => {
      render(<Login />);

      expect(screen.getByRole('button', { name: /termini di servizio/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /privacy policy/i })).toBeInTheDocument();
    });

    it('renders version info', () => {
      render(<Login />);

      expect(screen.getByText(/LEO Platform v1.0.0/)).toBeInTheDocument();
    });
  });

  describe('password visibility toggle', () => {
    it('password is hidden by default', () => {
      render(<Login />);

      const passwordInput = screen.getByPlaceholderText(/inserisci la password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('toggles password visibility on click', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const toggleButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg')
      );
      const passwordInput = screen.getByPlaceholderText(/inserisci la password/i);

      // Initial state - password hidden
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Click to show password
      if (toggleButton) {
        await user.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'text');

        // Click again to hide
        await user.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'password');
      }
    });
  });

  describe('form interaction', () => {
    it('allows typing in email field', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('allows typing in password field', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const passwordInput = screen.getByPlaceholderText(/inserisci la password/i);
      await user.type(passwordInput, 'mypassword123');

      expect(passwordInput).toHaveValue('mypassword123');
    });

    it('allows toggling remember me checkbox', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const checkbox = screen.getByLabelText(/ricordami/i);
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  describe('form validation', () => {
    it('shows error when submitting with empty fields', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const submitButton = screen.getByRole('button', { name: /accedi/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/inserisci email e password/i)).toBeInTheDocument();
      });
    });

    it('shows error when submitting with only email', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /accedi/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/inserisci email e password/i)).toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('calls login function with correct credentials', async () => {
      const mockLogin = vi.fn().mockResolvedValue(undefined);

      const { useAuthStore } = await import('@/stores/authStore');
      vi.mocked(useAuthStore).mockReturnValue({
        login: mockLogin,
        isLoading: false,
        user: null,
        token: null,
        isAuthenticated: false,
        logout: vi.fn(),
        checkAuth: vi.fn(),
        setUser: vi.fn(),
        setToken: vi.fn(),
        setLoading: vi.fn(),
      });

      const user = userEvent.setup();
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByPlaceholderText(/inserisci la password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /accedi/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('shows error message on login failure', async () => {
      const mockLogin = vi.fn().mockRejectedValue(new Error('Invalid credentials'));

      const { useAuthStore } = await import('@/stores/authStore');
      vi.mocked(useAuthStore).mockReturnValue({
        login: mockLogin,
        isLoading: false,
        user: null,
        token: null,
        isAuthenticated: false,
        logout: vi.fn(),
        checkAuth: vi.fn(),
        setUser: vi.fn(),
        setToken: vi.fn(),
        setLoading: vi.fn(),
      });

      const user = userEvent.setup();
      render(<Login />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByPlaceholderText(/inserisci la password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /accedi/i }));

      await waitFor(() => {
        expect(screen.getByText(/credenziali non valide/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('disables inputs when loading', async () => {
      // Re-mock with loading state
      const { useAuthStore } = await vi.importActual<typeof import('@/stores/authStore')>('@/stores/authStore');

      // Override the mock for this test
      vi.mocked(await import('@/stores/authStore')).useAuthStore.mockReturnValue({
        login: vi.fn(),
        isLoading: true,
        user: null,
        token: null,
        isAuthenticated: false,
        logout: vi.fn(),
        checkAuth: vi.fn(),
        setUser: vi.fn(),
        setToken: vi.fn(),
        setLoading: vi.fn(),
      });

      render(<Login />);

      expect(screen.getByLabelText(/email/i)).toBeDisabled();
      expect(screen.getByPlaceholderText(/inserisci la password/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /accesso in corso/i })).toBeDisabled();
    });

    it('shows loading spinner when loading', async () => {
      vi.mocked(await import('@/stores/authStore')).useAuthStore.mockReturnValue({
        login: vi.fn(),
        isLoading: true,
        user: null,
        token: null,
        isAuthenticated: false,
        logout: vi.fn(),
        checkAuth: vi.fn(),
        setUser: vi.fn(),
        setToken: vi.fn(),
        setLoading: vi.fn(),
      });

      render(<Login />);

      expect(screen.getByText(/accesso in corso/i)).toBeInTheDocument();
    });
  });
});
