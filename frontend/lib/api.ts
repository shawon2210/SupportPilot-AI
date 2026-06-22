const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

class ApiError extends Error {
  constructor(public status: number, message: string, public code: string = "UNKNOWN_ERROR") {
    super(message);
    this.name = "ApiError";
  }
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) { this.baseUrl = baseUrl; }

  setToken(token: string | null) { this.token = token; }
  getToken(): string | null { return this.token; }
  getBaseUrl(): string { return this.baseUrl; }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      // On 401, clear auth and redirect to sign-in (don't retry)
      if (res.status === 401 && typeof window !== "undefined") {
        this.token = null;
        try {
          // Clear localStorage auth state
          localStorage.removeItem("supportpilot-auth");
        } catch {}
        // Only redirect if not already on sign-in page
        if (!window.location.pathname.startsWith("/sign-in") && !window.location.pathname.startsWith("/sign-up")) {
          window.location.href = "/sign-in";
        }
      }
      let message = "Request failed";
      if (res.status === 0 || res.status === 502 || res.status === 503) {
        message = `Cannot reach server at ${this.baseUrl}. Is the backend running?`;
      } else {
        try {
          const err = await res.json();
          message = (err as Record<string, unknown>)["detail"] as string || (err as Record<string, unknown>)["error"] as string || message;
        } catch {
          message = res.statusText || message;
        }
      }
      throw new ApiError(res.status, message, "REQUEST_FAILED");
    }
    return res.json();
  }

  async get<T>(ep: string, params?: Record<string, string>): Promise<T> {
    const sp = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<T>(`${ep}${sp}`, { method: "GET" });
  }
  async post<T>(ep: string, data?: unknown): Promise<T> {
    return this.request<T>(ep, { method: "POST", body: data ? JSON.stringify(data) : undefined });
  }
  async patch<T>(ep: string, data?: unknown): Promise<T> {
    return this.request<T>(ep, { method: "PATCH", body: data ? JSON.stringify(data) : undefined });
  }
  async put<T>(ep: string, data?: unknown): Promise<T> {
    return this.request<T>(ep, { method: "PUT", body: data ? JSON.stringify(data) : undefined });
  }
  async delete<T>(ep: string): Promise<T> {
    return this.request<T>(ep, { method: "DELETE" });
  }

  async postStream(ep: string, data?: unknown, signal?: AbortSignal): Promise<Response> {
    const url = `${this.baseUrl}${ep}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    return fetch(url, { method: "POST", body: data ? JSON.stringify(data) : undefined, headers, signal });
  }

  async postFormData(ep: string, formData: FormData): Promise<Response> {
    const url = `${this.baseUrl}${ep}`;
    const headers: Record<string, string> = {};
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    return fetch(url, { method: "POST", body: formData, headers });
  }
}

export const api = new ApiClient(API_BASE_URL);
export { ApiError };