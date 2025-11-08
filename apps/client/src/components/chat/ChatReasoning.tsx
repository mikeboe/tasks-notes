import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Streamdown } from 'streamdown';

interface ChatReasoningProps {
  content: string;
  isStreaming?: boolean;
}

export function ChatReasoning({ content, isStreaming = false }: ChatReasoningProps) {
  const [isExpanded, setIsExpanded] = useState(isStreaming);

  return (
    <div className="border rounded-lg overflow-hidden bg-blue-50 dark:bg-blue-950/20">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 h-auto hover:bg-blue-100 dark:hover:bg-blue-950/40"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium">Reasoning</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>

      {isExpanded && (
        <div className="p-3 border-t">
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
            <Streamdown isAnimating={isStreaming}>
              {content}
            </Streamdown>
          </div>
        </div>
      )}
    </div>
  );
}
