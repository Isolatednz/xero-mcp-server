import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { PurchaseOrder } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

type PurchaseOrderStatus = "DRAFT" | "SUBMITTED" | "AUTHORISED" | "BILLED" | "DELETED";

async function getPurchaseOrders(
  page: number,
  status: PurchaseOrderStatus | undefined,
  dateFrom: string | undefined,
  dateTo: string | undefined,
): Promise<PurchaseOrder[]> {
  await xeroClient.authenticate();

  const response = await xeroClient.accountingApi.getPurchaseOrders(
    xeroClient.tenantId,
    undefined, // ifModifiedSince
    status,
    dateFrom,
    dateTo,
    "UpdatedDateUTC DESC", // order
    page,
    10, // pageSize
    getClientHeaders(),
  );

  return response.body.purchaseOrders ?? [];
}

/**
 * List purchase orders from Xero
 */
export async function listXeroPurchaseOrders(
  page: number = 1,
  status?: PurchaseOrderStatus,
  dateFrom?: string,
  dateTo?: string,
): Promise<XeroClientResponse<PurchaseOrder[]>> {
  try {
    const purchaseOrders = await getPurchaseOrders(
      page,
      status,
      dateFrom,
      dateTo,
    );

    return {
      result: purchaseOrders,
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
