import { z } from "zod";
import { updateXeroInvoice } from "../../handlers/update-xero-invoice.handler.js";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { Invoice } from "xero-node";

const trackingSchema = z.object({
  name: z.string().describe("The name of the tracking category. Can be obtained from the list-tracking-categories tool"),
  option: z.string().describe("The name of the tracking option. Can be obtained from the list-tracking-categories tool"),
  trackingCategoryID: z.string().describe("The ID of the tracking category. \
    Can be obtained from the list-tracking-categories tool"),
});

const lineItemSchema = z.object({
  lineItemID: z.string().describe("The ID of an existing line item to update in place. \
    Can be obtained from the list-invoices tool (shown as 'Line Item ID' when line items are returned). \
    When provided, only the fields included in this call are changed on that line item - \
    any fields left out (for example unitAmount) are preserved as-is, not cleared. \
    Omit this field entirely when adding a brand new line item, and in that case provide \
    description, quantity, unitAmount, accountCode, and taxType.").optional(),
  description: z.string().describe("The description of the line item").optional(),
  quantity: z.number().describe("The quantity of the line item").optional(),
  unitAmount: z.number().describe("The price per unit of the line item").optional(),
  accountCode: z.string().describe("The account code of the line item - can be obtained from the list-accounts tool").optional(),
  taxType: z.string().describe("The tax type of the line item - can be obtained from the list-tax-rates tool").optional(),
  itemCode: z.string().describe("The item code of the line item - can be obtained from the list-items tool \
    If the item was not populated in the original invoice, \
    add without an item code unless the user has told you to add an item code.").optional(),
  tracking: z.array(trackingSchema).describe("Up to 2 tracking categories and options can be added to the line item. \
    Can be obtained from the list-tracking-categories tool. \
    Only use if prompted by the user.").optional(),
});

const UpdateInvoiceTool = CreateXeroTool(
  "update-invoice",
  "Update an invoice in Xero. Only works on draft invoices.\
  All line items must be provided. Any line items not provided will be removed. Including existing line items.\
  Do not modify line items that have not been specified by the user.\
  To change only specific fields on an existing line item (for example just the quantity, \
  leaving a manually-entered 4dp unit price untouched), include that line item's lineItemID \
  (from list-invoices) along with only the field(s) you want to change - omitted fields are \
  preserved, not cleared. Line items without a lineItemID are treated as new additions and \
  should have all their fields supplied.\
 When an invoice is updated, a deep link to the invoice in Xero is returned. \
 This deep link can be used to view the contact in Xero directly. \
 This link should be displayed to the user.",
  {
    invoiceId: z.string().describe("The ID of the invoice to update."),
    lineItems: z.array(lineItemSchema).optional().describe(
      "All line items must be provided. Any line items not provided will be removed. Including existing line items. \
      Do not modify line items that have not been specified by the user",
    ),
    reference: z.string().optional().describe("A reference number for the invoice."),
    dueDate: z.string().optional().describe("The due date of the invoice."),
    date: z.string().optional().describe("The date of the invoice."),
    contactId: z.string().optional().describe("The ID of the contact to update the invoice for. \
      Can be obtained from the list-contacts tool."),
  },
  async (
    {
      invoiceId,
      lineItems,
      reference,
      dueDate,
      date,
      contactId,
    }: {
      invoiceId: string;
      lineItems?: Array<{
        lineItemID?: string;
        description?: string;
        quantity?: number;
        unitAmount?: number;
        accountCode?: string;
        taxType?: string;
      }>;
      reference?: string;
      dueDate?: string;
      date?: string;
      contactId?: string;
    },
    //_extra: { signal: AbortSignal },
  ) => {
    const result = await updateXeroInvoice(
      invoiceId,
      lineItems,
      reference,
      dueDate,
      date,
      contactId,
    );
    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error updating invoice: ${result.error}`,
          },
        ],
      };
    }

    const invoice = result.result;

    const deepLink = invoice.invoiceID
      ? await getDeepLink(
          invoice.type === Invoice.TypeEnum.ACCREC ? DeepLinkType.INVOICE : DeepLinkType.BILL,
          invoice.invoiceID,
        )
      : null;

    return {
      content: [
        {
          type: "text" as const,
          text: [
            "Invoice updated successfully:",
            `ID: ${invoice?.invoiceID}`,
            `Contact: ${invoice?.contact?.name}`,
            `Type: ${invoice?.type}`,
            `Total: ${invoice?.total}`,
            `Status: ${invoice?.status}`,
            deepLink ? `Link to view: ${deepLink}` : null,
          ].join("\n"),
        },
      ],
    };
  },
);

export default UpdateInvoiceTool;
