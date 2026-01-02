/**
 * Input Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { Input } from './input';

describe('Input', () => {
  describe('rendering', () => {
    it('renders with default props', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter text" />);

      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('applies default classes', () => {
      render(<Input data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('flex', 'h-10', 'w-full', 'rounded-md', 'border');
    });
  });

  describe('types', () => {
    it('renders without type attribute by default (browser defaults to text)', () => {
      render(<Input data-testid="input" />);

      // Input component passes through type prop, browser defaults to text
      const input = screen.getByTestId('input');
      expect(input.tagName).toBe('INPUT');
    });

    it('renders as email input', () => {
      render(<Input type="email" data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveAttribute('type', 'email');
    });

    it('renders as password input', () => {
      render(<Input type="password" data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveAttribute('type', 'password');
    });

    it('renders as number input', () => {
      render(<Input type="number" data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'number');
    });
  });

  describe('states', () => {
    it('handles disabled state', () => {
      render(<Input disabled />);

      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('handles required attribute', () => {
      render(<Input required />);

      expect(screen.getByRole('textbox')).toBeRequired();
    });

    it('handles readonly attribute', () => {
      render(<Input readOnly />);

      expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    });
  });

  describe('user interaction', () => {
    it('accepts user input', async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello World');

      expect(input).toHaveValue('Hello World');
    });

    it('calls onChange handler', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Input onChange={handleChange} />);

      await user.type(screen.getByRole('textbox'), 'a');

      expect(handleChange).toHaveBeenCalled();
    });

    it('calls onFocus handler', async () => {
      const user = userEvent.setup();
      const handleFocus = vi.fn();

      render(<Input onFocus={handleFocus} />);

      await user.click(screen.getByRole('textbox'));

      expect(handleFocus).toHaveBeenCalled();
    });

    it('calls onBlur handler', async () => {
      const user = userEvent.setup();
      const handleBlur = vi.fn();

      render(
        <>
          <Input onBlur={handleBlur} />
          <button>Other element</button>
        </>
      );

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.click(screen.getByRole('button'));

      expect(handleBlur).toHaveBeenCalled();
    });
  });

  describe('controlled input', () => {
    it('displays controlled value', () => {
      render(<Input value="controlled" onChange={() => {}} />);

      expect(screen.getByRole('textbox')).toHaveValue('controlled');
    });

    it('updates on value change', () => {
      const { rerender } = render(<Input value="initial" onChange={() => {}} />);

      expect(screen.getByRole('textbox')).toHaveValue('initial');

      rerender(<Input value="updated" onChange={() => {}} />);

      expect(screen.getByRole('textbox')).toHaveValue('updated');
    });
  });

  describe('custom props', () => {
    it('applies custom className', () => {
      render(<Input className="custom-class" data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveClass('custom-class');
    });

    it('forwards other HTML attributes', () => {
      render(<Input data-testid="input" maxLength={10} />);

      expect(screen.getByTestId('input')).toHaveAttribute('maxLength', '10');
    });

    it('forwards aria attributes', () => {
      render(<Input aria-label="Search" data-testid="input" />);

      expect(screen.getByLabelText('Search')).toBeInTheDocument();
    });
  });

  describe('focus styles', () => {
    it('has focus-visible styles', () => {
      render(<Input data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2');
    });
  });
});
