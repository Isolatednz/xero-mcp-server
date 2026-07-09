import { AxiosError } from "axios";

interface XeroSdkProblem {
  title?: string;
  detail?: string;
  status?: number;
}

interface XeroValidationError {
  Message?: string;
}

interface XeroValidationElement {
  ValidationErrors?: XeroValidationError[];
}

interface XeroErrorBody {
  httpStatusCode?: string;
  problem?: XeroSdkProblem;
  Detail?: string;
  Message?: string;
  Type?: string;
  // Real shape of a Xero Accounting API validation failure, e.g.:
  // { "Type": "ValidationException", "Message": "A validation exception
  //   occurred", "Elements": [{ "ValidationErrors": [{ "Message": "..." }] }] }
  Elements?: XeroValidationElement[];
}

interface XeroSdkError {
  response: {
    statusCode: number;
    body?: XeroErrorBody;
  };
}

function isXeroSdkError(error: unknown): error is XeroSdkError {
  if (typeof error !== "object" || error === null) return false;
  const response = (error as { response?: unknown }).response;
  if (typeof response !== "object" || response === null) return false;
  return typeof (response as { statusCode?: unknown }).statusCode === "number";
}

function formatHttpStatus(status: number): string {
  switch (status) {
    case 401:
      return "Authentication failed. Please check your Xero credentials.";
    case 403:
      return "You don't have permission to access this resource in Xero.";
    case 404:
      return "The requested resource was not found in Xero.";
    case 429:
      return "Too many requests to Xero. Please try again in a moment.";
    default:
      return "";
  }
}

/**
 * Pulls a human-readable title/detail out of a Xero Accounting API error
 * body. Handles three shapes we've actually seen in the wild:
 *  - the OpenAPI "problem" shape (title/detail/status)
 *  - the plain Detail/httpStatusCode shape
 *  - the real ValidationException shape: Elements[].ValidationErrors[].Message,
 *    with a top-level Type/Message as fallback (this is what most 400s from
 *    create/update calls actually look like)
 */
function extractXeroErrorDetail(
  body: XeroErrorBody | undefined,
): { title: string; detail: string | undefined } {
  const problem = body?.problem;

  const validationMessages = body?.Elements
    ?.flatMap((element) => element.ValidationErrors ?? [])
    .map((validationError) => validationError.Message)
    .filter((message): message is string => Boolean(message));

  const title =
    problem?.title ?? body?.httpStatusCode ?? body?.Type ?? "HTTP error";

  const detail =
    problem?.detail ??
    body?.Detail ??
    (validationMessages && validationMessages.length > 0
      ? validationMessages.join("; ")
      : undefined) ??
    body?.Message;

  return { title, detail };
}

/**
 * Format error messages for return to the LLM.
 *
 * Never stringify unknown error objects — the xero-node SDK rejects with a
 * plain object whose `request.headers.authorization` field contains the
 * caller's Bearer token. Whitelist the fields we extract so secrets never
 * reach the response.
 */
export function formatError(error: unknown): string {
  // Every xero-node SDK call rejects with
  // JSON.stringify(new ApiError(axiosError).generateError()) - a plain
  // string - rather than an Error/AxiosError/object, whenever the request
  // fails. isXeroSdkError() below requires an object, so without this
  // unwrap step those errors fell straight through to the fully generic
  // message below, hiding the real Xero API response for every tool in
  // this connector, not just one endpoint. Parse it and re-run through the
  // same (already secret-safe) checks below.
  if (typeof error === "string") {
    try {
      return formatError(JSON.parse(error));
    } catch {
      // Not JSON - treat as an unrecognised error shape, same as before.
      return "An unexpected error occurred while communicating with Xero.";
    }
  }

  if (error instanceof AxiosError) {
    const status = error.response?.status;

    if (status !== undefined) {
      const mapped = formatHttpStatus(status);
      if (mapped) return mapped;
    }

    const { detail } = extractXeroErrorDetail(error.response?.data);
    return detail || "An error occurred while communicating with Xero.";
  }

  if (isXeroSdkError(error)) {
    const status = error.response.statusCode;
    const mapped = formatHttpStatus(status);
    if (mapped) return mapped;

    const { title, detail } = extractXeroErrorDetail(error.response.body);
    return detail ? `${status} ${title}: ${detail}` : `${status} ${title}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred while communicating with Xero.";
}
