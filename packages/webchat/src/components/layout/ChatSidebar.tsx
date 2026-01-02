import { memo, useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquarePlus,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatStore, type Conversation } from '@/stores';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}

const ConversationItem = memo(forwardRef<HTMLDivElement, ConversationItemProps>(function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onRename,
}, ref) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const [showMenu, setShowMenu] = useState(false);

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onRename(editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(conversation.title);
    setIsEditing(false);
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Oggi';
    if (diffDays === 1) return 'Ieri';
    if (diffDays < 7) return `${diffDays} giorni fa`;
    return d.toLocaleDateString();
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="group relative"
    >
      <button
        onClick={onSelect}
        className={cn(
          'w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200',
          'flex items-start gap-3',
          isActive
            ? 'bg-leo-accent/20 border border-leo-accent/30'
            : 'hover:bg-muted border border-transparent'
        )}
      >
        <MessageSquare
          className={cn(
            'w-4 h-4 mt-0.5 flex-shrink-0',
            isActive ? 'text-leo-accent' : 'text-muted-foreground'
          )}
        />

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                className="flex-1 bg-muted rounded px-2 py-0.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-leo-accent"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveEdit();
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <Check className="w-3 h-3 text-leo-accent" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelEdit();
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <>
              <p
                className={cn(
                  'text-sm font-medium truncate',
                  isActive ? 'text-foreground' : 'text-foreground/80'
                )}
              >
                {conversation.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {conversation.messages.length} messaggi · {formatDate(conversation.updatedAt)}
              </p>
            </>
          )}
        </div>
      </button>

      {/* Actions menu */}
      {!isEditing && (
        <div
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2',
            'opacity-0 group-hover:opacity-100 transition-opacity'
          )}
        >
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  className="absolute right-0 top-full mt-1 z-50 min-w-[120px] py-1 bg-card/95 backdrop-blur-xl border border-border rounded-lg shadow-xl"
                  onMouseLeave={() => setShowMenu(false)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      setIsEditing(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground/80 hover:bg-muted transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Rinomina
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Elimina
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
}));

/**
 * Chat sidebar with conversation history
 */
export const ChatSidebar = memo(function ChatSidebar() {
  const {
    conversations,
    activeConversationId,
    sidebarOpen,
    createConversation,
    deleteConversation,
    setActiveConversation,
    renameConversation,
    toggleSidebar,
  } = useChatStore();

  return (
    <>
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: sidebarOpen ? 280 : 0,
          opacity: sidebarOpen ? 1 : 0,
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'h-full bg-card/50 backdrop-blur-xl border-r border-border',
          'flex flex-col overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <button
            onClick={() => createConversation()}
            className={cn(
              'w-full flex items-center justify-center gap-2',
              'px-4 py-2.5 rounded-xl',
              'bg-gradient-to-r from-leo-accent to-emerald-500',
              'text-white font-medium text-sm',
              'shadow-lg shadow-leo-accent/20',
              'hover:shadow-xl hover:shadow-leo-accent/30',
              'transition-all duration-200',
              'hover:scale-[1.02] active:scale-[0.98]'
            )}
          >
            <MessageSquarePlus className="w-4 h-4" />
            Nuova chat
          </button>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <AnimatePresence mode="popLayout">
            {conversations.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 px-4"
              >
                <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Nessuna conversazione</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Clicca "Nuova chat" per iniziare
                </p>
              </motion.div>
            ) : (
              conversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={conversation.id === activeConversationId}
                  onSelect={() => setActiveConversation(conversation.id)}
                  onDelete={() => deleteConversation(conversation.id)}
                  onRename={(title) => renameConversation(conversation.id, title)}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            {conversations.length} conversazioni
          </p>
        </div>
      </motion.aside>

      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 z-20',
          'p-1.5 rounded-r-lg',
          'bg-muted/50 backdrop-blur-sm border border-l-0 border-border',
          'hover:bg-muted transition-colors',
          sidebarOpen ? 'translate-x-[280px]' : 'translate-x-0'
        )}
        style={{
          transition: 'transform 0.2s ease-in-out',
        }}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
    </>
  );
});

export default ChatSidebar;
