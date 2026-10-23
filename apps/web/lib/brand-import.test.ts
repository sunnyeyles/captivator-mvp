import { brandProfileSchema } from "@repo/portal";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  IMPORT_BUDGET_MS,
  importBrand,
  PAGE_MAX_BYTES,
  PAGE_TIMEOUT_MS,
} from "./brand-import";
import type { SafeFetchDeps } from "./safe-fetch";

const SITE = "https://acme.example/";

function page(head: string, body = "") {
  return `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
}

function htmlResponse(html: string) {
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function jsonResponse(data: unknown, type = "application/manifest+json") {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": type },
  });
}

function fakeDeps(
  responses: Record<
    string,
    (init: RequestInit) => Response | Promise<Response>
  >,
  addresses: Record<string, string> = {},
) {
  const fetch = vi.fn<SafeFetchDeps["fetch"]>(async (url, init) => {
    const respond = responses[url];
    if (!respond) throw new TypeError("fetch failed");
    return respond(init);
  });
  const lookup = vi.fn<SafeFetchDeps["lookup"]>(async (hostname) => [
    { address: addresses[hostname] ?? "93.184.216.34", family: 4 },
  ]);
  return { fetch, lookup };
}

async function importPage(html: string, extra = {}) {
  const deps = fakeDeps({ [SITE]: () => htmlResponse(html), ...extra });
  const brand = await importBrand(SITE, deps);
  return { brand, deps };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("importBrand name extraction", () => {
  const siteName = '<meta property="og:site_name" content="Acme Site Name">';
  const applicationName = '<meta name="application-name" content="Acme App">';
  const jsonLd = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: "Not the business" },
      { "@type": ["Organization"], name: "Acme Organisation" },
    ],
  })}</script>`;
  const manifestLink = '<link rel="manifest" href="/site.webmanifest">';
  const title = "<title>Home | Acme Title</title>";
  const manifest = {
    "https://acme.example/site.webmanifest": () =>
      jsonResponse({ name: "Acme Manifest", short_name: "Acme" }),
  };

  it("prefers og:site_name over everything else", async () => {
    const { brand, deps } = await importPage(
      page(title + manifestLink + jsonLd + applicationName + siteName),
      manifest,
    );

    expect(brand.name).toBe("Acme Site Name");
    expect(deps.fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to application-name", async () => {
    const { brand } = await importPage(page(title + jsonLd + applicationName));

    expect(brand.name).toBe("Acme App");
  });

  it("falls back to the JSON-LD Organization name", async () => {
    const { brand } = await importPage(
      page(title + manifestLink + jsonLd),
      manifest,
    );

    expect(brand.name).toBe("Acme Organisation");
  });

  it("reads a LocalBusiness as an organisation", async () => {
    const { brand } = await importPage(
      page(
        `<script type="application/ld+json">{"@type":"LocalBusiness","name":"Corner Cafe"}</script>`,
      ),
    );

    expect(brand.name).toBe("Corner Cafe");
  });

  it("skips JSON-LD that doesn't parse", async () => {
    const { brand } = await importPage(
      page(`<script type="application/ld+json">{oops</script>${title}`),
    );

    expect(brand.name).toBe("Acme Title");
  });

  it("falls back to the linked manifest's name, resolved against the page", async () => {
    const { brand, deps } = await importPage(
      page(title + manifestLink),
      manifest,
    );

    expect(brand.name).toBe("Acme Manifest");
    expect(deps.fetch).toHaveBeenCalledTimes(2);
    expect(deps.fetch.mock.calls[1]![0]).toBe(
      "https://acme.example/site.webmanifest",
    );
  });

  it("uses the manifest's short_name when it has no name", async () => {
    const { brand } = await importPage(page(manifestLink), {
      "https://acme.example/site.webmanifest": () =>
        jsonResponse({ short_name: "Acme Short" }, "application/json"),
    });

    expect(brand.name).toBe("Acme Short");
  });

  it("never fetches a manifest the page doesn't link", async () => {
    const { deps } = await importPage(page(title), manifest);

    expect(deps.fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a missing manifest", () => new Response("", { status: 404 })],
    ["a manifest that isn't JSON", () => jsonResponse("{", "text/html")],
    [
      "a manifest with bad JSON",
      () =>
        new Response("{", { headers: { "content-type": "application/json" } }),
    ],
  ])("treats %s as no name", async (_label, respond) => {
    const { brand } = await importPage(page(title + manifestLink), {
      "https://acme.example/site.webmanifest": respond,
    });

    expect(brand.name).toBe("Acme Title");
    expect(brand.missing).not.toContain("name");
  });

  it("refuses a manifest on a private address without failing the import", async () => {
    const { brand, deps } = await importPage(
      page(
        title + '<link rel="manifest" href="http://10.0.0.1/manifest.json">',
      ),
    );

    expect(brand.name).toBe("Acme Title");
    expect(deps.fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["Home | Acme Coffee", "Acme Coffee"],
    ["Acme Coffee | Fresh beans daily", "Acme Coffee"],
    ["Welcome – Acme Coffee", "Acme Coffee"],
    ["Home — Welcome · Acme Coffee", "Acme Coffee"],
    ["Homepage: Acme Coffee", "Acme Coffee"],
    ["Welcome to Acme Coffee", "Acme Coffee"],
    ["  Acme\n   Coffee  ", "Acme Coffee"],
    ["Acme &amp; Sons &#8211; Bakers", "Acme & Sons"],
  ])("cleans the title %j to %j", async (text, name) => {
    const { brand } = await importPage(page(`<title>${text}</title>`));

    expect(brand.name).toBe(name);
  });

  it("skips a candidate longer than the name limit", async () => {
    const { brand } = await importPage(
      page(
        `<meta property="og:site_name" content="${"x".repeat(61)}"><title>Acme Title</title>`,
      ),
    );

    expect(brand.name).toBe("Acme Title");
  });

  it("ignores tags inside comments and scripts", async () => {
    const { brand } = await importPage(
      page(
        `<!-- <meta property="og:site_name" content="Commented"> -->
        <script>document.write('<meta property="og:site_name" content="Scripted">')</script>
        <title>Acme Title</title>`,
      ),
    );

    expect(brand.name).toBe("Acme Title");
  });

  it("reads unquoted and single-quoted attributes in any case", async () => {
    const { brand } = await importPage(
      page("<META PROPERTY=og:site_name CONTENT='Acme &quot;Q&quot;'>"),
    );

    expect(brand.name).toBe('Acme "Q"');
  });

  it.each([
    ["https://www.acme-coffee.com/", "Acme Coffee"],
    ["https://acme.co.uk/", "Acme"],
    ["https://shop.bean_there.org/", "Bean There"],
  ])("falls back to the hostname of %s", async (url, name) => {
    const deps = fakeDeps({
      [url]: () => htmlResponse(page("<title>Home</title>")),
    });

    const brand = await importBrand(url, deps);

    expect(brand.name).toBe(name);
    expect(brand.missing).toContain("name");
  });

  it("lists everything this ticket doesn't fill as missing", async () => {
    const { brand } = await importPage(page(title));

    expect(brand).toEqual({
      sourceUrl: SITE,
      name: "Acme Title",
      logo: null,
      image: null,
      colors: [],
      primaryColor: null,
      missing: ["logo", "image", "colors"],
    });
  });

  it.each([
    page(""),
    page(siteName),
    page(title + manifestLink),
    "not html at all",
  ])("returns a profile that parses against the schema", async (html) => {
    const { brand } = await importPage(html, manifest);

    expect(brandProfileSchema.safeParse(brand).error).toBeUndefined();
  });

  it("reads the name from a page cut off at the size cap", async () => {
    const { brand } = await importPage(
      page(title, "x".repeat(PAGE_MAX_BYTES * 2)),
    );

    expect(brand.name).toBe("Acme Title");
  });
});

describe("importBrand requests", () => {
  it("adds https:// when the scheme is left out", async () => {
    const deps = fakeDeps({ [SITE]: () => htmlResponse(page("")) });

    const brand = await importBrand("  acme.example  ", deps);

    expect(brand.sourceUrl).toBe(SITE);
  });

  it("reports the final URL after redirects", async () => {
    const deps = fakeDeps({
      [SITE]: () =>
        new Response(null, {
          status: 301,
          headers: { location: "https://www.acme.example/" },
        }),
      "https://www.acme.example/": () => htmlResponse(page("")),
    });

    const brand = await importBrand(SITE, deps);

    expect(brand.sourceUrl).toBe("https://www.acme.example/");
  });

  it.each([
    "",
    "   ",
    "not a url",
    "ftp://acme.example/",
    "localhost",
    "https://user:pw@acme.example/",
    `acme.example/${"x".repeat(2048)}`,
  ])("rejects %j as an invalid URL", async (input) => {
    const deps = fakeDeps({});

    await expect(importBrand(input, deps)).rejects.toMatchObject({
      code: "invalid_url",
    });
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it.each(["http://127.0.0.1/", "192.168.1.1", "acme.example:8080"])(
    "blocks %s",
    async (input) => {
      await expect(importBrand(input, fakeDeps({}))).rejects.toMatchObject({
        code: "blocked_url",
      });
    },
  );

  it("blocks a host that resolves to a private address", async () => {
    const deps = fakeDeps({}, { "acme.example": "10.0.0.8" });

    await expect(importBrand(SITE, deps)).rejects.toMatchObject({
      code: "blocked_url",
    });
  });

  it("reports an unreachable site", async () => {
    await expect(importBrand(SITE, fakeDeps({}))).rejects.toMatchObject({
      code: "unreachable",
    });
  });

  it("reports a non-HTML page", async () => {
    const deps = fakeDeps({
      [SITE]: () => jsonResponse({}, "application/pdf"),
    });

    await expect(importBrand(SITE, deps)).rejects.toMatchObject({
      code: "not_html",
    });
  });

  it(`times out a page that takes longer than ${PAGE_TIMEOUT_MS} ms`, async () => {
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

    const result = expect(importBrand(SITE, deps)).rejects.toMatchObject({
      code: "timeout",
    });
    await vi.advanceTimersByTimeAsync(PAGE_TIMEOUT_MS);
    await result;
  });

  it("gives up on the manifest when the overall budget runs out", async () => {
    vi.useFakeTimers();
    const deps = fakeDeps({
      [SITE]: () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve(
                htmlResponse(
                  page(
                    '<title>Acme</title><link rel="manifest" href="/m.json">',
                  ),
                ),
              ),
            PAGE_TIMEOUT_MS - 500,
          ),
        ),
      "https://acme.example/m.json": (init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    });

    const result = importBrand(SITE, deps);
    await vi.advanceTimersByTimeAsync(IMPORT_BUDGET_MS);

    await expect(result).resolves.toMatchObject({ name: "Acme" });
  });

  it("makes at most one page and one manifest request", async () => {
    const { deps } = await importPage(
      page(
        '<link rel="manifest" href="/a.json"><link rel="manifest" href="/b.json">',
      ),
      {
        "https://acme.example/a.json": () => jsonResponse({}),
        "https://acme.example/b.json": () => jsonResponse({ name: "B" }),
      },
    );

    expect(deps.fetch).toHaveBeenCalledTimes(2);
  });
});
