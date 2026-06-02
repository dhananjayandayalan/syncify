let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// All token refreshes share this promise — prevents concurrent rotations
let refreshingPromise: Promise<string | null> | null = null;

export function doRefresh(): Promise<string | null> {
  if (refreshingPromise) return refreshingPromise;
  refreshingPromise = (async () => {
    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json() as { accessToken: string };
      setAccessToken(data.accessToken);
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshingPromise = null;
    }
  })();
  return refreshingPromise;
}

type FetchOptions = RequestInit & { skipAuth?: boolean };

async function request<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { skipAuth, ...init } = options;
  const headers = new Headers(init.headers);

  if (init.body !== undefined && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const res = await fetch(url, { ...init, headers, credentials: 'include' });

  if (res.status === 401 && !skipAuth) {
    const newToken = await doRefresh();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      const retry = await fetch(url, { ...init, headers, credentials: 'include' });
      if (!retry.ok) {
        const err = await retry.json().catch(() => ({ error: 'Request failed' }));
        throw new ApiError(retry.status, err.error ?? 'Request failed');
      }
      if (retry.status === 204) return undefined as T;
      return retry.json() as Promise<T>;
    }
    setAccessToken(null);
    window.dispatchEvent(new Event('auth:logout'));
    throw new ApiError(401, 'Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiError(res.status, err.error ?? 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  get: <T>(url: string, opts?: FetchOptions) => request<T>(url, { method: 'GET', ...opts }),
  post: <T>(url: string, body?: unknown, opts?: FetchOptions) =>
    request<T>(url, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined, ...opts }),
  patch: <T>(url: string, body?: unknown, opts?: FetchOptions) =>
    request<T>(url, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined, ...opts }),
  delete: <T>(url: string, body?: unknown, opts?: FetchOptions) =>
    request<T>(url, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined, ...opts }),
};
