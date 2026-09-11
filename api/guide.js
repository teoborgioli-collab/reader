import { get, head, del } from '@vercel/blob';
import { Readable } from 'node:stream';

const TARGET = 'guide.epub';
const LEGACY = 'Lonely Planet Peru.epub';

function verifyKey(req) {
  if (!process.env.GUIDE_KEY) {
    const err = new Error('GUIDE_KEY is not configured');
    err.status = 500;
    throw err;
  }
  const key = req.body?.key || '';
  if (key !== process.env.GUIDE_KEY) {
    const err = new Error('wrong_key');
    err.status = 401;
    throw err;
  }
}

function isNotFound(error) {
  const text = String(error?.message || error).toLowerCase();
  return text.includes('not found') ||
    text.includes('404') ||
    text.includes('does not exist') ||
    text.includes('blobnotfound');
}

async function exists(pathname) {
  try {
    const info = await head(pathname, { access: 'private' });
    return info || null;
  } catch (error) {
    // Vercel currently reports a missing private blob as
    // "The requested blob does not exist" rather than always using 404.
    // Missing guide is a normal first-use state, not an application error.
    if (isNotFound(error)) return null;
    throw error;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    verifyKey(req);
    const action = req.body?.action || 'status';

    if (action === 'status') {
      const info = await exists(TARGET);
      return res.status(200).json({
        exists: !!info,
        pathname: TARGET,
        size: info?.size || null,
        uploadedAt: info?.uploadedAt || null
      });
    }

    if (action === 'read') {
      const result = await get(TARGET, { access: 'private', useCache: false });
      if (!result) return res.status(404).json({ error: 'guide_not_found' });

      res.statusCode = 200;
      res.setHeader('Content-Type', result.blob?.contentType || 'application/epub+zip');
      res.setHeader('Content-Disposition', 'inline; filename="guide.epub"');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (result.blob?.size) res.setHeader('Content-Length', String(result.blob.size));
      return Readable.fromWeb(result.stream).pipe(res);
    }

    if (action === 'finalize') {
      const info = await exists(TARGET);
      if (!info) return res.status(404).json({ error: 'upload_not_found' });

      // The old manually uploaded copy is no longer used. Remove it after the
      // new shared guide has definitely arrived, so there is no risk of losing both.
      try {
        await del(LEGACY, { access: 'private' });
      } catch (error) {
        if (!isNotFound(error)) {
          console.warn('LEGACY_DELETE_WARNING', error);
        }
      }

      return res.status(200).json({ ok: true, size: info.size || null });
    }

    if (action === 'delete') {
      try {
        await del(TARGET, { access: 'private' });
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'unknown_action' });
  } catch (error) {
    console.error('GUIDE_ERROR', error);
    if (res.headersSent) return res.destroy(error);
    return res.status(error?.status || 500).json({ error: error?.message || 'guide_error' });
  }
}
