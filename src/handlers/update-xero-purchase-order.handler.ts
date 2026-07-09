import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { PurchaseOrder, LineItemTracking } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

interface PurchaseOrderLineItem {
  // Include an existing line's lineItemID to update it in place: Xero will
  // only change the fields supplied below and leave any omitted fields
  // untouched, rather than clearing them (same behaviour as update-invoice,
  // see gh-158). Omit lineItemID entirely to add a brand new line item.
  lineItemID?: string;
  description?: string;
  quantity?: number;
  unitAmount?: number;
  accountCode?: string;
  taxType?: string;
  itemCode?: string;
  tracking?: LineItemTracking[];
}

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

async function updatePurchaseOrder(
  purchaseOrderId: string,
  lineItems: PurchaseOrderLineItem[] | undefined,
  reference: string | undefined,
  date: string | undefined,
  deliveryDate: string | undefined,
  expectedArrivalDate: string | undefined,
  deliveryAddress: string | undefined,
  attentionTo: string | undefined,
  telephone: string | undefined,
  deliveryInstructions: string | undefined,
  contactId: string | undefined,
  status: PurchaseOrder.StatusEnum | undefined,
): Promise<PurchaseOrder | undefined> {
  const purchaseOrder: PurchaseOrder = {
    lineItems: lineItems,
    reference: reference,
    date: date,
    deliveryDate: deliveryDate,
    expectedArrivalDate: expectedArrivalDate,
    deliveryAddress: deliveryAddress,
    attentionTo: attentionTo,
    telephone: telephone,
    deliveryInstructions: deliveryInstructions,
    contact: contactId ? { contactID: contactId } : undefined,
    status: status,
  };

  const response = await xeroClient.accountingApi.updatePurchaseOrder(
    xeroClient.tenantId,
    purchaseOrderId,
    {
      purchaseOrders: [purchaseOrder],
    },
    undefined, // idempotencyKey
    getClientHeaders(),
  );

  return response.body.purchaseOrders?.[0];
}

/**
 * Update an existing purchase order in Xero
 */
export async function updateXeroPurchaseOrder(
  purchaseOrderId: string,
  lineItems?: PurchaseOrderLineItem[],
  reference?: string,
  date?: string,
  deliveryDate?: string,
  expectedArrivalDate?: string,
  deliveryAddress?: string,
  attentionTo?: string,
  telephone?: string,
  deliveryInstructions?: string,
  contactId?: string,
  status?: PurchaseOrder.StatusEnum,
): Promise<XeroClientResponse<PurchaseOrder>> {
  try {
    const existingPurchaseOrder = await getPurchaseOrder(purchaseOrderId);
    const currentStatus = existingPurchaseOrder?.status;

    // Only allow updates while still a draft - once submitted/authorised/billed,
    // changes should go through Xero directly. Mirrors update-invoice's guard.
    // Note: this still allows the update call itself to move a DRAFT PO
    // forward (e.g. status: AUTHORISED), since the check is against the
    // *current* status before this update is applied.
    if (currentStatus !== PurchaseOrder.StatusEnum.DRAFT) {
      return {
        result: null,
        isError: true,
        error: `Cannot update purchase order because it is not a draft. Current status: ${currentStatus}`,
      };
    }

    const updatedPurchaseOrder = await updatePurchaseOrder(
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
    );

    if (!updatedPurchaseOrder) {
      throw new Error("Purchase order update failed.");
    }

    return {
      result: updatedPurchaseOrder,
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
