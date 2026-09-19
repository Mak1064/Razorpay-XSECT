import { z } from "zod";

export const RequestUploadUrlBody = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().positive().max(10 * 1024 * 1024),
  contentType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf", "text/plain"]),
});
export const RequestUploadUrlResponse = z.object({
  uploadURL: z.string().url(),
  objectPath: z.string().regex(/^\/objects\/[A-Za-z0-9._/-]+$/),
  metadata: RequestUploadUrlBody,
});