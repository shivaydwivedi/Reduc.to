import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App, toLocalDateTime } from "./app.js";
import type { ApiClient, Link, SafeUser } from "./api-client.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const user: SafeUser = {
  id: "user-1",
  email: "owner@example.com",
  displayEmail: "Owner@example.com",
  displayName: "Owner",
  role: "USER",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const link: Link = {
  id: "link-1",
  displayKey: "launch",
  shortUrl: "https://reduc.to/launch",
  destinationUrl: "https://example.com/launch",
  title: "Launch",
  isActive: true,
  expiresAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  totalClicks: 4
};

let root: Root;
let host: HTMLDivElement;

describe("App", () => {
  beforeEach(() => {
    host = document.createElement("div");
    document.body.replaceChildren(host);
    root = createRoot(host);
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn()
      }
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("redirects anonymous dashboard users to login", async () => {
    await render(
      <App
        client={fakeClient({ me: () => Promise.reject(new Error("no session")) })}
        initialPath="/dashboard"
      />
    );

    expect(host.textContent).toContain("Log in to Reduc.to");
  });

  it("validates auth forms before calling the API", async () => {
    const register = vi.fn();
    await render(
      <App
        client={fakeClient({ me: () => Promise.reject(new Error("no session")), register })}
        initialPath="/register"
      />
    );

    await submit("form");

    expect(host.textContent).toContain("Enter a valid email address.");
    expect(register).not.toHaveBeenCalled();
  });

  it("creates a link from the dashboard form", async () => {
    const createLink = vi.fn().mockResolvedValue({ link });
    await render(<App client={fakeClient({ createLink })} initialPath="/dashboard" />);

    setInput("Destination URL", "https://example.com/launch");
    await submit(".tool-panel");

    expect(createLink).toHaveBeenCalledWith({ destinationUrl: "https://example.com/launch" });
    expect(host.textContent).toContain("https://reduc.to/launch");
  });

  it("omits empty expiry when creating a link", async () => {
    const createLink = vi.fn().mockResolvedValue({ link });
    await render(<App client={fakeClient({ createLink })} initialPath="/dashboard" />);

    setInput("Destination URL", "https://example.com/launch");
    setInput("Expiry", "");
    await submit(".tool-panel");

    expect(createLink).toHaveBeenCalledWith({ destinationUrl: "https://example.com/launch" });
  });

  it("blocks past create expiry before calling the API", async () => {
    const createLink = vi.fn().mockResolvedValue({ link });
    await render(<App client={fakeClient({ createLink })} initialPath="/dashboard" />);

    setInput("Destination URL", "https://example.com/launch");
    setInput("Expiry", "2000-01-01T00:00");
    await submit(".tool-panel");

    expect(createLink).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Expiry must be in the future.");
  });

  it("resets expiry state after a successful create", async () => {
    const createLink = vi.fn().mockResolvedValue({ link });
    await render(<App client={fakeClient({ createLink })} initialPath="/dashboard" />);

    setInput("Destination URL", "https://example.com/launch");
    setInput("Expiry", "2099-01-01T09:30");
    await submit(".tool-panel");

    const expiry = inputForLabel("Expiry");
    expect(expiry.value).toBe("");
    expect(createLink).toHaveBeenCalledWith({
      destinationUrl: "https://example.com/launch",
      expiresAt: new Date("2099-01-01T09:30").toISOString()
    });
  });

  it("formats ISO expiry values for datetime-local edit fields", async () => {
    const expiringLink = { ...link, expiresAt: "2099-07-28T11:04:00.000Z" };
    await render(
      <App
        client={fakeClient({
          listLinks: () => Promise.resolve({ links: [expiringLink], total: 1, page: 1, limit: 20 })
        })}
        initialPath="/dashboard"
      />
    );

    await clickButton("Edit");

    const expiry = inputForLabel("Expiry", ".edit-panel");
    expect(expiry.value).toBe(toLocalDateTime(expiringLink.expiresAt));
  });

  it("handles link actions from the dashboard", async () => {
    const disabled = { ...link, isActive: false };
    const disableLink = vi.fn().mockResolvedValue({ link: disabled });
    const deleteLink = vi.fn().mockResolvedValue({ ok: true });
    await render(
      <App
        client={fakeClient({
          listLinks: () => Promise.resolve({ links: [link], total: 1, page: 1, limit: 20 }),
          disableLink,
          deleteLink
        })}
        initialPath="/dashboard"
      />
    );

    await clickButton("Copy");
    await clickButton("Disable");
    await clickButton("Delete");

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(link.shortUrl);
    expect(disableLink).toHaveBeenCalledWith(link.id);
    expect(deleteLink).toHaveBeenCalledWith(link.id);
  });
});

function fakeClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    me: () => Promise.resolve({ user }),
    register: () => Promise.resolve({ user }),
    login: () => Promise.resolve({ user }),
    logout: () => Promise.resolve({ ok: true }),
    refresh: () => Promise.resolve({ ok: true }),
    createLink: () => Promise.resolve({ link }),
    listLinks: () => Promise.resolve({ links: [], total: 0, page: 1, limit: 20 }),
    updateLink: () => Promise.resolve({ link }),
    enableLink: () => Promise.resolve({ link }),
    disableLink: () => Promise.resolve({ link: { ...link, isActive: false } }),
    deleteLink: () => Promise.resolve({ ok: true }),
    ...overrides
  } as ApiClient;
}

async function render(element: ReactNode): Promise<void> {
  await act(async () => {
    root.render(element);
  });
  await act(async () => Promise.resolve());
}

async function submit(selector: string): Promise<void> {
  const form = host.querySelector(selector);
  if (!(form instanceof HTMLFormElement)) {
    throw new Error(`Missing form ${selector}`);
  }
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

function setInput(labelText: string, value: string): void {
  setInputIn(labelText, value);
}

function setInputIn(labelText: string, value: string, containerSelector?: string): void {
  const container = containerSelector === undefined ? host : host.querySelector(containerSelector);
  if (container === null) {
    throw new Error(`Missing container ${containerSelector}`);
  }
  const label = [...container.querySelectorAll("label")].find((item) =>
    item.textContent?.includes(labelText)
  );
  const input = label?.querySelector("input");
  if (input === undefined || input === null) {
    throw new Error(`Missing input ${labelText}`);
  }
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function inputForLabel(labelText: string, containerSelector?: string): HTMLInputElement {
  const container = containerSelector === undefined ? host : host.querySelector(containerSelector);
  if (container === null) {
    throw new Error(`Missing container ${containerSelector}`);
  }
  const label = [...container.querySelectorAll("label")].find((item) =>
    item.textContent?.includes(labelText)
  );
  const input = label?.querySelector("input");
  if (input === undefined || input === null) {
    throw new Error(`Missing input ${labelText}`);
  }
  return input;
}

async function clickButton(text: string): Promise<void> {
  const button = [...host.querySelectorAll("button")].find((item) => item.textContent === text);
  if (button === undefined) {
    throw new Error(`Missing button ${text}`);
  }
  await act(async () => {
    button.click();
  });
}
