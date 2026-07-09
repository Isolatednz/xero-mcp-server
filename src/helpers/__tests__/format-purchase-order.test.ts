import { describe, it, expect } from "vitest";
import { formatPurchaseOrder } from "../format-purchase-order.js";

describe("formatPurchaseOrder", () => {
  it("renders header fields", () => {
    const out = formatPurchaseOrder({
      purchaseOrderID: "po-1",
      purchaseOrderNumber: "PO-0001",
      status: "DRAFT" as never,
      contact: { name: "Acme", contactID: "c-1" } as never,
      total: 250,
    } as never);

    expect(out).toContain("Purchase Order ID: po-1");
    expect(out).toContain("Purchase Order Number: PO-0001");
    expect(out).toContain("Status: DRAFT");
    expect(out).toContain("Contact: Acme (c-1)");
    expect(out).toContain("Total: 250");
  });

  it("includes formatted line items (reusing formatLineItem) by default", () => {
    const out = formatPurchaseOrder({
      purchaseOrderID: "po-2",
      total: 100,
      lineItems: [
        { description: "Panels", quantity: 10, unitAmount: 10 } as never,
      ],
    } as never);

    expect(out).toContain("Line Items:");
    expect(out).toContain("Description: Panels");
  });

  it("omits line items when includeLineItems is false", () => {
    const out = formatPurchaseOrder(
      {
        purchaseOrderID: "po-3",
        total: 100,
        lineItems: [{ description: "Panels" } as never],
      } as never,
      false,
    );

    expect(out).not.toContain("Line Items:");
  });
});
