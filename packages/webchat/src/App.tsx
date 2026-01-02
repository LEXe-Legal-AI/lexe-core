import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { GlassCard } from '@/components/effects/GlassCard';
import { ChatMessage as ChatMessageComponent } from '@/components/chat/ChatMessage';
import {
  FileUploadTrigger,
  PendingAttachmentsBar,
  DropZoneOverlay,
  useFileDrop,
} from '@/components/chat/FileUpload';
import { ChatSidebar } from '@/components/layout/ChatSidebar';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import { ToolExecutionList } from '@/components/preview/ToolExecutionCard';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { UserMenu } from '@/components/ui/UserMenu';
import { useChatStore, useAttachmentStore, useUIStore, useStreamStore, selectToolCalls } from '@/stores';
import { useStreaming } from '@/hooks/useStreaming';
import { cn } from '@/lib/utils';

// Icons
import {
  Send,
  Paperclip,
  Moon,
  Sun,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
} from 'lucide-react';

export default function App() {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Theme and UI state from persisted store
  const { theme, toggleTheme, initializeTheme, previewPanelOpen, togglePreview } = useUIStore();

  // Tool calls from stream store
  const toolCalls = useStreamStore(selectToolCalls);
  const streamIsStreaming = useStreamStore((state) => state.isStreaming);
  const { addToolCall, completeToolCall, startStream, endStream, reset: resetStream } = useStreamStore();

  // Zustand store
  const {
    isStreaming,
    streamingContent,
    sidebarOpen,
    getMessages,
    addMessage,
    setStreaming,
    setStreamingContent,
    completeStreaming,
    toggleSidebar,
    activeConversationId,
    createConversation,
  } = useChatStore();

  // Attachment store
  const {
    pendingAttachments,
    clearPending,
  } = useAttachmentStore();

  const { handleFiles } = useFileDrop();

  const messages = getMessages();

  // Real streaming hook
  const {
    message: _streamingMessage,
    isStreaming: _backendStreaming,
    error: _streamingError,
    sendMessage: sendStreamingMessage,
    stop: _stopBackendStreaming,
  } = useStreaming({
    onStart: () => {
      // Reset and start stream store
      resetStream();
      startStream();
    },
    onToken: (token) => {
      // Update streaming content as tokens arrive
      // Get current content from store and append new token
      const currentContent = useChatStore.getState().streamingContent || '';
      setStreamingContent(currentContent + token);
    },
    onToolUpdate: (tool) => {
      // Propagate tool updates to stream store for PreviewPanel
      if (tool.status === 'executing') {
        addToolCall({
          id: tool.id,
          name: tool.name,
          type: 'custom',
          status: 'executing',
          input: tool.input,
        });
      } else {
        // Tool completed or failed
        completeToolCall(
          tool.id,
          tool.output,
          tool.status === 'failed' ? 'Tool execution failed' : undefined
        );
      }
    },
    onComplete: (msg) => {
      // Complete streaming with full message
      endStream();
      completeStreaming(msg.content);
    },
    onError: (err) => {
      console.error('Streaming error:', err);
      endStream();
      completeStreaming(`❌ Errore: ${err.message}`);
    },
  });

  // Has pending attachments
  const hasAttachments = useMemo(
    () => pendingAttachments.length > 0,
    [pendingAttachments]
  );

  // Initialize theme on mount
  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  // Auto-focus input when conversation changes
  useEffect(() => {
    // Small delay to ensure UI is ready
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [activeConversationId]);

  // Handle send message
  const handleSend = useCallback(async () => {
    const hasContent = inputValue.trim() || hasAttachments;
    if (!hasContent || isStreaming) return;

    // Ensure we have an active conversation
    if (!activeConversationId) {
      createConversation();
    }

    // Build message content with attachments
    const attachmentInfo = hasAttachments
      ? `\n\n[${pendingAttachments.length} file(s) attached: ${pendingAttachments.map((a) => a.filename).join(', ')}]`
      : '';

    // Add user message
    addMessage({
      role: 'user',
      content: inputValue.trim() + attachmentInfo,
    });

    // Clear input and attachments
    setInputValue('');
    clearPending();

    // Use SSE streaming with backend
    try {
      setStreaming(true);
      setStreamingContent('');

      // Convert pending attachments to File array if needed
      const attachmentFiles = pendingAttachments.map(a => a.file).filter((f): f is File => f !== undefined);

      // Send via streaming hook
      await sendStreamingMessage(inputValue.trim(), attachmentFiles);
    } catch (error) {
      console.error('Failed to send message:', error);
      completeStreaming(`Errore di connessione: ${error instanceof Error ? error.message : 'Sconosciuto'}`);
    }
  }, [inputValue, isStreaming, addMessage, activeConversationId, createConversation, setStreaming, setStreamingContent, completeStreaming, hasAttachments, pendingAttachments, clearPending, sendStreamingMessage]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (streamingContent) {
      completeStreaming(streamingContent);
    } else {
      setStreaming(false);
    }
  }, [streamingContent, completeStreaming, setStreaming]);

  // Auto-scroll to bottom on new messages
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      dragCounterRef.current = 0;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
        e.dataTransfer.clearData();
      }
    },
    [handleFiles]
  );

  return (
    <div
      className={cn(
        'h-screen overflow-hidden transition-colors duration-300',
        'bg-background text-foreground'
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Background gradient - theme aware */}
      <div className={cn(
        'fixed inset-0 pointer-events-none transition-all duration-300',
        'dark:bg-gradient-to-br dark:from-leo-dark dark:via-leo-primary/20 dark:to-leo-dark',
        'bg-gradient-to-br from-slate-100 via-slate-50 to-white'
      )} />

      {/* Drop zone overlay */}
      <DropZoneOverlay isOver={isDragOver} />

      {/* Main layout with sidebar */}
      <div className="relative h-full flex">
        {/* Sidebar */}
        <ChatSidebar />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 border-b border-border/50"
          >
            <div className="flex items-center gap-3">
              {/* Sidebar toggle for mobile */}
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-muted transition-colors lg:hidden"
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="w-5 h-5" />
                ) : (
                  <PanelLeft className="w-5 h-5" />
                )}
              </button>

              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-leo-primary via-leo-accent to-leo-secondary flex items-center justify-center shadow-lg shadow-leo-primary/30"
              >
                <span className="text-lg font-bold text-white">L</span>
              </motion.div>
              <div>
                <h1 className="text-lg font-heading font-semibold text-foreground">
                  LEO Webchat
                </h1>
                <p className="text-xs text-muted-foreground/70">{t('app.tagline')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LanguageSelector compact />
              <ModelSelector />
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title={theme === 'dark' ? t('theme.light') : t('theme.dark')}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* Tools Panel Toggle */}
              <button
                onClick={togglePreview}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  previewPanelOpen
                    ? 'bg-leo-accent/20 text-leo-accent'
                    : 'hover:bg-muted text-muted-foreground'
                )}
                title={t('tools.title')}
              >
                {previewPanelOpen ? (
                  <PanelRightClose className="w-5 h-5" />
                ) : (
                  <PanelRight className="w-5 h-5" />
                )}
              </button>

              {/* User Menu */}
              <UserMenu />
            </div>
          </motion.header>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 && !isStreaming ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <GlassCard variant="dark" padding="lg" className="max-w-lg">
                    <div className="flex justify-center mb-4">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-leo-accent to-emerald-400 flex items-center justify-center shadow-lg shadow-leo-accent/20"
                      >
                        <MessageSquare className="w-8 h-8 text-white" />
                      </motion.div>
                    </div>
                    <h2 className="text-2xl font-heading font-semibold mb-2 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                      {t('chat:messages.no_messages').split('.')[0]}
                    </h2>
                    <p className="text-muted-foreground mb-4">
                      {t('chat:messages.no_messages').split('.')[1] || 'Start a conversation!'}
                    </p>
                  </GlassCard>
                </motion.div>
              </div>
            ) : (
              <div className="space-y-1 max-w-4xl mx-auto">
                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => (
                    <ChatMessageComponent
                      key={msg.id}
                      id={msg.id}
                      role={msg.role}
                      content={msg.content}
                      timestamp={msg.timestamp}
                    />
                  ))}
                  {/* Streaming message */}
                  {isStreaming && (
                    <ChatMessageComponent
                      key="streaming"
                      id="streaming"
                      role="assistant"
                      content=""
                      isStreaming={true}
                      streamingContent={streamingContent}
                      onSkipStreaming={stopStreaming}
                    />
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="border-t border-border"
          >
            {/* Pending attachments bar */}
            <AnimatePresence>
              {hasAttachments && <PendingAttachmentsBar />}
            </AnimatePresence>

            <div className="p-4 pt-2 max-w-4xl mx-auto">
              <GlassCard
                padding="sm"
                className="flex items-end gap-2 border border-border hover:border-border/80 transition-colors"
              >
                <FileUploadTrigger
                  onFilesSelected={handleFiles}
                  disabled={isStreaming}
                >
                  <button
                    className={cn(
                      'p-3 rounded-xl transition-all duration-200',
                      'hover:bg-muted hover:scale-105',
                      'active:scale-95',
                      hasAttachments && 'text-leo-accent'
                    )}
                    title={t('chat:input.attach_tooltip')}
                  >
                    <Paperclip className="w-5 h-5 text-muted-foreground" />
                  </button>
                </FileUploadTrigger>

                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={t('chat:input.placeholder')}
                  className={cn(
                    'flex-1 bg-transparent resize-none',
                    'text-foreground placeholder:text-muted-foreground/60',
                    'focus:outline-none focus:placeholder:text-muted-foreground/40',
                    'min-h-[44px] max-h-[200px] py-3',
                    'transition-colors duration-200'
                  )}
                  rows={1}
                  disabled={isStreaming}
                />

                <motion.button
                  onClick={handleSend}
                  disabled={(!inputValue.trim() && !hasAttachments) || isStreaming}
                  whileHover={{ scale: (inputValue.trim() || hasAttachments) && !isStreaming ? 1.05 : 1 }}
                  whileTap={{ scale: (inputValue.trim() || hasAttachments) && !isStreaming ? 0.95 : 1 }}
                  className={cn(
                    'p-3 rounded-xl transition-all duration-200',
                    (inputValue.trim() || hasAttachments) && !isStreaming
                      ? 'bg-gradient-to-r from-leo-accent to-emerald-500 text-white shadow-lg shadow-leo-accent/20'
                      : 'bg-muted text-muted-foreground/50 cursor-not-allowed'
                  )}
                  title={t('chat:input.send_tooltip')}
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </GlassCard>

              {/* Typing hint */}
              <p className="text-center text-xs text-muted-foreground/50 mt-2">
                Press{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Enter</kbd> to
                send,{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">
                  Shift+Enter
                </kbd>{' '}
                for new line
              </p>
            </div>
          </motion.div>
        </div>

        {/* Tools/Preview Panel */}
        <AnimatePresence>
          {previewPanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden border-l border-border"
            >
              <PreviewPanel
                onClose={togglePreview}
                toolCount={toolCalls.length}
                isLoading={streamIsStreaming && toolCalls.length === 0}
                toolExecution={
                  toolCalls.length > 0 ? (
                    <ToolExecutionList
                      tools={toolCalls.map((tc) => ({
                        ...tc,
                        startedAt: tc.startedAt ? new Date(tc.startedAt) : undefined,
                        completedAt: tc.completedAt ? new Date(tc.completedAt) : undefined,
                      }))}
                    />
                  ) : undefined
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
