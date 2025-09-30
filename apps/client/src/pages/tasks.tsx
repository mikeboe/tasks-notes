import { KanbanBoard } from "@/components/tasks/kanban-board";

const TasksPage = () => {
  return (
    <div className="container mx-auto p-4 h-full flex flex-col" >
      <h1 className="text-2xl font-bold mb-4">Tasks</h1>
      <div className="flex-1 min-h-0">
        <KanbanBoard />
      </div>
    </div>
  );
};

export default TasksPage;
