import type { Note } from './note';
import type { User } from './user';

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  createdById: string;
  priority: 'low' | 'medium' | 'high';
  statusId: string;
  notes?: string;
  startDate?: string;
  endDate?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  assignees?: User[];
  tags?: Tag[];
  linked_notes?: Note[];
  checklist?: TaskChecklistItem[];
  comments?: TaskComment[];
  created_by?: User;
  status?: TaskStage;
}

export interface TaskStage {
  id: string;
  name: string;
  order: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  organizationId: string;
}

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  text: string;
  is_completed: boolean;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: User;
}

export interface CreateTaskRequest {
  title: string;
  status_id: string;
  priority?: 'low' | 'medium' | 'high';
  assigned_to_ids?: string[];
  notes?: string;
  start_date?: string;
  linked_note_ids?: string[];
  end_date?: string;
  tag_ids?: string[];
}

export interface UpdateTaskRequest {
  title?: string;
  priority?: 'low' | 'medium' | 'high';
  status_id?: string;
  assigned_to_ids?: string[];
  tag_ids?: string[];
  notes?: string;
  start_date?: string;
  end_date?: string;
  is_completed?: boolean;
  linked_note_ids?: string[];
}

export interface TaskFilters {
  assignee_id?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface CreateStageRequest {
  name: string;
}

export interface UpdateStageOrderRequest {
  stage_ids: string[];
}

export interface UpdateStageRequest {
  name: string;
}

export interface CreateTagRequest {
  name: string;
}

export interface CreateCommentRequest {
  content: string;
}