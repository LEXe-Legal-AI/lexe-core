/**
 * Channels Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import Channels from './Channels';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('Channels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders page header', () => {
      render(<Channels />);

      expect(screen.getByText('Canali')).toBeInTheDocument();
      expect(screen.getByText(/configura i canali di comunicazione/i)).toBeInTheDocument();
    });

    it('renders channel type cards', async () => {
      render(<Channels />);

      await waitFor(() => {
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByText('SMS')).toBeInTheDocument();
      });
    });

    it('renders channel tabs', async () => {
      render(<Channels />);

      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument();
      });
    });

    it('renders channel cards after loading', async () => {
      render(<Channels />);

      await waitFor(() => {
        expect(screen.getByText('WhatsApp Business')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('channel cards', () => {
    it('renders configure buttons', async () => {
      render(<Channels />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /configura/i });
        expect(buttons.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('responsive design', () => {
    it('uses grid layout', () => {
      const { container } = render(<Channels />);

      expect(container.querySelector('.grid')).toBeInTheDocument();
    });
  });
});
