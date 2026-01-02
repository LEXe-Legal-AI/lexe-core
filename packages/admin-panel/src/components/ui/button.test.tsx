/**
 * Button Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { Button, buttonVariants } from './button';

describe('Button', () => {
  describe('rendering', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>);

      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
    });

    it('renders with children', () => {
      render(<Button>Test Button</Button>);

      expect(screen.getByText('Test Button')).toBeInTheDocument();
    });

    it('renders as different element when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );

      const link = screen.getByRole('link', { name: /link button/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test');
    });
  });

  describe('variants', () => {
    it('applies default variant classes', () => {
      render(<Button>Default</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary');
    });

    it('applies destructive variant classes', () => {
      render(<Button variant="destructive">Delete</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-destructive');
    });

    it('applies outline variant classes', () => {
      render(<Button variant="outline">Outline</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border');
    });

    it('applies secondary variant classes', () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-secondary');
    });

    it('applies ghost variant classes', () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-accent');
    });

    it('applies link variant classes', () => {
      render(<Button variant="link">Link</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-primary');
    });
  });

  describe('sizes', () => {
    it('applies default size classes', () => {
      render(<Button size="default">Default Size</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10');
    });

    it('applies small size classes', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9');
    });

    it('applies large size classes', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-11');
    });

    it('applies icon size classes', () => {
      render(<Button size="icon">Icon</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10', 'w-10');
    });
  });

  describe('states', () => {
    it('handles disabled state', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50');
    });

    it('handles click events', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<Button onClick={handleClick}>Click me</Button>);

      await user.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not trigger click when disabled', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<Button disabled onClick={handleClick}>Disabled</Button>);

      await user.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('custom props', () => {
    it('applies custom className', () => {
      render(<Button className="custom-class">Custom</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('forwards other HTML attributes', () => {
      render(<Button data-testid="test-button" type="submit">Submit</Button>);

      const button = screen.getByTestId('test-button');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('buttonVariants', () => {
    it('returns correct class string for default variant', () => {
      const classes = buttonVariants({ variant: 'default' });
      expect(classes).toContain('bg-primary');
    });

    it('returns correct class string for size', () => {
      const classes = buttonVariants({ size: 'lg' });
      expect(classes).toContain('h-11');
    });

    it('accepts custom className', () => {
      const classes = buttonVariants({ className: 'my-custom-class' });
      expect(classes).toContain('my-custom-class');
    });
  });
});
