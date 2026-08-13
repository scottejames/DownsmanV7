// A fetch wrapper that never throws on an unexpected response shape.
//
// The bug this exists to prevent: `const d = await res.json(); setError(d.error)`
// crashes with an uncaught SyntaxError if the server ever returns a non-JSON
// error body (a bare 500, a gateway timeout page, a dropped connection) - and
// that crash is silent to the user, since nothing catches it. Every dialog in
// this app was doing that. This centralizes it once, correctly.

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';
const NETWORK_MESSAGE = 'Could not reach the server. Check your connection and try again.';

export async function apiRequest<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch {
    throw new ApiError(NETWORK_MESSAGE);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON or empty body - fall through with body left as null.
  }

  if (!res.ok) {
    const message = (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string')
      ? (body as { error: string }).error
      : FALLBACK_MESSAGE;
    throw new ApiError(message, res.status);
  }

  return body as T;
}

export function postJson<T = unknown>(url: string, data: unknown): Promise<T> {
  return apiRequest<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function deleteJson<T = unknown>(url: string, data: unknown): Promise<T> {
  return apiRequest<T>(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
