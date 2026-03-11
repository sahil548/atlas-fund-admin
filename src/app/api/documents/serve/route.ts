import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/documents/serve?url=<encoded blob URL>
 *
 * Proxy route for serving files stored in a private Vercel Blob store.
 * Fetches the blob using the server-side BLOB_READ_WRITE_TOKEN and
 * streams it back to the browser so it works in <iframe> and <img> tags.
 */
export async function GET(req: NextRequest) {
  const blobUrl = req.nextUrl.searchParams.get("url");
  if (!blobUrl) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Blob storage not configured" }, { status: 500 });
  }

  try {
    // Fetch the private blob with auth token
    const blobResponse = await fetch(blobUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!blobResponse.ok) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Stream the blob content back with correct headers
    const headers = new Headers();
    const contentType = blobResponse.headers.get("content-type") || "application/octet-stream";
    headers.set("Content-Type", contentType);

    const disposition = blobResponse.headers.get("content-disposition");
    if (disposition) {
      headers.set("Content-Disposition", disposition);
    }

    // Cache for 1 hour
    headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");

    return new NextResponse(blobResponse.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    logger.error("[documents/serve] Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
