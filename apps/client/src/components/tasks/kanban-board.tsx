import { useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

import { BoardColumn, BoardContainer } from "./board-column";
import {
    DndContext,
    type DragEndEvent,
    type DragOverEvent,
    DragOverlay,
    type DragStartEvent,
    useSensor,
    useSensors,
    KeyboardSensor,
    type Announcements,
    type UniqueIdentifier,
    TouchSensor,
    MouseSensor,
} from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { type Task, TaskCard, type TaskDragData } from "./task-card";
import type { Column, ColumnDragData } from "./board-column";
import { hasDraggableData } from "./has-dragable";
import { coordinateGetter } from "./multiple-containers-keyboard-preset";
import { TasksApi } from "@/lib/tasks-api";
import type { Task as TaskType, TaskStage, User, TaskFilters } from "@/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TaskDetailModal } from "./task-detail-modal";

// Convert TaskStage to Column format for DnD
function stageToColumn(stage: TaskStage): Column {
  return {
    id: stage.id,
    title: stage.name
  };
}

// Convert TaskType to Task format for DnD
function taskToTask(task: TaskType): Task {
  return {
    id: task.id,
    columnId: task.statusId,
    content: task.title,
    task: task
  };
}

export type ColumnId = string;
export function KanbanBoard() {
    // API Data State
    const [stages, setStages] = useState<TaskStage[]>([]);
    const [allTasks, setAllTasks] = useState<TaskType[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filters
    const [filters, setFilters] = useState<TaskFilters>({});
    
    // Modal
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    
    // DnD State (converted from API data)
    const [columns, setColumns] = useState<Column[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const pickedUpTaskColumn = useRef<ColumnId | null>(null);
    const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);
    const [activeColumn, setActiveColumn] = useState<Column | null>(null);
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    const sensors = useSensors(
        useSensor(MouseSensor),
        useSensor(TouchSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: coordinateGetter,
        })
    );
    
    // Load initial data
    useEffect(() => {
        loadData();
    }, [filters]);
    
    // Convert API data to DnD format
    useEffect(() => {
        const sortedStages = [...stages].sort((a, b) => a.order - b.order);
        setColumns(sortedStages.map(stageToColumn));
        setTasks(allTasks.map(taskToTask));
    }, [stages, allTasks]);
    
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [tasksResponse, stagesResponse, usersResponse] = await Promise.all([
                TasksApi.getTasks(filters),
                TasksApi.getTaskStages(),
                TasksApi.getUsers()
            ]);
            
            if (tasksResponse.success && tasksResponse.data) {
                setAllTasks(tasksResponse.data);
            } else {
                toast.error(tasksResponse.error || 'Failed to load tasks');
            }
            
            if (stagesResponse.success && stagesResponse.data) {
                setStages(stagesResponse.data);
            } else {
                toast.error(stagesResponse.error || 'Failed to load stages');
            }

            if (usersResponse.success && usersResponse.data) {
                setUsers(usersResponse.data);
            } else {
                toast.error(usersResponse.error || 'Failed to load users');
            }
        } catch (error) {
            toast.error('Failed to load kanban data');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleTaskClick = (taskId: string) => {
        setSelectedTaskId(taskId);
    };
    
    const handleCompletionToggle = async (taskId: string, completed: boolean) => {
        try {
            const response = await TasksApi.updateTask(taskId, { is_completed: completed });
            if (response.success) {
                setAllTasks(prev => prev.map(task => 
                    task.id === taskId ? { ...task, isCompleted: completed } : task
                ));
                toast.success(completed ? 'Task completed' : 'Task marked incomplete');
            } else {
                toast.error(response.error || 'Failed to update task');
            }
        } catch (error) {
            toast.error('Failed to update task');
        }
    };
    
    const handleTaskDrop = async (taskId: string, newStatusId: string) => {
        try {
            const response = await TasksApi.updateTask(taskId, { status_id: newStatusId });
            if (response.success) {
                setAllTasks(prev => prev.map(task => 
                    task.id === taskId ? { ...task, statusId: newStatusId } : task
                ));
                toast.success('Task moved successfully');
            } else {
                toast.error(response.error || 'Failed to move task');
                // Revert the optimistic update by reloading
                loadData();
            }
        } catch (error) {
            toast.error('Failed to move task');
            loadData();
        }
    };
    
    const handleTaskCreated = async (newTask: TaskType) => {
        // Optimistically add the new task to the state
        setAllTasks(prev => [...prev, newTask]);
    };
    
    const handleTaskUpdated = async (updatedTask: TaskType) => {
        // Optimistically update the task in state
        setAllTasks(prev => prev.map(task => 
            task.id === updatedTask.id ? updatedTask : task
        ));
    };
    
    const handleModalClose = async (shouldRefresh?: boolean) => {
        setSelectedTaskId(null);
        if (shouldRefresh) {
            // Only refresh if something went wrong or we need fresh data
            await loadData();
        }
    };

    function getDraggingTaskData(taskId: UniqueIdentifier, columnId: ColumnId) {
        const tasksInColumn = tasks.filter((task) => task.columnId === columnId);
        const taskPosition = tasksInColumn.findIndex((task) => task.id === taskId);
        const column = columns.find((col) => col.id === columnId);
        return {
            tasksInColumn,
            taskPosition,
            column,
        };
    }

    const announcements: Announcements = {
        onDragStart({ active }) {
            if (!hasDraggableData(active)) return;
            if (active.data.current?.type === "Column") {
                const startColumnIdx = columnsId.findIndex((id) => id === active.id);
                const startColumn = columns[startColumnIdx];
                return `Picked up Column ${startColumn?.title} at position: ${startColumnIdx + 1
                    } of ${columnsId.length}`;
            } else if (active.data.current?.type === "Task") {
                const taskData = active.data.current as TaskDragData;
                pickedUpTaskColumn.current = taskData.task.columnId;
                const { tasksInColumn, taskPosition, column } = getDraggingTaskData(
                    active.id,
                    pickedUpTaskColumn.current
                );
                return `Picked up Task ${taskData.task.content
                    } at position: ${taskPosition + 1} of ${tasksInColumn.length
                    } in column ${column?.title}`;
            }
        },
        onDragOver({ active, over }) {
            if (!hasDraggableData(active) || !hasDraggableData(over)) return;

            if (
                active.data.current?.type === "Column" &&
                over.data.current?.type === "Column"
            ) {
                const overColumnIdx = columnsId.findIndex((id) => id === over.id);
                const activeColumnData = active.data.current as ColumnDragData;
                const overColumnData = over.data.current as ColumnDragData;
                return `Column ${activeColumnData.column.title} was moved over ${overColumnData.column.title
                    } at position ${overColumnIdx + 1} of ${columnsId.length}`;
            } else if (
                active.data.current?.type === "Task" &&
                over.data.current?.type === "Task"
            ) {
                const activeTaskData = active.data.current as TaskDragData;
                const overTaskData = over.data.current as TaskDragData;
                const { tasksInColumn, taskPosition, column } = getDraggingTaskData(
                    over.id,
                    overTaskData.task.columnId
                );
                if (overTaskData.task.columnId !== pickedUpTaskColumn.current) {
                    return `Task ${activeTaskData.task.content
                        } was moved over column ${column?.title} in position ${taskPosition + 1
                        } of ${tasksInColumn.length}`;
                }
                return `Task was moved over position ${taskPosition + 1} of ${tasksInColumn.length
                    } in column ${column?.title}`;
            }
        },
        onDragEnd({ active, over }) {
            if (!hasDraggableData(active) || !hasDraggableData(over)) {
                pickedUpTaskColumn.current = null;
                return;
            }
            if (
                active.data.current?.type === "Column" &&
                over.data.current?.type === "Column"
            ) {
                const overColumnPosition = columnsId.findIndex((id) => id === over.id);

                const activeColumnData = active.data.current as ColumnDragData;
                return `Column ${activeColumnData.column.title
                    } was dropped into position ${overColumnPosition + 1} of ${columnsId.length
                    }`;
            } else if (
                active.data.current?.type === "Task" &&
                over.data.current?.type === "Task"
            ) {
                const overTaskData = over.data.current as TaskDragData;
                const { tasksInColumn, taskPosition, column } = getDraggingTaskData(
                    over.id,
                    overTaskData.task.columnId
                );
                if (overTaskData.task.columnId !== pickedUpTaskColumn.current) {
                    return `Task was dropped into column ${column?.title} in position ${taskPosition + 1
                        } of ${tasksInColumn.length}`;
                }
                return `Task was dropped into position ${taskPosition + 1} of ${tasksInColumn.length
                    } in column ${column?.title}`;
            }
            pickedUpTaskColumn.current = null;
        },
        onDragCancel({ active }) {
            pickedUpTaskColumn.current = null;
            if (!hasDraggableData(active)) return;
            return `Dragging ${active.data.current?.type} cancelled.`;
        },
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Filters and Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <span className="text-sm font-medium">Filters:</span>
                    </div>
                    
                    <Select value={filters.assignee_id || 'all'} onValueChange={(value) => 
                        setFilters(prev => ({ ...prev, assignee_id: value === 'all' ? undefined : value }))}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Assigned to" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All assignees</SelectItem>
                            {users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                    {user.firstName} {user.lastName} ({user.email})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <Select value={filters.priority || 'all'} onValueChange={(value) => 
                        setFilters(prev => ({ ...prev, priority: value === 'all' ? undefined : value as TaskFilters['priority'] }))}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All priorities</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                <Button onClick={() => setSelectedTaskId('new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                </Button>
            </div>
            
            {/* Kanban Board */}
            <div className="flex-1 overflow-hidden">
                <DndContext
                    accessibility={{
                        announcements,
                    }}
                    sensors={sensors}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onDragOver={onDragOver}
                >
                    <BoardContainer>
                        <SortableContext items={columnsId}>
                            {columns.map((col) => (
                                <BoardColumn
                                    key={col.id}
                                    column={col}
                                    tasks={tasks.filter((task) => task.columnId === col.id)}
                                    onTaskClick={handleTaskClick}
                                    onCompletionToggle={handleCompletionToggle}
                                />
                            ))}
                        </SortableContext>
                    </BoardContainer>

                {"document" in window &&
                    createPortal(
                        <DragOverlay>
                            {activeColumn && (
                                <BoardColumn
                                    isOverlay
                                    column={activeColumn}
                                    tasks={tasks.filter(
                                        (task) => task.columnId === activeColumn.id
                                    )}
                                />
                            )}
                            {activeTask && <TaskCard task={activeTask} isOverlay />}
                        </DragOverlay>,
                        document.body
                    )}
            </DndContext>
            
            {/* Task Detail Modal */}
            <TaskDetailModal 
                taskId={selectedTaskId} 
                onClose={handleModalClose}
                onTaskCreated={handleTaskCreated}
                onTaskUpdated={handleTaskUpdated}
            />
        </div>
        </div>
    );
    

    function onDragStart(event: DragStartEvent) {
        if (!hasDraggableData(event.active)) return;
        const data = event.active.data.current;
        if (data?.type === "Column") {
            const columnData = data as ColumnDragData;
            setActiveColumn(columnData.column);
            return;
        }

        if (data?.type === "Task") {
            const taskData = data as TaskDragData;
            setActiveTask(taskData.task);
            return;
        }
    }

    function onDragEnd(event: DragEndEvent) {
        setActiveColumn(null);
        setActiveTask(null);

        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (!hasDraggableData(active)) return;

        const activeData = active.data.current;

        if (activeId === overId) return;

        const isActiveAColumn = activeData?.type === "Column";
        if (!isActiveAColumn) return;

        // Column reordering not implemented in this version
        // Would require API call to update stage order
        console.log('Column reordering not yet implemented');
    }

    function onDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        if (!hasDraggableData(active) || !hasDraggableData(over)) return;

        const activeData = active.data.current;
        const overData = over.data.current;

        const isActiveATask = activeData?.type === "Task";
        const isOverATask = overData?.type === "Task";

        if (!isActiveATask) return;

        // Im dropping a Task over another Task
        if (isActiveATask && isOverATask) {
            setTasks((tasks) => {
                const activeIndex = tasks.findIndex((t) => t.id === activeId);
                const overIndex = tasks.findIndex((t) => t.id === overId);
                const activeTask = tasks[activeIndex];
                const overTask = tasks[overIndex];
                if (
                    activeTask &&
                    overTask &&
                    activeTask.columnId !== overTask.columnId
                ) {
                    const newColumnId = overTask.columnId;
                    activeTask.columnId = newColumnId;
                    
                    // API call to update task status
                    handleTaskDrop(activeId.toString(), newColumnId);
                    
                    return arrayMove(tasks, activeIndex, overIndex - 1);
                }

                return arrayMove(tasks, activeIndex, overIndex);
            });
        }

        const isOverAColumn = overData?.type === "Column";

        // Im dropping a Task over a column
        if (isActiveATask && isOverAColumn) {
            setTasks((tasks) => {
                const activeIndex = tasks.findIndex((t) => t.id === activeId);
                const activeTask = tasks[activeIndex];
                if (activeTask && activeTask.columnId !== overId) {
                    const newColumnId = overId as ColumnId;
                    activeTask.columnId = newColumnId;
                    
                    // API call to update task status
                    handleTaskDrop(activeId.toString(), newColumnId);
                    
                    return arrayMove(tasks, activeIndex, activeIndex);
                }
                return tasks;
            });
        }
    }
}