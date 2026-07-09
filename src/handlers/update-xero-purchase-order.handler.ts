import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { PurchaseOrder, LineItemTracking } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

interface PurchaseOrderLineItem {
  // Optionally target an existing line by ID rather than adding a new one.
  // IMPORTANT: unlike update-invoice (gh-158), Xero's Purchase Orders API
  // does NOT preserve omitted fields when lineItemID is supplied - every
  // field below is still mandatory on every line, every call, confirmed via
  // a live 400 ValidationException ("The UnitAmount field is mandatory")
  // when only lineItemID + quantity were sent.
  lineItemID?: string;
  description: string;
  quantity: number;
  unitAmount: number;
  accountCode: string;
  taxType: string;
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
    // Deliberately never set here. Authorising/submitting a purchase order
    // is a controlled management action at this organisation - this tool
    // must never be able to move a PO beyond DRAFT. Xero defaults status to
    // its current value (DRAFT, enforced by the guard below) when omitted.
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
 * Update an existing purchase order in Xero.
 *
 * This intentionally has no way to change status. Moving a purchase order to
 * SUBMITTED, AUTHORISED, BILLED, or DELETED must be done directly in Xero by
 * someone with the appropriate approval authority - it is not exposed here.
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
): Promise<XeroClientResponse<PurchaseOrder>> {
  try {
    const existingPurchaseOrder = await getPurchaseOrder(purchaseOrderId);
    const currentStatus = existingPurchaseOrder?.status;

    // Only allow updates while still a draft. Since this tool can never set
    // status itself, this also guarantees a purchase order can never leave
    // DRAFT via this connector at all.
    if (currentStatus !== PurchaseOrder.StatusEnum.DRAFT) {
      return {
        result: null,
        isError: true,
        error: `Cannot update purchase order because it is not a draft. Current status: ${currentStatus}. Submitting or authorising a purchase order must be done directly in Xero.`,
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
