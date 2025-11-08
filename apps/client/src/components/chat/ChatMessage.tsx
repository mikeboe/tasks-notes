import { User, Bot, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { type Message } from '@/lib/chat-api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Streamdown } from 'streamdown';
import { ChatToolCall } from './ChatToolCall';
import { ChatReasoning } from './ChatReasoning';
import { ChatSources } from './ChatSources';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message content */}
      <div className={cn('flex flex-col gap-2 max-w-[80%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-lg px-4 py-2 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted',
            isStreaming && 'animate-pulse'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Streamdown isAnimating={isStreaming}>
                {message.content}
              </Streamdown>
            </div>
          )}
        </div>

        {/* Assistant message extras */}
        {!isUser && (
          <div className="flex flex-col gap-2 w-full">
            {/* Reasoning */}
            {message.metadata?.reasoning && (
              <ChatReasoning content={message.metadata.reasoning} isStreaming={isStreaming} />
            )}

            {/* Tool calls (for agent mode) */}
            {message.messageType === 'tool_call' && message.metadata?.tool_name && (
              <ChatToolCall
                toolName={message.metadata.tool_name}
                args={message.metadata.tool_args}
                result={message.metadata.tool_result}
                error={message.metadata.error}
              />
            )}

            {/* Sources */}
            {message.metadata?.sources && message.metadata.sources.length > 0 && (
              <ChatSources sources={message.metadata.sources} />
            )}

            {/* Actions */}
            {!isStreaming && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-6 px-2 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
