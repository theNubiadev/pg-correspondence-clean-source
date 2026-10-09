import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { NextResponse } from "next/server";
import { Readable } from "stream";

import { attachmentDiskPath } from "@/lib/attachments";
import { requireRegisterAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> },
) {
  try {
    await requireRegisterAccess();
    const { id, attachmentId } = await context.params;
    const attachment = await prisma.correspondenceAttachment.findFirst({
      where: { id: attachmentId, correspondenceId: id },
    });
    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
    }

    const diskPath = attachmentDiskPath(id, attachment.storedName);
    await stat(diskPath);
    const stream = createReadStream(diskPath);
    const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `inline; filename="${attachment.fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof Error && error.name === "UnauthenticatedError") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    console.error("[attachment] download failed", error);
    return NextResponse.json({ error: "Could not open the attachment." }, { status: 500 });
  }
}
