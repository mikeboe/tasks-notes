import { config } from "@/config";
import { authenticatedRequest } from "./auth-api";
import type { 
  Task, 
  TaskStage, 
  Tag, 
  TaskComment,
  User,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskFilters,
  CreateStageRequest,
  UpdateStageOrderRequest,
  UpdateStageRequest,
  CreateTagRequest,
  CreateCommentRequest
} from "@/types/index";

const API_BASE_URL = config.apiUrl || "http://localhost:3000";
const TASKS_API_BASE = `${API_BASE_URL}/tasks`;
const STAGES_API_BASE = `${API_BASE_URL}/task-stages`;
const TAGS_API_BASE = `${API_BASE_URL}/tags`;
// const USERS_API_BASE = `${API_BASE_URL}/users`;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class TasksApiError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message);
    this.name = "TasksApiError";
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${TASKS_API_BASE}${endpoint}`;
  
  try {
    const response = await authenticatedRequest(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new TasksApiError(errorMessage, response.status);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof TasksApiError) {
      throw error;
    }
    throw new TasksApiError(
      error instanceof Error ? error.message : "An unexpected error occurred"
    );
  }
}

export class TasksApi {
  // Task operations
  static async getTasks(filters?: TaskFilters): Promise<ApiResponse<Task[]>> {
    try {
      const params = new URLSearchParams();
      if (filters?.assignee_id) params.append('assignee_id', filters.assignee_id);
      if (filters?.priority) params.append('priority', filters.priority);
      
      const queryString = params.toString();
      const endpoint = queryString ? `/?${queryString}` : "/";
      
      const tasks = await apiRequest<Task[]>(endpoint);
      return { success: true, data: tasks };
    } catch (error) {
      return { success: false, error: error instanceof TasksApiError ? error.message : "Failed to get tasks" };
    }
  }

  static async getTaskById(taskId: string): Promise<ApiResponse<Task>> {
    try {
      const task = await apiRequest<Task>(`/${taskId}`);
      return { success: true, data: task };
    } catch (error) {
      return { success: false, error: error instanceof TasksApiError ? error.message : "Failed to get task" };
    }
  }

  static async createTask(taskData: CreateTaskRequest): Promise<ApiResponse<Task>> {
    try {
      const newTask = await apiRequest<Task>("/", {
        method: "POST",
        body: JSON.stringify(taskData),
      });
      return { success: true, data: newTask };
    } catch (error) {
      return { success: false, error: error instanceof TasksApiError ? error.message : "Failed to create task" };
    }
  }

  static async updateTask(taskId: string, taskData: UpdateTaskRequest): Promise<ApiResponse<Task>> {
    try {
      const updatedTask = await apiRequest<Task>(`/${taskId}`, {
        method: "PUT",
        body: JSON.stringify(taskData),
      });
      return { success: true, data: updatedTask };
    } catch (error) {
      return { success: false, error: error instanceof TasksApiError ? error.message : "Failed to update task" };
    }
  }

  static async deleteTask(taskId: string): Promise<ApiResponse> {
    try {
      await apiRequest(`/${taskId}`, {
        method: "DELETE",
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof TasksApiError ? error.message : "Failed to delete task" };
    }
  }

  // Task Stage operations
  static async getTaskStages(): Promise<ApiResponse<TaskStage[]>> {
    try {
      const stages = await apiRequest<TaskStage[]>(STAGES_API_BASE);
      return { success: true, data: stages };
    } catch (error) {
      return { success: false, error: error instanceof TasksApiError ? error.message : "Failed to get task stages" };
    }
  }

  static async createTaskStage(stageData: CreateStageRequest): Promise<ApiResponse<TaskStage>> {
    try {
      const newStage = await apiRequest<TaskStage>(STAGES_API_BASE, {
        method: "POST",
        body: JSON.stringify(stageData),
      });
      return { success: true, data: newStage };
    } catch (error) {
      return { success: false, error: error instanceof TasksApiError ? error.message : "Failed to create task stage" };
    }
  }

  static async updateTaskStageOrder(orderData: UpdateStageOrderRequest): Promise<ApiResponse> {
    try {
      await apiRequest(`${STAGES_API_BASE}/order`, {
        method: "PUT",
        body: JSON.stringify(orderData),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof TasksApiError ? error.message : "Failed to update task stage order" };
    }
  }

  static async updateTaskStage(stageId: string, stageData: UpdateStageRequest): Promise<ApiResponse<TaskStage>> {
    try {
      const updatedStage = await apiRequest<TaskStage>(`${STAGES_API_BASE}/${stageId}`, {
        method: "PUT",
        body: JSON.stringify(stageData),
      });
      return { success: true, data: updatedStage };
    } catch (error) {
      return { success: false, error: error instanceof TasksApiError ? error.message : "Failed to update task stage" };
    }
  }

  static async deleteTaskStage(stageId: string): Promise<ApiResponse> {
    try {
      await apiRequest(`${STAGES_API_BASE}/${stageId}`, {
        method: "DELETE",
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof TasksApiError ? error.message : "Failed to delete task stage" };
    }
  }

  // Tag operations
  static async getTags(): Promise<ApiResponse<Tag[]>> {
    try {
      const tags = await apiRequest<Tag[]>(TAGS_API_BASE);
      return { success: true, data: tags };
    } catch (error) {
      return { success: false, error: error instanceof TasksApiError ? error.message : "Failed to get tags" };
    }
  }

  static async createTag(tagData: CreateTagRequest): Promise<ApiResponse<Tag>> {
    try {
      const newTag = await apiRequest<Tag>(TAGS_API_BASE, {
        method: "POST",
        body: JSON.stringify(tagData),
      });
      return { success: true, data: newTag };
    } catch (error) {
      return { success: false, error: error instanceof TasksApiError ? error.message : "Failed to create tag" };
    }
  }

  // Comment operations
  static async addComment(taskId: string, commentData: CreateCommentRequest): Promise<ApiResponse<TaskComment>> {
    try {
      const newComment = await apiRequest<TaskComment>(`/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify(commentData),
      });
      return { success: true, data: newComment };
    } catch (error) {
      return { success: false, error: error instanceof TasksApiError ? error.message : "Failed to add comment" };
    }
  }

  // User operations
  static async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      const users = await apiRequest<User[]>('/assignable-users');
      return { success: true, data: users };
    } catch (error) {
      return { success: false, error: error instanceof TasksApiError ? error.message : "Failed to get users" };
    }
  }

  // Get tasks assigned to current user
  static async getAssignedTasks(): Promise<ApiResponse<Task[]>> {
    try {
      const tasks = await apiRequest<Task[]>('/assigned');
      return { success: true, data: tasks };
    } catch (error) {
      return { success: false, error: error instanceof TasksApiError ? error.message : "Failed to get assigned tasks" };
    }
  }
}