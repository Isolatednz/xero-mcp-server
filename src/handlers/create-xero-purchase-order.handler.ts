import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { PurchaseOrder, LineItemTracking } from "xero-node";

interface PurchaseOrderLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  accountCode: string;
  taxType: string;
  itemCode?: string;
  tracking?: LineItemTracking[];
}

async function createPurchaseOrder(
  contactId: string,
  lineItems: PurchaseOrderLineItem[],
  date: string | undefined,
  deliveryDate: string | undefined,
  reference: string | undefined,
  deliveryAddress: string | undefined,
  attentionTo: string | undefined,
  telephone: string | undefined,
  deliveryInstructions: string | undefined,
  expectedArrivalDate: string | undefined,
): Promise<PurchaseOrder | undefined> {
  await xeroClient.authenticate();

  const purchaseOrder: PurchaseOrder = {
    contact: {
      contactID: contactId,
    },
    lineItems: lineItems,
    date: date || new Date().toISOString().split("T")[0],
    deliveryDate: deliveryDate,
    reference: reference,
    deliveryAddress: deliveryAddress,
    attentionTo: attentionTo,
    telephone: telephone,
    deliveryInstructions: deliveryInstructions,
    expectedArrivalDate: expectedArrivalDate,
    status: PurchaseOrder.StatusEnum.DRAFT,
  };

  const response = await xeroClient.accountingApi.createPurchaseOrders(
    xeroClient.tenantId,
    {
      purchaseOrders: [purchaseOrder],
    },
    true, // summarizeErrors
    undefined, // idempotencyKey
    getClientHeaders(),
  );

  return response.body.purchaseOrders?.[0];
}

/**
 * Create a new purchase order in Xero
 */
export async function createXeroPurchaseOrder(
  contactId: string,
  lineItems: PurchaseOrderLineItem[],
  date?: string,
  deliveryDate?: string,
  reference?: string,
  deliveryAddress?: string,
  attentionTo?: string,
  telephone?: string,
  deliveryInstructions?: string,
  expectedArrivalDate?: string,
): Promise<XeroClientResponse<PurchaseOrder>> {
  try {
    const createdPurchaseOrder = await createPurchaseOrder(
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

    if (!createdPurchaseOrder) {
      throw new Error("Purchase order creation failed.");
    }

    return {
      result: createdPurchaseOrder,
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
