import "server-only";

import { createHash, randomUUID } from "crypto";
import { mkdir, rm, writeFile, unlink } from "fs/promises";
import path from "path";

import {
  ATTACHMENT_ALLOWED_MIME,
  ATTACHMENT_MAX_BYTES,
  detectAttachmentMime,
} from "@/lib/attachment-mime";

export type StoredAttachment = {
  fileName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
};

function storageRoot() {
  return path.join(process.cwd(), "storage", "correspondence");
}

function safeFileName(name: string) {
  return name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 180) || "attachment";
}

export function attachmentDiskPath(correspondenceId: string, storedName: string) {
  return path.join(storageRoot(), correspondenceId, storedName);
}

export function correspondenceStorageDir(correspondenceId: string) {
  return path.join(storageRoot(), correspondenceId);
}

/** Reject bad files before any DB write. */
export async function assertValidAttachmentFiles(files: File[]): Promise<void> {
  for (const file of files) {
    if (!file || file.size <= 0) continue;
    if (file.size > ATTACHMENT_MAX_BYTES) {
      throw new Error(`"${file.name}" is larger than 12 MB.`);
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const mimeType = detectAttachmentMime(bytes);
    if (!mimeType || !ATTACHMENT_ALLOWED_MIME.has(mimeType)) {
      throw new Error(
        `"${file.name}" must be a PDF or image (JPEG, PNG, WebP, GIF).`,
      );
    }
  }
}

/**
 * Store files on disk. On any failure, removes files written in this call.
 */
export async function storeCorrespondenceFiles(
  correspondenceId: string,
  files: File[],
): Promise<StoredAttachment[]> {
  const usable = files.filter((file) => file && file.size > 0);
  if (usable.length === 0) return [];

  await assertValidAttachmentFiles(usable);

  const dir = correspondenceStorageDir(correspondenceId);
  await mkdir(dir, { recursive: true });

  const saved: StoredAttachment[] = [];
  try {
    for (const file of usable) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const mimeType = detectAttachmentMime(bytes);
      if (!mimeType) {
        throw new Error(
          `"${file.name}" must be a PDF or image (JPEG, PNG, WebP, GIF).`,
        );
      }
      const digest = createHash("sha1").update(bytes).digest("hex").slice(0, 10);
      const storedName = `${randomUUID()}-${digest}-${safeFileName(file.name)}`;
      await writeFile(path.join(dir, storedName), bytes);
      saved.push({
        fileName: file.name.slice(0, 255),
        storedName,
        mimeType,
        sizeBytes: file.size,
      });
    }
    return saved;
  } catch (error) {
    for (const file of saved) {
      await removeStoredAttachment(correspondenceId, file.storedName);
    }
    throw error;
  }
}

export async function removeStoredAttachment(
  correspondenceId: string,
  storedName: string,
) {
  try {
    await unlink(attachmentDiskPath(correspondenceId, storedName));
  } catch {
    /* Missing file is fine. */
  }
}

export async function removeCorrespondenceStorage(correspondenceId: string) {
  try {
    await rm(correspondenceStorageDir(correspondenceId), {
      recursive: true,
      force: true,
    });
  } catch {
    /* Missing folder is fine. */
  }
}

/** Collect named file inputs from FormData (`attachment` / `attachments`). */
export function filesFromFormData(formData: FormData): File[] {
  const out: File[] = [];
  for (const key of ["attachment", "attachments", "letterCopy"]) {
    for (const value of formData.getAll(key)) {
      if (value instanceof File && value.size > 0) out.push(value);
    }
  }
  return out;
}
