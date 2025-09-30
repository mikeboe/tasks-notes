import { useCallback } from "react";

// Define the permissions as a union type
type Permission = "read" | "write";

// Define the roles and their permissions
type RoleDefinition = {
  [key: string]: Permission[];
};

const ROLES: RoleDefinition = {
  owner: ["read", "write"],
  superAdmin: ["read", "write"],
  admin: ["read", "write"],
  viewer: ["read"],
  guest: [],
  student: ["read"],
};

type Role = keyof typeof ROLES;

export const usePermissions = (userRole: Role | null) => {
  const hasPermission = useCallback(
    (requiredPermission: Permission): boolean => {
      if (!userRole) return false;
      return ROLES[userRole].includes(requiredPermission);
    },
    [userRole]
  );

  const canManage = useCallback(
    (requiredPermission: Permission): boolean => {
      if (!userRole) return false;
      return !ROLES[userRole].includes(requiredPermission);
    },
    [userRole]
  );

  const hasRole = useCallback(
    (roleToCheck: Role): boolean => {
      return userRole === roleToCheck;
    },
    [userRole]
  );

  return { hasPermission, canManage, hasRole, userRole };
};
