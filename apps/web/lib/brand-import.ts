import { isIP } from "node:net";
import {
  BRAND_NAME_MAX,
  brandDetails,
  contrastRatio,
  IMAGE_MAX_BYTES,
  imageTypes,
  type BrandProfile,
} from "@repo/portal";
import {
  safeFetch,
  SafeFetchError,
  type SafeFetchDeps,
  type SafeFetchErrorCode,
  type SafeResponse,
} from "./safe-fetch";
import { websiteUrlSchema } from "./website-url";

export type BrandImportErrorCode =
  "invalid_url" | "blocked_url" | "unreachable" | "not_html" | "timeout";

export class BrandImportError extends Error {
  constructor(readonly code: BrandImportErrorCode) {
    super(code);
    this.name = "BrandImportError";
  }
}

export const PAGE_TIMEOUT_MS = 8000;
export const PAGE_MAX_BYTES = 1024 * 1024;
export const IMPORT_BUDGET_MS = 15_000;
const MANIFEST_MAX_BYTES = 256 * 1024;

// One page, one manifest, two logo attempts and one image, with redirect hops counted too
export const MAX_OUTBOUND_REQUESTS = 5;
export const MAX_LOGO_ATTEMPTS = 2;
const MAX_COLORS = 6;

// The renderer draws logos only through <img>, where an SVG's scripts never run, so SVG is safe for logos alone
const logoTypes = [...imageTypes, "image/svg+xml"] as const;

const pageErrors: Record<SafeFetchErrorCode, BrandImportErrorCode> = {
  blocked: "blocked_url",
  unreachable: "unreachable",
  unsupported_type: "not_html",
  timeout: "timeout",
};

type BrandDetail = (typeof brandDetails)[number];

type Attributes = Map<string, string>;

const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  middot: "·",
  nbsp: " ",
  ndash: "–",
  quot: '"',
  rsquo: "’",
};

function decodeEntities(text: string) {
  return text.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (match, entity: string) => {
      if (!entity.startsWith("#")) {
        return namedEntities[entity.toLowerCase()] ?? match;
      }
      const code = /^#x/i.test(entity)
        ? parseInt(entity.slice(2), 16)
        : parseInt(entity.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    },
  );
}

