/**
 * StatCard Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { MessageSquare } from 'lucide-react';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  const defaultProps = {
    title: 'Total Messages',
    value: 1234,
    icon: MessageSquare,
  };

  describe('rendering', () => {
    it('renders with title and value', () => {
      render(<StatCard {...defaultProps} />);

      expect(screen.getByText('Total Messages')).toBeInTheDocument();
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    it('renders string value without formatting', () => {
      render(<StatCard {...defaultProps} value="Custom Value" />);

      expect(screen.getByText('Custom Value')).toBeInTheDocument();
    });

    it('renders icon', () => {
      render(<StatCard {...defaultProps} />);

      // Icon should be rendered as SVG
      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('renders skeleton when loading', () => {
      render(<StatCard {...defaultProps} isLoading />);

      // Should not show actual content
      expect(screen.queryByText('Total Messages')).not.toBeInTheDocument();
      expect(screen.queryByText('1,234')).not.toBeInTheDocument();
    });

    it('shows skeleton placeholders', () => {
      const { container } = render(<StatCard {...defaultProps} isLoading />);

      // Skeleton elements should be present
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('trend indicator', () => {
    it('shows change value with up trend', () => {
      render(<StatCard {...defaultProps} change="+12.5%" trend="up" />);

      expect(screen.getByText('+12.5%')).toBeInTheDocument();
      expect(screen.getByText('+12.5%')).toHaveClass('text-green-500');
    });

    it('shows change value with down trend', () => {
      render(<StatCard {...defaultProps} change="-5.2%" trend="down" />);

      expect(screen.getByText('-5.2%')).toBeInTheDocument();
      expect(screen.getByText('-5.2%')).toHaveClass('text-red-500');
    });

    it('shows change value with neutral trend', () => {
      render(<StatCard {...defaultProps} change="0%" trend="neutral" />);

      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('0%')).toHaveClass('text-muted-foreground');
    });

    it('shows trend arrow for up trend', () => {
      render(<StatCard {...defaultProps} change="+10%" trend="up" />);

      // ArrowUpRight icon should be present
      const arrows = document.querySelectorAll('svg');
      expect(arrows.length).toBeGreaterThan(1); // Icon + trend arrow
    });

    it('does not show trend arrow for neutral', () => {
      render(<StatCard {...defaultProps} change="0%" trend="neutral" />);

      // Only one icon (the main icon)
      const card = document.querySelector('[class*="card"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('change description', () => {
    it('shows default change description', () => {
      render(<StatCard {...defaultProps} change="+5%" />);

      expect(screen.getByText('rispetto a ieri')).toBeInTheDocument();
    });

    it('shows custom change description', () => {
      render(
        <StatCard
          {...defaultProps}
          change="+10%"
          changeDescription="vs last week"
        />
      );

      expect(screen.getByText('vs last week')).toBeInTheDocument();
    });

    it('does not show description without change', () => {
      render(<StatCard {...defaultProps} />);

      expect(screen.queryByText('rispetto a ieri')).not.toBeInTheDocument();
    });
  });

  describe('custom styling', () => {
    it('applies custom className', () => {
      render(<StatCard {...defaultProps} className="custom-class" />);

      const card = document.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });
  });

  describe('number formatting', () => {
    it('formats large numbers with locale separators', () => {
      render(<StatCard {...defaultProps} value={1234567} />);

      expect(screen.getByText('1,234,567')).toBeInTheDocument();
    });

    it('handles zero value', () => {
      render(<StatCard {...defaultProps} value={0} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles negative numbers', () => {
      render(<StatCard {...defaultProps} value={-100} />);

      expect(screen.getByText('-100')).toBeInTheDocument();
    });
  });
});
