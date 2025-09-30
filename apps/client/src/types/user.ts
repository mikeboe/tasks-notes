// Legacy user type (keeping for backward compatibility)
export type LegacyUser = {
  id?: string;
  name?: string;
  lastName?: string;
  firstName?: string;
  orgName?: string;
  orgId?: string;
  email: string;
  username?: string;
  role?: string;
  plan?: "free" | "premium";
  balance?: number;
  [key: string]: any;
  avatar?: {
    id?: string;
    url?: string;
  };
};

// New user type based on backend API with optional legacy properties for backward compatibility
export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  // Legacy properties for backward compatibility
  name?: string;
  userName?: string;
  orgName?: string;
  orgId?: string;
  username?: string;
  plan?: "free" | "premium";
  balance?: number;
  avatar?: {
    id?: string;
    url?: string;
  };
};

// For backward compatibility, export the User type as default
export type { User as default };
