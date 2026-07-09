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
  lineItemID: z.string().describe("The ID of an existing line item, if updating one in place \
    rather than adding a new line. Can be obtained from the list-purchase-orders or \
    get-purchase-order tools. Unlike invoices, Xero's Purchase Orders API does NOT preserve \
    omitted fields when a lineItemID is supplied - every field below (description, quantity, \
    unitAmount, accountCode, taxType) must still be provided in full on every line, even when \
    only one value (e.g. quantity) is actually changing. Fetch the existing line item first \
    with get-purchase-order if you need its current values to resupply them.").optional(),
  description: z.string().describe("The description of the line item"),
  quantity: z.number().describe("The quantity of the line item"),
  unitAmount: z.number().describe("The price per unit of the line item"),
  accountCode: z.string().describe("The account code of the line item - can be obtained from the list-accounts tool"),
  taxType: z.string().describe("The tax type of the line item - can be obtained from the list-tax-rates tool"),
  itemCode: z.string().describe("The item code of the line item - can be obtained from the list-items tool.").optional(),
  tracking: z.array(trackingSchema).describe("Up to 2 tracking categories and options can be added to the line item. \
    Can be obtained from the list-tracking-categories tool. \
    Only use if prompted by the user.").optional(),
});

const UpdatePurchaseOrderTool = CreateXeroTool(
  "update-purchase-order",
  "Update a purchase order in Xero. Only works while the purchase order is still a draft.\
  All line items must be provided in full on every call. Any line items not provided will be \
  removed, including existing line items. Do not modify line items that have not been \
  specified by the user.\
  Unlike update-invoice, this does NOT support partial per-field updates: even when you include \
  an existing line item's lineItemID to update it in place, Xero still requires description, \
  quantity, unitAmount, accountCode, and taxType to all be supplied - omitted fields are not \
  preserved and the call will fail with a validation error. If you only want to change one \
  field (e.g. quantity), first call get-purchase-order to read the line item's current values, \
  then resupply all of them here with just that one field changed.\
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
