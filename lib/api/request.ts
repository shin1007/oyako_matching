// 共通APIラッパー
// fetch + エラーハンドリング + JSONレスポンス

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiRequestOptions {
  method?: ApiMethod;
  headers?: Record<string, string>;
  body?: any;
  credentials?: RequestCredentials;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * 共通APIリクエストラッパー
 * @param url APIエンドポイント
 * @param options fetchオプション
 */
export async function apiRequest<T = any>(url: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: options.credentials || 'same-origin',
    });
    const contentType = res.headers.get('content-type');
    let data: any = undefined;
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    if (!res.ok) {
      return { ok: false, status: res.status, error: data?.error || data || 'API Error' };
    }
    return { ok: true, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 0, error: err?.message || 'Network Error' };
  }
}
