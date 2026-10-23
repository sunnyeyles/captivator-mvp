import { brandProfileSchema, IMAGE_MAX_BYTES } from "@repo/portal";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  IMPORT_BUDGET_MS,
  importBrand,
  MAX_LOGO_ATTEMPTS,
  MAX_OUTBOUND_REQUESTS,
  PAGE_MAX_BYTES,
  PAGE_TIMEOUT_MS,
} from "./brand-import";
import { fakeDeps, htmlResponse } from "./test-fixtures";

const SITE = "https://acme.example/";

function page(head: string, body = "") {
  return `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
}

function jsonResponse(data: unknown, type = "application/manifest+json") {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": type },
  });
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
      page(
        title +
          manifestLink +
          jsonLd +
          applicationName +
          siteName +
          // With a name and a colour on the page, the manifest isn't needed
          '<meta name="theme-color" content="#1d4ed8">',
      ),
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

  it("lists everything a bare page doesn't provide as missing", async () => {
    const { brand } = await importPage(page(title));

    expect(brand).toEqual({
      sourceUrl: SITE,
      name: "Acme Title",
      logo: null,
      image: null,
      imageRecommended: null,
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

const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d,
]);
const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const webpBytes = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);
const svgText =
  '<?xml version="1.0"?>\n<!-- logo --><svg xmlns="http://www.w3.org/2000/svg"></svg>';

function imageResponse(body: Uint8Array | string, type: string) {
  return () =>
    new Response(typeof body === "string" ? body : body.slice(), {
      headers: { "content-type": type },
    });
}

function dataUrl(bytes: Uint8Array | string, type: string) {
  return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
}

const png = imageResponse(pngBytes, "image/png");
const notFound = () => new Response("", { status: 404 });

function fetchedUrls(deps: ReturnType<typeof fakeDeps>) {
  return deps.fetch.mock.calls.map(([url]) => url);
}

describe("importBrand logo", () => {
  const jsonLdLogo = `<script type="application/ld+json">${JSON.stringify({
    "@type": "Organization",
    name: "Acme",
    logo: { "@type": "ImageObject", url: "/ld-logo.png" },
  })}</script>`;
  const imgLogo = '<img class="site-logo" src="/img-logo.png">';
  const touchIcon = '<link rel="apple-touch-icon" href="/touch.png">';
  const icons =
    '<link rel="icon" href="/favicon.ico" sizes="512x512">' +
    '<link rel="icon" type="image/png" href="/icon-16.png" sizes="16x16">' +
    '<link rel="icon" href="/icon-192.png" sizes="192x192">';

  it.each([
    [
      "the JSON-LD Organization logo",
      jsonLdLogo + imgLogo + touchIcon + icons,
      "/ld-logo.png",
    ],
    [
      "an img whose class mentions the logo",
      imgLogo + touchIcon + icons,
      "/img-logo.png",
    ],
    ["the apple-touch-icon", touchIcon + icons, "/touch.png"],
    ["the largest PNG or SVG icon", icons, "/icon-192.png"],
  ])("prefers %s", async (_label, head, path) => {
    const { brand, deps } = await importPage(
      page(`<title>Acme</title>${head}`),
      { [`https://acme.example${path}`]: png },
    );

    expect(brand.logo).toBe(dataUrl(pngBytes, "image/png"));
    expect(fetchedUrls(deps)[1]).toBe(`https://acme.example${path}`);
    expect(brand.missing).not.toContain("logo");
  });

  it.each([
    ['<img alt="Acme logo" src="/a.png">', "/a.png"],
    ['<img id="LogoMark" src="/b.png">', "/b.png"],
    ['<img src="/brand/logo-dark.png">', "/brand/logo-dark.png"],
  ])("finds the logo img in %s", async (img, path) => {
    const { deps } = await importPage(
      page("<title>Acme</title>", `<img src="/hero.png">${img}`),
      { [`https://acme.example${path}`]: png },
    );

    expect(fetchedUrls(deps)[1]).toBe(`https://acme.example${path}`);
  });

  it("falls back to the largest manifest icon, resolved against the manifest", async () => {
    const { brand, deps } = await importPage(
      page('<link rel="manifest" href="/static/site.webmanifest">'),
      {
        "https://acme.example/static/site.webmanifest": () =>
          jsonResponse({
            icons: [
              { src: "icon-48.png", sizes: "48x48" },
              { src: "icon-512.png", sizes: "512x512" },
            ],
          }),
        "https://acme.example/static/icon-512.png": png,
      },
    );

    expect(fetchedUrls(deps)[2]).toBe(
      "https://acme.example/static/icon-512.png",
    );
    expect(brand.logo).toBe(dataUrl(pngBytes, "image/png"));
  });

  it("resolves relative logos against the final page URL", async () => {
    const deps = fakeDeps({
      [SITE]: () =>
        new Response(null, {
          status: 301,
          headers: { location: "https://www.acme.example/home/" },
        }),
      "https://www.acme.example/home/": () =>
        htmlResponse(
          page('<title>Acme</title><img class="logo" src="logo.png">'),
        ),
      "https://www.acme.example/home/logo.png": png,
    });

    const brand = await importBrand(SITE, deps);

    expect(brand.logo).toBe(dataUrl(pngBytes, "image/png"));
  });

  it("tries at most two logo candidates", async () => {
    const { brand, deps } = await importPage(
      page(`<title>Acme</title>${jsonLdLogo}${imgLogo}${touchIcon}`),
      {
        "https://acme.example/ld-logo.png": notFound,
        "https://acme.example/img-logo.png": notFound,
        "https://acme.example/touch.png": png,
      },
    );

    expect(deps.fetch).toHaveBeenCalledTimes(1 + MAX_LOGO_ATTEMPTS);
    expect(brand.logo).toBeNull();
    expect(brand.missing).toContain("logo");
  });

  it("stops at the first logo that loads", async () => {
    const { deps } = await importPage(
      page(`<title>Acme</title>${imgLogo}${touchIcon}`),
      { "https://acme.example/img-logo.png": png },
    );

    expect(deps.fetch).toHaveBeenCalledTimes(2);
  });

  it("accepts an SVG logo", async () => {
    const { brand } = await importPage(
      page('<title>Acme</title><link rel="icon" href="/logo.svg" sizes="any">'),
      {
        "https://acme.example/logo.svg": imageResponse(
          svgText,
          "image/svg+xml",
        ),
      },
    );

    expect(brand.logo).toBe(dataUrl(svgText, "image/svg+xml"));
  });

  it.each([
    [
      "a header that disagrees with the bytes",
      imageResponse(pngBytes, "image/jpeg"),
    ],
    ["HTML served as a PNG", imageResponse("<html></html>", "image/png")],
    ["an unsupported type", imageResponse("GIF89a", "image/gif")],
    [
      "a body over the size limit",
      imageResponse(
        new Uint8Array(IMAGE_MAX_BYTES + 1)
          .fill(0)
          .map((byte, index) =>
            index < pngBytes.length ? pngBytes[index]! : byte,
          ),
        "image/png",
      ),
    ],
  ])("rejects %s and tries the next candidate", async (_label, respond) => {
    const { brand, deps } = await importPage(
      page(`<title>Acme</title>${imgLogo}${touchIcon}`),
      {
        "https://acme.example/img-logo.png": respond,
        "https://acme.example/touch.png": png,
      },
    );

    expect(deps.fetch).toHaveBeenCalledTimes(3);
    expect(brand.logo).toBe(dataUrl(pngBytes, "image/png"));
  });

  it("skips logos that aren't web addresses", async () => {
    const { deps } = await importPage(
      page(
        '<title>Acme</title><img class="logo" src="data:image/png;base64,AAAA">',
      ),
    );

    expect(deps.fetch).toHaveBeenCalledTimes(1);
  });

  it("refuses a logo on a private address", async () => {
    const { brand, deps } = await importPage(
      page(
        '<title>Acme</title><img class="logo" src="http://169.254.169.254/logo.png">',
      ),
    );

    expect(brand.missing).toContain("logo");
    expect(deps.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("importBrand image", () => {
  const og = '<meta property="og:image" content="/og.jpg">';
  const twitter =
    '<meta name="twitter:image" content="https://cdn.example/tw.webp">';

  it("prefers og:image", async () => {
    const { brand } = await importPage(
      page(`<title>Acme</title>${twitter}${og}`),
      {
        "https://acme.example/og.jpg": imageResponse(jpegBytes, "image/jpeg"),
        "https://cdn.example/tw.webp": imageResponse(webpBytes, "image/webp"),
      },
    );

    expect(brand.image).toBe(dataUrl(jpegBytes, "image/jpeg"));
    expect(brand.missing).not.toContain("image");
  });

  it("falls back to twitter:image", async () => {
    const { brand } = await importPage(page(`<title>Acme</title>${twitter}`), {
      "https://cdn.example/tw.webp": imageResponse(webpBytes, "image/webp"),
    });

    expect(brand.image).toBe(dataUrl(webpBytes, "image/webp"));
  });

  it("tries only one image", async () => {
    const { brand, deps } = await importPage(
      page(`<title>Acme</title>${og}${twitter}`),
      {
        "https://acme.example/og.jpg": notFound,
        "https://cdn.example/tw.webp": imageResponse(webpBytes, "image/webp"),
      },
    );

    expect(deps.fetch).toHaveBeenCalledTimes(2);
    expect(brand.image).toBeNull();
    expect(brand.missing).toContain("image");
  });

  it("refuses an SVG image", async () => {
    const { brand } = await importPage(
      page('<title>Acme</title><meta property="og:image" content="/og.svg">'),
      {
        "https://acme.example/og.svg": imageResponse(svgText, "image/svg+xml"),
      },
    );

    expect(brand.image).toBeNull();
  });

  it("leaves the image's positions for the browser to work out", async () => {
    const { brand } = await importPage(page(`<title>Acme</title>${og}`), {
      "https://acme.example/og.jpg": imageResponse(jpegBytes, "image/jpeg"),
    });

    expect(brand.imageRecommended).toBeNull();
  });
});

describe("importBrand colours", () => {
  it("collects candidates in order, normalised and without duplicates", async () => {
    const { brand } = await importPage(
      page(
        '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0F172A">' +
          '<meta name="theme-color" content="#1D4ED8FF">' +
          '<meta name="theme-color" media="(prefers-color-scheme: light)" content=" #abc ">' +
          '<meta name="msapplication-TileColor" content="#00ABA9">' +
          '<link rel="mask-icon" href="/mask.svg" color="#5bbad5">' +
          '<link rel="manifest" href="/site.webmanifest">',
      ),
      {
        "https://acme.example/site.webmanifest": () =>
          jsonResponse({
            name: "Acme",
            theme_color: "#1d4ed8",
            background_color: "#F00",
          }),
      },
    );

    expect(brand.colors).toEqual([
      "#aabbcc",
      "#1d4ed8",
      "#0f172a",
      "#ff0000",
      "#00aba9",
      "#5bbad5",
    ]);
    expect(brand.missing).not.toContain("colors");
  });

  it.each(["red", "rgb(29, 78, 216)", "#12345", "hsl(0 0% 0%)"])(
    "skips the non-hex colour %j",
    async (color) => {
      const { brand } = await importPage(
        page(`<title>Acme</title><meta name="theme-color" content="${color}">`),
      );

      expect(brand.colors).toEqual([]);
      expect(brand.missing).toContain("colors");
    },
  );

  it("keeps at most six colours", async () => {
    const metas = [1, 2, 3, 4, 5, 6, 7]
      .map(
        (digit) => `<meta name="theme-color" content="#${digit}${digit}0000">`,
      )
      .join("");

    const { brand } = await importPage(page(`<title>Acme</title>${metas}`));

    expect(brand.colors).toHaveLength(6);
  });

  it("builds from the first colour that isn't near-white or near-black", async () => {
    const { brand } = await importPage(
      page(
        '<title>Acme</title><meta name="theme-color" content="#ffffff">' +
          '<meta name="msapplication-TileColor" content="#0a0a0a">' +
          '<link rel="mask-icon" color="#e11d48">',
      ),
    );

    expect(brand.colors).toEqual(["#ffffff", "#0a0a0a", "#e11d48"]);
    expect(brand.primaryColor).toBe("#e11d48");
  });

  it("builds from a dark brand colour such as navy", async () => {
    const { brand } = await importPage(
      page('<title>Acme</title><meta name="theme-color" content="#052962">'),
    );

    expect(brand.primaryColor).toBe("#052962");
  });

  it("has no primary colour when every candidate is near-white or near-black", async () => {
    const { brand } = await importPage(
      page(
        '<title>Acme</title><meta name="theme-color" content="#f8fafc">' +
          '<meta name="msapplication-TileColor" content="#111111">',
      ),
    );

    expect(brand.primaryColor).toBeNull();
    expect(brand.missing).not.toContain("colors");
  });

  it("fetches the manifest for colours the page doesn't declare", async () => {
    const { brand, deps } = await importPage(
      page('<title>Acme</title><link rel="manifest" href="/m.json">'),
      {
        "https://acme.example/m.json": () =>
          jsonResponse({ theme_color: "#e11d48" }),
      },
    );

    expect(deps.fetch).toHaveBeenCalledTimes(2);
    expect(brand.primaryColor).toBe("#e11d48");
  });

  it("skips the manifest when the page has a name and colours", async () => {
    const { deps } = await importPage(
      page(
        '<meta property="og:site_name" content="Acme">' +
          '<link rel="mask-icon" color="#e11d48"><link rel="manifest" href="/m.json">',
      ),
      { "https://acme.example/m.json": () => jsonResponse({}) },
    );

    expect(deps.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("importBrand full profile and request limit", () => {
  const fullPage = page(
    '<link rel="manifest" href="/m.json">' +
      '<meta property="og:image" content="/og.jpg">' +
      '<link rel="apple-touch-icon" href="/touch.png">' +
      '<link rel="icon" href="/icon.svg" sizes="any">',
    '<img class="logo" src="/logo.png">',
  );

  it("returns every detail a fully branded site provides", async () => {
    const { brand, deps } = await importPage(fullPage, {
      "https://acme.example/m.json": () =>
        jsonResponse({ name: "Acme Coffee", theme_color: "#1d4ed8" }),
      "https://acme.example/logo.png": notFound,
      "https://acme.example/touch.png": png,
      "https://acme.example/og.jpg": imageResponse(jpegBytes, "image/jpeg"),
    });

    expect(brand).toEqual({
      sourceUrl: SITE,
      name: "Acme Coffee",
      logo: dataUrl(pngBytes, "image/png"),
      image: dataUrl(jpegBytes, "image/jpeg"),
      imageRecommended: null,
      colors: ["#1d4ed8"],
      primaryColor: "#1d4ed8",
      missing: [],
    });
    expect(brandProfileSchema.safeParse(brand).error).toBeUndefined();
    expect(deps.fetch).toHaveBeenCalledTimes(MAX_OUTBOUND_REQUESTS);
  });

  it(`never makes more than ${MAX_OUTBOUND_REQUESTS} outbound requests, counting redirects`, async () => {
    const loop = (to: string) => () =>
      new Response(null, { status: 302, headers: { location: to } });
    const { brand, deps } = await importPage(fullPage, {
      "https://acme.example/m.json": loop("/m2.json"),
      "https://acme.example/m2.json": loop("/m.json"),
      "https://acme.example/logo.png": loop("/logo2.png"),
      "https://acme.example/logo2.png": loop("/logo.png"),
      "https://acme.example/touch.png": loop("/touch2.png"),
      "https://acme.example/touch2.png": loop("/touch.png"),
      "https://acme.example/og.jpg": loop("/og2.jpg"),
      "https://acme.example/og2.jpg": loop("/og.jpg"),
    });

    expect(deps.fetch.mock.calls.length).toBeLessThanOrEqual(
      MAX_OUTBOUND_REQUESTS,
    );
    expect(brand.missing).toEqual(["name", "logo", "image", "colors"]);
  });
});
