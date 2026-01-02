/**
 * Card Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './card';

describe('Card', () => {
  describe('Card component', () => {
    it('renders children', () => {
      render(
        <Card>
          <div>Card content</div>
        </Card>
      );

      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('applies default classes', () => {
      render(<Card data-testid="card">Content</Card>);

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card');
    });

    it('applies custom className', () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>);

      expect(screen.getByTestId('card')).toHaveClass('custom-class');
    });

    it('forwards ref', () => {
      const ref = { current: null };
      render(<Card ref={ref}>Content</Card>);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardHeader component', () => {
    it('renders children', () => {
      render(
        <CardHeader>
          <span>Header content</span>
        </CardHeader>
      );

      expect(screen.getByText('Header content')).toBeInTheDocument();
    });

    it('applies default classes', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);

      const header = screen.getByTestId('header');
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });

    it('applies custom className', () => {
      render(<CardHeader className="custom" data-testid="header">Header</CardHeader>);

      expect(screen.getByTestId('header')).toHaveClass('custom');
    });
  });

  describe('CardTitle component', () => {
    it('renders as h3 by default', () => {
      render(<CardTitle>Title</CardTitle>);

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveTextContent('Title');
    });

    it('applies default classes', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);

      const title = screen.getByTestId('title');
      expect(title).toHaveClass('text-2xl', 'font-semibold');
    });

    it('applies custom className', () => {
      render(<CardTitle className="custom" data-testid="title">Title</CardTitle>);

      expect(screen.getByTestId('title')).toHaveClass('custom');
    });
  });

  describe('CardDescription component', () => {
    it('renders children', () => {
      render(<CardDescription>Description text</CardDescription>);

      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('applies default classes', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);

      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('applies custom className', () => {
      render(<CardDescription className="custom" data-testid="desc">Description</CardDescription>);

      expect(screen.getByTestId('desc')).toHaveClass('custom');
    });
  });

  describe('CardContent component', () => {
    it('renders children', () => {
      render(
        <CardContent>
          <p>Content paragraph</p>
        </CardContent>
      );

      expect(screen.getByText('Content paragraph')).toBeInTheDocument();
    });

    it('applies default classes', () => {
      render(<CardContent data-testid="content">Content</CardContent>);

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('p-6', 'pt-0');
    });

    it('applies custom className', () => {
      render(<CardContent className="custom" data-testid="content">Content</CardContent>);

      expect(screen.getByTestId('content')).toHaveClass('custom');
    });
  });

  describe('CardFooter component', () => {
    it('renders children', () => {
      render(
        <CardFooter>
          <button>Footer button</button>
        </CardFooter>
      );

      expect(screen.getByRole('button', { name: /footer button/i })).toBeInTheDocument();
    });

    it('applies default classes', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);

      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });

    it('applies custom className', () => {
      render(<CardFooter className="custom" data-testid="footer">Footer</CardFooter>);

      expect(screen.getByTestId('footer')).toHaveClass('custom');
    });
  });

  describe('Card composition', () => {
    it('renders a complete card with all components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card body content</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByRole('heading', { name: /card title/i })).toBeInTheDocument();
      expect(screen.getByText('Card Description')).toBeInTheDocument();
      expect(screen.getByText('Card body content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
    });
  });
});
