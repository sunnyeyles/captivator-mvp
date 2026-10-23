import type { LanguageModel } from "ai";

// Cheapest capable gateway model by default, swappable through AI_MODEL without a code change
const DEFAULT_MODEL = "google/gemini-3.1-flash-lite";

/** The gateway model the design agent runs on. */
export function designAgentModel(): LanguageModel {
  return process.env.AI_MODEL ?? DEFAULT_MODEL;
}
