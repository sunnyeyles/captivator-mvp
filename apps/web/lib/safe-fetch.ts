import { BlockList, isIP } from "node:net";

export interface LookupAddress {
  address: string;
  family: number;
}

/** The network access a safe fetch uses, injected so tests never touch the network. */
export interface SafeFetchDeps {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  lookup: (hostname: string) => Promise<LookupAddress[]>;
}

export interface SafeFetchOptions {
  accept: string;
  contentTypes: readonly string[];
  maxBytes: number;
  timeoutMs: number;
  // Aborting it, for example when an overall budget runs out, ends the fetch as a timeout
  signal?: AbortSignal;
}

export interface SafeResponse {
  url: URL;
  contentType: string;
  body: Uint8Array;
  truncated: boolean;
}

export type SafeFetchErrorCode =
  "blocked" | "unreachable" | "unsupported_type" | "timeout";

export class SafeFetchError extends Error {
  constructor(readonly code: SafeFetchErrorCode) {
    super(code);
    this.name = "SafeFetchError";
  }
}

export const MAX_REDIRECTS = 3;

export const USER_AGENT = "CaptivatorBrandImport/1.0";

const blockedAddresses = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv4");
}
// BlockList matches IPv4-mapped addresses against the IPv4 ranges itself, and these cover the other IPv6 forms that can reach them
for (const [network, prefix] of [
  ["::", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv6");
}

/** Whether an address is outside the public internet, which includes anything that isn't a valid IP. */
export function isBlockedAddress(address: string) {
  const bare = address.replace(/^\[|\]$/g, "").replace(/%.*$/, "");
  const family = isIP(bare);
  if (family === 0) return true;
  return blockedAddresses.check(bare, family === 4 ? "ipv4" : "ipv6");
}

async function checkUrl(url: URL, deps: SafeFetchDeps) {
  const allowed =
    (url.protocol === "http:" || url.protocol === "https:") &&
    ["", "80", "443"].includes(url.port) &&
    !url.username &&
    !url.password;
  if (!allowed) throw new SafeFetchError("blocked");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) !== 0) {
    if (isBlockedAddress(host)) throw new SafeFetchError("blocked");
    return;
  }
  let addresses: LookupAddress[];
  try {
    addresses = await deps.lookup(host);
  } catch {
    throw new SafeFetchError("unreachable");
  }
  if (addresses.length === 0) throw new SafeFetchError("unreachable");
  if (addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new SafeFetchError("blocked");
  }
}

function mediaType(response: Response) {
  return (response.headers.get("content-type") ?? "")
    .split(";")[0]!
    .trim()
    .toLowerCase();
}

async function readLimited(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  if (reader) {
    while (size < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.byteLength;
    }
    if (size >= maxBytes) {
      // A body exactly at the cap is complete only if nothing follows it
      truncated = size > maxBytes || !(await reader.read()).done;
      await reader.cancel();
    }
  }
  const body = new Uint8Array(Math.min(size, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const part = chunk.subarray(0, body.byteLength - offset);
    body.set(part, offset);
    offset += part.byteLength;
  }
  return { body, truncated };
}

function isRedirect(status: number) {
  return [301, 302, 303, 307, 308].includes(status);
}

/** Fetches one public http(s) resource, re-checking every redirect and enforcing the time, size and type limits. */
export async function safeFetch(
  url: URL,
  options: SafeFetchOptions,
  deps: SafeFetchDeps,
): Promise<SafeResponse> {
  const controller = new AbortController();
  // A plain timer rather than AbortSignal.timeout, so tests can drive it with fake timers
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  const signal = options.signal
    ? AbortSignal.any([controller.signal, options.signal])
    : controller.signal;
  try {
    let current = url;
    for (let hop = 0; ; hop += 1) {
      await checkUrl(current, deps);
      if (signal.aborted) throw new SafeFetchError("timeout");
      const response = await deps.fetch(current.href, {
        method: "GET",
        headers: { Accept: options.accept, "User-Agent": USER_AGENT },
        redirect: "manual",
        credentials: "omit",
        cache: "no-store",
        signal,
      });
      const location = response.headers.get("location");
      if (isRedirect(response.status) && location) {
        await response.body?.cancel();
        const next = URL.parse(location, current);
        if (!next || hop >= MAX_REDIRECTS) {
          throw new SafeFetchError("unreachable");
        }
        current = next;
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new SafeFetchError("unreachable");
      }
      const contentType = mediaType(response);
      if (!options.contentTypes.includes(contentType)) {
        await response.body?.cancel();
        throw new SafeFetchError("unsupported_type");
      }
      const { body, truncated } = await readLimited(response, options.maxBytes);
      return { url: current, contentType, body, truncated };
    }
  } catch (error) {
    if (signal.aborted) throw new SafeFetchError("timeout");
    if (error instanceof SafeFetchError) throw error;
    throw new SafeFetchError("unreachable");
  } finally {
    clearTimeout(timer);
  }
}
