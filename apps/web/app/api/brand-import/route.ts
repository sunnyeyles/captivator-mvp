import { lookup } from "node:dns/promises";
import { brandProfileSchema } from "@repo/portal";
import { z } from "zod";
import {
  BrandImportError,
  importBrand,
  type BrandImportErrorCode,
} from "@/lib/brand-import";
import type { SafeFetchDeps } from "@/lib/safe-fetch";

const requestSchema = z.object({ url: z.string() });

// Messages are shown to the customer as they are, so they never carry addresses or other internal details
const errors: Record<
  BrandImportErrorCode,
  { status: number; message: string }
> = {
  invalid_url: {
    status: 400,
    message: "Enter a website address like yourbusiness.com",
  },
  blocked_url: {
    status: 422,
    message:
      "That address can't be used. Enter your business's public website.",
  },
  unreachable: {
    status: 502,
    message: "We couldn't reach that website. Check the address and try again.",
  },
  not_html: {
    status: 502,
    message: "That address isn't a web page. Enter your website's home page.",
  },
  timeout: {
    status: 504,
    message: "That website took too long to respond. Try again.",
  },
};

// Looked up at call time so tests can stand in for the network
const deps: SafeFetchDeps = {
  fetch: (url, init) => fetch(url, init),
  lookup: (hostname) => lookup(hostname, { all: true, verbatim: true }),
};

function respond(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function errorResponse(code: BrandImportErrorCode) {
  const { status, message } = errors[code];
  return respond({ error: { code, message } }, status);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_url");
  }
  const parsedRequest = requestSchema.safeParse(body);
  if (!parsedRequest.success) return errorResponse("invalid_url");
  try {
    const brand = brandProfileSchema.safeParse(
      await importBrand(parsedRequest.data.url, deps),
    );
    // A profile the schema rejects is an extraction bug, which the customer sees as an unreadable site
    if (!brand.success) return errorResponse("unreachable");
    return respond({ brand: brand.data });
  } catch (error) {
    return errorResponse(
      error instanceof BrandImportError ? error.code : "unreachable",
    );
  }
}
