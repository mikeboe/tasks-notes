import { useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { ChatConversationList } from '@/components/chat/ChatConversationList';
import { ChatConversation } from '@/components/chat/ChatConversation';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatQuickActions } from '@/components/chat/ChatQuickActions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

export default function ChatPage() {
  const { loadConversations, currentConversation, chatMode, toggleMode } = useChat();

  // Load conversations when the page mounts
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Panel - Conversation List */}
      <div className="w-80 shrink-0">
        <ChatConversationList />
      </div>

      {/* Right Panel - Current Conversation */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">
                {currentConversation?.title || 'AI Assistant'}
              </h1>
            </div>
          </div>

          {/* Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMode}
            className="gap-2"
          >
            <Badge variant={chatMode === 'agent' ? 'default' : 'secondary'}>
              {chatMode === 'agent' ? 'Agent Mode' : 'Ask Mode'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {chatMode === 'agent' ? 'With tools' : 'Simple Q&A'}
            </span>
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          {currentConversation ? (
            <ChatConversation />
          ) : (
            <div className="h-full flex items-center justify-center">
              <ChatQuickActions />
            </div>
          )}
        </div>

        {/* Input Area */}
        <ChatInput />
      </div>
    </div>
  );
}
