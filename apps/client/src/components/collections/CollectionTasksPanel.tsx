import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollections } from '@/context/CollectionsContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  FileTextIcon,
  MicIcon,
  SearchIcon,
  ListIcon,
  CheckCircleIcon,
  XCircleIcon,
  LoaderIcon,
  ExternalLinkIcon,
} from 'lucide-react';
import type { CollectionTask } from '@/lib/collections-api';

interface Props {
  collectionId: string;
  tasks: CollectionTask[];
}

const TASK_TYPES = [
  {
    type: 'summary' as const,
    icon: FileTextIcon,
    label: 'Create Summary',
    description: 'Comprehensive summary',
  },
  {
    type: 'podcast' as const,
    icon: MicIcon,
    label: 'Generate Podcast',
    description: 'Conversational script',
  },
  {
    type: 'research' as const,
    icon: SearchIcon,
    label: 'Conduct Research',
    description: 'Deep analysis',
  },
  {
    type: 'common_themes' as const,
    icon: ListIcon,
    label: 'Find Themes',
    description: 'Extract common themes',
  },
  {
    type: 'outline' as const,
    icon: ListIcon,
    label: 'Create Outline',
    description: 'Structured outline',
  },
];

export const CollectionTasksPanel: React.FC<Props> = ({ collectionId, tasks }) => {
  const navigate = useNavigate();
  const { createTask, deleteTask } = useCollections();

  const handleCreateTask = async (taskType: typeof TASK_TYPES[number]['type'], label: string) => {
    try {
      await createTask(collectionId, {
        taskType,
        title: label,
      });
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this task?')) return;

    try {
      await deleteTask(collectionId, taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleViewResult = (resultNoteId: string) => {
    navigate(`/note/${resultNoteId}`);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Task Templates */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium mb-2">Start New Task</h3>
        {TASK_TYPES.map(taskType => {
          const Icon = taskType.icon;
          return (
            <Button
              key={taskType.type}
              variant="outline"
              className="w-full justify-start h-auto py-2"
              onClick={() => handleCreateTask(taskType.type, taskType.label)}
            >
              <Icon className="mr-2 h-4 w-4 shrink-0" />
              <div className="text-left flex-1">
                <div className="text-sm font-medium">{taskType.label}</div>
                <div className="text-xs text-muted-foreground">
                  {taskType.description}
                </div>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Active/Completed Tasks */}
      {tasks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium mb-2">Tasks</h3>
          {tasks.map(task => (
            <div key={task.id} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {task.taskType.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {task.status === 'completed' && (
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  )}
                  {task.status === 'failed' && (
                    <XCircleIcon className="h-4 w-4 text-red-500" />
                  )}
                  {task.status === 'running' && (
                    <LoaderIcon className="h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>

              {task.status === 'running' && (
                <Progress value={task.progress} className="w-full h-1" />
              )}

              {task.status === 'failed' && task.error && (
                <p className="text-xs text-destructive">{task.error}</p>
              )}

              {task.status === 'completed' && task.resultNoteId && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start h-auto py-1"
                  onClick={() => handleViewResult(task.resultNoteId!)}
                >
                  <ExternalLinkIcon className="mr-2 h-3 w-3" />
                  <span className="text-xs">View Result</span>
                </Button>
              )}

              {(task.status === 'completed' || task.status === 'failed') && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive h-auto py-1"
                  onClick={(e) => handleDeleteTask(task.id, e)}
                >
                  <span className="text-xs">Delete</span>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
