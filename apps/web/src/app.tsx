import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";

import {
  ApiClient,
  apiClient,
  ApiClientError,
  type CreateLinkInput,
  type Link,
  type SafeUser
} from "./api-client.js";

type Route = "/" | "/login" | "/register" | "/dashboard";

type AppProps = {
  client?: ApiClient;
  initialPath?: Route;
};

type SessionState =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: SafeUser };

type CreateLinkFormState = {
  destinationUrl: string;
  alias?: string;
  title?: string;
  expiresAt: string;
};

export function App({ client = apiClient, initialPath }: AppProps): ReactElement {
  const [route, setRoute] = useState<Route>(initialPath ?? currentRoute());
  const [session, setSession] = useState<SessionState>({ status: "loading", user: null });

  useEffect(() => {
    document.title = route === "/" ? "Reduc.to" : `Reduc.to ${routeLabel(route)}`;
  }, [route]);

  useEffect(() => {
    if (route === "/dashboard" && session.status === "anonymous") {
      navigate("/login");
    }
  }, [route, session.status]);

  useEffect(() => {
    let active = true;
    client
      .me()
      .then(({ user }) => {
        if (active) {
          setSession({ status: "authenticated", user });
        }
      })
      .catch(() => {
        if (active) {
          setSession({ status: "anonymous", user: null });
        }
      });
    return () => {
      active = false;
    };
  }, [client]);

  const navigate = (next: Route): void => {
    setRoute(next);
    if (initialPath === undefined) {
      window.history.pushState({}, "", next);
    }
  };

  const appShell = useMemo(
    () => (
      <header className="topbar">
        <button className="brand" type="button" onClick={() => navigate("/")}>
          <span className="brand-mark">R</span>
          <span>Reduc.to</span>
        </button>
        <nav aria-label="Primary navigation">
          {session.status === "authenticated" ? (
            <>
              <button type="button" onClick={() => navigate("/dashboard")}>
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  void client.logout().finally(() => {
                    setSession({ status: "anonymous", user: null });
                    navigate("/login");
                  });
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => navigate("/login")}>
                Log in
              </button>
              <button
                className="button-primary"
                type="button"
                onClick={() => navigate("/register")}
              >
                Register
              </button>
            </>
          )}
        </nav>
      </header>
    ),
    [client, session.status]
  );

  if ((route === "/login" || route === "/register") && session.status === "authenticated") {
    return (
      <>
        {appShell}
        <Dashboard client={client} session={session} />
      </>
    );
  }

  return (
    <>
      {appShell}
      {route === "/" && <Landing onNavigate={navigate} />}
      {route === "/login" && (
        <AuthPage
          mode="login"
          client={client}
          onNavigate={navigate}
          onAuthenticated={(user) => setSession({ status: "authenticated", user })}
        />
      )}
      {route === "/register" && (
        <AuthPage
          mode="register"
          client={client}
          onNavigate={navigate}
          onAuthenticated={(user) => setSession({ status: "authenticated", user })}
        />
      )}
      {route === "/dashboard" && <Dashboard client={client} session={session} />}
    </>
  );
}

function Landing({ onNavigate }: { onNavigate: (route: Route) => void }): ReactElement {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Privacy-aware link management</p>
          <h1>Short links with the signal teams actually need.</h1>
          <p>
            Reduc.to gives registered users fast short links, simple ownership controls, and basic
            click totals without turning the MVP into an analytics maze.
          </p>
          <div className="hero-actions">
            <button
              className="button-primary"
              type="button"
              onClick={() => onNavigate("/register")}
            >
              Start shortening
            </button>
            <button type="button" onClick={() => onNavigate("/login")}>
              Log in
            </button>
          </div>
        </div>
        <div className="hero-panel" aria-label="Product preview">
          <div className="preview-url">reduc.to/launch</div>
          <div className="preview-destination">https://example.com/product-launch</div>
          <div className="preview-stats">
            <span>128 clicks</span>
            <span>Active</span>
          </div>
        </div>
      </section>
      <section className="feature-grid" aria-label="Features">
        <article>
          <h2>Cookie auth</h2>
          <p>Secure HTTP-only sessions with refresh support.</p>
        </article>
        <article>
          <h2>Owned links</h2>
          <p>Create, edit, disable, and remove links from one dashboard.</p>
        </article>
        <article>
          <h2>Basic counts</h2>
          <p>See total clicks without advanced tracking or charts.</p>
        </article>
      </section>
    </main>
  );
}

