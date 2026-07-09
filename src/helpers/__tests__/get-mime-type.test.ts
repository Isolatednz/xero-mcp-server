import { describe, it, expect } from "vitest";
import { getMimeTypeForFileName } from "../get-mime-type.js";

describe("getMimeTypeForFileName", () => {
  it("resolves common extensions to their mime type", () => {
    expect(getMimeTypeForFileName("usage-report.pdf")).toBe("application/pdf");
    expect(getMimeTypeForFileName("photo.JPG")).toBe("image/jpeg");
    expect(getMimeTypeForFileName("data.csv")).toBe("text/csv");
  });

  it("is case-insensitive on the extension", () => {
    expect(getMimeTypeForFileName("Report.PDF")).toBe("application/pdf");
  });

  it("falls back to application/octet-stream for unknown extensions", () => {
    expect(getMimeTypeForFileName("mystery.xyz")).toBe(
      "application/octet-stream",
    );
  });

  it("handles file names with no extension", () => {
    expect(getMimeTypeForFileName("README")).toBe("application/octet-stream");
  });
});
