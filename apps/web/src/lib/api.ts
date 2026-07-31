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

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...(json !== undefined ? { "content-type": "application/json" } : {}),
      ...(rest.method && rest.method !== "GET" ? { "x-csrf-token": csrfToken() } : {}),
      ...rest.headers,
    },
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
  });
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
