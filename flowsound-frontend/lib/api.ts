export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000";

const REQUEST_TIMEOUT_MS = 8000;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const data = JSON.parse(text) as { error?: string; message?: string };
    const message = data.error ?? data.message;
    if (typeof message === "string" && message) return message;
  } catch {
    // non-JSON body; fall through to the generic message
  }
  return `Request failed: ${response.status}`;
}

const throwIfNotOk = async (response: Response): Promise<void> => {
  if (response.ok) return;
  const message = await readErrorMessage(response);
  throw new ApiError(response.status, message);
};

const readJson = async <T>(response: Response): Promise<T> => {
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(response.status, `Empty or invalid response (${response.status})`);
  }
};

export async function jsonFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  await throwIfNotOk(response);
  return readJson<T>(response);
}