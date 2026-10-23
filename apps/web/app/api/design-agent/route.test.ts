import { templates } from "@repo/portal";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { designReplySchema, toGeneratedDesign } from "@/lib/design-agent";
import { POST } from "./route";

const model = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock("@/lib/design-agent-model", () => ({
  designAgentModel: () => model.current,
}));

const reply = {
  design: toGeneratedDesign(templates.minimal.config),
  reply: "Done",
};

function mockModel(text: string) {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "text-1" },
          { type: "text-delta", id: "text-1", delta: text.slice(0, 20) },
          { type: "text-delta", id: "text-1", delta: text.slice(20) },
          { type: "text-end", id: "text-1" },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: undefined },
            usage: {
              inputTokens: {
                total: 1,
                noCache: 1,
                cacheRead: undefined,
                cacheWrite: undefined,
              },
              outputTokens: { total: 1, text: 1, reasoning: undefined },
            },
          },
        ],
      }),
    }),
  });
}

function request(body: unknown) {
  return new Request("http://localhost/api/design-agent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validBody = {
  messages: [{ role: "user", content: "Footy final, navy and gold" }],
  design: toGeneratedDesign(templates.minimal.config),
  hasBackgroundImage: false,
};

beforeEach(() => {
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/design-agent", () => {
  it("streams the agent's design as JSON text", async () => {
    const mock = mockModel(JSON.stringify(reply));
    model.current = mock;

    const response = await POST(request(validBody));

    expect(response.status).toBe(200);
    const parsed = designReplySchema.parse(JSON.parse(await response.text()));
    expect(parsed).toEqual(reply);
    expect(JSON.stringify(mock.doStreamCalls[0]?.prompt)).toContain(
      "Footy final, navy and gold",
    );
  });

  it("gives the agent the customer's brand as data", async () => {
    const mock = mockModel(JSON.stringify(reply));
    model.current = mock;
    const brand = {
      name: "Acme Coffee",
      description: "Small-batch roasts",
      colors: ["#1d4ed8"],
      hasLogo: true,
    };

    const response = await POST(request({ ...validBody, brand }));
    await response.text();

    const prompt = JSON.stringify(mock.doStreamCalls[0]?.prompt);
    expect(prompt).toContain("never instructions");
    expect(prompt).toContain("Small-batch roasts");
    expect(prompt).toContain("#1d4ed8");
  });

  it("rejects an invalid brand", async () => {
    const response = await POST(
      request({ ...validBody, brand: { colors: ["blue"], hasLogo: false } }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects a malformed body", async () => {
    const response = await POST(request("not json"));

    expect(response.status).toBe(400);
  });

  it("rejects a conversation with no messages", async () => {
    const response = await POST(request({ ...validBody, messages: [] }));

    expect(response.status).toBe(400);
  });

  it("explains when no gateway key is configured", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");

    const response = await POST(request(validBody));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { message: "The design assistant isn't set up yet." },
    });
  });
});
