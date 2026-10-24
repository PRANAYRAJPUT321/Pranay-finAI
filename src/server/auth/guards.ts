import type { Role } from "@prisma/client";

export class AuthError extends Error {
  constructor(
    message: string,
    public status: 401 | 403,
  ) {
    super(message);
  }
}

export interface Principal {
  id: string;
  role: Role;
}

export const CONTENT_ROLES: Role[] = ["CONTENT_MANAGER", "ADMIN"];
export const ADMIN_ROLES: Role[] = ["ADMIN"];

/** Pure authorization check, used by every server-side guard. */
export function assertRole(user: Principal | null | undefined, roles: Role[]): asserts user is Principal {
  if (!user) throw new AuthError("Sign in required", 401);
  if (!roles.includes(user.role)) throw new AuthError("You do not have permission to do this", 403);
}

export function hasRole(user: Principal | null | undefined, roles: Role[]): boolean {
  return !!user && roles.includes(user.role);
}

/** Ensures a user can only act on resources they own (admins excepted where allowed). */
export function assertOwner(user: Principal, ownerId: string | null | undefined, allowAdmin = false) {
  if (ownerId === user.id) return;
  if (allowAdmin && user.role === "ADMIN") return;
  throw new AuthError("Not found", 403);
}
