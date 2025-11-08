import { Sparkles, Calendar, CheckSquare, FileText, Tag } from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  prompt: string;
  description: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'tasks-due-today',
    icon: Calendar,
    label: 'Tasks Due Today',
    prompt: 'Which tasks are due today?',
    description: 'See your tasks for today',
  },
  {
    id: 'recent-notes',
    icon: FileText,
    label: 'Recent Notes',
    prompt: 'Show me my recent notes from the last week',
    description: 'View recently edited notes',
  },
  {
    id: 'overdue-tasks',
    icon: CheckSquare,
    label: 'Overdue Tasks',
    prompt: 'What tasks are overdue and need my attention?',
    description: 'Find overdue items',
  },
  {
    id: 'summarize-progress',
    icon: Sparkles,
    label: 'Daily Summary',
    prompt: 'Summarize my progress today - what tasks I completed and notes I updated',
    description: 'Get a daily overview',
  },
  {
    id: 'find-by-tag',
    icon: Tag,
    label: 'Find by Tag',
    prompt: 'Show me notes tagged with',
    description: 'Search notes by tag',
  },
];

interface ChatQuickActionsProps {
  onActionClick?: (prompt: string) => void;
}

export function ChatQuickActions({ onActionClick }: ChatQuickActionsProps) {
  const { sendMessage, isStreaming } = useChat();

  const handleActionClick = async (action: QuickAction) => {
    if (isStreaming) return;

    // For tag action, we'll let the user type the tag
    if (action.id === 'find-by-tag') {
      onActionClick?.(action.prompt + ' ');
      return;
    }

    await sendMessage(action.prompt);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-medium">Quick Actions</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant="outline"
              className={cn(
                'h-auto flex flex-col items-start gap-2 p-4 hover:bg-accent transition-colors',
                isStreaming && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => handleActionClick(action)}
              disabled={isStreaming}
            >
              <div className="flex items-center gap-2 w-full">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{action.label}</span>
              </div>
              <p className="text-xs text-muted-foreground text-left">
                {action.description}
              </p>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
