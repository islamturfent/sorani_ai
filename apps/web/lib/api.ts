// Use a relative /api path so the whole app (frontend + API) is served from a
// single origin (via Next.js rewrite proxy). Set NEXT_PUBLIC_API_URL to an
// absolute URL only when the API lives on a separate host.
const API = (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL !== 'http://localhost:4000/api') ? process.env.NEXT_PUBLIC_API_URL : '/api';

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export async function api<T>(path: string, options?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  const json = (await res.json().catch(() => undefined)) as ApiResult<T> | undefined;
  if (!json || typeof json.ok !== 'boolean') {
    return { ok: res.ok, error: { code: String(res.status), message: res.statusText } };
  }
  return json;
}

export function apiPost<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  return api<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
}
