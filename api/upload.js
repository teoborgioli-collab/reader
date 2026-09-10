import { handleUpload } from '@vercel/blob/client';

const TARGET = 'guide.epub';

function verifyClientPayload(clientPayload) {
  if (!process.env.GUIDE_KEY) throw new Error('GUIDE_KEY is not configured');
  let key = '';
  try {
    key = JSON.parse(clientPayload || '{}').key || '';
  } catch {
    key = '';
  }
  if (!key || key !== process.env.GUIDE_KEY) throw new Error('wrong_key');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        verifyClientPayload(clientPayload);
        return {
          allowedContentTypes: ['application/epub+zip', 'application/octet-stream'],
          maximumSizeInBytes: 500 * 1024 * 1024,
          addRandomSuffix: false,
          allowOverwrite: true,
          tokenPayload: JSON.stringify({ target: TARGET })
        };
      },
      onUploadCompleted: async () => {
        // No database is needed. The shared book always lives at guide.epub.
      }
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('UPLOAD_ERROR', error);
    const message = error?.message || String(error);
    return res.status(message === 'wrong_key' ? 401 : 400).json({ error: message });
  }
}
