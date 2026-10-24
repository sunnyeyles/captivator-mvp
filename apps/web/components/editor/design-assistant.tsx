"use client";

import { useObject } from "@ai-sdk/react";
import { Loader2, SendHorizontal, Sparkles, Square } from "lucide-react";
import type { PortalConfig } from "@repo/portal";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@repo/ui/button";
import { Textarea } from "@repo/ui/textarea";
import {
  CHAT_HISTORY_MAX,
  CHAT_MESSAGE_MAX,
  designReplySchema,
  examplePrompts,
  mergeGeneratedDesign,
  toGeneratedDesign,
  withAssets,
  type ChatMessage,
  type DesignRequest,
  type DesignStart,
} from "@/lib/design-agent";
import { usePortalEditorStore } from "@/lib/editor-store";
import { PromptCard } from "./prompt-card";
import { UploadAssetCard } from "./upload-asset-card";
import { WebsiteAssetCard } from "./website-asset-card";

const FALLBACK_ERROR = "The assistant couldn't finish that. Try again.";

// The route answers errors as JSON, which useObject passes on as the error message text
function errorMessage(error: Error) {
  try {
    const body: unknown = JSON.parse(error.message);
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? (body.error as { message?: unknown }).message
        : undefined;
    return typeof message === "string" ? message : FALLBACK_ERROR;
  } catch {
    return FALLBACK_ERROR;
  }
}

export function DesignAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  // The design the streaming reply is applied to, fixed when the request is sent
  const baseRef = useRef<PortalConfig | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const previewGeneratedConfig = usePortalEditorStore(
    (state) => state.previewGeneratedConfig,
  );
  const finishGeneration = usePortalEditorStore(
    (state) => state.finishGeneration,
  );

  const { object, submit, isLoading, stop } = useObject({
    api: "/api/design-agent",
    schema: designReplySchema,
    onFinish: ({ object: reply }) => {
      const base = baseRef.current;
      baseRef.current = null;
      if (!base || !reply) {
        finishGeneration(null);
        setFailure(FALLBACK_ERROR);
        return;
      }
      finishGeneration(mergeGeneratedDesign(base, reply.design));
      setMessages((current) => [
        ...current,
        { role: "assistant", content: reply.reply || "Done." },
      ]);
    },
    onError: (error) => {
      baseRef.current = null;
      finishGeneration(null);
      setFailure(errorMessage(error));
    },
  });

  // Streams into the store so the canvas redraws as each part of the design arrives
  useEffect(() => {
    const base = baseRef.current;
    if (!base || !object?.design) return;
    previewGeneratedConfig(mergeGeneratedDesign(base, object.design));
  }, [object?.design, previewGeneratedConfig]);

  useEffect(() => {
    // An empty chat stays scrolled to the top, where the ways to start are
    if (messages.length === 0) return;
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, object?.reply, failure]);

  function send({ text, brand, assets }: DesignStart) {
    const content = text.trim().slice(0, CHAT_MESSAGE_MAX);
    if (!content || isLoading) return false;
    const base = withAssets(usePortalEditorStore.getState().config, assets);
    // Assets join the streaming preview, so a failed or stopped reply takes them off the page again
    if (assets) previewGeneratedConfig(base);
    const next = [...messages, { role: "user" as const, content }];
    baseRef.current = base;
    setMessages(next);
    setInput("");
    setFailure(null);
    const request: DesignRequest = {
      messages: next.slice(-CHAT_HISTORY_MAX),
      design: toGeneratedDesign(base),
      hasBackgroundImage: base.background.image !== null,
      brand,
    };
    submit(request);
    return true;
  }

  // A stopped reply leaves nothing half-applied, so the page goes back to how it was
  function cancel() {
    stop();
    baseRef.current = null;
    finishGeneration(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    send({ text: input });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Sparkles className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Design assistant</h2>
      </div>
      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto p-4"
      >
        {messages.length === 0 && (
          <div className="@container grid gap-3">
            <p className="text-sm text-muted-foreground">
              Describe your event and I&apos;ll design the page. Then ask for
              changes.
            </p>
            <ul
              aria-label="Ways to start"
              className="grid gap-2 @sm:grid-cols-2"
            >
              <WebsiteAssetCard disabled={isLoading} onStart={send} />
              <UploadAssetCard disabled={isLoading} onStart={send} />
              {examplePrompts.map(({ title, prompt }) => (
                <PromptCard
                  key={title}
                  title={title}
                  description={prompt}
                  disabled={isLoading}
                  onClick={() => send({ text: prompt })}
                />
              ))}
            </ul>
          </div>
        )}
        {messages.map((message, index) => (
          <p
            key={index}
            className={
              message.role === "user"
                ? "ml-6 justify-self-end rounded-md bg-primary px-3 py-2 text-sm whitespace-pre-wrap text-primary-foreground"
                : "mr-6 justify-self-start rounded-md bg-muted px-3 py-2 text-sm whitespace-pre-wrap text-muted-foreground"
            }
          >
            {message.content}
          </p>
        ))}
        {isLoading && (
          <p className="mr-6 flex items-center gap-2 justify-self-start rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 shrink-0 animate-spin" />
            {object?.reply || "Designing…"}
          </p>
        )}
        {failure && (
          <p role="alert" className="text-sm text-destructive">
            {failure}
          </p>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={handleSubmit} className="grid gap-2 border-t p-4">
        <Textarea
          aria-label="Message the design assistant"
          placeholder="Describe your event or ask for a change"
          value={input}
          maxLength={CHAT_MESSAGE_MAX}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends and Shift+Enter starts a new line, as in most chat inputs
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send({ text: input });
            }
          }}
          className="max-h-40"
        />
        {isLoading ? (
          <Button type="button" variant="outline" onClick={cancel}>
            <Square />
            Stop
          </Button>
        ) : (
          <Button type="submit" disabled={!input.trim()}>
            <SendHorizontal />
            Send
          </Button>
        )}
      </form>
    </div>
  );
}
