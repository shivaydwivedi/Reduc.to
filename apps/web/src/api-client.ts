export type SafeUser = {
  id: string;
  email: string;
  displayEmail: string | null;
  displayName: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export type Link = {
  id: string;
  displayKey: string;
  shortUrl: string;
  destinationUrl: string;
  title: string | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  totalClicks: number;
};

export type CreateLinkInput = {
  destinationUrl: string;
  alias?: string;
  title?: string;
  expiresAt?: string | null;
};

export type UpdateLinkInput = {
  destinationUrl?: string;
  title?: string | null;
  expiresAt?: string | null;
};

type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
  };
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  retryOnUnauthorized?: boolean;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
  }
}

export class ApiClient {
  constructor(
    private readonly baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000",
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  register(input: {
    email: string;
    password: string;
    displayName?: string;
  }): Promise<{ user: SafeUser }> {
    return this.request("/api/v1/auth/register", { method: "POST", body: input });
  }

  login(input: { email: string; password: string }): Promise<{ user: SafeUser }> {
    return this.request("/api/v1/auth/login", { method: "POST", body: input });
  }

  logout(): Promise<{ ok: true }> {
    return this.request("/api/v1/auth/logout", { method: "POST" });
  }

  me(): Promise<{ user: SafeUser }> {
    return this.request("/api/v1/auth/me");
  }

  refresh(): Promise<{ ok: true }> {
    return this.request("/api/v1/auth/refresh", { method: "POST", retryOnUnauthorized: false });
  }

  createLink(input: CreateLinkInput): Promise<{ link: Link }> {
    return this.request("/api/v1/links", { method: "POST", body: cleanPayload(input) });
  }

  listLinks(): Promise<{ links: Link[]; total: number; page: number; limit: number }> {
    return this.request("/api/v1/links");
  }

  updateLink(linkId: string, input: UpdateLinkInput): Promise<{ link: Link }> {
    return this.request(`/api/v1/links/${encodeURIComponent(linkId)}`, {
      method: "PATCH",
      body: cleanPayload(input)
    });
  }

  enableLink(linkId: string): Promise<{ link: Link }> {
    return this.request(`/api/v1/links/${encodeURIComponent(linkId)}/enable`, { method: "POST" });
  }

  disableLink(linkId: string): Promise<{ link: Link }> {
    return this.request(`/api/v1/links/${encodeURIComponent(linkId)}/disable`, { method: "POST" });
  }

  deleteLink(linkId: string): Promise<{ ok: true }> {
    return this.request(`/api/v1/links/${encodeURIComponent(linkId)}`, { method: "DELETE" });
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.send(path, options);
    if (response.status !== 401 || options.retryOnUnauthorized === false) {
      return parseResponse<T>(response);
    }

    const refreshResponse = await this.send("/api/v1/auth/refresh", {
      method: "POST",
      retryOnUnauthorized: false
    });
    if (!refreshResponse.ok) {
      throw await createError(refreshResponse);
    }

    return parseResponse<T>(await this.send(path, { ...options, retryOnUnauthorized: false }));
  }

  private send(path: string, options: RequestOptions): Promise<Response> {
    const init: RequestInit = {
      method: options.method ?? "GET",
      credentials: "include"
    };

    if (options.body !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(options.body);
    }

    return this.fetchImpl(`${this.baseUrl}${path}`, init);
  }
}

export const apiClient = new ApiClient();

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await createError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  return (text.length === 0 ? undefined : JSON.parse(text)) as T;
}

async function createError(response: Response): Promise<ApiClientError> {
  const text = await response.text();
  let envelope: ApiErrorEnvelope = {};
  try {
    envelope = text.length === 0 ? {} : (JSON.parse(text) as ApiErrorEnvelope);
  } catch {
    envelope = {};
  }
  return new ApiClientError(
    envelope.error?.message ?? "Request failed. Please try again.",
    response.status,
    envelope.error?.code ?? "REQUEST_FAILED"
  );
}

function cleanPayload<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== "")
  ) as T;
}
