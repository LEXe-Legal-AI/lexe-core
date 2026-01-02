/**
 * UI Components Test Suite
 *
 * Comprehensive tests for LEO Webchat UI components.
 * Tests cover rendering, interactions, accessibility, and edge cases.
 */

import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Components
import { Button, buttonVariants } from '../Button';
import { Input, inputVariants } from '../Input';
import { Badge, badgeVariants } from '../Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../Tabs';
import { ScrollArea } from '../ScrollArea';
import { Avatar, AvatarImage, AvatarFallback, getInitials } from '../Avatar';
import { Tooltip, TooltipProvider as _TooltipProvider } from '../Tooltip';

// ============================================================================
// Button Component Tests
// ============================================================================

describe('Button', () => {
  describe('rendering', () => {
    it('renders with default variant', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('renders children correctly', () => {
      render(<Button>Test Button</Button>);
      expect(screen.getByText('Test Button')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<Button className="custom-class">Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('forwards ref correctly', () => {
      const ref = vi.fn();
      render(<Button ref={ref}>Button</Button>);
      expect(ref).toHaveBeenCalled();
    });
  });

  describe('variants', () => {
    it.each([
      ['default', 'bg-leo-primary'],
      ['primary', 'bg-gradient-to-r'],
      ['secondary', 'bg-leo-secondary'],
      ['ghost', 'bg-transparent'],
      ['outline', 'border-2'],
      ['destructive', 'bg-red-600'],
    ] as const)('renders %s variant with correct classes', (variant, expectedClass) => {
      render(<Button variant={variant}>Button</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain(expectedClass);
    });
  });

  describe('sizes', () => {
    it.each([
      ['sm', 'h-8'],
      ['md', 'h-10'],
      ['lg', 'h-12'],
      ['xl', 'h-14'],
      ['icon', 'h-10 w-10'],
    ] as const)('renders %s size with correct classes', (size, expectedClass) => {
      render(<Button size={size}>Button</Button>);
      const button = screen.getByRole('button');
      expectedClass.split(' ').forEach((cls) => {
        expect(button.className).toContain(cls);
      });
    });
  });

  describe('loading state', () => {
    it('shows spinner when loading', () => {
      render(<Button isLoading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('disables button when loading', () => {
      render(<Button isLoading>Loading</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('hides left icon when loading', () => {
      const LeftIcon = () => <span data-testid="left-icon">Icon</span>;
      render(
        <Button isLoading leftIcon={<LeftIcon />}>
          Button
        </Button>
      );
      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
    });
  });

  describe('icons', () => {
    it('renders left icon', () => {
      const LeftIcon = () => <span data-testid="left-icon">L</span>;
      render(<Button leftIcon={<LeftIcon />}>Button</Button>);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders right icon', () => {
      const RightIcon = () => <span data-testid="right-icon">R</span>;
      render(<Button rightIcon={<RightIcon />}>Button</Button>);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('hides right icon when loading', () => {
      const RightIcon = () => <span data-testid="right-icon">R</span>;
      render(
        <Button isLoading rightIcon={<RightIcon />}>
          Button
        </Button>
      );
      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onClick when clicked', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      await userEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} disabled>
          Click me
        </Button>
      );

      await userEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', async () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} isLoading>
          Click me
        </Button>
      );

      await userEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Input Component Tests
// ============================================================================

describe('Input', () => {
  describe('rendering', () => {
    it('renders basic input', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Input label="Email" id="email" />);
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('renders required indicator', () => {
      render(<Input label="Email" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = vi.fn();
      render(<Input ref={ref} />);
      expect(ref).toHaveBeenCalled();
    });
  });

  describe('states', () => {
    it('applies error state', () => {
      render(<Input error="Invalid input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('displays error message', () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('displays helper text', () => {
      render(<Input helperText="Enter your email address" />);
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('hides helper text when error is present', () => {
      render(<Input helperText="Helper" error="Error" />);
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('applies disabled state', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });

  describe('sizes', () => {
    it.each([
      ['sm', 'h-8'],
      ['md', 'h-10'],
      ['lg', 'h-12'],
    ] as const)('renders %s size with correct classes', (inputSize, expectedClass) => {
      render(<Input inputSize={inputSize} />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain(expectedClass);
    });
  });

  describe('icons', () => {
    it('renders start icon', () => {
      const StartIcon = () => <span data-testid="start-icon">@</span>;
      render(<Input startIcon={<StartIcon />} />);
      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
    });

    it('renders end icon', () => {
      const EndIcon = () => <span data-testid="end-icon">X</span>;
      render(<Input endIcon={<EndIcon />} />);
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
    });

    it('applies padding for start icon', () => {
      const StartIcon = () => <span>@</span>;
      render(<Input startIcon={<StartIcon />} />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('pl-10');
    });
  });

  describe('interactions', () => {
    it('calls onChange when typing', async () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'test');

      expect(handleChange).toHaveBeenCalled();
    });

    it('updates value on input', async () => {
      render(<Input />);
      const input = screen.getByRole('textbox');

      await userEvent.type(input, 'hello');
      expect(input).toHaveValue('hello');
    });
  });

  describe('accessibility', () => {
    it('associates error message with aria-describedby', () => {
      render(<Input error="Error message" id="test-input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
    });

    it('associates helper text with aria-describedby', () => {
      render(<Input helperText="Helper text" id="test-input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-input-helper');
    });
  });
});

// ============================================================================
// Badge Component Tests
// ============================================================================

describe('Badge', () => {
  describe('rendering', () => {
    it('renders basic badge', () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<Badge className="custom-badge">Badge</Badge>);
      expect(screen.getByText('Badge')).toHaveClass('custom-badge');
    });

    it('forwards ref correctly', () => {
      const ref = vi.fn();
      render(<Badge ref={ref}>Badge</Badge>);
      expect(ref).toHaveBeenCalled();
    });
  });

  describe('variants', () => {
    it.each([
      ['default', 'bg-leo-primary'],
      ['secondary', 'bg-leo-secondary'],
      ['outline', 'border-2'],
      ['destructive', 'bg-red-100'],
      ['success', 'bg-leo-accent'],
      ['warning', 'bg-amber-100'],
      ['info', 'bg-blue-100'],
    ] as const)('renders %s variant with correct classes', (variant, expectedClass) => {
      render(<Badge variant={variant}>Badge</Badge>);
      const badge = screen.getByText('Badge');
      expect(badge.className).toContain(expectedClass);
    });
  });

  describe('sizes', () => {
    it.each([
      ['sm', 'h-5'],
      ['md', 'h-6'],
      ['lg', 'h-7'],
    ] as const)('renders %s size with correct classes', (size, expectedClass) => {
      render(<Badge size={size}>Badge</Badge>);
      expect(screen.getByText('Badge').className).toContain(expectedClass);
    });
  });

  describe('dot indicator', () => {
    it('renders dot when dot prop is true', () => {
      const { container } = render(<Badge dot>Status</Badge>);
      const dot = container.querySelector('.rounded-full.h-1\\.5.w-1\\.5');
      expect(dot).toBeInTheDocument();
    });

    it('applies custom dot color', () => {
      const { container } = render(<Badge dot dotColor="#ff0000">Status</Badge>);
      const dot = container.querySelector('.rounded-full.h-1\\.5.w-1\\.5');
      expect(dot).toHaveStyle({ backgroundColor: '#ff0000' });
    });
  });

  describe('icon', () => {
    it('renders icon when provided', () => {
      const Icon = () => <span data-testid="badge-icon">*</span>;
      render(<Badge icon={<Icon />}>Badge</Badge>);
      expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Card Component Tests
// ============================================================================

describe('Card', () => {
  describe('rendering', () => {
    it('renders basic card', () => {
      render(<Card data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('renders children', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = vi.fn();
      render(<Card ref={ref}>Card</Card>);
      expect(ref).toHaveBeenCalled();
    });
  });

  describe('variants', () => {
    it.each([
      ['default', 'bg-white'],
      ['elevated', 'shadow-lg'],
      ['glass', 'backdrop-blur-xl'],
      ['outline', 'border-2'],
    ] as const)('renders %s variant with correct classes', (variant, expectedClass) => {
      render(<Card variant={variant} data-testid="card">Card</Card>);
      expect(screen.getByTestId('card').className).toContain(expectedClass);
    });
  });

  describe('hover effect', () => {
    it('applies hover classes when hover is true', () => {
      render(<Card hover data-testid="card">Card</Card>);
      expect(screen.getByTestId('card').className).toContain('hover:shadow-lg');
    });
  });

  describe('padding', () => {
    it.each([
      ['sm', 'p-4'],
      ['md', 'p-6'],
      ['lg', 'p-8'],
    ] as const)('renders %s padding with correct classes', (padding, expectedClass) => {
      render(<Card padding={padding} data-testid="card">Card</Card>);
      expect(screen.getByTestId('card').className).toContain(expectedClass);
    });
  });

  describe('sub-components', () => {
    it('renders CardHeader', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('renders CardTitle with correct tag', () => {
      render(<CardTitle as="h1">Title</CardTitle>);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('renders CardTitle with default h3 tag', () => {
      render(<CardTitle>Title</CardTitle>);
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('renders CardDescription', () => {
      render(<CardDescription>Description text</CardDescription>);
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('renders CardContent', () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('renders CardFooter', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('renders full card composition', () => {
      render(
        <Card data-testid="card">
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardDescription>Description</CardDescription>
          </CardHeader>
          <CardContent>Content</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Tabs Component Tests
// ============================================================================

describe('Tabs', () => {
  describe('rendering', () => {
    it('renders tabs with default value', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByRole('tab', { name: 'Tab 1' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('does not render inactive tab content by default', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    });
  });

  describe('tab switching', () => {
    it('switches tabs on click', async () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      await userEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));

      expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('calls onValueChange when tab changes', async () => {
      const handleChange = vi.fn();
      render(
        <Tabs defaultValue="tab1" onValueChange={handleChange}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      await userEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));
      expect(handleChange).toHaveBeenCalledWith('tab2');
    });
  });

  describe('controlled mode', () => {
    it('works in controlled mode', async () => {
      const ControlledTabs = () => {
        const [value, setValue] = useState('tab1');
        return (
          <Tabs value={value} onValueChange={setValue}>
            <TabsList>
              <TabsTrigger value="tab1">Tab 1</TabsTrigger>
              <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">Content 1</TabsContent>
            <TabsContent value="tab2">Content 2</TabsContent>
          </Tabs>
        );
      };

      render(<ControlledTabs />);

      await userEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  describe('forceMount', () => {
    it('renders hidden content when forceMount is true', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2" forceMount>
            Content 2
          </TabsContent>
        </Tabs>
      );

      const content2 = screen.getByText('Content 2');
      expect(content2).toBeInTheDocument();
      expect(content2.closest('[role="tabpanel"]')).toHaveAttribute('hidden');
    });
  });

  describe('accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(2);
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Avatar Component Tests
// ============================================================================

describe('Avatar', () => {
  describe('rendering', () => {
    it('renders basic avatar', () => {
      render(
        <Avatar data-testid="avatar">
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByTestId('avatar')).toBeInTheDocument();
    });

    it('renders fallback text', () => {
      render(
        <Avatar>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText('AB')).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = vi.fn();
      render(
        <Avatar ref={ref}>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      expect(ref).toHaveBeenCalled();
    });
  });

  describe('sizes', () => {
    it.each([
      ['xs', 'h-6 w-6'],
      ['sm', 'h-8 w-8'],
      ['md', 'h-10 w-10'],
      ['lg', 'h-12 w-12'],
      ['xl', 'h-16 w-16'],
      ['2xl', 'h-20 w-20'],
    ] as const)('renders %s size with correct classes', (size, expectedClass) => {
      render(
        <Avatar size={size} data-testid="avatar">
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      const avatar = screen.getByTestId('avatar');
      expectedClass.split(' ').forEach((cls) => {
        expect(avatar.className).toContain(cls);
      });
    });
  });

  describe('status indicator', () => {
    it.each(['online', 'offline', 'away', 'busy'] as const)(
      'renders %s status indicator',
      (status) => {
        render(
          <Avatar status={status} data-testid="avatar">
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        );
        expect(screen.getByLabelText(`Status: ${status}`)).toBeInTheDocument();
      }
    );
  });

  describe('image handling', () => {
    it('shows fallback when image fails to load', async () => {
      render(
        <Avatar>
          <AvatarImage src="invalid-url.jpg" alt="Test" />
          <AvatarFallback>FB</AvatarFallback>
        </Avatar>
      );

      const img = screen.getByRole('img');
      fireEvent.error(img);

      await waitFor(() => {
        expect(screen.getByText('FB')).toBeInTheDocument();
      });
    });

    it('does not render image when src is empty', () => {
      render(
        <Avatar>
          <AvatarImage src="" alt="Test" />
          <AvatarFallback>FB</AvatarFallback>
        </Avatar>
      );

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByText('FB')).toBeInTheDocument();
    });
  });

  describe('getInitials utility', () => {
    it('returns initials from name', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('returns single initial for single name', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('limits initials to maxLength', () => {
      expect(getInitials('John Paul Doe', 1)).toBe('J');
    });

    it('handles multiple spaces', () => {
      expect(getInitials('John  Doe')).toBe('JD');
    });

    it('handles empty string', () => {
      expect(getInitials('')).toBe('');
    });
  });

  describe('fallback delay', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('delays showing fallback when delayMs is set', async () => {
      render(
        <Avatar>
          <AvatarFallback delayMs={500}>FB</AvatarFallback>
        </Avatar>
      );

      expect(screen.queryByText('FB')).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByText('FB')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Tooltip Component Tests
// ============================================================================

describe('Tooltip', () => {
  describe('rendering', () => {
    it('renders trigger element', () => {
      render(
        <Tooltip content="Tooltip text">
          <button>Hover me</button>
        </Tooltip>
      );
      expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
    });

    it('does not show tooltip by default', () => {
      render(
        <Tooltip content="Tooltip text">
          <button>Hover me</button>
        </Tooltip>
      );
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('show/hide behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows tooltip on hover after delay', async () => {
      render(
        <Tooltip content="Tooltip text" delayMs={100}>
          <button>Hover me</button>
        </Tooltip>
      );

      fireEvent.mouseEnter(screen.getByRole('button'));

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByText('Tooltip text')).toBeInTheDocument();
    });

    it('hides tooltip on mouse leave', async () => {
      render(
        <Tooltip content="Tooltip text" delayMs={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      fireEvent.mouseEnter(screen.getByRole('button'));

      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      fireEvent.mouseLeave(screen.getByRole('button'));

      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('shows tooltip on focus', () => {
      render(
        <Tooltip content="Tooltip text" delayMs={0}>
          <button>Focus me</button>
        </Tooltip>
      );

      fireEvent.focus(screen.getByRole('button'));

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('hides tooltip on blur', () => {
      render(
        <Tooltip content="Tooltip text" delayMs={0}>
          <button>Focus me</button>
        </Tooltip>
      );

      fireEvent.focus(screen.getByRole('button'));
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      fireEvent.blur(screen.getByRole('button'));
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('does not show tooltip when disabled', () => {
      vi.useFakeTimers();

      render(
        <Tooltip content="Tooltip text" disabled delayMs={0}>
          <button>Hover me</button>
        </Tooltip>
      );

      fireEvent.mouseEnter(screen.getByRole('button'));

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('positioning', () => {
    it.each(['top', 'bottom', 'left', 'right'] as const)(
      'applies correct classes for %s position',
      (side) => {
        vi.useFakeTimers();

        render(
          <Tooltip content="Tooltip" side={side} delayMs={0}>
            <button>Hover</button>
          </Tooltip>
        );

        fireEvent.mouseEnter(screen.getByRole('button'));

        act(() => {
          vi.advanceTimersByTime(0);
        });

        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toBeInTheDocument();

        vi.useRealTimers();
      }
    );
  });

  describe('controlled mode', () => {
    it('works in controlled mode', () => {
      const { rerender } = render(
        <Tooltip content="Tooltip text" open={false}>
          <button>Hover me</button>
        </Tooltip>
      );

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      rerender(
        <Tooltip content="Tooltip text" open={true}>
          <button>Hover me</button>
        </Tooltip>
      );

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// ScrollArea Component Tests
// ============================================================================

describe('ScrollArea', () => {
  describe('rendering', () => {
    it('renders children', () => {
      render(
        <ScrollArea>
          <div>Scrollable content</div>
        </ScrollArea>
      );
      expect(screen.getByText('Scrollable content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <ScrollArea className="custom-scroll" data-testid="scroll-area">
          Content
        </ScrollArea>
      );
      expect(screen.getByTestId('scroll-area')).toHaveClass('custom-scroll');
    });

    it('forwards ref correctly', () => {
      const ref = vi.fn();
      render(
        <ScrollArea ref={ref}>
          <div>Content</div>
        </ScrollArea>
      );
      expect(ref).toHaveBeenCalled();
    });
  });

  describe('orientation', () => {
    it.each([
      ['vertical', 'overflow-y-auto'],
      ['horizontal', 'overflow-x-auto'],
      ['both', 'overflow-auto'],
    ] as const)('applies %s orientation classes', (orientation, expectedClass) => {
      render(
        <ScrollArea orientation={orientation} data-testid="scroll-area">
          Content
        </ScrollArea>
      );
      expect(screen.getByTestId('scroll-area').className).toContain(expectedClass);
    });
  });

  describe('scrollbar visibility', () => {
    it('toggles scrollbar visibility on hover when scrollbarVisibility is hover', () => {
      render(
        <ScrollArea scrollbarVisibility="hover" data-testid="scroll-area">
          Content
        </ScrollArea>
      );

      const scrollArea = screen.getByTestId('scroll-area');

      fireEvent.mouseEnter(scrollArea);
      expect(scrollArea.className).toContain('scrollbar-visible');

      fireEvent.mouseLeave(scrollArea);
      expect(scrollArea.className).toContain('scrollbar-hidden');
    });

    it('always shows scrollbar when scrollbarVisibility is always', () => {
      render(
        <ScrollArea scrollbarVisibility="always" data-testid="scroll-area">
          Content
        </ScrollArea>
      );

      expect(screen.getByTestId('scroll-area').className).toContain('scrollbar-visible');
    });
  });

  describe('scrollbar size', () => {
    it.each(['thin', 'default', 'thick'] as const)(
      'applies %s scrollbar size class',
      (scrollbarSize) => {
        render(
          <ScrollArea scrollbarSize={scrollbarSize} data-testid="scroll-area">
            Content
          </ScrollArea>
        );
        expect(screen.getByTestId('scroll-area').className).toContain(`scrollbar-${scrollbarSize}`);
      }
    );
  });
});

// ============================================================================
// CVA Variants Tests
// ============================================================================

describe('CVA Variants', () => {
  describe('buttonVariants', () => {
    it('exports buttonVariants function', () => {
      expect(typeof buttonVariants).toBe('function');
    });

    it('generates correct classes for variant and size', () => {
      const classes = buttonVariants({ variant: 'primary', size: 'lg' });
      expect(classes).toContain('h-12');
    });
  });

  describe('inputVariants', () => {
    it('exports inputVariants function', () => {
      expect(typeof inputVariants).toBe('function');
    });
  });

  describe('badgeVariants', () => {
    it('exports badgeVariants function', () => {
      expect(typeof badgeVariants).toBe('function');
    });
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('Edge Cases', () => {
  describe('Button edge cases', () => {
    it('handles empty children', () => {
      render(<Button>{''}</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('handles complex children', () => {
      render(
        <Button>
          <span>Part 1</span>
          <span>Part 2</span>
        </Button>
      );
      expect(screen.getByText('Part 1')).toBeInTheDocument();
      expect(screen.getByText('Part 2')).toBeInTheDocument();
    });
  });

  describe('Input edge cases', () => {
    it('handles special characters in value', async () => {
      render(<Input />);
      const input = screen.getByRole('textbox');

      await userEvent.type(input, '<script>alert("xss")</script>');
      expect(input).toHaveValue('<script>alert("xss")</script>');
    });
  });

  describe('Tabs edge cases', () => {
    it('handles empty tabs list', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList></TabsList>
          <TabsContent value="tab1">Content</TabsContent>
        </Tabs>
      );
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('throws error when TabsTrigger is used outside Tabs', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TabsTrigger value="tab1">Tab</TabsTrigger>);
      }).toThrow('Tabs components must be used within a Tabs provider');

      consoleSpy.mockRestore();
    });
  });

  describe('Avatar edge cases', () => {
    it('throws error when AvatarImage is used outside Avatar', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<AvatarImage src="test.jpg" />);
      }).toThrow('Avatar components must be used within an Avatar provider');

      consoleSpy.mockRestore();
    });
  });
});
