import { useChat } from '@/context/ChatContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Simple relative time formatter
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMins = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMs / 3600000);
  const diffInDays = Math.floor(diffInMs / 86400000);

  if (diffInMins < 1) return 'just now';
  if (diffInMins < 60) return `${diffInMins}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

export function ChatConversationList() {
  const {
    conversations,
    currentConversation,
    createConversation,
    selectConversation,
    deleteConversation,
    isLoading,
  } = useChat();

  const handleNewChat = async () => {
    await createConversation();
  };

  const handleSelectConversation = async (id: string) => {
    if (currentConversation?.id !== id) {
      await selectConversation(id);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      await deleteConversation(id);
    }
  };

  return (
    <div className="flex flex-col h-full border-r bg-background">
      {/* Header */}
      <div className="p-4 border-b">
        <Button
          onClick={handleNewChat}
          className="w-full"
          variant="default"
          disabled={isLoading}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading && conversations.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 px-4 text-muted-foreground text-sm">
              No conversations yet.
              <br />
              Start a new chat to begin.
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={cn(
                    'group relative flex flex-col gap-1 p-3 rounded-lg cursor-pointer transition-colors',
                    'hover:bg-accent',
                    currentConversation?.id === conv.id && 'bg-accent'
                  )}
                >
                  {/* Title or Preview */}
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conv.title || conv.lastMessagePreview || 'New conversation'}
                      </p>
                      {!conv.title && conv.lastMessagePreview && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.lastMessagePreview}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground ml-6">
                    <span>
                      {conv.messageCount} {conv.messageCount === 1 ? 'message' : 'messages'}
                    </span>
                    <span>
                      {formatRelativeTime(conv.updatedAt)}
                    </span>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
