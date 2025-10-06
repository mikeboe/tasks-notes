/**
 * Authentication API Client Library
 * Provides a clean interface to interact with the backend auth API
 */

const API_BASE_URL =
  config.apiUrl|| "http://localhost:3000";
const AUTH_API_BASE = `${API_BASE_URL}/auth`;

import { config } from "@/config";
import { type User } from "@/types/user";

// Re-export the User type for convenience
export type { User };

export interface LoginRequest {
  email: string;
  password: string;
}

export interface MicrosoftLoginRequest {
  idToken: string;
  accessToken?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  user?: User;
  message?: string;
  error?: string;
  errors?: any[];
}

// API response structures based on your backend
export type AuthResponse = ApiResponse<User>;

export type UserResponse = ApiResponse<User>;

export interface ErrorResponse {
  message: string;
  errors?: any[];
}

// Custom error class for API errors
export class AuthApiError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message);
    this.name = "AuthApiError";
  }
}

/**
 * Makes HTTP requests with proper error handling and cookie support
 * The API already returns {success, data/user/message}, so we return that directly
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${AUTH_API_BASE}${endpoint}`;

  const config: RequestInit = {
    credentials: "include", // Important for httpOnly cookies
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `HTTP ${response.status}`;
      let errorData: any = {};
      
      try {
        errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Fallback to status text if JSON parsing fails
        errorMessage = response.statusText || errorMessage;
      }

      throw new AuthApiError(errorMessage, response.status);
    }

    // For 204 No Content responses, return empty success response
    if (response.status === 204) {
      return {} as T;
    }

    // Return the API response directly
    const apiResponse = await response.json();
    return apiResponse;
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw error;
    }

    // Network or other errors
    throw new AuthApiError(
      error instanceof Error ? error.message : "An unexpected error occurred"
    );
  }
}

/**
 * Authentication API Client
 */
export class AuthApi {
  /**
   * Register a new user account
   */
  static async register(userData: RegisterRequest): Promise<ApiResponse> {
    try {
      const response = await apiRequest<User>("/register", {
        method: "POST",
        body: JSON.stringify(userData),
      });
      return {
        success: true,
        user: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof AuthApiError ? error.message : "Registration failed",
      };
    }
  }

  /**
   * Login with email and password
   */
  static async login(credentials: LoginRequest): Promise<ApiResponse> {
    try {
      const response = await apiRequest<User>("/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      return {
        success: true,
        user: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof AuthApiError ? error.message : "Login failed",
      };
    }
  }

  /**
   * Login with Microsoft Entra ID
   */
  static async loginWithMicrosoft(msCredentials: MicrosoftLoginRequest): Promise<ApiResponse> {
    try {
      const response = await apiRequest<User>("/microsoft/login", {
        method: "POST",
        body: JSON.stringify(msCredentials),
      });
      return {
        success: true,
        user: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof AuthApiError ? error.message : "Microsoft login failed",
      };
    }
  }

  /**
   * Refresh access token using refresh token from cookies
   */
  static async refresh(): Promise<void> {
    await apiRequest("/refresh", {
      method: "POST",
    });
  }

  /**
   * Logout and revoke tokens
   */
  static async logout(): Promise<void> {
    await apiRequest("/logout", {
      method: "POST",
    });
  }

  /**
   * Get current authenticated user information
   */
  static async getCurrentUser(): Promise<ApiResponse> {
    try {
      const response = await apiRequest<User>("/me");
      return {
        success: true,
        user: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof AuthApiError ? error.message : "Failed to get user",
      };
    }
  }

  /**
   * Verify user email with token from verification email
   */
  static async verifyEmail(
    tokenData: VerifyEmailRequest
  ): Promise<ApiResponse> {
    try {
      await apiRequest("/verify-email", {
        method: "POST",
        body: JSON.stringify(tokenData),
      });
      return {
        success: true,
        message: "Email verified successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof AuthApiError ? error.message : "Email verification failed",
      };
    }
  }

  /**
   * Request password reset email
   */
  static async forgotPassword(
    emailData: ForgotPasswordRequest
  ): Promise<ApiResponse> {
    try {
      await apiRequest("/forgot-password", {
        method: "POST",
        body: JSON.stringify(emailData),
      });
      return {
        success: true,
        message: "Password reset email sent",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof AuthApiError ? error.message : "Password reset request failed",
      };
    }
  }

  /**
   * Reset password with token from reset email
   */
  static async resetPassword(
    resetData: ResetPasswordRequest
  ): Promise<ApiResponse> {
    try {
      await apiRequest("/reset-password", {
        method: "POST",
        body: JSON.stringify(resetData),
      });
      return {
        success: true,
        message: "Password reset successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof AuthApiError ? error.message : "Password reset failed",
      };
    }
  }
}

/**
 * Token refresh utility with automatic retry logic
 */
export class TokenManager {
  private static refreshPromise: Promise<boolean> | null = null;

  /**
   * Attempt to refresh the authentication token
   * Uses a singleton pattern to prevent multiple simultaneous refresh attempts
   */
  static async refreshToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;

    return result;
  }

  private static async performRefresh(): Promise<boolean> {
    try {
      await AuthApi.refresh();
      return true;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  }

  /**
   * Check if a request failed due to authentication issues
   */
  static isAuthError(error: any): boolean {
    return (
      error instanceof AuthApiError &&
      (error.status === 401 || error.status === 403)
    );
  }
}

/**
 * Enhanced API request function with automatic token refresh
 * This can be used for other API calls that need authentication
 */
export async function authenticatedRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const config: RequestInit = {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  let response = await fetch(url, config);

  // If we get a 401, try to refresh the token and retry once
  if (response.status === 401) {
    const refreshSuccess = await TokenManager.refreshToken();

    if (refreshSuccess) {
      // Retry the original request
      response = await fetch(url, config);
    }
  }

  return response;
}

export default AuthApi;
