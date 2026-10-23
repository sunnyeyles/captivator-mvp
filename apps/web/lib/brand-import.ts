import { isIP } from "node:net";
import { BRAND_NAME_MAX, brandDetails, type BrandProfile } from "@repo/portal";
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
  const tags = [...markup.matchAll(/<(meta|link)\b([^>]*)>/gi)].map(
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
    jsonLd,
  };
}

type ScannedPage = ReturnType<typeof scanHtml>;

function metaContent(page: ScannedPage, key: string) {
  return page.metas
    .find(
      (meta) =>
        (meta.get("property") ?? meta.get("name"))?.trim().toLowerCase() ===
        key,
    )
    ?.get("content");
}

function linkHref(page: ScannedPage, rel: string) {
  return page.links
    .find((link) =>
      (link.get("rel") ?? "").toLowerCase().split(/\s+/).includes(rel),
    )
    ?.get("href");
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

function organizationName(blocks: string[]) {
  for (const block of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(block);
    } catch {
      continue;
    }
    for (const node of jsonLdNodes(data)) {
      const types = [node["@type"]].flat();
      if (!types.some((type) => organizationTypes.has(String(type)))) continue;
      const name = cleanName(node.name);
      if (name) return name;
    }
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

async function manifestName(
  url: URL,
  signal: AbortSignal,
  deps: SafeFetchDeps,
) {
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
  try {
    const data: unknown = JSON.parse(new TextDecoder().decode(manifest.body));
    if (!isRecord(data)) return null;
    return cleanName(data.name) ?? cleanName(data.short_name);
  } catch {
    return null;
  }
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
  deps: SafeFetchDeps,
): Promise<BrandProfile> {
  const url = websiteUrlSchema.safeParse(input);
  if (!url.success) throw new BrandImportError("invalid_url");
  const budget = new AbortController();
  const timer = setTimeout(() => budget.abort(), IMPORT_BUDGET_MS);
  try {
    const response = await fetchPage(url.data, budget.signal, deps);
    // The cap can cut a multi-byte character, so the decoder must not throw on a broken tail
    const page = scanHtml(new TextDecoder().decode(response.body));
    let name =
      cleanName(metaContent(page, "og:site_name")) ??
      cleanName(metaContent(page, "application-name")) ??
      organizationName(page.jsonLd);
    const manifestHref = linkHref(page, "manifest");
    const manifestUrl = manifestHref
      ? URL.parse(manifestHref, response.url)
      : null;
    if (!name && manifestUrl) {
      name = await manifestName(manifestUrl, budget.signal, deps);
    }
    if (!name && page.title !== null) name = nameFromTitle(page.title);
    const missing = new Set<BrandDetail>(["logo", "image", "colors"]);
    if (!name) missing.add("name");
    return {
      sourceUrl: response.url.href,
      name: name ?? nameFromHostname(response.url.hostname),
      logo: null,
      image: null,
      colors: [],
      primaryColor: null,
      missing: brandDetails.filter((detail) => missing.has(detail)),
    };
  } finally {
    clearTimeout(timer);
  }
}
