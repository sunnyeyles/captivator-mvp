import { z } from "zod";

const WEBSITE_URL_MAX = 2048;

const INVALID_MESSAGE = "Enter a website address like yourbusiness.com";

// A single-label host such as "localhost" can never be a customer's public website
function isWebsiteHost(hostname: string) {
  return hostname.includes(".") || hostname.startsWith("[");
}

/** Normalises what a customer typed into an http(s) URL, adding https:// when they left the scheme out. */
export const websiteUrlSchema = z
  .string()
  .trim()
  .min(1, "Enter your website address")
  .max(WEBSITE_URL_MAX, INVALID_MESSAGE)
  .transform((input, context) => {
    const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(input)
      ? input
      : `https://${input}`;
    const url = URL.parse(withScheme);
    if (
      !url ||
      withScheme.length > WEBSITE_URL_MAX ||
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      !isWebsiteHost(url.hostname)
    ) {
      context.addIssue({ code: "custom", message: INVALID_MESSAGE });
      return z.NEVER;
    }
    return url;
  });
