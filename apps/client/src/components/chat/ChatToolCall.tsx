import { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatToolCallProps {
  toolName: string;
  args?: Record<string, any>;
  result?: any;
  error?: string;
}

export function ChatToolCall({ toolName, args, result, error }: ChatToolCallProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden bg-muted/50">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 h-auto hover:bg-muted/80"
      >
        <div className="flex items-center gap-2">
          {error ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <Wrench className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">{formatToolName(toolName)}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>

      {isExpanded && (
        <div className="p-3 border-t space-y-3 text-sm">
          {/* Arguments */}
          {args && Object.keys(args).length > 0 && (
            <div>
              <p className="font-medium mb-1 text-xs text-muted-foreground">Arguments:</p>
              <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}

          {/* Result */}
          {result && (
            <div>
              <p className="font-medium mb-1 text-xs text-muted-foreground">Result:</p>
              <div className="bg-background p-2 rounded text-xs overflow-x-auto max-h-48 overflow-y-auto">
                {typeof result === 'string' ? (
                  <pre className="whitespace-pre-wrap">{result}</pre>
                ) : (
                  <pre>{JSON.stringify(result, null, 2)}</pre>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div>
              <p className="font-medium mb-1 text-xs text-destructive">Error:</p>
              <p className="bg-destructive/10 text-destructive p-2 rounded text-xs">
                {error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatToolName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
