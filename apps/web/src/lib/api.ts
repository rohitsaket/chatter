const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function csrfToken(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)chatter_csrf=([^;]+)/);
  return m?.[1] ?? "";
}

let refreshInFlight: Promise<boolean> | null = null;

/** Rotate the HttpOnly refresh JWT and receive a fresh HttpOnly access JWT. */
export function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "x-csrf-token": csrfToken() },
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const request = (): RequestInit => ({
      ...rest,
      credentials: "include",
      headers: {
        ...(json !== undefined ? { "content-type": "application/json" } : {}),
        ...(rest.method && rest.method !== "GET" ? { "x-csrf-token": csrfToken() } : {}),
        ...rest.headers,
      },
      ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
    });
  let res = await fetch(`${API_URL}/api/v1${path}`, request());
  if (res.status === 401 && path !== "/auth/refresh" && (await refreshSession())) {
    res = await fetch(`${API_URL}/api/v1${path}`, request());
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.join("; ") : (body.message ?? message);
    } catch {
      /* keep statusText */
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export { API_URL };
