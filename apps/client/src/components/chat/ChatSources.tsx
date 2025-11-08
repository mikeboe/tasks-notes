import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Source {
  id: string;
  title: string;
  type: string;
}

interface ChatSourcesProps {
  sources: Source[];
}

export function ChatSources({ sources }: ChatSourcesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="border rounded-lg overflow-hidden bg-green-50 dark:bg-green-950/20">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 h-auto hover:bg-green-100 dark:hover:bg-green-950/40"
      >
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium">
            Used {sources.length} source{sources.length > 1 ? 's' : ''}
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>

      {isExpanded && (
        <div className="p-3 border-t space-y-2">
          {sources.map((source) => (
            <Link
              key={source.id}
              to={`/note/${source.id}`}
              className="flex items-center gap-2 p-2 rounded hover:bg-green-100 dark:hover:bg-green-950/40 transition-colors"
            >
              <FileText className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{source.title}</span>
                <span className="text-xs text-muted-foreground capitalize">{source.type}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
