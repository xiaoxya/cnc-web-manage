import type { UserRole } from "@prisma/client";

export function requireRole(
  userRole: string | undefined,
  allowedRoles: UserRole[]
): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole as UserRole);
}

export function isAdmin(role: string | undefined): boolean {
  return role === "ADMIN";
}

export function isOperator(role: string | undefined): boolean {
  return role === "OPERATOR";
}
