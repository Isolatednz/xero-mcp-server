import { z } from "zod";
import { listXeroPurchaseOrders } from "../../handlers/list-xero-purchase-orders.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { formatPurchaseOrder } from "../../helpers/format-purchase-order.js";

const ListPurchaseOrdersTool = CreateXeroTool(
  "list-purchase-orders",
  "List purchase orders in Xero, including line items and any tracking categories on them. \
  Ask the user if they want to filter by status or date range before running, \
  or to see all purchase orders. \
  Ask the user if they want the next page of purchase orders after running this tool \
  if 10 are returned. If they want the next page, call this tool again with the next page number.",
  {
    page: z.number(),
    status: z.enum(["DRAFT", "SUBMITTED", "AUTHORISED", "BILLED", "DELETED"])
      .describe("Filter by purchase order status.")
      .optional(),
    dateFrom: z.string().describe("Filter by purchase order date, from this date (YYYY-MM-DD format).").optional(),
    dateTo: z.string().describe("Filter by purchase order date, up to this date (YYYY-MM-DD format).").optional(),
  },
  async ({ page, status, dateFrom, dateTo }) => {
    const response = await listXeroPurchaseOrders(page, status, dateFrom, dateTo);
    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing purchase orders: ${response.error}`,
          },
        ],
      };
    }

    const purchaseOrders = response.result;

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${purchaseOrders?.length || 0} purchase orders:`,
        },
        ...(purchaseOrders?.map((purchaseOrder) => ({
          type: "text" as const,
          text: formatPurchaseOrder(purchaseOrder),
        })) || []),
      ],
    };
  },
);

export default ListPurchaseOrdersTool;
