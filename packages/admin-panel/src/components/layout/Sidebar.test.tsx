/**
 * Sidebar Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  describe('rendering', () => {
    it('renders logo', () => {
      render(<Sidebar />);

      expect(screen.getByText('LEO')).toBeInTheDocument();
      expect(screen.getByText('L')).toBeInTheDocument();
    });

    it('renders navigation items', () => {
      render(<Sidebar />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Conversations')).toBeInTheDocument();
      expect(screen.getByText('Contacts')).toBeInTheDocument();
      expect(screen.getByText('Agents')).toBeInTheDocument();
      expect(screen.getByText('Pipeline')).toBeInTheDocument();
      expect(screen.getByText('Memory')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    it('renders collapse button', () => {
      render(<Sidebar />);

      expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();
    });

    it('renders user section', () => {
      render(<Sidebar />);

      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('admin@leo.it')).toBeInTheDocument();
    });
  });

  describe('navigation links', () => {
    it('has correct link destinations', () => {
      render(<Sidebar />);

      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: /conversations/i })).toHaveAttribute('href', '/conversations');
      expect(screen.getByRole('link', { name: /contacts/i })).toHaveAttribute('href', '/contacts');
      expect(screen.getByRole('link', { name: /agents/i })).toHaveAttribute('href', '/agents');
      expect(screen.getByRole('link', { name: /pipeline/i })).toHaveAttribute('href', '/pipeline');
      expect(screen.getByRole('link', { name: /memory/i })).toHaveAttribute('href', '/memory');
      expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
      expect(screen.getByRole('link', { name: /users/i })).toHaveAttribute('href', '/users');
    });
  });

  describe('collapse functionality', () => {
    it('starts expanded by default', () => {
      const { container } = render(<Sidebar />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('w-64');
    });

    it('collapses when button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<Sidebar />);

      const collapseButton = screen.getByRole('button', { name: /collapse/i });
      await user.click(collapseButton);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('w-16');
    });

    it('hides text labels when collapsed', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);

      const collapseButton = screen.getByRole('button', { name: /collapse/i });
      await user.click(collapseButton);

      // Text labels should be hidden
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('LEO')).not.toBeInTheDocument();
    });

    it('expands when clicked again', async () => {
      const user = userEvent.setup();
      const { container } = render(<Sidebar />);

      const collapseButton = screen.getByRole('button', { name: /collapse/i });

      // Collapse
      await user.click(collapseButton);
      expect(container.querySelector('aside')).toHaveClass('w-16');

      // Expand
      await user.click(collapseButton);
      expect(container.querySelector('aside')).toHaveClass('w-64');
    });

    it('hides user info when collapsed', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);

      const collapseButton = screen.getByRole('button', { name: /collapse/i });
      await user.click(collapseButton);

      expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
      expect(screen.queryByText('admin@leo.it')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('has border on right side', () => {
      const { container } = render(<Sidebar />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('border-r');
    });

    it('has background color', () => {
      const { container } = render(<Sidebar />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('bg-background');
    });

    it('has transition for smooth collapse', () => {
      const { container } = render(<Sidebar />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('transition-all');
    });

    it('applies custom className', () => {
      const { container } = render(<Sidebar className="custom-sidebar" />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('custom-sidebar');
    });
  });

  describe('accessibility', () => {
    it('has navigation landmark', () => {
      render(<Sidebar />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('navigation links are accessible', () => {
      render(<Sidebar />);

      const navLinks = screen.getAllByRole('link');
      // 9 navigation links: Dashboard, Conversations, Coda Revisione, Contacts, Agents, Pipeline, Memory, Settings, Users
      expect(navLinks.length).toBe(9);
    });
  });
});