function AuthPage({
  mode,
  client,
  onNavigate,
  onAuthenticated
}: {
  mode: "login" | "register";
  client: ApiClient;
  onNavigate: (route: Route) => void;
  onAuthenticated: (user: SafeUser) => void;
}): ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError("");
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result =
        mode === "login"
          ? await client.login({ email, password })
          : await client.register({
              email,
              password,
              ...(displayName.length > 0 ? { displayName } : {})
            });
      onAuthenticated(result.user);
      onNavigate("/dashboard");
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={(event) => void submit(event)}>
        <p className="eyebrow">{mode === "login" ? "Welcome back" : "Create account"}</p>
        <h1>{mode === "login" ? "Log in to Reduc.to" : "Register for Reduc.to"}</h1>
        {mode === "register" && (
          <label>
            Display name
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error.length > 0 && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Working..." : mode === "login" ? "Log in" : "Create account"}
        </button>
        <button type="button" onClick={() => onNavigate(mode === "login" ? "/register" : "/login")}>
          {mode === "login" ? "Need an account?" : "Already registered?"}
        </button>
      </form>
    </main>
  );
}

function Dashboard({
  client,
  session
}: {
  client: ApiClient;
  session: SessionState;
}): ReactElement {
  const [links, setLinks] = useState<Link[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (session.status !== "authenticated") {
      return;
    }
    let active = true;
    client
      .listLinks()
      .then((result) => {
        if (active) {
          setLinks(result.links);
          setStatus("idle");
        }
      })
      .catch((caught) => {
        if (active) {
          setStatus("error");
          setMessage(messageFromError(caught));
        }
      });
    return () => {
      active = false;
    };
  }, [client, session.status]);

  if (session.status === "loading") {
    return <main className="dashboard-shell">Loading your account...</main>;
  }

  if (session.status === "anonymous") {
    return (
      <main className="dashboard-shell">
        <section className="notice" role="alert">
          Please log in to view your dashboard.
        </section>
      </main>
    );
  }

  const replaceLink = (link: Link): void => {
    setLinks((current) => current.map((item) => (item.id === link.id ? link : item)));
  };

  return (
    <main className="dashboard-shell">
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>
            Hello, {session.user.displayName ?? session.user.displayEmail ?? session.user.email}
          </h1>
          <p>{session.user.email}</p>
        </div>
        <div className="summary-card">
          <span>Total links</span>
          <strong>{links.length}</strong>
        </div>
      </section>

      <CreateLinkForm
        client={client}
        onCreated={(link) => {
          setLinks((current) => [link, ...current]);
          setMessage("Short link created.");
        }}
      />

      {message.length > 0 && (
        <p className={status === "error" ? "form-error" : "form-success"}>{message}</p>
      )}
      {status === "loading" && <p>Loading links...</p>}
      {status === "error" && <p className="form-error">Could not load links.</p>}
      {status === "idle" && links.length === 0 && (
        <p className="empty-state">No links yet. Create your first one.</p>
      )}
      <section className="link-list" aria-label="Your links">
        {links.map((link) => (
          <LinkCard
            key={link.id}
            client={client}
            link={link}
            onChanged={replaceLink}
            onDeleted={() => setLinks((items) => items.filter((item) => item.id !== link.id))}
          />
        ))}
      </section>
    </main>
  );
}

