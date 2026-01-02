/**
 * Tenants Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import Tenants from './Tenants';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

describe('Tenants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders page header', () => {
      render(<Tenants />);

      expect(screen.getByText('Tenants')).toBeInTheDocument();
      expect(screen.getByText(/gestisci i tenant/i)).toBeInTheDocument();
    });

    it('renders add tenant button', () => {
      render(<Tenants />);

      expect(screen.getByRole('button', { name: /nuovo tenant/i })).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<Tenants />);

      expect(screen.getByPlaceholderText(/cerca per nome/i)).toBeInTheDocument();
    });

    it('renders stats cards', async () => {
      render(<Tenants />);

      await waitFor(() => {
        expect(screen.getByText('Totale Tenant')).toBeInTheDocument();
        expect(screen.getByText('Attivi')).toBeInTheDocument();
      });
    });

    it('renders tenants table', async () => {
      render(<Tenants />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });

    it('renders mock tenant data', async () => {
      render(<Tenants />);

      await waitFor(() => {
        expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
      });
    });
  });

  describe('table content', () => {
    it('renders action buttons', async () => {
      render(<Tenants />);

      await waitFor(() => {
        expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(1);
    });
  });

  describe('status badges', () => {
    it('renders status badges', async () => {
      render(<Tenants />);

      await waitFor(() => {
        const badges = screen.queryAllByText(/attivo|sospeso|trial|scaduto/i);
        expect(badges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('responsive design', () => {
    it('has table container', () => {
      const { container } = render(<Tenants />);

      expect(container.querySelector('table')).toBeInTheDocument();
    });
  });
});
