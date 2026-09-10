import { issueSignedToken, presignUrl } from "@vercel/blob";

const PATHNAME = "Lonely Planet Peru.epub";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const { key } = req.body || {};

    if (!process.env.GUIDE_KEY) {
      return res.status(500).json({ error: "GUIDE_KEY is not configured" });
    }

    if (!key || key !== process.env.GUIDE_KEY) {
      return res.status(401).json({ error: "wrong_key" });
    }

    const token = await issueSignedToken({
      pathname: PATHNAME,
      operations: ["get"],
      validUntil: Date.now() + 60 * 60 * 1000
    });

    const { presignedUrl } = await presignUrl(token, {
      pathname: PATHNAME,
      operation: "get",
      validUntil: Date.now() + 60 * 60 * 1000
    });

    return res.status(200).json({ url: presignedUrl });
  } catch (error) {
    console.error("GUIDE_ERROR", error);
    return res.status(500).json({
      error: error && error.message ? error.message : "could_not_create_guide_url"
    });
  }
}
