import { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatToolCallProps {
  toolName: string;
  args?: Record<string, any>;
  result?: any;
  error?: string;
  isLoading?: boolean;
}

export function ChatToolCall({ toolName, args, result, error, isLoading = false }: ChatToolCallProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetails = (args && Object.keys(args).length > 0) || result || error;

  return (
    <div className="border rounded-lg overflow-hidden bg-muted/50">
      <Button
        variant="ghost"
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 px-3 h-auto hover:bg-muted/80"
        disabled={!hasDetails}
      >
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : error ? (
            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          ) : (
            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-xs font-medium">{formatToolName(toolName)}</span>
        </div>
        {hasDetails && (
          isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )
        )}
      </Button>

      {isExpanded && hasDetails && (
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
              <p className="font-medium mb-1 text-xs text-muted-foreground">
                Result: {getResultSummary(result)}
              </p>
              <div className="bg-background p-2 rounded text-xs overflow-x-auto max-h-64 overflow-y-auto">
                {typeof result === 'string' ? (
                  <pre className="whitespace-pre-wrap text-[10px] leading-tight">{result}</pre>
                ) : (
                  <pre className="text-[10px] leading-tight">{JSON.stringify(result, null, 2)}</pre>
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

function getResultSummary(result: any): string {
  if (!result) return '';

  const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

  // Extract first line or first meaningful content
  const lines = resultStr.split('\n').filter(line => line.trim());
  if (lines.length === 0) return 'Empty result';

  // Count items if it looks like a list result
  const foundMatch = resultStr.match(/Found (\d+) result\(s\)/);
  if (foundMatch) {
    return foundMatch[0];
  }

  // Count notes/items
  const noteMatches = resultStr.match(/ID: [a-f0-9-]{36}/g);
  if (noteMatches && noteMatches.length > 0) {
    return `${noteMatches.length} item(s)`;
  }

  // For short results, show truncated version
  if (resultStr.length <= 100) {
    return resultStr.trim();
  }

  return `${resultStr.substring(0, 80).trim()}...`;
}
