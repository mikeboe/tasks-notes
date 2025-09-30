/**
 * Video API Client Library
 * Provides a clean interface to interact with the video/asset management API
 */

import { authenticatedRequest } from "./auth-api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const VIDEO_API_BASE = `${API_BASE_URL}/assets`;

// Types based on the asset schema
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
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed';
  metadata?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface AssetSearchParams {
  fileType?: Asset['fileType'];
  uploaderId?: string;
  uploadStatus?: Asset['uploadStatus'];
  page?: number;
  limit?: number;
}

export interface AssetsResponse {
  success: boolean;
  data: {
    assets: Asset[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message?: string;
}

export interface AssetResponse {
  success: boolean;
  data: Asset;
  message?: string;
}

export interface UploadResponse {
  success: boolean;
  data: Asset;
  message?: string;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Video API Error class for better error handling
 */
export class VideoApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public errors?: any[]
  ) {
    super(message);
    this.name = "VideoApiError";
  }
}

/**
 * Helper function to handle API responses
 */
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    let errorData: any = {};
    
    try {
      errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    
    throw new VideoApiError(errorMessage, response.status, errorData.errors);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new VideoApiError("Invalid JSON response");
  }
}

/**
 * Video API Client Class
 */
export class VideoApi {
  /**
   * Upload a video file
   */
  static async uploadVideo(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('video', file);

      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Set up progress tracking
        if (onProgress) {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress: UploadProgress = {
                loaded: event.loaded,
                total: event.total,
                percentage: Math.round((event.loaded / event.total) * 100),
              };
              onProgress(progress);
            }
          });
        }

        xhr.onload = () => {
          try {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(response);
            } else {
              reject(new VideoApiError(
                response.message || `HTTP ${xhr.status}`,
                xhr.status
              ));
            }
          } catch (error) {
            reject(new VideoApiError('Invalid JSON response'));
          }
        };

        xhr.onerror = () => {
          reject(new VideoApiError('Network error'));
        };

        xhr.open('POST', `${VIDEO_API_BASE}/upload/video`);
        xhr.withCredentials = true; // Include cookies for auth
        xhr.send(formData);
      });

    } catch (error) {
      throw new VideoApiError(
        error instanceof Error ? error.message : "Upload failed"
      );
    }
  }

  /**
   * Get assets with optional filtering and pagination
   */
  static async getAssets(params?: AssetSearchParams): Promise<AssetsResponse> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params?.fileType) searchParams.append('fileType', params.fileType);
      if (params?.uploaderId) searchParams.append('uploaderId', params.uploaderId);
      if (params?.uploadStatus) searchParams.append('uploadStatus', params.uploadStatus);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());

      const url = `${VIDEO_API_BASE}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const response = await authenticatedRequest(url);
      
      return await handleApiResponse<AssetsResponse>(response);
    } catch (error) {
      throw new VideoApiError(
        error instanceof VideoApiError ? error.message : "Failed to fetch assets"
      );
    }
  }

  /**
   * Get a specific asset by ID
   */
  static async getAsset(assetId: string): Promise<AssetResponse> {
    try {
      const response = await authenticatedRequest(`${VIDEO_API_BASE}/${assetId}`);
      return await handleApiResponse<AssetResponse>(response);
    } catch (error) {
      throw new VideoApiError(
        error instanceof VideoApiError ? error.message : "Failed to fetch asset"
      );
    }
  }

  /**
   * Delete an asset
   */
  static async deleteAsset(assetId: string): Promise<ApiResponse> {
    try {
      const response = await authenticatedRequest(`${VIDEO_API_BASE}/${assetId}`, {
        method: 'DELETE',
      });
      return await handleApiResponse<ApiResponse>(response);
    } catch (error) {
      throw new VideoApiError(
        error instanceof VideoApiError ? error.message : "Failed to delete asset"
      );
    }
  }

  /**
   * Get video assets only (convenience method)
   */
  static async getVideos(params?: Omit<AssetSearchParams, 'fileType'>): Promise<AssetsResponse> {
    return this.getAssets({ ...params, fileType: 'video' });
  }
}

/**
 * Utility functions
 */
export const VideoUtils = {
  /**
   * Format file size in human readable format
   */
  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Validate video file type
   */
  isVideoFile(file: File): boolean {
    return file.type.startsWith('video/');
  },

  /**
   * Get supported video mime types
   */
  getSupportedVideoTypes(): string[] {
    return [
      'video/mp4',
      'video/avi',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/x-flv',
      'video/webm',
      'video/x-matroska',
    ];
  },

  /**
   * Get upload status color class
   */
  getStatusColorClass(status: Asset['uploadStatus']): string {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'uploading':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  },
};

export default VideoApi;