import { z } from "zod";
import { updateXeroPurchaseOrder } from "../../handlers/update-xero-purchase-order.handler.js";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { PurchaseOrder } from "xero-node";

const trackingSchema = z.object({
  name: z.string().describe("The name of the tracking category. Can be obtained from the list-tracking-categories tool"),
  option: z.string().describe("The name of the tracking option. Can be obtained from the list-tracking-categories tool"),
  trackingCategoryID: z.string().describe("The ID of the tracking category. \
    Can be obtained from the list-tracking-categories tool"),
});

const lineItemSchema = z.object({
  lineItemID: z.string().describe("The ID of an existing line item to update in place. \
    Can be obtained from the list-purchase-orders or get-purchase-order tools. \
    When provided, only the fields included in this call are changed on that line item - \
    any fields left out (for example unitAmount) are preserved as-is, not cleared. \
    Omit this field entirely when adding a brand new line item, and in that case provide \
    description, quantity, unitAmount, accountCode, and taxType.").optional(),
  description: z.string().describe("The description of the line item").optional(),
  quantity: z.number().describe("The quantity of the line item").optional(),
  unitAmount: z.number().describe("The price per unit of the line item").optional(),
  accountCode: z.string().describe("The account code of the line item - can be obtained from the list-accounts tool").optional(),
  taxType: z.string().describe("The tax type of the line item - can be obtained from the list-tax-rates tool").optional(),
  itemCode: z.string().describe("The item code of the line item - can be obtained from the list-items tool.").optional(),
  tracking: z.array(trackingSchema).describe("Up to 2 tracking categories and options can be added to the line item. \
    Can be obtained from the list-tracking-categories tool. \
    Only use if prompted by the user.").optional(),
});

const UpdatePurchaseOrderTool = CreateXeroTool(
  "update-purchase-order",
  "Update a purchase order in Xero. Only works while the purchase order is still a draft.\
  All line items must be provided. Any line items not provided will be removed, including existing line items.\
  Do not modify line items that have not been specified by the user.\
  To change only specific fields on an existing line item (for example just the quantity), \
  include that line item's lineItemID (from list-purchase-orders or get-purchase-order) along \
  with only the field(s) you want to change - omitted fields are preserved, not cleared.\
  This tool can also be used to move the purchase order forward, for example setting status \
  to SUBMITTED or AUTHORISED once it's ready.\
  When a purchase order is updated, a deep link to it in Xero is returned. \
  This link should be displayed to the user.",
  {
    purchaseOrderId: z.string().describe("The ID of the purchase order to update."),
    lineItems: z.array(lineItemSchema).optional().describe(
      "All line items must be provided. Any line items not provided will be removed. Including existing line items. \
      Do not modify line items that have not been specified by the user",
    ),
    reference: z.string().optional().describe("A reference for the purchase order."),
    date: z.string().optional().describe("The date the purchase order was issued (YYYY-MM-DD format)."),
    deliveryDate: z.string().optional().describe("The date the goods are to be delivered (YYYY-MM-DD format)."),
    expectedArrivalDate: z.string().optional().describe("The date the goods are expected to arrive (YYYY-MM-DD format)."),
    deliveryAddress: z.string().optional().describe("The address the goods are to be delivered to."),
    attentionTo: z.string().optional().describe("The person the delivery is going to."),
    telephone: z.string().optional().describe("The phone number for the person accepting the delivery."),
    deliveryInstructions: z.string().optional().describe("Free text delivery instructions (500 characters max)."),
    contactId: z.string().optional().describe("The ID of the supplier contact to update the purchase order for. \
      Can be obtained from the list-contacts tool."),
    status: z.enum(["DRAFT", "SUBMITTED", "AUTHORISED", "BILLED", "DELETED"])
      .optional()
      .describe("Move the purchase order to a new status, for example SUBMITTED or AUTHORISED once it's ready to send."),
  },
  async ({
    purchaseOrderId,
    lineItems,
    reference,
    date,
    deliveryDate,
    expectedArrivalDate,
    deliveryAddress,
    attentionTo,
    telephone,
    deliveryInstructions,
    contactId,
    status,
  }) => {
    const result = await updateXeroPurchaseOrder(
      purchaseOrderId,
      lineItems,
      reference,
      date,
      deliveryDate,
      expectedArrivalDate,
      deliveryAddress,
      attentionTo,
      telephone,
      deliveryInstructions,
      contactId,
      status as PurchaseOrder.StatusEnum | undefined,
    );
    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error updating purchase order: ${result.error}`,
          },
        ],
      };
    }

    const purchaseOrder = result.result;

    const deepLink = purchaseOrder.purchaseOrderID
      ? await getDeepLink(
          DeepLinkType.PURCHASE_ORDER,
          purchaseOrder.purchaseOrderID,
        )
      : null;

    return {
      content: [
        {
          type: "text" as const,
          text: [
            "Purchase order updated successfully:",
            `ID: ${purchaseOrder?.purchaseOrderID}`,
            `Purchase Order Number: ${purchaseOrder?.purchaseOrderNumber}`,
            `Contact: ${purchaseOrder?.contact?.name}`,
            `Total: ${purchaseOrder?.total}`,
            `Status: ${purchaseOrder?.status}`,
            deepLink ? `Link to view: ${deepLink}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    };
  },
);

export default UpdatePurchaseOrderTool;
