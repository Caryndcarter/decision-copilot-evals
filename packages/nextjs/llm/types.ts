/**
 * LLM Provider Types
 *
 * IMPORTANT: These modules are server-only.
 * Do not import from client/UI code.
 */

export type LLMProvider = "openai" | "anthropic" | "gemini";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** URLs surfaced by provider web search / grounding (for UI or logging). */
export interface WebSearchSource {
  title?: string;
  uri: string;
}

export interface LLMRequestOptions {
  /** Model identifier (provider-specific) */
  model?: string;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Temperature for response randomness (0-1) */
  temperature?: number;
  /** Optional JSON schema for structured output */
  schema?: Record<string, unknown>;
  /**
   * When true, use the provider’s web search / grounding if available (extra billing).
   * Ignored when `schema` is set (structured output path).
   */
  enableWebSearch?: boolean;
  /**
   * When true and `schema` is not set, bias the provider toward returning a single JSON object
   * (OpenAI `json_object`, Gemini JSON MIME type). Prompt must still ask for JSON.
   */
  preferJsonObject?: boolean;
}

export interface LLMResponse {
  content: string;
  /** Parsed JSON if schema was provided and response is valid JSON */
  parsed?: unknown;
  /** Token usage stats */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Provider-specific metadata */
  meta?: {
    model: string;
    provider: LLMProvider;
    finishReason?: string;
  };
  /** Populated when web search / grounding ran */
  webSearch?: {
    queries?: string[];
    sources?: WebSearchSource[];
  };
}

export interface LLMError {
  code: string;
  message: string;
  provider: LLMProvider;
  retryable: boolean;
}

/**
 * Common interface for LLM providers
 */
export interface LLMClient {
  run(prompt: string | LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse>;
}
