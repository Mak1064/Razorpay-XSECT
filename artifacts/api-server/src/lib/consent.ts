import { consentRecordsTable, db } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { type AuthenticatedRequest } from "../middlewares/requireAuth";

export type ConsentPurpose = "analytics" | "ai_profiling" | "marketing" | "precise_location";

export async function hasConsent(userId: string, purpose: ConsentPurpose): Promise<boolean> {
  const [latest] = await db.select({ granted: consentRecordsTable.granted })
    .from(consentRecordsTable)
    .where(and(eq(consentRecordsTable.userId, userId), eq(consentRecordsTable.purpose, purpose)))
    .orderBy(desc(consentRecordsTable.createdAt))
    .limit(1);
  return latest?.granted === true;
}

export function requireConsent(purpose: ConsentPurpose) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).userId;
      if (await hasConsent(userId, purpose)) {
        next();
        return;
      }
      res.status(403).json({
        error: `Consent for ${purpose.replace("_", " ")} is required.`,
        code: "CONSENT_REQUIRED",
        purpose,
      });
    } catch (error) {
      next(error);
    }
  };
}