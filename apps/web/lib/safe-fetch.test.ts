import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isBlockedAddress,
  MAX_REDIRECTS,
  safeFetch,
  type SafeFetchDeps,
  type SafeFetchOptions,
} from "./safe-fetch";
import { fakeDeps, htmlResponse as html } from "./test-fixtures";

const options: SafeFetchOptions = {
  accept: "text/html",
  contentTypes: ["text/html"],
  maxBytes: 1024,
  timeoutMs: 8000,
};

function redirect(location: string, status = 302) {
  return new Response(null, { status, headers: { location } });
}

function fetchFrom(url: string, deps: SafeFetchDeps, overrides = {}) {
  return safeFetch(new URL(url), { ...options, ...overrides }, deps);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("isBlockedAddress", () => {
  it.each([
    "0.0.0.0",
    "0.1.2.3",
    "10.1.2.3",
    "100.64.0.1",
    "100.127.255.255",
    "127.0.0.1",
    "127.10.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "172.31.255.255",
    "192.0.0.170",
    "192.168.1.1",
    "198.18.0.1",
    "224.0.0.1",
    "239.255.255.250",
    "240.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "[::1]",
    "::127.0.0.1",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "fe80::1%eth0",
    "ff02::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:10.0.0.1",
    "::ffff:169.254.169.254",
    "::ffff:a9fe:a9fe",
    "64:ff9b::7f00:1",
    "2002:7f00:1::",
    "not-an-address",
    "",
  ])("blocks %s", (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each([
    "93.184.216.34",
    "8.8.8.8",
    "172.32.0.1",
    "100.128.0.1",
    "2606:4700:4700::1111",
    "::ffff:8.8.8.8",
  ])("allows %s", (address) => {
    expect(isBlockedAddress(address)).toBe(false);
  });
});

describe("safeFetch", () => {
  it("fetches a public page with fixed headers and manual redirects", async () => {
    const deps = fakeDeps({ "https://acme.example/": () => html() });

    const response = await fetchFrom("https://acme.example/", deps);

    expect(new TextDecoder().decode(response.body)).toBe("<title>Acme</title>");
    expect(response.contentType).toBe("text/html");
    expect(response.truncated).toBe(false);
    expect(response.url.href).toBe("https://acme.example/");
    const [, init] = deps.fetch.mock.calls[0]!;
    expect(init).toMatchObject({
      method: "GET",
      redirect: "manual",
      headers: { Accept: "text/html" },
    });
    expect(init.headers).toHaveProperty("User-Agent");
    expect(init.headers).not.toHaveProperty("Cookie");
  });

  it.each([
    "ftp://acme.example/",
    "file:///etc/passwd",
    "http://acme.example:8080/",
    "https://acme.example:22/",
    "https://user:secret@acme.example/",
  ])("blocks %s before any request", async (url) => {
    const deps = fakeDeps({ [url]: () => html() });

    await expect(fetchFrom(url, deps)).rejects.toMatchObject({
      code: "blocked",
    });
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it.each(["http://acme.example:80/", "https://acme.example:443/"])(
    "allows the default port written out in %s",
    async (url) => {
      const deps = fakeDeps({ [new URL(url).href]: () => html() });

      await expect(fetchFrom(url, deps)).resolves.toMatchObject({
        contentType: "text/html",
      });
    },
  );

  it.each([
    "http://127.0.0.1/",
    "http://10.0.0.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://2130706433/",
    "http://0x7f.1/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[fe80::1]/",
  ])("blocks the IP literal %s without a lookup", async (url) => {
    const deps = fakeDeps({});

    await expect(fetchFrom(url, deps)).rejects.toMatchObject({
      code: "blocked",
    });
    expect(deps.lookup).not.toHaveBeenCalled();
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it("allows a public IP literal", async () => {
    const deps = fakeDeps({ "http://93.184.216.34/": () => html() });

    await expect(
      fetchFrom("http://93.184.216.34/", deps),
    ).resolves.toBeTruthy();
    expect(deps.lookup).not.toHaveBeenCalled();
  });

  it("blocks a host when any of its addresses is private", async () => {
    const deps = fakeDeps(
      { "https://mixed.example/": () => html() },
      { "mixed.example": ["93.184.216.34", "10.0.0.5"] },
    );

    await expect(
      fetchFrom("https://mixed.example/", deps),
    ).rejects.toMatchObject({ code: "blocked" });
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it("blocks a host that resolves to an IPv6 loopback", async () => {
    const deps = fakeDeps({}, { "six.example": ["::1"] });

    await expect(fetchFrom("https://six.example/", deps)).rejects.toMatchObject(
      {
        code: "blocked",
      },
    );
  });

  it("treats a failed lookup as unreachable", async () => {
    const deps = fakeDeps({});
    deps.lookup.mockRejectedValueOnce(new Error("getaddrinfo ENOTFOUND"));

    await expect(
      fetchFrom("https://nowhere.example/", deps),
    ).rejects.toMatchObject({ code: "unreachable" });
  });

  it("treats a lookup with no addresses as unreachable", async () => {
    const deps = fakeDeps({}, { "empty.example": [] });

    await expect(
      fetchFrom("https://empty.example/", deps),
    ).rejects.toMatchObject({ code: "unreachable" });
  });

  it("treats a connection failure as unreachable", async () => {
    const deps = fakeDeps({});

    await expect(
      fetchFrom("https://down.example/", deps),
    ).rejects.toMatchObject({
      code: "unreachable",
    });
  });

  it("follows a relative redirect and reports the final URL", async () => {
    const deps = fakeDeps({
      "http://acme.example/": () => redirect("https://acme.example/"),
      "https://acme.example/": () => redirect("/home", 301),
      "https://acme.example/home": () => html(),
    });

    const response = await fetchFrom("http://acme.example/", deps);

    expect(response.url.href).toBe("https://acme.example/home");
    expect(deps.fetch).toHaveBeenCalledTimes(3);
  });

  it("re-checks a redirect and refuses one into a private range", async () => {
    const deps = fakeDeps(
      {
        "https://acme.example/": () => redirect("https://internal.example/"),
        "https://internal.example/": () => html(),
      },
      { "internal.example": ["192.168.0.10"] },
    );

    await expect(
      fetchFrom("https://acme.example/", deps),
    ).rejects.toMatchObject({
      code: "blocked",
    });
    expect(deps.fetch).toHaveBeenCalledTimes(1);
  });

  it("refuses a redirect to a metadata IP literal", async () => {
    const deps = fakeDeps({
      "https://acme.example/": () =>
        redirect("http://169.254.169.254/latest/meta-data/", 307),
    });

    await expect(
      fetchFrom("https://acme.example/", deps),
    ).rejects.toMatchObject({
      code: "blocked",
    });
    expect(deps.fetch).toHaveBeenCalledTimes(1);
  });

  it("refuses a redirect to another scheme", async () => {
    const deps = fakeDeps({
      "https://acme.example/": () => redirect("file:///etc/passwd"),
    });

    await expect(
      fetchFrom("https://acme.example/", deps),
    ).rejects.toMatchObject({
      code: "blocked",
    });
  });

  it(`follows at most ${MAX_REDIRECTS} redirects`, async () => {
    const hops = Object.fromEntries(
      Array.from({ length: MAX_REDIRECTS + 1 }, (_, hop) => [
        `https://acme.example/${hop}`,
        () => redirect(`/${hop + 1}`),
      ]),
    );
    const deps = fakeDeps({
      ...hops,
      [`https://acme.example/${MAX_REDIRECTS + 1}`]: () => html(),
    });

    await expect(
      fetchFrom("https://acme.example/0", deps),
    ).rejects.toMatchObject({
      code: "unreachable",
    });
    expect(deps.fetch).toHaveBeenCalledTimes(MAX_REDIRECTS + 1);

    const allowed = fakeDeps({
      ...hops,
      [`https://acme.example/${MAX_REDIRECTS}`]: () => html(),
    });
    await expect(
      fetchFrom("https://acme.example/0", allowed),
    ).resolves.toBeTruthy();
  });

  it.each([404, 410, 500, 503])(
    "treats status %i as unreachable",
    async (status) => {
      const deps = fakeDeps({
        "https://acme.example/": () => html("Not here", { status }),
      });

      await expect(
        fetchFrom("https://acme.example/", deps),
      ).rejects.toMatchObject({
        code: "unreachable",
      });
    },
  );

  it.each(["application/pdf", "image/png", "text/plain", ""])(
    "rejects the content type %j",
    async (type) => {
      const deps = fakeDeps({
        "https://acme.example/": () =>
          new Response("%PDF", { headers: { "content-type": type } }),
      });

      await expect(
        fetchFrom("https://acme.example/", deps),
      ).rejects.toMatchObject({ code: "unsupported_type" });
    },
  );

  it("reads at most the byte cap and marks the body truncated", async () => {
    const deps = fakeDeps({
      "https://acme.example/": () => html("x".repeat(5000)),
    });

    const response = await fetchFrom("https://acme.example/", deps);

    expect(response.body.byteLength).toBe(options.maxBytes);
    expect(response.truncated).toBe(true);
  });

  it("keeps a body exactly at the cap whole", async () => {
    const deps = fakeDeps({
      "https://acme.example/": () => html("x".repeat(options.maxBytes)),
    });

    const response = await fetchFrom("https://acme.example/", deps);

    expect(response.body.byteLength).toBe(options.maxBytes);
    expect(response.truncated).toBe(false);
  });

  it("times out a request that never answers", async () => {
    vi.useFakeTimers();
    const deps = fakeDeps({});
    deps.fetch.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );

    const result = expect(
      fetchFrom("https://slow.example/", deps),
    ).rejects.toMatchObject({ code: "timeout" });
    await vi.advanceTimersByTimeAsync(options.timeoutMs);
    await result;
  });

  it("times out when the caller's budget runs out", async () => {
    const budget = new AbortController();
    budget.abort();
    const deps = fakeDeps({ "https://acme.example/": () => html() });

    await expect(
      fetchFrom("https://acme.example/", deps, { signal: budget.signal }),
    ).rejects.toMatchObject({ code: "timeout" });
    expect(deps.fetch).not.toHaveBeenCalled();
  });
});
