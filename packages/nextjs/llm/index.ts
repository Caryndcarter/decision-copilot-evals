/**
 * LLM Provider Module
 *
 * SERVER-ONLY: Do not import from client/UI code.
 * The `server-only` import will throw a build error if used in client code.
 *
 * Usage:
 *   import { openai, anthropic, gemini } from "@/llm";
 *   const response = await openai.run("Hello, world!");
 *   const structured = await anthropic.run("Analyze this", { schema: mySchema });
 */

import "server-only";
import type { LLMClient, LLMProvider } from "./types";
import { openai } from "./openai";
import { anthropic } from "./anthropic";
import { gemini } from "./gemini";

export * from "./types";
export { openai, run as runOpenAI } from "./openai";
export { anthropic, run as runAnthropic } from "./anthropic";
export { gemini, run as runGemini } from "./gemini";

const clients: Record<LLMProvider, LLMClient> = { openai, anthropic, gemini };

/** Return the LLM client for the given provider (use for lenses, brief, chat). */
export function getClient(provider: LLMProvider): LLMClient {
  return clients[provider];
}
