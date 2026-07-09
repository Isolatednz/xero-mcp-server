import path from "path";

const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".zip": "application/zip",
};

/**
 * Resolves a Content-Type for a file based on its extension, defaulting to
 * application/octet-stream for anything unrecognised. Used when uploading
 * attachments to Xero, which relies on the Content-Type header rather than
 * inspecting the file contents.
 */
export function getMimeTypeForFileName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  return MIME_TYPES_BY_EXTENSION[ext] ?? "application/octet-stream";
}
