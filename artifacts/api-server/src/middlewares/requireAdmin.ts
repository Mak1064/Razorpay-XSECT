import { adminUsersTable, db } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "./requireAuth";

/** Admins are rows in admin_users. ADMIN_USER_IDS (comma-separated Clerk user ids) can bootstrap admins via env. */
export async function isAdmin(userId: string): Promise<boolean> {
  const envAdmins = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (envAdmins.includes(userId)) return true;
  const row = (await db.select().from(adminUsersTable).where(eq(adminUsersTable.userId, userId)).limit(1))[0];
  return Boolean(row);
}

/** Must run after requireAuth. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required." }); return; }
    next();
  } catch (error) { next(error); }
}
