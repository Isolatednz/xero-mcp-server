import { z } from "zod";
import { getXeroPurchaseOrder } from "../../handlers/get-xero-purchase-order.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { formatPurchaseOrder } from "../../helpers/format-purchase-order.js";

const GetPurchaseOrderTool = CreateXeroTool(
  "get-purchase-order",
  "Retrieve a single purchase order from Xero by its ID, including its line items and tracking categories. \
  Can be used to check a purchase order's status, or to get its lineItemIDs for a subsequent \
  partial update via update-purchase-order.",
  {
    purchaseOrderId: z.string().describe("The ID of the purchase order to retrieve. \
      Can be obtained from the list-purchase-orders tool."),
  },
  async ({ purchaseOrderId }) => {
    const response = await getXeroPurchaseOrder(purchaseOrderId);
    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error retrieving purchase order: ${response.error}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: formatPurchaseOrder(response.result),
        },
      ],
    };
  },
);

export default GetPurchaseOrderTool;
