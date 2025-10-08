import type { UniqueIdentifier } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { cva } from "class-variance-authority";
import { User, MessageSquare, ExternalLink, GripVertical } from "lucide-react";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import type { Task as TaskType } from "@/types";
import { cn } from "@/lib/utils";

export interface Task {
  id: UniqueIdentifier;
  columnId: string;
  content: string;
  task?: TaskType;
}



interface TaskCardProps {
  task: Task;
  isOverlay?: boolean;
  onTaskClick?: (taskId: string) => void;
}

export type TaskDragType = "Task";

export interface TaskDragData {
  type: "Task";
  task: Task;
}

export function TaskCard({ task, isOverlay, onTaskClick }: TaskCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    } satisfies TaskDragData,
    attributes: {
      roleDescription: "Task",
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const variants = cva("", {
    variants: {
      dragging: {
        over: "ring-2 opacity-30",
        overlay: "ring-2 ring-primary",
      },
    },
  });

  const taskData = task.task;
  const priority = taskData?.priority || 'medium';

  const handleTitleClick = (e: React.MouseEvent<HTMLHeadingElement>) => {
    e.stopPropagation();
    onTaskClick?.(task.id.toString());
  };

  const assignees = taskData?.assignees || [];
  const visibleAssignees = assignees.slice(0, 3);
  const remainingCount = Math.max(0, assignees.length - 3);

  const commentsCount = taskData?.comments?.length || 0;
  const linkedNotes = taskData?.linked_notes || [];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        variants({
          dragging: isOverlay ? "overlay" : isDragging ? "over" : undefined,
        }),
        "bg-gray-50 dark:bg-gray-800 text-card-foreground flex flex-col gap-6 rounded-xl py-6 focus-visible:ring-ring focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden touch-none select-none cursor-grab border-0 hover:shadow-md transition-shadow",
        isDragging && "cursor-grabbing",
        taskData?.isCompleted && "opacity-75"
      )}
    >
      {/* Card Header */}
      <div className="@container/card-header flex items-start gap-2 px-6">
        <div className="flex-1 grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5">
          <h3
            className="text-base font-semibold cursor-pointer"
            onClick={handleTitleClick}

          >
            {taskData?.title || task.content}
          </h3>
          {taskData?.notes && (
            <p className="text-muted-foreground text-sm">
              {taskData.notes.length > 60
                ? taskData.notes.substring(0, 60) + ".."
                : taskData.notes
              }
            </p>
          )}
        </div>
        <div
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors mt-0.5"
        >
          <GripVertical className="h-5 w-5" />
        </div>
      </div>

      {/* Card Content */}
      <div className="px-6 space-y-4">
        {/* Assignees */}
        <div className="text-muted-foreground flex items-center text-sm">
          <div className="flex -space-x-2 overflow-hidden">
            {visibleAssignees.map((assignee) => (
              <Avatar key={assignee.id} className="relative flex size-8 shrink-0 overflow-hidden rounded-full border-background border-2">
                <AvatarFallback>
                  {assignee.name?.charAt(0)?.toUpperCase() || <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            ))}
            {remainingCount > 0 && (
              <Avatar className="relative flex size-8 shrink-0 overflow-hidden rounded-full border-background border-2">
                <AvatarFallback className="text-xs">
                  +{remainingCount}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="bg-border shrink-0 h-px w-full"></div>

        {/* Bottom section with priority and comments */}
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          {/* Priority Badge */}
          <Badge
            variant="outline"
            className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 capitalize"
          >
            {priority}
          </Badge>

          {/* Comments count */}
          <div className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            <span>{commentsCount}</span>
          </div>
        </div>

        {/* Linked Notes */}
        {linkedNotes.length > 0 && (
          <>
            <div className="bg-border shrink-0 h-px w-full"></div>
            <div className="space-y-1.5">
              {linkedNotes.map((note) => (
                <a
                  key={note.id}
                  href={`/notes/${note.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3 shrink-0 group-hover:text-primary" />
                  <span className="truncate">{note.title}</span>
                </a>
              ))}
            </div>
          </>
        )}
      </div>

    </Card>
  );
}