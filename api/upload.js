import { issueSignedToken, presignUrl } from '@vercel/blob';

const TARGET = 'guide.epub';
const MAX_SIZE = 500 * 1024 * 1024;

function verifyKey(key) {
  if (!process.env.GUIDE_KEY) {
    const err = new Error('GUIDE_KEY is not configured');
    err.status = 500;
    throw err;
  }
  if (!key || key !== process.env.GUIDE_KEY) {
    const err = new Error('wrong_key');
    err.status = 401;
    throw err;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    verifyKey(req.body?.key || '');

    // Vercel's classic @vercel/blob/client upload tokens still do not support
    // private client uploads. Instead, mint a short-lived, one-file PUT URL.
    // The browser uploads directly to Blob, so the 100+ MB EPUB never passes
    // through this Serverless Function.
    const validUntil = Date.now() + 20 * 60 * 1000;
    const allowedContentTypes = ['application/epub+zip', 'application/octet-stream'];

    const token = await issueSignedToken({
      pathname: TARGET,
      operations: ['put'],
      validUntil,
      allowedContentTypes,
      maximumSizeInBytes: MAX_SIZE,
    });

    const { presignedUrl } = await presignUrl(token, {
      pathname: TARGET,
      operation: 'put',
      validUntil,
      allowedContentTypes,
      maximumSizeInBytes: MAX_SIZE,
      allowOverwrite: true,
      addRandomSuffix: false,
      cacheControlMaxAge: 60,
    });

    return res.status(200).json({
      url: presignedUrl,
      pathname: TARGET,
      validUntil,
      maxSize: MAX_SIZE,
    });
  } catch (error) {
    console.error('UPLOAD_URL_ERROR', error);
    return res.status(error?.status || 500).json({
      error: error?.message || 'could_not_prepare_upload',
    });
  }
}
