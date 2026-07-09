import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { PurchaseOrder } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function getPurchaseOrder(
  purchaseOrderId: string,
): Promise<PurchaseOrder | undefined> {
  await xeroClient.authenticate();

  const response = await xeroClient.accountingApi.getPurchaseOrder(
    xeroClient.tenantId,
    purchaseOrderId,
    getClientHeaders(),
  );

  return response.body.purchaseOrders?.[0];
}

/**
 * Retrieve a single purchase order from Xero by ID
 */
export async function getXeroPurchaseOrder(
  purchaseOrderId: string,
): Promise<XeroClientResponse<PurchaseOrder>> {
  try {
    const purchaseOrder = await getPurchaseOrder(purchaseOrderId);

    if (!purchaseOrder) {
      throw new Error(`No purchase order found with ID: ${purchaseOrderId}`);
    }

    return {
      result: purchaseOrder,
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
