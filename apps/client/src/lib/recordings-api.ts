import { config } from "@/config";
import { authenticatedRequest } from "./auth-api";

const API_BASE_URL = config.apiUrl || "http://localhost:3000";
const RECORDINGS_API_BASE = `${API_BASE_URL}/recordings`;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface RecordingSettings {
  hasWebcam: boolean;
  webcamPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  webcamShape?: 'circle' | 'rounded';
  hasMicrophone: boolean;
  hasSystemAudio: boolean;
}

export interface Recording {
  id: string;
  userId: string;
  teamId: string | null;
  assetId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  duration: number;
  isPublic: boolean;
  shareToken: string | null;
  settings: RecordingSettings | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  asset?: {
    s3Url: string;
    fileSize: number;
    mimeType: string;
  };
}

export interface CreateRecordingDto {
  assetId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  duration: number;
  isPublic?: boolean;
  settings?: RecordingSettings;
  teamId?: string;
}

export interface UpdateRecordingDto {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
  settings?: RecordingSettings;
}

export class RecordingsApiError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message);
    this.name = "RecordingsApiError";
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${RECORDINGS_API_BASE}${endpoint}`;

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
      throw new RecordingsApiError(errorMessage, response.status);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof RecordingsApiError) {
      throw error;
    }
    throw new RecordingsApiError(
      error instanceof Error ? error.message : "An unexpected error occurred"
    );
  }
}

export class RecordingsApi {
  static async createRecording(data: CreateRecordingDto): Promise<ApiResponse<Recording>> {
    try {
      const result = await apiRequest<ApiResponse<Recording>>('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof RecordingsApiError ? error.message : "Failed to create recording"
      };
    }
  }

  static async getRecordings(params?: {
    teamId?: string;
    isPublic?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    recordings: Recording[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.teamId) queryParams.append('teamId', params.teamId);
      if (params?.isPublic !== undefined) queryParams.append('isPublic', params.isPublic.toString());
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const result = await apiRequest<ApiResponse<{
        recordings: Recording[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>>(`/?${queryParams.toString()}`);

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof RecordingsApiError ? error.message : "Failed to get recordings"
      };
    }
  }

  static async getRecording(recordingId: string): Promise<ApiResponse<Recording>> {
    try {
      const result = await apiRequest<ApiResponse<Recording>>(`/${recordingId}`);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof RecordingsApiError ? error.message : "Failed to get recording"
      };
    }
  }

  static async getPublicRecording(shareToken: string): Promise<ApiResponse<Recording>> {
    try {
      const url = `${RECORDINGS_API_BASE}/public/${shareToken}`;
      const response = await fetch(url);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new RecordingsApiError(errorMessage, response.status);
      }

      return response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof RecordingsApiError ? error.message : "Failed to get public recording"
      };
    }
  }

  static async updateRecording(recordingId: string, data: UpdateRecordingDto): Promise<ApiResponse<Recording>> {
    try {
      const result = await apiRequest<ApiResponse<Recording>>(`/${recordingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof RecordingsApiError ? error.message : "Failed to update recording"
      };
    }
  }

  static async deleteRecording(recordingId: string): Promise<ApiResponse> {
    try {
      await apiRequest(`/${recordingId}`, {
        method: 'DELETE',
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof RecordingsApiError ? error.message : "Failed to delete recording"
      };
    }
  }

  static async incrementViewCount(recordingId: string): Promise<ApiResponse<{ viewCount: number }>> {
    try {
      const result = await apiRequest<ApiResponse<{ viewCount: number }>>(`/${recordingId}/view`, {
        method: 'POST',
      });
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof RecordingsApiError ? error.message : "Failed to increment view count"
      };
    }
  }
}