function CreateLinkForm({
  client,
  onCreated
}: {
  client: ApiClient;
  onCreated: (link: Link) => void;
}): ReactElement {
  const [input, setInput] = useState<CreateLinkFormState>({ destinationUrl: "", expiresAt: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError("");
    if (
      !input.destinationUrl.startsWith("http://") &&
      !input.destinationUrl.startsWith("https://")
    ) {
      setError("Destination must start with http:// or https://.");
      return;
    }
    const expiresAt = toFutureExpiryIso(input.expiresAt);
    if (expiresAt === undefined) {
      setError("Expiry must be in the future.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: CreateLinkInput = {
        destinationUrl: input.destinationUrl,
        ...(input.alias !== undefined ? { alias: input.alias } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(expiresAt !== null ? { expiresAt } : {})
      };
      const { link } = await client.createLink(payload);
      setInput({ destinationUrl: "", expiresAt: "" });
      onCreated(link);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="tool-panel" onSubmit={(event) => void submit(event)}>
      <h2>Create a short link</h2>
      <div className="form-grid">
        <label>
          Destination URL
          <input
            value={input.destinationUrl}
            placeholder="https://example.com/launch"
            onChange={(event) => setInput({ ...input, destinationUrl: event.target.value })}
            required
          />
        </label>
        <label>
          Custom alias
          <input
            value={input.alias ?? ""}
            placeholder="launch"
            onChange={(event) => setInput({ ...input, alias: event.target.value })}
          />
        </label>
        <label>
          Title
          <input
            value={input.title ?? ""}
            placeholder="Launch page"
            onChange={(event) => setInput({ ...input, title: event.target.value })}
          />
        </label>
        <label>
          Expiry
          <input
            type="datetime-local"
            value={input.expiresAt}
            onChange={(event) =>
              setInput({
                ...input,
                expiresAt: event.target.value
              })
            }
          />
        </label>
      </div>
      {error.length > 0 && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button-primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create link"}
      </button>
    </form>
  );
}

function LinkCard({
  client,
  link,
  onChanged,
  onDeleted
}: {
  client: ApiClient;
  link: Link;
  onChanged: (link: Link) => void;
  onDeleted: () => void;
}): ReactElement {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    title: link.title ?? "",
    destinationUrl: link.destinationUrl,
    expiresAt: toLocalDateTime(link.expiresAt)
  });
  const [error, setError] = useState("");

  const copy = async (): Promise<void> => {
    await navigator.clipboard?.writeText(link.shortUrl);
  };

  const save = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError("");
    const expiresAt = toFutureExpiryIso(draft.expiresAt);
    if (expiresAt === undefined) {
      setError("Expiry must be in the future.");
      return;
    }
    try {
      const { link: updated } = await client.updateLink(link.id, {
        title: draft.title === "" ? null : draft.title,
        destinationUrl: draft.destinationUrl,
        expiresAt
      });
      onChanged(updated);
      setIsEditing(false);
    } catch (caught) {
      setError(messageFromError(caught));
    }
  };

  return (
    <article className="link-card">
      <div className="link-main">
        <div>
          <h3>{link.title ?? link.displayKey}</h3>
          <a href={link.shortUrl} target="_blank" rel="noreferrer">
            {link.shortUrl}
          </a>
          <p>{link.destinationUrl}</p>
        </div>
        <span className={link.isActive ? "badge badge-active" : "badge"}>
          {link.isActive ? "Active" : "Disabled"}
        </span>
      </div>
      <dl className="link-meta">
        <div>
          <dt>Clicks</dt>
          <dd>{link.totalClicks}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDate(link.createdAt)}</dd>
        </div>
        <div>
          <dt>Expires</dt>
          <dd>{link.expiresAt === null ? "Never" : formatDate(link.expiresAt)}</dd>
        </div>
      </dl>
      <div className="link-actions">
        <button type="button" onClick={() => void copy()}>
          Copy
        </button>
        <button type="button" onClick={() => setIsEditing((value) => !value)}>
          Edit
        </button>
        <button
          type="button"
          onClick={() =>
            void (link.isActive ? client.disableLink(link.id) : client.enableLink(link.id)).then(
              (result) => onChanged(result.link)
            )
          }
        >
          {link.isActive ? "Disable" : "Enable"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Delete this short link?")) {
              void client.deleteLink(link.id).then(onDeleted);
            }
          }}
        >
          Delete
        </button>
      </div>
      {isEditing && (
        <form className="edit-panel" onSubmit={(event) => void save(event)}>
          <label>
            Title
            <input
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </label>
          <label>
            Destination
            <input
              value={draft.destinationUrl}
              onChange={(event) => setDraft({ ...draft, destinationUrl: event.target.value })}
              required
            />
          </label>
          <label>
            Expiry
            <input
              type="datetime-local"
              value={draft.expiresAt}
              onChange={(event) => setDraft({ ...draft, expiresAt: event.target.value })}
            />
          </label>
          {error.length > 0 && <p className="form-error">{error}</p>}
          <button className="button-primary" type="submit">
            Save
          </button>
        </form>
      )}
    </article>
  );
}

function currentRoute(): Route {
  if (
    window.location.pathname === "/login" ||
    window.location.pathname === "/register" ||
    window.location.pathname === "/dashboard"
  ) {
    return window.location.pathname;
  }
  return "/";
}

function routeLabel(route: Route): string {
  return route === "/" ? "" : route.replace("/", "- ");
}

function messageFromError(error: unknown): string {
  return error instanceof ApiClientError || error instanceof Error
    ? error.message
    : "Something went wrong.";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
}

export function toLocalDateTime(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toFutureExpiryIso(value: string): string | null | undefined {
  if (value === "") {
    return null;
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date <= new Date()) {
    return undefined;
  }

  return date.toISOString();
}