// A Map rather than an object, so an attribute named like a prototype key can't collide with one
function parseAttributes(source: string): Attributes {
  const attributes: Attributes = new Map();
  for (const [, name = "", double, single, bare] of source.matchAll(
    /([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g,
  )) {
    const key = name.toLowerCase();
    if (!attributes.has(key)) {
      attributes.set(key, decodeEntities(double ?? single ?? bare ?? ""));
    }
  }
  return attributes;
}

// A tag scanner rather than a parser is enough here, since only a few head tags are read
function scanHtml(html: string) {
  const source = html.replace(/<!--[\s\S]*?-->/g, "");
  const jsonLd: string[] = [];
  for (const [, attributes = "", body = ""] of source.matchAll(
    /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi,
  )) {
    const type = parseAttributes(attributes).get("type");
    if (type?.trim().toLowerCase() === "application/ld+json") jsonLd.push(body);
  }
  // Script and style bodies can contain tag-like text that isn't part of the page
  const markup = source.replace(
    /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    "",
  );
  const tags = [...markup.matchAll(/<(meta|link|img)\b([^>]*)>/gi)].map(
    ([, name = "", attributes = ""]) => ({
      name: name.toLowerCase(),
      attributes: parseAttributes(attributes),
    }),
  );
  const title = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(markup)?.[1];
  return {
    title: title === undefined ? null : decodeEntities(title),
    metas: tags
      .filter((tag) => tag.name === "meta")
      .map((tag) => tag.attributes),
    links: tags
      .filter((tag) => tag.name === "link")
      .map((tag) => tag.attributes),
    images: tags
      .filter((tag) => tag.name === "img")
      .map((tag) => tag.attributes),
    jsonLd,
  };
}

type ScannedPage = ReturnType<typeof scanHtml>;

function metaTags(page: ScannedPage, key: string) {
  return page.metas.filter(
    (meta) =>
      (meta.get("property") ?? meta.get("name"))?.trim().toLowerCase() === key,
  );
}

function metaContent(page: ScannedPage, key: string) {
  return metaTags(page, key)[0]?.get("content");
}

function linksWithRel(page: ScannedPage, rel: string) {
  return page.links.filter((link) =>
    (link.get("rel") ?? "").toLowerCase().split(/\s+/).includes(rel),
  );
}

function linkHref(page: ScannedPage, rel: string) {
  return linksWithRel(page, rel)[0]?.get("href");
}

function cleanName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.replace(/\s+/g, " ").trim();
  return name.length > 0 && name.length <= BRAND_NAME_MAX ? name : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonLdNodes(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(jsonLdNodes);
  if (!isRecord(value)) return [];
  return [value, ...jsonLdNodes(value["@graph"])];
}

// LocalBusiness is the Organization subtype most small-business sites declare
const organizationTypes = new Set([
  "Organization",
  "LocalBusiness",
  "Corporation",
]);

function organizationNodes(blocks: string[]) {
  return blocks.flatMap((block) => {
    let data: unknown;
    try {
      data = JSON.parse(block);
    } catch {
      return [];
    }
    return jsonLdNodes(data).filter((node) =>
      [node["@type"]]
        .flat()
        .some((type) => organizationTypes.has(String(type))),
    );
  });
}

function organizationName(blocks: string[]) {
  for (const node of organizationNodes(blocks)) {
    const name = cleanName(node.name);
    if (name) return name;
  }
  return null;
}

// Schema.org allows a logo as a URL or an ImageObject, and either may come in a list
function jsonLdUrl(value: unknown): string | null {
  if (Array.isArray(value)) return jsonLdUrl(value[0]);
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value.url === "string") return value.url;
  return null;
}

function organizationLogo(blocks: string[]) {
  for (const node of organizationNodes(blocks)) {
    const logo = jsonLdUrl(node.logo);
    if (logo) return logo;
  }
  return null;
}

const genericTitleSegments = new Set([
  "home",
  "homepage",
  "home page",
  "index",
  "official site",
  "official website",
  "welcome",
]);

function nameFromTitle(title: string) {
  for (const segment of title.split(/[|–—·:]/)) {
    const name = cleanName(segment.replace(/^\s*welcome to\s+/i, ""));
    if (name && !genericTitleSegments.has(name.toLowerCase())) return name;
  }
  return null;
}

// Second-level labels that sit in front of a country code, as in example.co.uk
const secondLevelLabels = new Set([
  "ac",
  "co",
  "com",
  "edu",
  "gov",
  "net",
  "org",
]);

function nameFromHostname(hostname: string) {
  const bare = hostname.replace(/^\[|\]$/g, "");
  if (isIP(bare) !== 0) return bare;
  const labels = hostname
    .replace(/^www\./, "")
    .split(".")
    .filter(Boolean);
  if (labels.length > 1) labels.pop();
  if (labels.length > 1 && secondLevelLabels.has(labels.at(-1)!)) labels.pop();
  const words = (labels.at(-1) ?? hostname)
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1));
  return words.join(" ").slice(0, BRAND_NAME_MAX).trim() || "Our venue";
}

// "any" is how a scalable icon declares its size, so it outranks every fixed size
function iconSize(sizes: string | undefined) {
  if (sizes?.trim().toLowerCase() === "any") return Number.POSITIVE_INFINITY;
  const widths = [...(sizes ?? "").matchAll(/(\d+)x\d+/gi)].map(([, width]) =>
    Number(width),
  );
  return Math.max(0, ...widths);
}

function largest<T>(items: T[], size: (item: T) => number) {
  return items.reduce<T | null>(
    (best, item) => (best === null || size(item) > size(best) ? item : best),
    null,
  );
}

