import { config } from "@/config";
import { authenticatedRequest } from "./auth-api";

const API_BASE_URL = config.apiUrl || "http://localhost:3000";
const ASSETS_API_BASE = `${API_BASE_URL}/assets`;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface Asset {
  id: string;
  uploaderId: string;
  originalFileName: string;
  fileName: string;
  s3Key: string;
  s3Bucket: string;
  s3Url: string;
  fileSize: number;
  mimeType: string;
  fileType: 'video' | 'image' | 'document' | 'audio' | 'other';
  uploadStatus: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: string;
  createdAt: string;
  updatedAt: string;
}

export class AssetsApiError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message);
    this.name = "AssetsApiError";
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${ASSETS_API_BASE}${endpoint}`;

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
      throw new AssetsApiError(errorMessage, response.status);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof AssetsApiError) {
      throw error;
    }
    throw new AssetsApiError(
      error instanceof Error ? error.message : "An unexpected error occurred"
    );
  }
}

export class AssetsApi {
  static async uploadFile(file: File): Promise<ApiResponse<Asset>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Custom request for file upload - don't set Content-Type for FormData
      const config: RequestInit = {
        credentials: "include",
        method: "POST",
        body: formData,
        // Don't set Content-Type - browser will set it with boundary
      };

      let response = await fetch(`${ASSETS_API_BASE}/upload`, config);

      // If we get a 401, try to refresh the token and retry once
      if (response.status === 401) {
        const AuthApi = await import('./auth-api');
        const refreshSuccess = await AuthApi.TokenManager.refreshToken();

        if (refreshSuccess) {
          response = await fetch(`${ASSETS_API_BASE}/upload`, config);
        }
      }

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new AssetsApiError(errorMessage, response.status);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof AssetsApiError ? error.message : "Failed to upload file"
      };
    }
  }

  static async getAssets(params?: {
    fileType?: 'video' | 'image' | 'document' | 'audio' | 'other';
    uploadStatus?: 'pending' | 'processing' | 'completed' | 'failed';
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    assets: Asset[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.fileType) queryParams.append('fileType', params.fileType);
      if (params?.uploadStatus) queryParams.append('uploadStatus', params.uploadStatus);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const result = await apiRequest<{
        assets: Asset[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(`/?${queryParams.toString()}`);

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof AssetsApiError ? error.message : "Failed to get assets"
      };
    }
  }

  static async getAsset(assetId: string): Promise<ApiResponse<Asset>> {
    try {
      const asset = await apiRequest<Asset>(`/${assetId}`);
      return { success: true, data: asset };
    } catch (error) {
      return {
        success: false,
        error: error instanceof AssetsApiError ? error.message : "Failed to get asset"
      };
    }
  }

  static async deleteAsset(assetId: string): Promise<ApiResponse> {
    try {
      await apiRequest(`/${assetId}`, {
        method: "DELETE",
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof AssetsApiError ? error.message : "Failed to delete asset"
      };
    }
  }
}
