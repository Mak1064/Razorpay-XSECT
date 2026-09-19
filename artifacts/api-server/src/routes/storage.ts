import { Readable } from 'stream';
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from '@workspace/api-zod';
import { Router, type IRouter, type Request, type Response } from 'express';

import { setObjectAclPolicy } from '../lib/objectAcl';
import { db, connectionTable, conversationTable, messageTable, professionalProfileTable } from '@workspace/db';
import { and, eq, sql } from 'drizzle-orm';
import { requireAuth, type AuthenticatedRequest } from '../middlewares/requireAuth';
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();
router.use(requireAuth);
const userId = (req: Request) => (req as AuthenticatedRequest).userId;

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 * Requires auth middleware so public callers cannot mint write-capable URLs.
 */
router.post(
  '/storage/uploads/request-url',
  async (req: Request, res: Response) => {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }

    try {
      const { name, size, contentType } = parsed.data;

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, 'Error generating upload URL');
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },
);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get(
  '/storage/public-objects/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const response = await objectStorageService.downloadObject(file);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      req.log.error({ err: error }, 'Error serving public object');
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  },
);

router.post('/storage/uploads/finalize', async (req: Request, res: Response) => {
  try {
    const objectPath = typeof req.body?.objectPath === 'string' ? req.body.objectPath : '';
    if (!/^\/objects\/[A-Za-z0-9._/-]+$/.test(objectPath)) {
      res.status(400).json({ error: 'Invalid object path' });
      return;
    }
    const file = await objectStorageService.getObjectEntityFile(objectPath);
    await setObjectAclPolicy(file, { owner: userId(req), visibility: 'private' });
    res.json({ objectPath });
  } catch {
    res.status(400).json({ error: 'Uploaded object was not found' });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile =
      await objectStorageService.getObjectEntityFile(objectPath);

    const ownedProfile = await db.select({ userId: professionalProfileTable.userId })
      .from(professionalProfileTable)
      .where(and(eq(professionalProfileTable.userId, userId(req)), eq(professionalProfileTable.photoUrl, objectPath)))
      .limit(1);
    const visibleProfile = await db.select({ userId: professionalProfileTable.userId, privacy: professionalProfileTable.privacy })
      .from(professionalProfileTable)
      .innerJoin(connectionTable, sql`(${connectionTable.requesterId} = ${professionalProfileTable.userId} AND ${connectionTable.recipientId} = ${userId(req)}) OR (${connectionTable.recipientId} = ${professionalProfileTable.userId} AND ${connectionTable.requesterId} = ${userId(req)})`)
      .where(and(eq(professionalProfileTable.photoUrl, objectPath), eq(connectionTable.status, "accepted")))
      .limit(1);
    const attached = await db.select({ senderId: messageTable.senderId })
      .from(messageTable)
      .innerJoin(conversationTable, eq(messageTable.conversationId, conversationTable.id))
      .innerJoin(connectionTable, sql`(${connectionTable.requesterId} = ${conversationTable.participantA} AND ${connectionTable.recipientId} = ${conversationTable.participantB}) OR (${connectionTable.requesterId} = ${conversationTable.participantB} AND ${connectionTable.recipientId} = ${conversationTable.participantA})`)
      .where(and(sql`attachment->>'url' = ${objectPath}`, sql`${conversationTable.participantA} = ${userId(req)} OR ${conversationTable.participantB} = ${userId(req)}`, eq(connectionTable.status, "accepted")))
      .limit(1);
    const sharedPhoto = visibleProfile.some((profile) => profile.privacy?.fieldVisibility?.photoUrl !== false);
    if (!ownedProfile.length && (!visibleProfile.length || !sharedPhoto) && !attached.length) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as ReadableStream<Uint8Array>,
      );
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, 'Object not found');
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    req.log.error({ err: error }, 'Error serving object');
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

export default router;
