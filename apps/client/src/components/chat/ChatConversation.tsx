import { useEffect, useRef } from 'react';
import { useChat } from '@/context/ChatContext';
import { ChatMessage } from './ChatMessage';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChatConversation() {
  const { messages, isStreaming, streamingMessageContent, streamingToolCalls, isLoading, currentConversation } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, streamingMessageContent]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Don't show empty state - let the parent component handle it with quick actions
  if (!currentConversation && messages.length === 0) {
    return null;
  }

  return (
    <ScrollArea className="h-full w-full" ref={scrollRef}>
      <div className="flex flex-col gap-4 p-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isStreaming && (
          <>
            {/* Show active tool calls during streaming */}
            {streamingToolCalls.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground px-4">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Using tools: {streamingToolCalls.map(tc => formatToolName(tc.name)).join(', ')}</span>
              </div>
            )}

            {/* Show streaming message content */}
            {streamingMessageContent && (
              <ChatMessage
                message={{
                  id: 'streaming',
                  conversationId: currentConversation?.id || '',
                  role: 'assistant',
                  content: streamingMessageContent,
                  messageType: 'content',
                  order: messages.length,
                  createdAt: new Date().toISOString(),
                }}
                isStreaming
              />
            )}
          </>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

function formatToolName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
