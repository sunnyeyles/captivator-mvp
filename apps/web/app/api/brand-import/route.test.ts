import { brandProfileSchema } from "@repo/portal";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LookupAddress } from "@/lib/safe-fetch";
import { POST } from "./route";

const fakeLookup = vi.hoisted(() =>
  vi.fn<(hostname: string) => Promise<LookupAddress[]>>(),
);

vi.mock("node:dns/promises", () => ({ lookup: fakeLookup }));

const fakeFetch = vi.fn<typeof fetch>();

function request(body: unknown) {
  return new Request("http://localhost/api/brand-import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function resolvesTo(address: string) {
  fakeLookup.mockResolvedValue([{ address, family: 4 }]);
}

beforeEach(() => {
  vi.stubGlobal("fetch", fakeFetch);
  resolvesTo("93.184.216.34");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  fakeFetch.mockReset();
  fakeLookup.mockReset();
});

describe("POST /api/brand-import", () => {
  it("returns the brand profile for a reachable site", async () => {
    fakeFetch.mockResolvedValue(
      new Response(
        '<meta property="og:site_name" content="Acme Coffee"><title>Home</title>',
        { headers: { "content-type": "text/html" } },
      ),
    );

    const response = await POST(request({ url: "acme.example" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(brandProfileSchema.parse(body.brand)).toMatchObject({
      sourceUrl: "https://acme.example/",
      name: "Acme Coffee",
      missing: ["logo", "image", "colors"],
    });
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["an invalid address", { url: "not a url" }],
    ["an empty address", { url: "" }],
    ["a missing address", {}],
    ["a body that isn't JSON", "{"],
  ])("rejects %s with 400 invalid_url", async (_label, body) => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "invalid_url",
        message: "Enter a website address like yourbusiness.com",
      },
    });
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it.each([
    ["a private IP literal", "http://192.168.1.1/", null],
    ["a metadata address", "http://169.254.169.254/", null],
    ["a host resolving to loopback", "https://sneaky.example/", "127.0.0.1"],
    ["a disallowed port", "https://acme.example:8443/", null],
  ])("blocks %s with 422 without leaking it", async (_label, url, address) => {
    if (address) resolvesTo(address);

    const response = await POST(request({ url }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.error.code).toBe("blocked_url");
    expect(JSON.stringify(body)).not.toMatch(/127\.0|192\.168|169\.254/);
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it("reports a DNS failure as 502 unreachable", async () => {
    fakeLookup.mockRejectedValue(
      Object.assign(new Error("getaddrinfo ENOTFOUND nowhere.example"), {
        code: "ENOTFOUND",
      }),
    );

    const response = await POST(request({ url: "nowhere.example" }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error.code).toBe("unreachable");
    expect(body.error.message).not.toMatch(/ENOTFOUND|getaddrinfo/);
  });

  it("reports a site error as 502 unreachable", async () => {
    fakeFetch.mockResolvedValue(new Response("Down", { status: 503 }));

    const response = await POST(request({ url: "acme.example" }));

    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("unreachable");
  });

  it("reports a non-HTML page as 502 not_html", async () => {
    fakeFetch.mockResolvedValue(
      new Response("{}", { headers: { "content-type": "application/json" } }),
    );

    const response = await POST(request({ url: "acme.example" }));

    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("not_html");
  });

  it("reports a slow site as 504 timeout", async () => {
    vi.useFakeTimers();
    fakeFetch.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );

    const pending = POST(request({ url: "acme.example" }));
    await vi.advanceTimersByTimeAsync(15_000);
    const response = await pending;

    expect(response.status).toBe(504);
    expect((await response.json()).error.code).toBe("timeout");
  });
});
