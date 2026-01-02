/**
 * MainLayout Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { MainLayout } from './MainLayout';

// Mock child components to simplify testing
vi.mock('./Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('./Header', () => ({
  Header: ({ title }: { title?: string }) => (
    <header data-testid="header">{title || 'Header'}</header>
  ),
}));

describe('MainLayout', () => {
  describe('rendering', () => {
    it('renders children content', () => {
      render(
        <MainLayout>
          <div>Main content</div>
        </MainLayout>
      );

      expect(screen.getByText('Main content')).toBeInTheDocument();
    });

    it('renders sidebar', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('renders header', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('passes title to header', () => {
      render(
        <MainLayout title="Dashboard">
          <div>Content</div>
        </MainLayout>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('layout structure', () => {
    it('has flex layout', () => {
      const { container } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex');
    });

    it('has full screen height', () => {
      const { container } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('h-screen');
    });

    it('has background class', () => {
      const { container } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('bg-background');
    });
  });

  describe('main content area', () => {
    it('has overflow-auto for scrolling', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveClass('overflow-auto');
    });

    it('has padding', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveClass('p-6');
    });

    it('applies custom className to main content', () => {
      render(
        <MainLayout className="custom-class">
          <div>Content</div>
        </MainLayout>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveClass('custom-class');
    });
  });

  describe('accessibility', () => {
    it('has main landmark', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});
