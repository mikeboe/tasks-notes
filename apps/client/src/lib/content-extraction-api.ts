import { config } from "@/config";

const API_BASE_URL = config.apiUrl || "http://localhost:3000";
const CONTENT_EXTRACTION_API_BASE = `${API_BASE_URL}/content-extraction`;

export interface ExtractionRequest {
  type: 'url' | 'file';
  url?: string;
  file?: File;
}

export interface ExtractionResponse {
  success: boolean;
  data?: {
    markdown: string;
    metadata: {
      title?: string;
      extractionType: string;
      processingTime: number;
      sourceInfo?: any;
    };
  };
  message?: string;
  error?: string;
}

export class ContentExtractionApiError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message);
    this.name = "ContentExtractionApiError";
  }
}

export class ContentExtractionApi {
  static async extractContent(request: ExtractionRequest): Promise<ExtractionResponse> {
    try {
      const formData = new FormData();
      formData.append('type', request.type);

      if (request.type === 'url' && request.url) {
        formData.append('url', request.url);
      } else if (request.type === 'file' && request.file) {
        formData.append('file', request.file);
      } else {
        throw new ContentExtractionApiError('Invalid request: missing url or file');
      }

      // Custom request for file upload - don't set Content-Type for FormData
      const requestConfig: RequestInit = {
        credentials: "include",
        method: "POST",
        body: formData,
      };

      let response = await fetch(`${CONTENT_EXTRACTION_API_BASE}/extract`, requestConfig);

      // If we get a 401, try to refresh the token and retry once
      if (response.status === 401) {
        const AuthApi = await import('./auth-api');
        const refreshSuccess = await AuthApi.TokenManager.refreshToken();

        if (refreshSuccess) {
          response = await fetch(`${CONTENT_EXTRACTION_API_BASE}/extract`, requestConfig);
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
        throw new ContentExtractionApiError(errorMessage, response.status);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      if (error instanceof ContentExtractionApiError) {
        return {
          success: false,
          error: error.message
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to extract content"
      };
    }
  }
}
