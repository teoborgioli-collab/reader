import { get, del, issueSignedToken, presignUrl } from "@vercel/blob";
import { Readable } from "node:stream";

const PATHNAME = "Lonely Planet Peru.epub";

function verifyKey(req) {
  if (!process.env.GUIDE_KEY) {
    const err = new Error("GUIDE_KEY is not configured");
    err.status = 500;
    throw err;
  }
  const key = req.body?.key;
  if (!key || key !== process.env.GUIDE_KEY) {
    const err = new Error("wrong_key");
    err.status = 401;
    throw err;
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    verifyKey(req);
    const action = req.body?.action || "read";

    if (action === "read") {
      const result = await get(PATHNAME, {
        access: "private",
        useCache: false,
      });

      if (!result) return res.status(404).json({ error: "guide_not_found" });

      res.statusCode = 200;
      res.setHeader("Content-Type", result.blob?.contentType || "application/epub+zip");
      res.setHeader("Content-Disposition", 'inline; filename="Lonely Planet Peru.epub"');
      if (result.blob?.size) res.setHeader("Content-Length", String(result.blob.size));
      return Readable.fromWeb(result.stream).pipe(res);
    }

    if (action === "upload-url") {
      // Large EPUBs upload directly from the browser to the private Blob store.
      // The URL is short-lived and only allows PUT to this one pathname.
      const validUntil = Date.now() + 15 * 60 * 1000;
      const token = await issueSignedToken({
        pathname: PATHNAME,
        operations: ["put"],
        validUntil,
        maximumSizeInBytes: 250 * 1024 * 1024,
        allowedContentTypes: ["application/epub+zip", "application/octet-stream"],
      });

      const { presignedUrl } = await presignUrl(token, {
        pathname: PATHNAME,
        operation: "put",
        validUntil,
      });

      return res.status(200).json({ url: presignedUrl, pathname: PATHNAME });
    }

    if (action === "delete") {
      try {
        await del(PATHNAME, { access: "private" });
      } catch (error) {
        // Treat an already-missing file as successfully removed.
        if (!String(error?.message || error).toLowerCase().includes("not found")) throw error;
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "unknown_action" });
  } catch (error) {
    console.error("GUIDE_ERROR", error);
    if (res.headersSent) return res.destroy(error);
    return res.status(error?.status || 500).json({
      error: error?.message || "guide_error",
    });
  }
}
