import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  AuthApi,
  TokenManager,
  type User,
  type ApiResponse,
} from "@/lib/auth-api";

// Auth state type
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Auth context type
interface AuthContextType extends AuthState {
  // Authentication actions
  login: (email: string, password: string) => Promise<ApiResponse>;
  loginWithMicrosoft: (idToken: string, accessToken?: string) => Promise<ApiResponse>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<ApiResponse>;
  logout: () => Promise<void>;

  // Email verification and password reset
  verifyEmail: (token: string) => Promise<ApiResponse>;
  forgotPassword: (email: string) => Promise<ApiResponse>;
  resetPassword: (token: string, password: string) => Promise<ApiResponse>;

  // Utility functions
  refreshAuth: () => Promise<boolean>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Helper function to update auth state
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setAuthState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Set user and update authentication status
  const setUser = useCallback(
    (user: User | null) => {
      updateAuthState({
        user,
        isAuthenticated: !!user,
        isLoading: false,
      });
    },
    [updateAuthState]
  );

  // Login function
  const login = useCallback(
    async (email: string, password: string): Promise<ApiResponse> => {
      updateAuthState({ isLoading: true });

      try {
        const response = await AuthApi.login({ email, password });

        if (response.success && response.user) {
          setUser(response.user);
          return { success: true, data: response };
        } else {
          updateAuthState({ isLoading: false });
          return {
            success: false,
            error: response.success === false ? response.error : "Login failed",
          };
        }
      } catch (error) {
        updateAuthState({ isLoading: false });
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        };
      }
    },
    [setUser, updateAuthState]
  );

  // Microsoft login function
  const loginWithMicrosoft = useCallback(
    async (idToken: string, accessToken?: string): Promise<ApiResponse> => {
      updateAuthState({ isLoading: true });

      try {
        const response = await AuthApi.loginWithMicrosoft({ idToken, accessToken });

        if (response.success && response.user) {
          setUser(response.user);
          return { success: true, data: response };
        } else {
          updateAuthState({ isLoading: false });
          return {
            success: false,
            error: response.success === false ? response.error : "Microsoft login failed",
          };
        }
      } catch (error) {
        updateAuthState({ isLoading: false });
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        };
      }
    },
    [setUser, updateAuthState]
  );

  // Register function
  const register = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string
    ): Promise<ApiResponse> => {
      updateAuthState({ isLoading: true });

      try {
        const response = await AuthApi.register({
          email,
          password,
          firstName,
          lastName,
        });

        if (response.success && response.user) {
          setUser(response.user);
          return { success: true, data: response };
        } else {
          updateAuthState({ isLoading: false });
          return {
            success: false,
            error:
              response.success === false
                ? response.error
                : "Registration failed",
          };
        }
      } catch (error) {
        updateAuthState({ isLoading: false });
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        };
      }
    },
    [setUser, updateAuthState]
  );

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      await AuthApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
    }
  }, [setUser]);

  // Verify email function
  const verifyEmail = useCallback(
    async (token: string): Promise<ApiResponse> => {
      try {
        const response = await AuthApi.verifyEmail({ token });

        if (response.success) {
          // Refresh user data to get updated emailVerified status
          await checkAuthStatus();
        }

        return response;
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Email verification failed",
        };
      }
    },
    []
  );

  // Forgot password function
  const forgotPassword = useCallback(
    async (email: string): Promise<ApiResponse> => {
      try {
        return await AuthApi.forgotPassword({ email });
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Password reset request failed",
        };
      }
    },
    []
  );

  // Reset password function
  const resetPassword = useCallback(
    async (token: string, password: string): Promise<ApiResponse> => {
      try {
        return await AuthApi.resetPassword({ token, password });
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Password reset failed",
        };
      }
    },
    []
  );

  // Refresh authentication
  const refreshAuth = useCallback(async (): Promise<boolean> => {
    try {
      const success = await TokenManager.refreshToken();

      if (success) {
        // Get updated user data
        const userResponse = await AuthApi.getCurrentUser();
        if (userResponse.success && userResponse.user) {
          console.log("User data after refresh:", userResponse.user);
          setUser(userResponse.user);
          return true;
        }
      }

      // If refresh failed or user data couldn't be retrieved, logout
      setUser(null);
      return false;
    } catch (error) {
      console.error("Auth refresh error:", error);
      setUser(null);
      return false;
    }
  }, [setUser]);

  // Check current authentication status
  const checkAuthStatus = useCallback(async (): Promise<void> => {
    try {
      const response = await AuthApi.getCurrentUser();

      if (response.success && response.user) {
        console.log("Current user data:", response);
        setUser(response.user);
      } else {
        // Try to refresh token if getting user data failed
        const refreshed = await refreshAuth();
        if (!refreshed) {
          setUser(null);
        }
      }
    } catch (error) {
      console.error("Auth status check error:", error);
      setUser(null);
    }
  }, [setUser, refreshAuth]);

  // Initialize authentication state on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Set up automatic token refresh
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    // Set up a timer to refresh token periodically (every 10 minutes)
    // The JWT expires in 15 minutes, so this gives us a 5-minute buffer
    const refreshInterval = setInterval(async () => {
      const success = await refreshAuth();
      if (!success) {
        console.warn("Token refresh failed, user will be logged out");
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(refreshInterval);
  }, [authState.isAuthenticated, refreshAuth]);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    loginWithMicrosoft,
    register,
    logout,
    verifyEmail,
    forgotPassword,
    resetPassword,
    refreshAuth,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Hook for getting authentication status without full context
export const useAuthStatus = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  return { isAuthenticated, isLoading, user };
};

// Hook for authentication actions only
export const useAuthActions = () => {
  const {
    login,
    register,
    logout,
    verifyEmail,
    forgotPassword,
    resetPassword,
  } = useAuth();
  return {
    login,
    register,
    logout,
    verifyEmail,
    forgotPassword,
    resetPassword,
  };
};

export default AuthProvider;
