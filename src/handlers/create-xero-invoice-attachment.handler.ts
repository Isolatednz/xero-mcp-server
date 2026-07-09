import fs from "fs";
import path from "path";
import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { getMimeTypeForFileName } from "../helpers/get-mime-type.js";
import { Attachment } from "xero-node";

async function createInvoiceAttachment(
  invoiceId: string,
  filePath: string,
  fileName: string | undefined,
  includeOnline: boolean | undefined,
): Promise<Attachment | undefined> {
  await xeroClient.authenticate();

  let fileBuffer: Buffer;
  try {
    fileBuffer = fs.readFileSync(filePath);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not read file at "${filePath}": ${reason}. Check the path is correct, ` +
        "absolute, and accessible from this machine.",
    );
  }

  const resolvedFileName = fileName || path.basename(filePath);
  const clientHeaders = getClientHeaders();

  const response =
    await xeroClient.accountingApi.createInvoiceAttachmentByFileName(
      xeroClient.tenantId,
      invoiceId,
      resolvedFileName,
      fileBuffer,
      includeOnline,
      undefined, // idempotencyKey
      {
        headers: {
          ...clientHeaders.headers,
          "Content-Type": getMimeTypeForFileName(resolvedFileName),
        },
      },
    );

  return response.body.attachments?.[0];
}

/**
 * Attach a local file to an existing invoice or bill in Xero.
 */
export async function createXeroInvoiceAttachment(
  invoiceId: string,
  filePath: string,
  fileName?: string,
  includeOnline?: boolean,
): Promise<XeroClientResponse<Attachment>> {
  try {
    const attachment = await createInvoiceAttachment(
      invoiceId,
      filePath,
      fileName,
      includeOnline,
    );

    if (!attachment) {
      throw new Error("Attachment upload failed: Xero did not return the created attachment.");
    }

    return {
      result: attachment,
      isError: false,
      error: null,
    };
  } catch (error) {
    return {
      result: null,
      isError: true,
      error: formatError(error),
    };
  }
}
