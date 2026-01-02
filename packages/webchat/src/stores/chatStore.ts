import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Chat message structure
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

/**
 * Conversation structure
 */
export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Chat store state
 */
interface ChatState {
  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;

  // Current streaming state
  isStreaming: boolean;
  streamingContent: string;

  // UI state
  sidebarOpen: boolean;
  demoMode: boolean;

  // Actions - Conversations
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  renameConversation: (id: string, title: string) => void;

  // Actions - Messages
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, content: string) => void;
  clearMessages: () => void;

  // Actions - Streaming
  setStreaming: (isStreaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  completeStreaming: (content: string) => void;

  // Actions - UI
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDemoMode: () => void;

  // Getters
  getActiveConversation: () => Conversation | null;
  getMessages: () => ChatMessage[];
}

/**
 * Generate unique ID
 */
const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/**
 * Generate conversation title from first message
 */
const generateTitle = (content: string): string => {
  const maxLength = 30;
  const cleaned = content.replace(/\n/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength).trim() + '...';
};

/**
 * Chat store with persistence
 */
export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      conversations: [],
      activeConversationId: null,
      isStreaming: false,
      streamingContent: '',
      sidebarOpen: true,
      demoMode: true,

      // Conversation actions
      createConversation: () => {
        const id = generateId();
        const now = new Date();
        const conversation: Conversation = {
          id,
          title: 'Nuova conversazione',
          messages: [],
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: id,
        }));

        return id;
      },

      deleteConversation: (id) => {
        set((state) => {
          const newConversations = state.conversations.filter((c) => c.id !== id);
          const newActiveId =
            state.activeConversationId === id
              ? newConversations[0]?.id ?? null
              : state.activeConversationId;

          return {
            conversations: newConversations,
            activeConversationId: newActiveId,
          };
        });
      },

      setActiveConversation: (id) => {
        set({ activeConversationId: id, streamingContent: '', isStreaming: false });
      },

      renameConversation: (id, title) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title, updatedAt: new Date() } : c
          ),
        }));
      },

      // Message actions
      addMessage: (message) => {
        const { activeConversationId, createConversation } = get();

        // Create conversation if none exists
        let conversationId = activeConversationId;
        if (!conversationId) {
          conversationId = createConversation();
        }

        const newMessage: ChatMessage = {
          ...message,
          id: generateId(),
          timestamp: new Date(),
        };

        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;

            // Update title if first user message
            const isFirstUserMessage =
              message.role === 'user' && c.messages.filter((m) => m.role === 'user').length === 0;

            return {
              ...c,
              messages: [...c.messages, newMessage],
              title: isFirstUserMessage ? generateTitle(message.content) : c.title,
              updatedAt: new Date(),
            };
          }),
        }));
      },

      updateMessage: (id, content) => {
        set((state) => ({
          conversations: state.conversations.map((c) => ({
            ...c,
            messages: c.messages.map((m) => (m.id === id ? { ...m, content } : m)),
          })),
        }));
      },

      clearMessages: () => {
        const { activeConversationId } = get();
        if (!activeConversationId) return;

        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === activeConversationId
              ? { ...c, messages: [], title: 'Nuova conversazione', updatedAt: new Date() }
              : c
          ),
        }));
      },

      // Streaming actions
      setStreaming: (isStreaming) => set({ isStreaming }),

      setStreamingContent: (content) => set({ streamingContent: content }),

      completeStreaming: (content) => {
        const { activeConversationId } = get();
        if (!activeConversationId) return;

        const newMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content,
          timestamp: new Date(),
        };

        set((state) => ({
          isStreaming: false,
          streamingContent: '',
          conversations: state.conversations.map((c) =>
            c.id === activeConversationId
              ? { ...c, messages: [...c.messages, newMessage], updatedAt: new Date() }
              : c
          ),
        }));
      },

      // UI actions
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleDemoMode: () => set((state) => ({ demoMode: !state.demoMode })),

      // Getters
      getActiveConversation: () => {
        const { conversations, activeConversationId } = get();
        return conversations.find((c) => c.id === activeConversationId) ?? null;
      },

      getMessages: () => {
        const conversation = get().getActiveConversation();
        return conversation?.messages ?? [];
      },
    }),
    {
      name: 'leo-chat-storage',
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        demoMode: state.demoMode,
      }),
    }
  )
);

export default useChatStore;
