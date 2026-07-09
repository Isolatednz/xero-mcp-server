import { describe, it, expect } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { formatError } from "../format-error.js";

function makeAxiosError(status: number, detail?: string): AxiosError {
  const headers = new AxiosHeaders();
  const config = { headers };
  const err = new AxiosError(
    "Request failed",
    String(status),
    config as never,
    null,
    {
      status,
      data: detail ? { Detail: detail } : {},
      statusText: "",
      headers: {},
      config,
    } as never,
  );
  return err;
}

describe("formatError", () => {
  describe("AxiosError mapping", () => {
    it("maps 401 to authentication message", () => {
      expect(formatError(makeAxiosError(401))).toBe(
        "Authentication failed. Please check your Xero credentials.",
      );
    });

    it("maps 403 to permission message", () => {
      expect(formatError(makeAxiosError(403))).toBe(
        "You don't have permission to access this resource in Xero.",
      );
    });

    it("maps 404 to not-found message", () => {
      expect(formatError(makeAxiosError(404))).toBe(
        "The requested resource was not found in Xero.",
      );
    });

    it("maps 429 to rate-limit message", () => {
      expect(formatError(makeAxiosError(429))).toBe(
        "Too many requests to Xero. Please try again in a moment.",
      );
    });

    it("returns response.data.Detail for non-mapped statuses", () => {
      expect(formatError(makeAxiosError(400, "Field is required"))).toBe(
        "Field is required",
      );
    });

    it("returns generic message when no Detail is provided", () => {
      expect(formatError(makeAxiosError(500))).toBe(
        "An error occurred while communicating with Xero.",
      );
    });
  });

  describe("xero-node SDK error shape", () => {
    it("extracts problem.detail and title without leaking request headers", () => {
      const sdkError = {
        response: {
          statusCode: 405,
          body: {
            httpStatusCode: "MethodNotAllowed",
            problem: {
              title: "MethodNotAllowed",
              detail: "Method not allowed for the current customer jurisdiction.",
              status: 405,
            },
          },
          headers: { "set-cookie": "ak_bmsc=secret" },
        },
        request: {
          headers: { authorization: "Bearer eyJSECRET" },
        },
      };

      const result = formatError(sdkError);

      expect(result).toBe(
        "405 MethodNotAllowed: Method not allowed for the current customer jurisdiction.",
      );
      expect(result).not.toContain("Bearer");
      expect(result).not.toContain("eyJSECRET");
      expect(result).not.toContain("set-cookie");
    });

    it("maps 401 SDK error to the standard auth message", () => {
      const sdkError = {
        response: { statusCode: 401, body: {} },
        request: { headers: { authorization: "Bearer leaky" } },
      };

      const result = formatError(sdkError);
      expect(result).toBe(
        "Authentication failed. Please check your Xero credentials.",
      );
      expect(result).not.toContain("Bearer");
    });

    it("falls back to status code + title when detail is missing", () => {
      const sdkError = {
        response: {
          statusCode: 502,
          body: { httpStatusCode: "BadGateway" },
        },
      };

      expect(formatError(sdkError)).toBe("502 BadGateway");
    });

    it("falls back to a generic title when neither problem nor httpStatusCode is present", () => {
      const sdkError = { response: { statusCode: 502 } };
      expect(formatError(sdkError)).toBe("502 HTTP error");
    });

    it("extracts the real ValidationException shape (Elements[].ValidationErrors[].Message)", () => {
      // This is what Xero actually sends back for a 400 on create/update
      // calls - see developer.xero.com/documentation/api/accounting/responsecodes
      const sdkError = JSON.stringify({
        response: {
          statusCode: 400,
          body: {
            ErrorNumber: 10,
            Type: "ValidationException",
            Message: "A validation exception occurred",
            Elements: [
              {
                PurchaseOrderID: "836c984f-bd6c-4946-b634-01cfa901efb1",
                HasErrors: true,
                ValidationErrors: [
                  { Message: "One or more line items must be specified" },
                ],
              },
            ],
          },
          request: { headers: { authorization: "Bearer eyJPOLEAK" } },
        },
      });

      const result = formatError(sdkError);

      expect(result).toBe(
        "400 ValidationException: One or more line items must be specified",
      );
      expect(result).not.toContain("Bearer");
    });

    it("joins multiple validation error messages", () => {
      const sdkError = {
        response: {
          statusCode: 400,
          body: {
            Type: "ValidationException",
            Elements: [
              {
                ValidationErrors: [
                  { Message: "Field A is invalid" },
                  { Message: "Field B is required" },
                ],
              },
            ],
          },
        },
      };

      expect(formatError(sdkError)).toBe(
        "400 ValidationException: Field A is invalid; Field B is required",
      );
    });

    it("falls back to the top-level Message when there are no per-element ValidationErrors", () => {
      const sdkError = {
        response: {
          statusCode: 400,
          body: {
            Type: "ValidationException",
            Message: "A validation exception occurred",
            Elements: [{ HasErrors: true }],
          },
        },
      };

      expect(formatError(sdkError)).toBe(
        "400 ValidationException: A validation exception occurred",
      );
    });
  });

  describe("plain Error", () => {
    it("returns the error message", () => {
      expect(formatError(new Error("Employee ID is required"))).toBe(
        "Employee ID is required",
      );
    });
  });

  describe("unknown error shapes", () => {
    it("returns a generic message and never stringifies the object", () => {
      const leakyUnknown = {
        request: { headers: { authorization: "Bearer LEAKY_TOKEN" } },
      };

      const result = formatError(leakyUnknown);

      expect(result).toBe(
        "An unexpected error occurred while communicating with Xero.",
      );
      expect(result).not.toContain("Bearer");
      expect(result).not.toContain("LEAKY_TOKEN");
    });

    it("handles non-JSON string errors safely", () => {
      expect(formatError("something blew up")).toBe(
        "An unexpected error occurred while communicating with Xero.",
      );
    });

    it("unwraps JSON.stringify()'d SDK errors from binary-upload endpoints (e.g. attachments)", () => {
      // xero-node's createInvoiceAttachmentByFileName rejects with exactly this
      // shape: JSON.stringify(new ApiError(axiosError).generateError()).
      const stringifiedSdkError = JSON.stringify({
        response: {
          statusCode: 400,
          body: {
            httpStatusCode: "BadRequest",
            problem: {
              title: "BadRequest",
              detail: "Invalid file name.",
              status: 400,
            },
          },
          headers: { "set-cookie": "ak_bmsc=secret" },
          request: {
            headers: { authorization: "Bearer eyJATTACHMENTSECRET" },
          },
        },
        body: { httpStatusCode: "BadRequest" },
      });

      const result = formatError(stringifiedSdkError);

      expect(result).toBe("400 BadRequest: Invalid file name.");
      expect(result).not.toContain("Bearer");
      expect(result).not.toContain("eyJATTACHMENTSECRET");
      expect(result).not.toContain("set-cookie");
    });

    it("handles null safely", () => {
      expect(formatError(null)).toBe(
        "An unexpected error occurred while communicating with Xero.",
      );
    });
  });
});
