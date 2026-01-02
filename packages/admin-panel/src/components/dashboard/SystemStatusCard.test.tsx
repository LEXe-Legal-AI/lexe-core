/**
 * SystemStatusCard Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Bot, GitBranch, Brain } from 'lucide-react';
import {
  SystemStatusCard,
  AgentStatusDetails,
  PipelineStatusDetails,
  MemoryStatusDetails,
} from './SystemStatusCard';

describe('SystemStatusCard', () => {
  const defaultProps = {
    title: 'Agenti',
    to: '/agents',
    icon: Bot,
    value: '3/5',
  };

  describe('rendering', () => {
    it('renders with title and value', () => {
      render(<SystemStatusCard {...defaultProps} />);

      expect(screen.getByText('Agenti')).toBeInTheDocument();
      expect(screen.getByText('3/5')).toBeInTheDocument();
    });

    it('renders as a link', () => {
      render(<SystemStatusCard {...defaultProps} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/agents');
    });

    it('renders icon', () => {
      render(<SystemStatusCard {...defaultProps} />);

      const icons = document.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('renders numeric value with locale formatting', () => {
      render(<SystemStatusCard {...defaultProps} value={12345} />);

      expect(screen.getByText('12,345')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('renders skeleton when loading', () => {
      render(<SystemStatusCard {...defaultProps} isLoading />);

      expect(screen.queryByText('Agenti')).not.toBeInTheDocument();
      expect(screen.queryByText('3/5')).not.toBeInTheDocument();
    });

    it('shows skeleton elements', () => {
      const { container } = render(<SystemStatusCard {...defaultProps} isLoading />);

      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('status', () => {
    it('displays healthy status correctly', () => {
      render(<SystemStatusCard {...defaultProps} status="healthy" />);

      expect(screen.getByText('Operativo')).toBeInTheDocument();
      expect(screen.getByText('Operativo')).toHaveClass('text-green-500');
    });

    it('displays degraded status correctly', () => {
      render(<SystemStatusCard {...defaultProps} status="degraded" />);

      expect(screen.getByText('Degradato')).toBeInTheDocument();
      expect(screen.getByText('Degradato')).toHaveClass('text-yellow-500');
    });

    it('displays error status correctly', () => {
      render(<SystemStatusCard {...defaultProps} status="error" />);

      expect(screen.getByText('Errore')).toBeInTheDocument();
      expect(screen.getByText('Errore')).toHaveClass('text-red-500');
    });

    it('displays offline status correctly', () => {
      render(<SystemStatusCard {...defaultProps} status="offline" />);

      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByText('Offline')).toHaveClass('text-gray-500');
    });

    it('displays maintenance status correctly', () => {
      render(<SystemStatusCard {...defaultProps} status="maintenance" />);

      expect(screen.getByText('Manutenzione')).toBeInTheDocument();
      expect(screen.getByText('Manutenzione')).toHaveClass('text-blue-500');
    });
  });

  describe('details', () => {
    it('renders custom details', () => {
      render(
        <SystemStatusCard
          {...defaultProps}
          details={<span>Custom details here</span>}
        />
      );

      expect(screen.getByText('Custom details here')).toBeInTheDocument();
    });

    it('does not render details section when not provided', () => {
      const { container } = render(<SystemStatusCard {...defaultProps} />);

      const detailsSection = container.querySelector('.flex.gap-2.text-xs');
      expect(detailsSection).not.toBeInTheDocument();
    });
  });

  describe('hover effects', () => {
    it('has hover border class', () => {
      const { container } = render(<SystemStatusCard {...defaultProps} />);

      const card = container.querySelector('[class*="hover:border-primary"]');
      expect(card).toBeInTheDocument();
    });

    it('has cursor pointer', () => {
      const { container } = render(<SystemStatusCard {...defaultProps} />);

      const card = container.querySelector('[class*="cursor-pointer"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('custom styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <SystemStatusCard {...defaultProps} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });
});

describe('AgentStatusDetails', () => {
  it('renders agent counts', () => {
    render(<AgentStatusDetails active={3} idle={1} error={0} />);

    expect(screen.getByText('3 attivi')).toBeInTheDocument();
    expect(screen.getByText('1 inattivi')).toBeInTheDocument();
  });

  it('shows error count when greater than zero', () => {
    render(<AgentStatusDetails active={2} idle={1} error={1} />);

    expect(screen.getByText('1 errori')).toBeInTheDocument();
  });

  it('hides error count when zero', () => {
    render(<AgentStatusDetails active={3} idle={2} error={0} />);

    expect(screen.queryByText('0 errori')).not.toBeInTheDocument();
  });

  it('applies correct colors', () => {
    render(<AgentStatusDetails active={3} idle={1} error={1} />);

    expect(screen.getByText('3 attivi')).toHaveClass('text-green-500');
    expect(screen.getByText('1 inattivi')).toHaveClass('text-yellow-500');
    expect(screen.getByText('1 errori')).toHaveClass('text-red-500');
  });
});

describe('PipelineStatusDetails', () => {
  it('renders pipeline details', () => {
    render(<PipelineStatusDetails activeRuns={5} avgLatency={120} />);

    expect(screen.getByText('5 esecuzioni attive')).toBeInTheDocument();
    expect(screen.getByText('Latenza: 120ms')).toBeInTheDocument();
  });

  it('renders separator', () => {
    render(<PipelineStatusDetails activeRuns={3} avgLatency={80} />);

    expect(screen.getByText('|')).toBeInTheDocument();
  });
});

describe('MemoryStatusDetails', () => {
  it('renders memory details', () => {
    render(<MemoryStatusDetails cacheHitRate={95.5} />);

    expect(screen.getByText('entries totali')).toBeInTheDocument();
    expect(screen.getByText('Cache hit: 95.5%')).toBeInTheDocument();
  });

  it('formats cache hit rate correctly', () => {
    render(<MemoryStatusDetails cacheHitRate={87.123} />);

    expect(screen.getByText('Cache hit: 87.1%')).toBeInTheDocument();
  });

  it('applies correct color to cache hit rate', () => {
    render(<MemoryStatusDetails cacheHitRate={95} />);

    expect(screen.getByText('Cache hit: 95.0%')).toHaveClass('text-green-500');
  });
});
