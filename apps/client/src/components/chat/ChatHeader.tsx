import { X, Maximize2, Minimize2, MessageSquare, Sparkles } from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NewChatButton } from './NewChatButton';

export function ChatHeader() {
  const { chatMode, isDocked, currentConversation, toggleMode, toggleDocked, toggleChat } = useChat();

  return (
    <div className="flex items-center justify-between p-4 border-b bg-muted/30">
      <div className="flex items-center gap-2 flex-1">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold">
            {currentConversation?.title || 'AI Assistant'}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMode}
              className="h-6 px-2 text-xs"
            >
              {chatMode === 'ask' ? (
                <>
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Ask
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Agent
                </>
              )}
            </Button>
            <Badge variant="outline" className="text-xs">
              {chatMode === 'ask' ? 'Read-only' : 'Full access'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <NewChatButton
          variant="ghost"
          size="icon"
          showText={false}
          className="h-8 w-8"
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDocked}
          className="h-8 w-8 hidden sm:flex"
          aria-label={isDocked ? 'Undock' : 'Dock'}
        >
          {isDocked ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleChat}
          className="h-8 w-8"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
