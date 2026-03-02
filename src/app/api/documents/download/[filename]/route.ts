import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const filePath = path.join(process.cwd(), "data", "uploads", filename);
  try {
    const buffer = await readFile(filePath);
    const cleanName = filename.replace(/^\d+-/, "");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${cleanName}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
