import type { BrandProfile } from "@repo/portal";
import { vi } from "vitest";
import type { SafeFetchDeps } from "./safe-fetch";

export const acmeBrand: BrandProfile = {
  sourceUrl: "https://acme.example/",
  name: "Acme Coffee",
  logo: null,
  image: null,
  imageRecommended: null,
  colors: [],
  primaryColor: null,
  missing: ["logo", "image", "colors"],
};

// example.com's address, which the block list treats as public
export const PUBLIC_ADDRESS = "93.184.216.34";

export function htmlResponse(
  body = "<title>Acme</title>",
  init: ResponseInit = {},
) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    ...init,
  });
}

// Unlisted URLs fail like an unreachable host and unlisted hosts resolve to a public address
export function fakeDeps(
  responses: Record<
    string,
    (init: RequestInit) => Response | Promise<Response>
  >,
  addresses: Record<string, string | string[]> = {},
) {
  const fetch = vi.fn<SafeFetchDeps["fetch"]>(async (url, init) => {
    const respond = responses[url];
    if (!respond) throw new TypeError("fetch failed");
    return respond(init);
  });
  const lookup = vi.fn<SafeFetchDeps["lookup"]>(async (hostname) =>
    [addresses[hostname] ?? PUBLIC_ADDRESS].flat().map((address) => ({
      address,
      family: address.includes(":") ? 6 : 4,
    })),
  );
  return { fetch, lookup };
}
