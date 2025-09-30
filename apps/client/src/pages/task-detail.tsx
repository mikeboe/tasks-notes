import { useParams } from "react-router-dom";
import { TaskDetailView } from "@/components/tasks/task-detail-view";

const TaskDetailPage = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="container mx-auto p-4 h-full flex flex-col">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Task not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 h-full flex flex-col">
      <TaskDetailView taskId={id} />
    </div>
  );
};

export default TaskDetailPage;