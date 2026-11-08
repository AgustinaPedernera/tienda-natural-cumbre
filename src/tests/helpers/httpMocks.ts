import { vi } from "vitest";
import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

export function createRequest(
  options: {
    method?: string;
    headers?: VercelRequest["headers"];
    body?: unknown;
  } = {}
): VercelRequest {
  return {
    method: options.method ?? "POST",
    headers: options.headers ?? {},
    body: options.body,
  } as VercelRequest;
}

export function createResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
    setHeader: vi.fn(),
  };

  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);

  return {
    response,
    res: response as unknown as VercelResponse,
  };
}