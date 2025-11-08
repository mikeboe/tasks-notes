import { useState, useRef, type KeyboardEvent } from 'react';
import { Plus, Mic, Globe, Loader2 } from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LlmModelName } from '@/lib/chat-api';

const MODEL_OPTIONS: { value: LlmModelName; label: string }[] = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { value: 'o3-mini', label: 'O3 Mini' },
];

export function ChatInput() {
  const { sendMessage, isStreaming, selectedModel, setModel } = useChat();
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const message = input;
    setInput('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await sendMessage(message);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <div className="p-4 pb-6 bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Main input container */}
        <div className="relative flex flex-col gap-2 border rounded-3xl px-5 py-3 bg-background shadow-sm hover:shadow-md transition-shadow">
          {/* Input field - top section, 2-3 lines */}
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="What would you like to know?"
            className="w-full border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[56px] max-h-[120px] px-0 py-0 text-base"
            disabled={isStreaming}
            rows={2}
          />

          {/* Bottom row - controls */}
          <div className="flex items-center justify-between gap-2">
            {/* Left side - action buttons and model selector */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-accent"
                disabled={isStreaming}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-accent"
                disabled={isStreaming}
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-full hover:bg-accent px-3"
                disabled={isStreaming}
              >
                <Globe className="h-4 w-4 mr-1.5" />
                <span className="text-sm">Search</span>
              </Button>

              {/* Vertical divider */}
              <div className="h-6 w-px bg-border mx-1" />

              {/* Model selector */}
              <Select value={selectedModel} onValueChange={(value) => setModel(value as LlmModelName)}>
                <SelectTrigger className="h-9 border-0 focus:ring-0 focus:ring-offset-0 bg-transparent hover:bg-accent rounded-full px-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Right side - submit button */}
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              size="icon"
              className="h-10 w-10 rounded-full shrink-0"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