function isPngOrSvgIcon(link: Attributes) {
  const type = link.get("type")?.trim().toLowerCase();
  if (type) return type === "image/png" || type === "image/svg+xml";
  return /\.(png|svg)(?:[?#]|$)/i.test(link.get("href") ?? "");
}

function normalizeColor(value: unknown) {
  if (typeof value !== "string") return null;
  const hex = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i
    .exec(value.trim())?.[1]
    ?.toLowerCase();
  if (!hex) return null;
  return hex.length <= 4
    ? `#${[...hex.slice(0, 3)].map((digit) => digit + digit).join("")}`
    : `#${hex.slice(0, 6)}`;
}

function themeColors(page: ScannedPage) {
  const rank = (meta: Attributes) => {
    const media = meta.get("media")?.toLowerCase();
    if (!media) return 1;
    return media.includes("light") ? 0 : 2;
  };
  return metaTags(page, "theme-color")
    .sort((a, b) => rank(a) - rank(b))
    .map((meta) => meta.get("content"));
}

// Off-white and near-black are usually page chrome rather than the brand colour
function isNearNeutral(color: string) {
  return (
    contrastRatio(color, "#ffffff") < 1.25 ||
    contrastRatio(color, "#000000") < 1.3
  );
}

interface Manifest {
  name: string | null;
  colors: unknown[];
  icon: URL | null;
}

async function fetchManifest(
  url: URL,
  signal: AbortSignal,
  deps: SafeFetchDeps,
): Promise<Manifest | null> {
  let manifest: SafeResponse;
  try {
    manifest = await safeFetch(
      url,
      {
        accept: "application/manifest+json, application/json",
        contentTypes: ["application/manifest+json", "application/json"],
        maxBytes: MANIFEST_MAX_BYTES,
        timeoutMs: PAGE_TIMEOUT_MS,
        signal,
      },
      deps,
    );
  } catch {
    return null;
  }
  if (manifest.truncated) return null;
  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder().decode(manifest.body));
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;
  const icons = (Array.isArray(data.icons) ? data.icons : []).filter(
    (icon): icon is Record<string, unknown> =>
      isRecord(icon) && typeof icon.src === "string",
  );
  const icon = largest(icons, (item) =>
    iconSize(typeof item.sizes === "string" ? item.sizes : undefined),
  );
  return {
    name: cleanName(data.name) ?? cleanName(data.short_name),
    colors: [data.theme_color, data.background_color],
    // Manifest members resolve against the manifest's own address, not the page's
    icon: icon ? URL.parse(String(icon.src), manifest.url) : null,
  };
}

function sniffImageType(bytes: Uint8Array) {
  const startsWith = (signature: number[], offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte);
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  // "RIFF", a four-byte length, then "WEBP"
  if (
    startsWith([0x52, 0x49, 0x46, 0x46]) &&
    startsWith([0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  const head = new TextDecoder()
    .decode(bytes.subarray(0, 1024))
    .replace(/<\?xml[\s\S]*?\?>|<!--[\s\S]*?-->|<!doctype[^>]*>/gi, "")
    .trimStart();
  return /^<svg[\s>]/i.test(head) ? "image/svg+xml" : null;
}

async function fetchImage(
  url: URL,
  types: readonly string[],
  signal: AbortSignal,
  deps: SafeFetchDeps,
) {
  let image: SafeResponse;
  try {
    image = await safeFetch(
      url,
      {
        accept: types.join(", "),
        contentTypes: types,
        maxBytes: IMAGE_MAX_BYTES,
        timeoutMs: PAGE_TIMEOUT_MS,
        signal,
      },
      deps,
    );
  } catch {
    return null;
  }
  // The header alone can be wrong or hostile, so the bytes have to agree with it
  if (image.truncated || sniffImageType(image.body) !== image.contentType) {
    return null;
  }
  return `data:${image.contentType};base64,${Buffer.from(image.body).toString("base64")}`;
}

async function firstLogo(
  candidates: URL[],
  signal: AbortSignal,
  deps: SafeFetchDeps,
) {
  for (const candidate of candidates.slice(0, MAX_LOGO_ATTEMPTS)) {
    const logo = await fetchImage(candidate, logoTypes, signal, deps);
    if (logo) return logo;
  }
  return null;
}

function webUrls(candidates: (string | URL | null | undefined)[], base: URL) {
  const seen = new Set<string>();
  return candidates.flatMap((candidate) => {
    if (!candidate) return [];
    const url = URL.parse(candidate, base);
    if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) {
      return [];
    }
    if (seen.has(url.href)) return [];
    seen.add(url.href);
    return [url];
  });
}

function limitRequests(deps: SafeFetchDeps): SafeFetchDeps {
  let made = 0;
  return {
    ...deps,
    fetch: (url, init) => {
      made += 1;
      if (made > MAX_OUTBOUND_REQUESTS) {
        return Promise.reject(new Error("Outbound request limit reached"));
      }
      return deps.fetch(url, init);
    },
  };
}

async function fetchPage(url: URL, signal: AbortSignal, deps: SafeFetchDeps) {
  try {
    return await safeFetch(
      url,
      {
        accept: "text/html",
        contentTypes: ["text/html"],
        maxBytes: PAGE_MAX_BYTES,
        timeoutMs: PAGE_TIMEOUT_MS,
        signal,
      },
      deps,
    );
  } catch (error) {
    if (error instanceof SafeFetchError) {
      throw new BrandImportError(pageErrors[error.code]);
    }
    throw new BrandImportError("unreachable");
  }
}

/** Reads one public web page and extracts the business's brand profile from it. */
export async function importBrand(
  input: string,
  networkDeps: SafeFetchDeps,
): Promise<BrandProfile> {
  const url = websiteUrlSchema.safeParse(input);
  if (!url.success) throw new BrandImportError("invalid_url");
  const deps = limitRequests(networkDeps);
  const budget = new AbortController();
  const timer = setTimeout(() => budget.abort(), IMPORT_BUDGET_MS);
  try {
    const response = await fetchPage(url.data, budget.signal, deps);
    const base = response.url;
    // The cap can cut a multi-byte character, so the decoder must not throw on a broken tail
    const page = scanHtml(new TextDecoder().decode(response.body));
    let name =
      cleanName(metaContent(page, "og:site_name")) ??
      cleanName(metaContent(page, "application-name")) ??
      organizationName(page.jsonLd);
    const themeCandidates = themeColors(page);
    const tileCandidates = [
      metaContent(page, "msapplication-tilecolor"),
      linksWithRel(page, "mask-icon")[0]?.get("color"),
    ];
    const pageHasColors = [...themeCandidates, ...tileCandidates].some(
      (color) => normalizeColor(color) !== null,
    );
    const manifestHref = linkHref(page, "manifest");
    const manifestUrl = manifestHref ? URL.parse(manifestHref, base) : null;
    const manifest =
      manifestUrl && (!name || !pageHasColors)
        ? await fetchManifest(manifestUrl, budget.signal, deps)
        : null;
    name ??= manifest?.name ?? null;
    if (!name && page.title !== null) name = nameFromTitle(page.title);
    const colors = [
      ...new Set(
        [
          ...themeCandidates,
          ...(manifest?.colors ?? []),
          ...tileCandidates,
        ].flatMap((color) => normalizeColor(color) ?? []),
      ),
    ].slice(0, MAX_COLORS);

    const logoImage = page.images.find((image) =>
      ["src", "alt", "class", "id"].some((key) =>
        image.get(key)?.toLowerCase().includes("logo"),
      ),
    );
    const logoCandidates = webUrls(
      [
        organizationLogo(page.jsonLd),
        logoImage?.get("src"),
        linkHref(page, "apple-touch-icon"),
        largest(linksWithRel(page, "icon").filter(isPngOrSvgIcon), (link) =>
          iconSize(link.get("sizes")),
        )?.get("href"),
        manifest?.icon,
      ],
      base,
    );
    const [imageCandidate] = webUrls(
      [metaContent(page, "og:image"), metaContent(page, "twitter:image")],
      base,
    );
    const [logo, image] = await Promise.all([
      firstLogo(logoCandidates, budget.signal, deps),
      imageCandidate
        ? fetchImage(imageCandidate, imageTypes, budget.signal, deps)
        : null,
    ]);

    const missing = new Set<BrandDetail>();
    if (!name) missing.add("name");
    if (!logo) missing.add("logo");
    if (!image) missing.add("image");
    if (colors.length === 0) missing.add("colors");
    return {
      sourceUrl: base.href,
      name: name ?? nameFromHostname(base.hostname),
      logo,
      image,
      imageRecommended: null,
      colors,
      primaryColor: colors.find((color) => !isNearNeutral(color)) ?? null,
      missing: brandDetails.filter((detail) => missing.has(detail)),
    };
  } finally {
    clearTimeout(timer);
  }
}
