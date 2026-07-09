import { PurchaseOrder } from "xero-node";
import { formatLineItem } from "./format-line-item.js";

/**
 * Formats a single purchase order's header fields (and, optionally, its line
 * items) as text for tool output. Shared between list-purchase-orders and
 * get-purchase-order so both render consistently.
 */
export const formatPurchaseOrder = (
  purchaseOrder: PurchaseOrder,
  includeLineItems: boolean = true,
): string => {
  return [
    `Purchase Order ID: ${purchaseOrder.purchaseOrderID}`,
    `Purchase Order Number: ${purchaseOrder.purchaseOrderNumber}`,
    purchaseOrder.reference ? `Reference: ${purchaseOrder.reference}` : null,
    `Status: ${purchaseOrder.status ?? "Unknown"}`,
    purchaseOrder.contact
      ? `Contact: ${purchaseOrder.contact.name} (${purchaseOrder.contact.contactID})`
      : null,
    purchaseOrder.date ? `Date: ${purchaseOrder.date}` : null,
    purchaseOrder.deliveryDate
      ? `Delivery Date: ${purchaseOrder.deliveryDate}`
      : null,
    purchaseOrder.expectedArrivalDate
      ? `Expected Arrival Date: ${purchaseOrder.expectedArrivalDate}`
      : null,
    purchaseOrder.deliveryAddress
      ? `Delivery Address: ${purchaseOrder.deliveryAddress}`
      : null,
    purchaseOrder.attentionTo
      ? `Attention To: ${purchaseOrder.attentionTo}`
      : null,
    purchaseOrder.telephone ? `Telephone: ${purchaseOrder.telephone}` : null,
    purchaseOrder.deliveryInstructions
      ? `Delivery Instructions: ${purchaseOrder.deliveryInstructions}`
      : null,
    purchaseOrder.lineAmountTypes
      ? `Line Amount Types: ${purchaseOrder.lineAmountTypes}`
      : null,
    purchaseOrder.subTotal !== undefined
      ? `Sub Total: ${purchaseOrder.subTotal}`
      : null,
    purchaseOrder.totalTax !== undefined
      ? `Total Tax: ${purchaseOrder.totalTax}`
      : null,
    `Total: ${purchaseOrder.total ?? 0}`,
    purchaseOrder.totalDiscount !== undefined
      ? `Total Discount: ${purchaseOrder.totalDiscount}`
      : null,
    purchaseOrder.currencyCode
      ? `Currency: ${purchaseOrder.currencyCode}`
      : null,
    purchaseOrder.currencyRate !== undefined
      ? `Currency Rate: ${purchaseOrder.currencyRate}`
      : null,
    purchaseOrder.updatedDateUTC
      ? `Last Updated: ${purchaseOrder.updatedDateUTC}`
      : null,
    purchaseOrder.hasAttachments ? "Has Attachments: Yes" : null,
    includeLineItems && purchaseOrder.lineItems?.length
      ? `Line Items:\n${purchaseOrder.lineItems.map(formatLineItem).join("\n\n")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
};
