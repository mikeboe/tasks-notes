import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagMultiSelect } from "@/components/select/tag-multi-select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Plus, X, Send, Save, ArrowLeft } from "lucide-react";
import { TasksApi } from "@/lib/tasks-api";
import type { Task, TaskStage, Tag, User as UserType, UpdateTaskRequest } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TaskDetailViewProps {
  taskId: string;
}

interface ChecklistItem {
  id?: string;
  text: string;
  is_completed: boolean;
  isNew?: boolean;
}

export function TaskDetailView({ taskId }: TaskDetailViewProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [stages, setStages] = useState<TaskStage[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    priority: "medium" as "low" | "medium" | "high",
    status_id: "",
    assigned_to_ids: [] as string[],
    tag_ids: [] as string[],
    notes: "",
    start_date: "",
    end_date: "",
    is_completed: false,
  });
  
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newComment, setNewComment] = useState("");
  
  useEffect(() => {
    loadTaskData();
  }, [taskId]);
  
  const loadTaskData = async () => {
    setIsLoading(true);
    try {
      // Load stages, tags, and users in parallel
      const [stagesResponse, tagsResponse, usersResponse] = await Promise.all([
        TasksApi.getTaskStages(),
        TasksApi.getTags(),
        TasksApi.getUsers()
      ]);
      
      if (stagesResponse.success && stagesResponse.data) {
        setStages(stagesResponse.data);
      }
      
      if (tagsResponse.success && tagsResponse.data) {
        setTags(tagsResponse.data);
      }

      if (usersResponse.success && usersResponse.data) {
        setUsers(usersResponse.data);
      }
      
      // Load task data
      const taskResponse = await TasksApi.getTaskById(taskId);
      if (taskResponse.success && taskResponse.data) {
        const taskData = taskResponse.data;
        setTask(taskData);
        setFormData({
          title: taskData.title,
          priority: taskData.priority,
          status_id: taskData.statusId,
          assigned_to_ids: taskData.assignees?.map(a => a.id) || [],
          tag_ids: taskData.tags?.map(t => t.id) || [],
          notes: taskData.notes || "",
          start_date: taskData.startDate ? taskData.startDate.split('T')[0] : "",
          end_date: taskData.endDate ? taskData.endDate.split('T')[0] : "",
          is_completed: taskData.isCompleted,
        });
        setChecklist(taskData.checklist || []);
      } else {
        toast.error("Task not found");
        navigate("/tasks");
      }
    } catch (error) {
      toast.error("Failed to load task data");
      navigate("/tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTagsOnly = async () => {
    try {
      const tagsResponse = await TasksApi.getTags();
      if (tagsResponse.success && tagsResponse.data) {
        setTags(tagsResponse.data);
      }
    } catch (error) {
      toast.error("Failed to reload tags");
    }
  };
  
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    
    setIsSaving(true);
    try {
      const updateData: UpdateTaskRequest = {
        title: formData.title,
        priority: formData.priority,
        status_id: formData.status_id,
        assigned_to_ids: formData.assigned_to_ids,
        tag_ids: formData.tag_ids,
        notes: formData.notes || undefined,
        start_date: formData.start_date ? `${formData.start_date}T00:00:00Z` : undefined,
        end_date: formData.end_date ? `${formData.end_date}T23:59:59Z` : undefined,
        is_completed: formData.is_completed,
      };
      
      const response = await TasksApi.updateTask(taskId, updateData);
      if (response.success && response.data) {
        toast.success("Task updated successfully");
        // Refresh task data
        loadTaskData();
      } else {
        toast.error(response.error || "Failed to update task");
      }
    } catch (error) {
      toast.error("Failed to save task");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      const response = await TasksApi.addComment(taskId, { content: newComment });
      if (response.success) {
        toast.success("Comment added");
        setNewComment("");
        // Refresh task data to get new comment
        loadTaskData();
      } else {
        toast.error(response.error || "Failed to add comment");
      }
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };
  
  const addChecklistItem = () => {
    setChecklist(prev => [...prev, { text: "", is_completed: false, isNew: true }]);
  };
  
  const updateChecklistItem = (index: number, updates: Partial<ChecklistItem>) => {
    setChecklist(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  };
  
  const removeChecklistItem = (index: number) => {
    setChecklist(prev => prev.filter((_, i) => i !== index));
  };
  
  const priorityColors = {
    low: "bg-blue-500",
    medium: "bg-yellow-500", 
    high: "bg-red-500"
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Task not found</p>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/tasks")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </Button>
        <h1 className="text-2xl font-bold">Task Details</h1>
      </div>

      {/* Task Details */}
      <div className="bg-card border rounded-lg p-6 space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Task title"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={formData.priority} onValueChange={(value: any) => 
              setFormData(prev => ({ ...prev, priority: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", priorityColors.low)} />
                    Low
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", priorityColors.medium)} />
                    Medium
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", priorityColors.high)} />
                    High
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Task Completion */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="task-completed"
            checked={formData.is_completed}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, is_completed: !!checked }))}
          />
          <Label 
            htmlFor="task-completed" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Mark as completed
          </Label>
        </div>
        
        {/* Status and Dates */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status_id} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, status_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="end_date">End Date</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
            />
          </div>
        </div>
        
        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Task description and notes"
            rows={4}
          />
        </div>

        {/* Assignees and Tags */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Assignees</Label>
            <Select onValueChange={(userId) => {
              if (!formData.assigned_to_ids.includes(userId)) {
                setFormData(prev => ({
                  ...prev,
                  assigned_to_ids: [...prev.assigned_to_ids, userId]
                }));
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Assign to users" />
              </SelectTrigger>
              <SelectContent>
                {users.filter(user => !formData.assigned_to_ids.includes(user.id)).map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {user.firstName?.charAt(0)?.toUpperCase() || <User className="h-3 w-3" />}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.firstName} {user.lastName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Selected Assignees */}
            {formData.assigned_to_ids.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.assigned_to_ids.map((userId) => {
                  const user = users.find(u => u.id === userId);
                  if (!user) return null;
                  return (
                    <div key={userId} className="flex items-center gap-1 bg-secondary rounded-md px-2 py-1">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-xs">
                          {user.firstName?.charAt(0)?.toUpperCase() || <User className="h-2 w-2" />}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{user.firstName} {user.lastName}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          assigned_to_ids: prev.assigned_to_ids.filter(id => id !== userId)
                        }))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <TagMultiSelect
              selectedTagIds={formData.tag_ids}
              onTagsChange={(tagIds) => setFormData(prev => ({ ...prev, tag_ids: tagIds }))}
              availableTags={tags}
              onTagsUpdated={loadTagsOnly}
              label="Tags"
              placeholder="Select tags"
            />
          </div>
        </div>
        
        {/* Checklist */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Checklist</Label>
            <Button size="sm" variant="outline" onClick={addChecklistItem}>
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>
          <div className="space-y-2">
            {checklist.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Checkbox
                  checked={item.is_completed}
                  onCheckedChange={(checked) => 
                    updateChecklistItem(index, { is_completed: !!checked })}
                />
                <Input
                  value={item.text}
                  onChange={(e) => updateChecklistItem(index, { text: e.target.value })}
                  placeholder="Checklist item"
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeChecklistItem(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Comments */}
        {task?.comments && (
          <div className="space-y-4">
            <Separator />
            <div>
              <Label className="text-base font-semibold">Comments</Label>
              <div className="mt-2 space-y-3">
                {task.comments.map((comment) => (
                  <div key={comment.id} className="bg-muted p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {comment.user?.name?.charAt(0)?.toUpperCase() || <User className="h-3 w-3" />}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {comment.user?.name || 'Unknown User'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))}
                
                {/* Add comment */}
                <div className="flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}