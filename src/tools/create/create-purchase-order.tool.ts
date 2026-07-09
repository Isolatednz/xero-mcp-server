import { z } from "zod";
import { createXeroPurchaseOrder } from "../../handlers/create-xero-purchase-order.handler.js";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const trackingSchema = z.object({
  name: z.string().describe("The name of the tracking category. Can be obtained from the list-tracking-categories tool"),
  option: z.string().describe("The name of the tracking option. Can be obtained from the list-tracking-categories tool"),
  trackingCategoryID: z.string().describe("The ID of the tracking category. \
    Can be obtained from the list-tracking-categories tool"),
});

const lineItemSchema = z.object({
  description: z.string().describe("The description of the line item"),
  quantity: z.number().describe("The quantity of the line item"),
  unitAmount: z.number().describe("The price per unit of the line item"),
  accountCode: z.string().describe("The account code of the line item - can be obtained from the list-accounts tool"),
  taxType: z.string().describe("The tax type of the line item - can be obtained from the list-tax-rates tool"),
  itemCode: z.string().describe("The item code of the line item - can be obtained from the list-items tool \
    If the item is not listed, add without an item code and ask the user if they would like to add an item code.").optional(),
  tracking: z.array(trackingSchema).describe("Up to 2 tracking categories and options can be added to the line item. \
    Can be obtained from the list-tracking-categories tool. \
    Only use if prompted by the user.").optional(),
});

const CreatePurchaseOrderTool = CreateXeroTool(
  "create-purchase-order",
  "Create a purchase order in Xero, to order goods or services from a supplier.\
 The purchase order is created as a draft.\
 When a purchase order is created, a deep link to it in Xero is returned. \
 This deep link can be used to view the purchase order in Xero directly. \
 This link should be displayed to the user.",
  {
    contactId: z.string().describe("The ID of the supplier contact to create the purchase order for. \
      Can be obtained from the list-contacts tool."),
    lineItems: z.array(lineItemSchema),
    date: z.string().describe("The date the purchase order was issued (YYYY-MM-DD format). \
      Defaults to today if not specified.").optional(),
    deliveryDate: z.string().describe("The date the goods are to be delivered (YYYY-MM-DD format).").optional(),
    expectedArrivalDate: z.string().describe("The date the goods are expected to arrive (YYYY-MM-DD format).").optional(),
    reference: z.string().describe("A reference for the purchase order.").optional(),
    deliveryAddress: z.string().describe("The address the goods are to be delivered to.").optional(),
    attentionTo: z.string().describe("The person the delivery is going to.").optional(),
    telephone: z.string().describe("The phone number for the person accepting the delivery.").optional(),
    deliveryInstructions: z.string().describe("Free text delivery instructions (500 characters max).").optional(),
  },
  async ({
    contactId,
    lineItems,
    date,
    deliveryDate,
    expectedArrivalDate,
    reference,
    deliveryAddress,
    attentionTo,
    telephone,
    deliveryInstructions,
  }) => {
    const result = await createXeroPurchaseOrder(
      contactId,
      lineItems,
      date,
      deliveryDate,
      reference,
      deliveryAddress,
      attentionTo,
      telephone,
      deliveryInstructions,
      expectedArrivalDate,
    );
    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error creating purchase order: ${result.error}`,
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
            "Purchase order created successfully:",
            `ID: ${purchaseOrder?.purchaseOrderID}`,
            `Purchase Order Number: ${purchaseOrder?.purchaseOrderNumber}`,
            `Contact: ${purchaseOrder?.contact?.name}`,
            `Date: ${purchaseOrder?.date}`,
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

export default CreatePurchaseOrderTool;
