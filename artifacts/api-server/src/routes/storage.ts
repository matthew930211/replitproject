import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { requireAuth } from "../middlewares/auth";
import { db, objectUploadsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a proxy upload URL for file upload.
 * Returns an internal proxy URL (/api/storage/uploads/proxy/:objectId) instead of
 * a GCS signed URL, avoiding browser CORS issues with storage.googleapis.com.
 */
router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  const me = req.appUser!;
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;
    const { objectId, objectPath } = objectStorageService.createObjectEntityUploadIntent();

    await db.insert(objectUploadsTable).values({
      objectPath,
      uploaderId: me.id,
    });

    const uploadURL = `/api/storage/uploads/proxy/${objectId}`;

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * PUT /storage/uploads/proxy/:objectId
 *
 * Proxy upload: receives the raw file body from the browser and writes it
 * directly to GCS server-side. This avoids CORS issues that arise when the
 * browser tries to PUT directly to storage.googleapis.com.
 */
router.put(
  "/storage/uploads/proxy/:objectId",
  requireAuth,
  async (req: Request, res: Response) => {
    const me = req.appUser!;
    const { objectId } = req.params;

    if (!objectId || !/^[0-9a-f-]{36}$/.test(objectId)) {
      res.status(400).json({ error: "Invalid objectId" });
      return;
    }

    const objectPath = `/objects/uploads/${objectId}`;

    try {
      const [upload] = await db
        .select()
        .from(objectUploadsTable)
        .where(eq(objectUploadsTable.objectPath, objectPath));

      if (!upload || upload.uploaderId !== me.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const file = objectStorageService.resolveObjectEntityFile(objectId);
      const contentType = req.headers["content-type"] || "application/octet-stream";

      await new Promise<void>((resolve, reject) => {
        const writeStream = file.createWriteStream({
          metadata: { contentType },
          resumable: false,
        });
        req.pipe(writeStream);
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
        req.on("error", reject);
      });

      res.status(200).json({ ok: true, objectPath });
    } catch (error) {
      req.log.error({ err: error }, "Proxy upload failed");
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const response = await objectStorageService.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve private object entities from PRIVATE_OBJECT_DIR.
 * ACL rules based on uploader ownership:
 *  - CHIEF_ADMIN: can access any private object
 *  - BIDDER_MANAGER: can access objects they uploaded, or uploaded by their assigned bidders
 *  - BIDDER: can only access objects they personally uploaded
 */
router.get("/storage/objects/*path", requireAuth, async (req: Request, res: Response) => {
  const me = req.appUser!;

  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;

    if (me.role !== "CHIEF_ADMIN") {
      const [upload] = await db.select().from(objectUploadsTable).where(eq(objectUploadsTable.objectPath, objectPath));

      if (!upload) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      if (me.role === "BIDDER") {
        if (upload.uploaderId !== me.id) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
      } else if (me.role === "BIDDER_MANAGER") {
        if (upload.uploaderId !== me.id) {
          const [uploaderUser] = await db.select().from(usersTable).where(eq(usersTable.id, upload.uploaderId));
          if (!uploaderUser || uploaderUser.managerId !== me.id) {
            res.status(403).json({ error: "Forbidden" });
            return;
          }
        }
      }
    }

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
