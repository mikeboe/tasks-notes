import * as React from "react"
import { useNavigate } from "react-router-dom"
import { CheckSquare, Clock, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TasksApi } from "@/lib/tasks-api"
import { type Task } from "@/types/task"
import { useTeamContext } from "@/hooks/use-team-context"

export function AssignedTasksSection() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const navigate = useNavigate()
  const { teamId } = useTeamContext()

  React.useEffect(() => {
    const loadAssignedTasks = async () => {
      try {
        setIsLoading(true)
        const response = await TasksApi.getAssignedTasks(teamId)
        if (response.success && response.data) {
          setTasks(response.data.slice(0, 5))
        } else {
          setError(response.error || "Failed to load assigned tasks")
        }
      } catch (err) {
        setError("An error occurred while loading tasks")
      } finally {
        setIsLoading(false)
      }
    }

    loadAssignedTasks()
  }, [teamId])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-3 w-3" />
      case 'medium':
        return <Clock className="h-3 w-3" />
      default:
        return <CheckSquare className="h-3 w-3" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const handleTaskClick = (taskId: string) => {
    const path = teamId ? `/${teamId}/tasks/${taskId}` : `/tasks/${taskId}`
    navigate(path)
  }

  const handleViewAllTasks = () => {
    const path = teamId ? `/${teamId}/tasks` : '/tasks'
    navigate(path)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Assigned Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Assigned Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Assigned Tasks
        </CardTitle>
        {tasks.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleViewAllTasks}>
            View All
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No tasks assigned to you</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => handleTaskClick(task.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">{task.title}</h4>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}
                    >
                      {getPriorityIcon(task.priority)}
                      {task.priority}
                    </span>
                  </div>
                  {task.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {task.notes}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {task.status?.name && (
                      <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">
                        {task.status.name}
                      </span>
                    )}
                    <span>{formatDate(task.updatedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}