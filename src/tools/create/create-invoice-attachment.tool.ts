import { z } from "zod";
import { createXeroInvoiceAttachment } from "../../handlers/create-xero-invoice-attachment.handler.js";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { xeroClient } from "../../clients/xero-client.js";
import { getClientHeaders } from "../../helpers/get-client-headers.js";
import { Invoice } from "xero-node";

const CreateInvoiceAttachmentTool = CreateXeroTool(
  "create-invoice-attachment",
  "Attach a local file (for example a PDF) to an existing invoice or bill in Xero.\
 The file must already exist on this machine - provide its absolute path.\
 Set includeOnline to true if the file should also be visible to the customer on their\
 online invoice (for example a usage report backing up the charges on the invoice).\
 When an attachment is created, a deep link to the invoice is returned.\
 This link should be displayed to the user.",
  {
    invoiceId: z.string().describe("The ID of the invoice or bill to attach the file to. \
      Can be obtained from the list-invoices tool."),
    filePath: z.string().describe("The absolute path to the file on this machine, \
      for example C:\\invoices\\usage-june.pdf or /Users/name/invoices/usage-june.pdf."),
    fileName: z.string().describe("The file name to store the attachment under in Xero. \
      If not provided, the file name is taken from filePath.").optional(),
    includeOnline: z.boolean().describe("Whether the attachment should be visible to the \
      customer on their online invoice. Defaults to false (internal attachment only) if not specified.").optional(),
  },
  async ({ invoiceId, filePath, fileName, includeOnline }) => {
    const result = await createXeroInvoiceAttachment(
      invoiceId,
      filePath,
      fileName,
      includeOnline,
    );
    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error attaching file to invoice: ${result.error}`,
          },
        ],
      };
    }

    const attachment = result.result;

    let deepLink: string | undefined;
    try {
      await xeroClient.authenticate();
      const invoiceResponse = await xeroClient.accountingApi.getInvoice(
        xeroClient.tenantId,
        invoiceId,
        undefined,
        getClientHeaders(),
      );
      const invoice = invoiceResponse.body.invoices?.[0];
      if (invoice?.invoiceID) {
        deepLink = await getDeepLink(
          invoice.type === Invoice.TypeEnum.ACCREC
            ? DeepLinkType.INVOICE
            : DeepLinkType.BILL,
          invoice.invoiceID,
        );
      }
    } catch {
      // Non-fatal: the attachment succeeded even if we couldn't build a deep link.
      deepLink = undefined;
    }

    return {
      content: [
        {
          type: "text" as const,
          text: [
            "Attachment created successfully:",
            `Attachment ID: ${attachment?.attachmentID}`,
            `File Name: ${attachment?.fileName}`,
            `Mime Type: ${attachment?.mimeType}`,
            `Include Online: ${attachment?.includeOnline ?? false}`,
            deepLink ? `Link to view invoice: ${deepLink}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    };
  },
);

export default CreateInvoiceAttachmentTool;
