
import { config } from "@/config";
import { authenticatedRequest } from "./auth-api";
import { type Note } from "@/types/index";

const API_BASE_URL = config.apiUrl || "http://localhost:3000";
const NOTES_API_BASE = `${API_BASE_URL}/notes`;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class NotesApiError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message);
    this.name = "NotesApiError";
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${NOTES_API_BASE}${endpoint}`;

  try {
    const response = await authenticatedRequest(url, options);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new NotesApiError(errorMessage, response.status);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof NotesApiError) {
      throw error;
    }
    throw new NotesApiError(
      error instanceof Error ? error.message : "An unexpected error occurred"
    );
  }
}

export class NotesApi {
  static async getNotes(): Promise<ApiResponse<Note[]>> {
    try {
      const notes = await apiRequest<Note[]>("/");
      return { success: true, data: notes };
    } catch (error) {
      return { success: false, error: error instanceof NotesApiError ? error.message : "Failed to get notes" };
    }
  }

  static async getNoteById(noteId: string): Promise<ApiResponse<Note>> {
    try {
      const note = await apiRequest<Note>(`/${noteId}`);
      return { success: true, data: note };
    } catch (error) {
      return { success: false, error: error instanceof NotesApiError ? error.message : "Failed to get note" };
    }
  }

  static async createNote(noteData: Partial<Note>): Promise<ApiResponse<Note>> {
    try {
      const newNote = await apiRequest<Note>("/", {
        method: "POST",
        body: JSON.stringify(noteData),
      });
      return { success: true, data: newNote };
    } catch (error) {
      return { success: false, error: error instanceof NotesApiError ? error.message : "Failed to create note" };
    }
  }

  static async updateNote(noteId: string, noteData: Partial<Note>): Promise<ApiResponse<Note>> {
    try {
      const updatedNote = await apiRequest<Note>(`/${noteId}`, {
        method: "PUT",
        body: JSON.stringify(noteData),
      });
      return { success: true, data: updatedNote };
    } catch (error) {
      return { success: false, error: error instanceof NotesApiError ? error.message : "Failed to update note" };
    }
  }

  static async deleteNote(noteId: string): Promise<ApiResponse> {
    try {
      await apiRequest(`/${noteId}`, {
        method: "DELETE",
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof NotesApiError ? error.message : "Failed to delete note" };
    }
  }

  static async moveNote(noteId: string, direction: 'up' | 'down' | 'top' | 'bottom'): Promise<ApiResponse<Note>> {
    try {
      const movedNote = await apiRequest<Note>(`/${noteId}/move`, {
        method: "POST",
        body: JSON.stringify({ direction }),
      });
      return { success: true, data: movedNote };
    } catch (error) {
      return { success: false, error: error instanceof NotesApiError ? error.message : "Failed to move note" };
    }
  }

  static async moveNoteToParent(noteId: string, parentId: string | null, order?: number): Promise<ApiResponse<Note>> {
    try {
      const movedNote = await apiRequest<Note>(`/${noteId}/move-to-parent`, {
        method: "POST",
        body: JSON.stringify({ parentId, order }),
      });
      return { success: true, data: movedNote };
    } catch (error) {
      return { success: false, error: error instanceof NotesApiError ? error.message : "Failed to move note to parent" };
    }
  }

  static async toggleFavorite(noteId: string): Promise<ApiResponse<{isFavorite: boolean}>> {
    try {
      const result = await apiRequest<{isFavorite: boolean}>(`/${noteId}/favorite`, {
        method: "POST",
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof NotesApiError ? error.message : "Failed to toggle favorite" };
    }
  }

  static async checkIfFavorite(noteId: string): Promise<ApiResponse<{isFavorite: boolean}>> {
    try {
      const result = await apiRequest<{isFavorite: boolean}>(`/${noteId}/favorite`);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof NotesApiError ? error.message : "Failed to check favorite status" };
    }
  }

  static async getFavoriteNotes(): Promise<ApiResponse<Note[]>> {
    try {
      const favoriteNotes = await apiRequest<Note[]>("/favorites/list");
      return { success: true, data: favoriteNotes };
    } catch (error) {
      return { success: false, error: error instanceof NotesApiError ? error.message : "Failed to get favorite notes" };
    }
  }

  static async archiveNote(noteId: string): Promise<ApiResponse<Note>> {
    try {
      const archivedNote = await apiRequest<Note>(`/${noteId}/archive`, {
        method: "POST",
      });
      return { success: true, data: archivedNote };
    } catch (error) {
      return { success: false, error: error instanceof NotesApiError ? error.message : "Failed to archive note" };
    }
  }

  static async duplicateNote(noteId: string): Promise<ApiResponse<Note>> {
    try {
      const duplicatedNote = await apiRequest<Note>(`/${noteId}/duplicate`, {
        method: "POST",
      });
      return { success: true, data: duplicatedNote };
    } catch (error) {
      return { success: false, error: error instanceof NotesApiError ? error.message : "Failed to duplicate note" };
    }
  }

  static async getRecentNotes(limit: number = 5): Promise<ApiResponse<Note[]>> {
    try {
      const recentNotes = await apiRequest<Note[]>(`/recent?limit=${limit}`);
      return { success: true, data: recentNotes };
    } catch (error) {
      return { success: false, error: error instanceof NotesApiError ? error.message : "Failed to get recent notes" };
    }
  }
}
