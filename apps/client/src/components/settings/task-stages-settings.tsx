import { useState, useEffect } from "react";
import { TasksApi } from "@/lib/tasks-api";
import { useTeamContext } from "@/hooks/use-team-context";
import type { TaskStage } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, GripVertical, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableStageItemProps {
  stage: TaskStage;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  isEditing: boolean;
  editValue: string;
  onEditChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
}

function SortableStageItem({
  stage,
  onEdit,
  onDelete,
  isEditing,
  editValue,
  onEditChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: SortableStageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border bg-card p-3"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      {isEditing ? (
        <>
          <Input
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            className="flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
          />
          <Button size="sm" variant="ghost" onClick={onSaveEdit}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancelEdit}>
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 font-medium">{stage.name}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={onStartEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(stage.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}

export function TaskStagesSettings() {
  const { teamId } = useTeamContext();
  const [stages, setStages] = useState<TaskStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newStageName, setNewStageName] = useState("");
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadStages = async () => {
    setIsLoading(true);
    try {
      const response = await TasksApi.getTaskStages(teamId);
      if (response.success && response.data) {
        setStages(response.data.sort((a, b) => a.order - b.order));
      } else {
        toast.error(response.error || "Failed to load task stages");
      }
    } catch (error) {
      toast.error("Failed to load task stages");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStages();
  }, [teamId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex((s) => s.id === active.id);
    const newIndex = stages.findIndex((s) => s.id === over.id);

    const newStages = arrayMove(stages, oldIndex, newIndex);
    setStages(newStages);

    // Update order on server
    const stageIds = newStages.map((s) => s.id);
    const response = await TasksApi.updateTaskStageOrder({ stage_ids: stageIds });
    if (!response.success) {
      toast.error(response.error || "Failed to update stage order");
      loadStages(); // Reload to get correct order
    }
  };

  const handleAddStage = async () => {
    if (!newStageName.trim()) {
      toast.error("Stage name cannot be empty");
      return;
    }

    const response = await TasksApi.createTaskStage({ name: newStageName.trim() }, teamId);
    if (response.success) {
      toast.success("Stage created successfully");
      setNewStageName("");
      loadStages();
    } else {
      toast.error(response.error || "Failed to create stage");
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (stages.length <= 1) {
      toast.error("You must have at least one stage");
      return;
    }

    const response = await TasksApi.deleteTaskStage(stageId);
    if (response.success) {
      toast.success("Stage deleted successfully");
      loadStages();
    } else {
      toast.error(response.error || "Failed to delete stage");
    }
  };

  const handleStartEdit = (stage: TaskStage) => {
    setEditingStageId(stage.id);
    setEditValue(stage.name);
  };

  const handleCancelEdit = () => {
    setEditingStageId(null);
    setEditValue("");
  };

  const handleSaveEdit = async () => {
    if (!editingStageId || !editValue.trim()) {
      toast.error("Stage name cannot be empty");
      return;
    }

    const response = await TasksApi.updateTaskStage(editingStageId, { name: editValue.trim() });
    if (response.success) {
      toast.success("Stage updated successfully");
      setEditingStageId(null);
      setEditValue("");
      loadStages();
    } else {
      toast.error(response.error || "Failed to update stage");
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading stages...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Task Stages</h3>
        <p className="text-sm text-muted-foreground">
          Customize your task board columns. Drag to reorder.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={stages.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {stages.map((stage) => (
              <SortableStageItem
                key={stage.id}
                stage={stage}
                onEdit={handleSaveEdit}
                onDelete={handleDeleteStage}
                isEditing={editingStageId === stage.id}
                editValue={editValue}
                onEditChange={setEditValue}
                onStartEdit={() => handleStartEdit(stage)}
                onCancelEdit={handleCancelEdit}
                onSaveEdit={handleSaveEdit}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2">
        <Input
          placeholder="New stage name..."
          value={newStageName}
          onChange={(e) => setNewStageName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddStage();
          }}
        />
        <Button onClick={handleAddStage}>
          <Plus className="h-4 w-4 mr-2" />
          Add Stage
        </Button>
      </div>
    </div>
  );
}
