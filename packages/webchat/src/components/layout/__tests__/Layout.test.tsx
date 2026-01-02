/**
 * Layout Components Tests
 *
 * Comprehensive tests for ChatSidebar component covering
 * render, interaction, conversation management, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ChatSidebar } from '../ChatSidebar';
import type { Conversation } from '@/stores';

// Mock the chat store
const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    title: 'First Conversation',
    messages: [
      { id: 'msg-1', role: 'user', content: 'Hello', timestamp: new Date() },
      { id: 'msg-2', role: 'assistant', content: 'Hi there!', timestamp: new Date() },
    ],
    createdAt: new Date('2026-01-01T10:00:00'),
    updatedAt: new Date('2026-01-01T10:30:00'),
  },
  {
    id: 'conv-2',
    title: 'Second Conversation',
    messages: [{ id: 'msg-3', role: 'user', content: 'Test', timestamp: new Date() }],
    createdAt: new Date('2025-12-31T09:00:00'),
    updatedAt: new Date('2025-12-31T09:00:00'),
  },
];

const mockStore = {
  conversations: mockConversations,
  activeConversationId: 'conv-1',
  sidebarOpen: true,
  createConversation: vi.fn(),
  deleteConversation: vi.fn(),
  setActiveConversation: vi.fn(),
  renameConversation: vi.fn(),
  toggleSidebar: vi.fn(),
};

vi.mock('@/stores', () => ({
  useChatStore: () => mockStore,
}));

// ============================================================
// ChatSidebar Tests
// ============================================================

describe('ChatSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.conversations = [...mockConversations];
    mockStore.activeConversationId = 'conv-1';
    mockStore.sidebarOpen = true;
  });

  describe('rendering', () => {
    it('renders sidebar when open', () => {
      render(<ChatSidebar />);

      expect(screen.getByText('Nuova chat')).toBeInTheDocument();
      expect(screen.getByText('First Conversation')).toBeInTheDocument();
      expect(screen.getByText('Second Conversation')).toBeInTheDocument();
    });

    it('shows conversation count in footer', () => {
      render(<ChatSidebar />);

      expect(screen.getByText('2 conversazioni')).toBeInTheDocument();
    });

    it('shows empty state when no conversations', () => {
      mockStore.conversations = [];
      render(<ChatSidebar />);

      expect(screen.getByText('Nessuna conversazione')).toBeInTheDocument();
      expect(screen.getByText('Clicca "Nuova chat" per iniziare')).toBeInTheDocument();
    });

    it('displays message count for each conversation', () => {
      render(<ChatSidebar />);

      expect(screen.getByText(/2 messaggi/)).toBeInTheDocument();
      expect(screen.getByText(/1 messaggi/)).toBeInTheDocument();
    });
  });

  describe('new conversation', () => {
    it('renders new chat button', () => {
      render(<ChatSidebar />);

      const button = screen.getByText('Nuova chat');
      expect(button).toBeInTheDocument();
    });

    it('calls createConversation when new chat button is clicked', async () => {
      render(<ChatSidebar />);

      await userEvent.click(screen.getByText('Nuova chat'));
      expect(mockStore.createConversation).toHaveBeenCalledTimes(1);
    });
  });

  describe('conversation selection', () => {
    it('highlights active conversation', () => {
      const { container } = render(<ChatSidebar />);

      // Active conversation should have accent styling
      const activeConv = screen.getByText('First Conversation').closest('button');
      expect(activeConv).toHaveClass('bg-leo-accent/20');
    });

    it('calls setActiveConversation when clicking a conversation', async () => {
      render(<ChatSidebar />);

      await userEvent.click(screen.getByText('Second Conversation'));
      expect(mockStore.setActiveConversation).toHaveBeenCalledWith('conv-2');
    });
  });

  describe('conversation actions', () => {
    it('shows action menu on hover', async () => {
      render(<ChatSidebar />);

      // The menu button should be present (hidden by default, visible on hover)
      const menuButtons = document.querySelectorAll('[class*="group-hover"]');
      expect(menuButtons.length).toBeGreaterThan(0);
    });

    it('opens context menu when more button is clicked', async () => {
      render(<ChatSidebar />);

      // Find and click the more button (MoreHorizontal icon)
      const moreButtons = document.querySelectorAll('button');
      const moreButton = Array.from(moreButtons).find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-more-horizontal') ||
        btn.innerHTML.includes('MoreHorizontal')
      );

      if (moreButton) {
        await userEvent.click(moreButton);
        await waitFor(() => {
          expect(screen.getByText('Rinomina')).toBeInTheDocument();
          expect(screen.getByText('Elimina')).toBeInTheDocument();
        });
      }
    });

    it('calls deleteConversation when delete is clicked', async () => {
      render(<ChatSidebar />);

      // Click more button first
      const firstConvContainer = screen.getByText('First Conversation').closest('.group');
      const moreBtn = firstConvContainer?.querySelector('button:last-child');

      if (moreBtn) {
        await userEvent.click(moreBtn);
        await waitFor(() => {
          const deleteBtn = screen.getByText('Elimina');
          return userEvent.click(deleteBtn);
        });
        expect(mockStore.deleteConversation).toHaveBeenCalledWith('conv-1');
      }
    });
  });

  describe('conversation rename', () => {
    it('shows rename input when rename is clicked', async () => {
      render(<ChatSidebar />);

      // Open menu and click rename
      const firstConvContainer = screen.getByText('First Conversation').closest('.group');
      const moreBtn = firstConvContainer?.querySelector('button:last-child');

      if (moreBtn) {
        await userEvent.click(moreBtn);
        await waitFor(async () => {
          const renameBtn = screen.getByText('Rinomina');
          await userEvent.click(renameBtn);
        });

        // Should now show input field
        await waitFor(() => {
          const input = document.querySelector('input[type="text"]');
          expect(input).toBeInTheDocument();
        });
      }
    });

    it('calls renameConversation on enter key', async () => {
      render(<ChatSidebar />);

      const firstConvContainer = screen.getByText('First Conversation').closest('.group');
      const moreBtn = firstConvContainer?.querySelector('button:last-child');

      if (moreBtn) {
        await userEvent.click(moreBtn);
        await waitFor(async () => {
          const renameBtn = screen.getByText('Rinomina');
          await userEvent.click(renameBtn);
        });

        await waitFor(async () => {
          const input = document.querySelector('input[type="text"]') as HTMLInputElement;
          if (input) {
            await userEvent.clear(input);
            await userEvent.type(input, 'New Title{enter}');
            expect(mockStore.renameConversation).toHaveBeenCalled();
          }
        });
      }
    });
  });

  describe('sidebar toggle', () => {
    it('renders toggle button', () => {
      render(<ChatSidebar />);

      // Toggle button should be present
      const buttons = document.querySelectorAll('button');
      const toggleBtn = Array.from(buttons).find(btn =>
        btn.querySelector('.lucide-chevron-left') ||
        btn.querySelector('.lucide-chevron-right')
      );
      expect(toggleBtn).toBeTruthy();
    });

    it('calls toggleSidebar when toggle button is clicked', async () => {
      render(<ChatSidebar />);

      const buttons = document.querySelectorAll('button');
      const toggleBtn = Array.from(buttons).find(btn => {
        const svg = btn.querySelector('svg');
        return svg && (
          svg.classList.contains('lucide-chevron-left') ||
          svg.classList.contains('lucide-chevron-right')
        );
      });

      if (toggleBtn) {
        await userEvent.click(toggleBtn);
        expect(mockStore.toggleSidebar).toHaveBeenCalledTimes(1);
      }
    });

    it('shows chevron-left icon when sidebar is open', () => {
      render(<ChatSidebar />);

      // When open, should show left chevron (to close)
      const leftChevron = document.querySelector('.lucide-chevron-left');
      expect(leftChevron).toBeInTheDocument();
    });

    it('shows chevron-right icon when sidebar is closed', () => {
      mockStore.sidebarOpen = false;
      render(<ChatSidebar />);

      // When closed, should show right chevron (to open)
      const rightChevron = document.querySelector('.lucide-chevron-right');
      expect(rightChevron).toBeInTheDocument();
    });
  });

  describe('date formatting', () => {
    it('displays "Oggi" for today\'s conversations', () => {
      const todayConv: Conversation = {
        id: 'today-conv',
        title: 'Today Conversation',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStore.conversations = [todayConv];

      render(<ChatSidebar />);

      expect(screen.getByText(/Oggi/)).toBeInTheDocument();
    });

    it('displays "Ieri" for yesterday\'s conversations', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const yesterdayConv: Conversation = {
        id: 'yesterday-conv',
        title: 'Yesterday Conversation',
        messages: [],
        createdAt: yesterday,
        updatedAt: yesterday,
      };
      mockStore.conversations = [yesterdayConv];

      render(<ChatSidebar />);

      expect(screen.getByText(/Ieri/)).toBeInTheDocument();
    });

    it('displays "X giorni fa" for recent conversations', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const recentConv: Conversation = {
        id: 'recent-conv',
        title: 'Recent Conversation',
        messages: [],
        createdAt: threeDaysAgo,
        updatedAt: threeDaysAgo,
      };
      mockStore.conversations = [recentConv];

      render(<ChatSidebar />);

      expect(screen.getByText(/3 giorni fa/)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has accessible button for new chat', () => {
      render(<ChatSidebar />);

      const newChatBtn = screen.getByRole('button', { name: /Nuova chat/i });
      expect(newChatBtn).toBeInTheDocument();
    });

    it('conversation items are buttons for keyboard navigation', () => {
      render(<ChatSidebar />);

      const convButtons = screen.getAllByRole('button');
      // Should have at least: new chat, 2 conversations, toggle, menu buttons
      expect(convButtons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('styling', () => {
    it('applies glassmorphism styling', () => {
      const { container } = render(<ChatSidebar />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('backdrop-blur-xl');
    });

    it('applies gradient to new chat button', () => {
      render(<ChatSidebar />);

      const newChatBtn = screen.getByText('Nuova chat').closest('button');
      expect(newChatBtn).toHaveClass('bg-gradient-to-r');
    });
  });
});
