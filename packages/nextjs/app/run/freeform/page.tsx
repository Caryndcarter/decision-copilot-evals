"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppNavBrand } from "@/app/components/app-nav-brand";
import { SessionNav } from "@/app/components/session-nav";
import type { FreeformResult } from "@/lenses/freeform";
import type { DecisionRunResult, LLMProviderName, Posture } from "@/types/decision";
import { postureRequiresLeaning } from "@/types/decision";
import { ChatMessageCopyActions } from "@/app/components/chat-copy-button";
import { CollapsibleBlock } from "../collapsible-block";
import { runHeadline, runPostureLabel, runProviderLabel } from "@/lib/run-display-name";
import {
  appendAssistantStreamDelta,
  consumeChatStream,
  ensureAssistantStreamPlaceholder,
} from "@/lib/consume-chat-stream";

const STORAGE_KEY = "freeformResult";
const CHAT_STORAGE_PREFIX = "freeformChat_";

type PageFreeformData = FreeformResult & {
  run_id?: string;
  decision_id?: string;
  llm_provider?: LLMProviderName;
  decision_title?: string;
};

/**
 * Pick the first plausible title-ish string out of the freeform model's free-form JSON.
 * The freeform schema is intentionally unconstrained, so we scan for common shapes the
 * models produce: top-level `title` / `headline` / `name` / `decision_title`, then nested
 * one level deep under `summary` or `decision`. Empty/whitespace-only strings are skipped.
 */
function freeformOutputTitle(output: Record<string, unknown> | null | undefined): string | null {
  if (!output) return null;
  const keys = ["title", "headline", "name", "decision_title", "decision"];
  for (const k of keys) {
    const v = output[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const containerKey of ["summary", "decision", "context", "overview"]) {
    const c = output[containerKey];
    if (c && typeof c === "object" && !Array.isArray(c)) {
      for (const k of keys) {
        const v = (c as Record<string, unknown>)[k];
        if (typeof v === "string" && v.trim()) return v.trim();
      }
    }
  }
  return null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const POSTURES: { value: Posture; label: string }[] = [
  { value: "explore", label: "Explore" },
  { value: "pressure_test", label: "Pressure test" },
  { value: "surface_risks", label: "Surface risks" },
  { value: "generate_alternatives", label: "Generate alternatives" },
  { value: "show_opposition", label: "Show opposition" },
];

const RERUN_PROVIDER_OPTIONS: { value: LLMProviderName | "all"; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
  { value: "xai", label: "xAI" },
  { value: "all", label: "Full think tank (parallel)" },
];

// ── Generic analysis renderer ─────────────────────────────────────────────────

function formatKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ValueRenderer({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    return <p className="text-sm text-zinc-700 leading-relaxed">{value}</p>;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <p className="text-sm font-medium text-zinc-800">{String(value)}</p>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;

    if (value.every((item) => typeof item === "string")) {
      return (
        <ul className="space-y-1.5">
          {(value as string[]).map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-zinc-700 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
              {item}
            </li>
          ))}
        </ul>
      );
    }

    if (value.every((item) => typeof item === "object" && item !== null && !Array.isArray(item))) {
      return (
        <div className="space-y-2">
          {(value as Record<string, unknown>[]).map((item, i) => (
            <div key={i} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-1">
              {Object.entries(item).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-sm">
                  <span className="shrink-0 font-medium text-zinc-500">{formatKey(k)}:</span>
                  <span className="text-zinc-800">
                    {typeof v === "string" ? v : Array.isArray(v) ? v.join(", ") : JSON.stringify(v)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {value.map((item, i) => (
          <ValueRenderer key={i} value={item} depth={depth} />
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    return (
      <div className="space-y-4 pl-4 border-l-2 border-zinc-100 mt-2">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <SectionRenderer key={k} sectionKey={k} value={v} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return null;
}

function SectionRenderer({ sectionKey, value, depth = 0 }: { sectionKey: string; value: unknown; depth?: number }) {
  const label = formatKey(sectionKey);
  if (depth === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900 mb-3">{label}</h2>
        <ValueRenderer value={value} depth={0} />
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-700 mb-2">{label}</h3>
      <ValueRenderer value={value} depth={depth} />
    </div>
  );
}

// ── Chat panel ────────────────────────────────────────────────────────────────

function ChatPanel({
  result,
  persistedRunId,
  chatTitle,
  legacyLlmProvider,
}: {
  result: FreeformResult;
  persistedRunId: string | null;
  chatTitle: string;
  legacyLlmProvider?: LLMProviderName;
}) {
  const chatKey = CHAT_STORAGE_PREFIX + (persistedRunId ?? result.generated_at);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = sessionStorage.getItem(chatKey);
      const parsed = raw ? (JSON.parse(raw) as ChatMessage[]) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(chatKey, JSON.stringify(messages));
    } catch {}
  }, [chatKey, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    const userMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(ensureAssistantStreamPlaceholder(next));
    setLoading(true);

    try {
      const body = persistedRunId
        ? { run_id: persistedRunId, messages, newMessage: text }
        : {
            messages,
            newMessage: text,
            output: result.output,
            intake: result.intake,
            ...(legacyLlmProvider ? { llm_provider: legacyLlmProvider } : {}),
          };

      const res = await fetch("/api/decision/run/freeform/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(body),
      });

      let streamFailed = false;
      await consumeChatStream(res, {
        onDelta: (delta) => {
          setMessages((prev) => appendAssistantStreamDelta(prev, delta));
        },
        onDone: (data) => {
          const content = typeof data.content === "string" ? data.content.trim() : "";
          if (!content) {
            streamFailed = true;
            setError("The assistant returned an empty response — please try again.");
            setMessages(next);
            return;
          }
          setMessages((prev) => {
            const withoutTail = prev[prev.length - 1]?.role === "assistant" ? prev.slice(0, -1) : prev;
            return [...withoutTail, { role: "assistant", content }];
          });
        },
        onError: (message) => {
          streamFailed = true;
          console.error("[freeform/chat]", message);
          setError(message);
          setMessages(next);
        },
      });
      if (streamFailed) return;
    } catch (err) {
      console.error("[freeform/chat] fetch error", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages(next);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100">
        <p className="text-sm font-semibold text-zinc-900">{chatTitle}</p>
        <p className="text-xs text-zinc-400 mt-0.5">Uses the same provider as this run · Ask about this analysis</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-400 text-center pt-8">Ask a question about this analysis.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-indigo-600 px-3.5 py-2.5 text-sm text-white"
                  : "max-w-[85%] rounded-2xl rounded-tl-sm bg-zinc-100 px-3.5 py-2.5 text-sm text-zinc-800"
              }
            >
              {m.role === "assistant" && m.content.trim() ? (
                <>
                  <ChatMessageCopyActions text={m.content} className="mb-1" />
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}
        {loading &&
          (messages.length === 0 ||
            messages[messages.length - 1]?.role !== "assistant" ||
            !messages[messages.length - 1]?.content) && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm bg-zinc-100 px-3.5 py-2.5">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-zinc-100 px-3 py-3">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this analysis…"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || loading}
            className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inner page (needs useSearchParams) ───────────────────────────────────────

function FreeformContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runIdFromUrl = searchParams.get("run_id");

  const [data, setData] = useState<PageFreeformData | null>(null);
  const [missing, setMissing] = useState(false);
  const [siblingRuns, setSiblingRuns] = useState<
    { run_id: string; llm_provider?: LLMProviderName; intake: { posture: Posture } }[]
  >([]);

  const [rerunPosture, setRerunPosture] = useState<Posture>("explore");
  const [rerunLeaning, setRerunLeaning] = useState("");
  const [rerunProvider, setRerunProvider] = useState<LLMProviderName | "all">("anthropic");
  const [rerunBusy, setRerunBusy] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);
  const rerunInitKey = useRef<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (runIdFromUrl) {
      fetch(`/api/decision/run?run_id=${encodeURIComponent(runIdFromUrl)}`)
        .then((r) => r.json())
        .then(
          (row: {
            freeform_output?: Record<string, unknown>;
            intake?: PageFreeformData["intake"];
            error?: string;
            decision_id?: string;
            freeform_model?: string;
            freeform_generated_at?: string;
            llm_provider?: LLMProviderName;
            decision_title?: string;
          }) => {
            if (row.error || !row.freeform_output || !row.intake) {
              setMissing(true);
              return;
            }
            setData({
              output: row.freeform_output,
              intake: row.intake,
              model: row.freeform_model ?? row.llm_provider ?? "unknown",
              generated_at: row.freeform_generated_at ?? new Date().toISOString(),
              run_id: runIdFromUrl,
              decision_id: row.decision_id,
              llm_provider: row.llm_provider,
              decision_title: row.decision_title,
            });
          }
        )
        .catch(() => setMissing(true));
      return;
    }

    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setMissing(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as PageFreeformData;
      if (!parsed.output || !parsed.intake) {
        setMissing(true);
        return;
      }
      setData({
        output: parsed.output,
        intake: parsed.intake,
        model: parsed.model ?? "unknown",
        generated_at: parsed.generated_at ?? new Date().toISOString(),
        run_id: parsed.run_id,
        decision_id: parsed.decision_id,
        llm_provider: parsed.llm_provider,
        decision_title: parsed.decision_title,
      });
    } catch {
      setMissing(true);
    }
  }, [runIdFromUrl]);

  useEffect(() => {
    const decisionId = data?.decision_id;
    if (!decisionId) {
      setSiblingRuns([]);
      return;
    }
    fetch(`/api/decision/run?decision_id=${encodeURIComponent(decisionId)}`)
      .then((r) => r.json())
      .then((res: { runs?: DecisionRunResult[] }) => {
        const runs = Array.isArray(res.runs) ? res.runs : [];
        setSiblingRuns(
          runs
            .filter((r) => r.freeform_output)
            .map((r) => ({
              run_id: r.run_id,
              llm_provider: r.llm_provider,
              intake: r.intake,
            }))
        );
      })
      .catch(() => setSiblingRuns([]));
  }, [data?.decision_id]);

  useEffect(() => {
    if (!data) return;
    const k = `${data.run_id ?? ""}-${data.decision_id ?? ""}-${data.generated_at}`;
    if (rerunInitKey.current === k) return;
    rerunInitKey.current = k;
    setRerunPosture(data.intake.posture);
    setRerunLeaning(data.intake.leaning_direction ?? "");
    setRerunProvider(data.llm_provider ?? "anthropic");
  }, [data]);

  async function handleRerunFreeform() {
    if (!data?.run_id) return;
    if (postureRequiresLeaning(rerunPosture) && !rerunLeaning.trim()) {
      setRerunError("Leaning toward is required for pressure test.");
      return;
    }
    setRerunError(null);
    setRerunBusy(true);
    try {
      const res = await fetch("/api/decision/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "rerun_freeform",
          run_id: data.run_id,
          posture: rerunPosture,
          ...(postureRequiresLeaning(rerunPosture) && { leaning_direction: rerunLeaning.trim() }),
          llm_provider: rerunProvider,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        runs?: DecisionRunResult[];
        primary_run_id?: string;
        decision_id?: string;
        run_id?: string;
      };
      if (!res.ok) {
        setRerunError(json.error ?? `Request failed (${res.status})`);
        return;
      }
      if (json.runs?.length && json.primary_run_id && json.decision_id) {
        router.push(`/runs?new=${json.decision_id}`);
        return;
      }
      if (json.run_id) {
        router.replace(`/run/freeform?run_id=${encodeURIComponent(json.run_id)}`);
        return;
      }
      setRerunError("Unexpected server response.");
    } catch (e) {
      setRerunError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setRerunBusy(false);
    }
  }

  if (missing) {
    return (
      <main className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-600">No result found.</p>
          <Link href="/runs" className="mt-3 inline-block text-sm text-indigo-600 hover:underline">
            ← My Decisions
          </Link>
        </div>
      </main>
    );
  }

  // Match the title shown on My Decisions: prefer the persisted decision_title (which the
  // freeform creation flow generates via runFreeformCardTitle), then probe the model's own
  // freeform JSON for a title-ish field (legacy runs that pre-date decision_title still get
  // something readable), and only as a last resort fall through to runHeadline (intake
  // situation, word-boundary truncated). Never a raw "We're a B2B…" mid-word slice.
  const headline = (() => {
    if (!data) return null;
    const stored = data.decision_title?.trim();
    if (stored) return stored;
    const fromOutput = freeformOutputTitle(data.output);
    if (fromOutput) return fromOutput;
    // runHeadline only reads demo_scenario_id, decision_brief, decision_title, intake.situation —
    // PageFreeformData is a strict subset of DecisionRunResult for those fields, so this cast is safe.
    return runHeadline(data as unknown as DecisionRunResult);
  })();

  const persistedRunId = runIdFromUrl ?? data?.run_id ?? null;
  const legacyChatProvider = persistedRunId ? undefined : data?.llm_provider;

  return (
    <main className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between gap-4">
          <AppNavBrand />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/intake"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              New decision
            </Link>
            <SessionNav />
          </div>
        </div>
      </nav>

      <header className="border-b border-zinc-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          {data ? (
            <div>
              <h1 className="text-base font-semibold text-zinc-900 leading-tight">{headline}</h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Free-form · {runPostureLabel(data.intake.posture)} · {runProviderLabel(data.llm_provider)} ·{" "}
                {data.model}
              </p>
            </div>
          ) : (
            <div className="h-8 w-48 animate-pulse rounded bg-zinc-100" />
          )}
        </div>
      </header>

      {!data ? (
        <div className="mx-auto max-w-2xl px-6 py-12">
          <p className="text-zinc-500 text-sm">Loading…</p>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
          {data.run_id && (
            <CollapsibleBlock
              id="freeform-rerun"
              title="Re-run freeform analysis"
              subtitle="Same decision — pick another posture and/or provider. Each model still chooses its own JSON shape."
              defaultOpen={false}
              className="border-violet-200 bg-violet-50/50 shadow-sm"
              bodyClassName="space-y-4 px-4 py-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="freeform-rerun-posture" className="block text-xs font-medium text-zinc-600">
                    Posture
                  </label>
                  <select
                    id="freeform-rerun-posture"
                    value={rerunPosture}
                    onChange={(e) => setRerunPosture(e.target.value as Posture)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                  >
                    {POSTURES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="freeform-rerun-provider" className="block text-xs font-medium text-zinc-600">
                    AI provider
                  </label>
                  <select
                    id="freeform-rerun-provider"
                    value={rerunProvider}
                    onChange={(e) => setRerunProvider(e.target.value as LLMProviderName | "all")}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                  >
                    {RERUN_PROVIDER_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {postureRequiresLeaning(rerunPosture) && (
                <div>
                  <label htmlFor="freeform-rerun-leaning" className="block text-xs font-medium text-zinc-600">
                    Leaning toward
                  </label>
                  <input
                    id="freeform-rerun-leaning"
                    type="text"
                    value={rerunLeaning}
                    onChange={(e) => setRerunLeaning(e.target.value)}
                    placeholder="What option are you leaning toward?"
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                  />
                </div>
              )}
              {rerunError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {rerunError}
                </div>
              )}
              <button
                type="button"
                onClick={() => void handleRerunFreeform()}
                disabled={rerunBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {rerunBusy && (
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    aria-hidden
                  />
                )}
                {rerunBusy ? "Running…" : "Run freeform again"}
              </button>
              <p className="text-xs text-zinc-500">
                Creates a new saved run for this decision. Choosing &quot;Full think tank&quot; adds one run
                per configured model (like on intake) and returns you to My Decisions.
              </p>
            </CollapsibleBlock>
          )}

          <CollapsibleBlock
            id="freeform-context"
            title="Your decision inputs"
            subtitle="Same fields as intake — edit context by re-running with updated intake from New decision, or adjust posture above."
            defaultOpen
            className="border-zinc-200 bg-white shadow-sm"
            bodyClassName="space-y-3 px-4 py-4 text-sm text-zinc-700"
          >
            <p>
              <span className="font-medium text-zinc-500">Situation · </span>
              {data.intake.situation}
            </p>
            <p>
              <span className="font-medium text-zinc-500">Constraints · </span>
              {data.intake.constraints}
            </p>
            {data.intake.knowns_assumptions ? (
              <p>
                <span className="font-medium text-zinc-500">Known / assuming · </span>
                {data.intake.knowns_assumptions}
              </p>
            ) : null}
            {data.intake.unknowns ? (
              <p>
                <span className="font-medium text-zinc-500">Unknowns · </span>
                {data.intake.unknowns}
              </p>
            ) : null}
            {postureRequiresLeaning(data.intake.posture) && data.intake.leaning_direction ? (
              <p>
                <span className="font-medium text-zinc-500">Leaning toward · </span>
                {data.intake.leaning_direction}
              </p>
            ) : null}
          </CollapsibleBlock>

          {siblingRuns.length > 1 && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-xs font-medium text-zinc-500 mb-2">Other freeform runs for this decision</p>
              <div className="flex flex-wrap gap-2">
                {siblingRuns.map((r) => (
                  <Link
                    key={r.run_id}
                    href={`/run/freeform?run_id=${encodeURIComponent(r.run_id)}`}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      r.run_id === data.run_id
                        ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                    }`}
                  >
                    {runProviderLabel(r.llm_provider)} · {runPostureLabel(r.intake.posture)}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
            <div className="space-y-4">
              <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                The model chose its own schema for this analysis — sections and field names are generated by{" "}
                {runProviderLabel(data.llm_provider)}, not fixed by the app.
              </div>

              {Object.entries(data.output).map(([key, value]) => (
                <SectionRenderer key={key} sectionKey={key} value={value} depth={0} />
              ))}

              <details className="rounded-xl border border-zinc-200 bg-white shadow-sm">
                <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-zinc-500 hover:text-zinc-700">
                  Raw JSON output
                </summary>
                <pre className="px-5 pb-5 text-xs text-zinc-600 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(data.output, null, 2)}
                </pre>
              </details>
            </div>

            <div className="lg:sticky lg:top-[105px] h-[calc(100vh-130px)]">
              <ChatPanel
                result={data}
                persistedRunId={persistedRunId}
                chatTitle={`Chat · ${runProviderLabel(data.llm_provider)}`}
                legacyLlmProvider={legacyChatProvider}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function FreeformResultPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-50">
          <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
            <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between gap-4">
              <AppNavBrand />
            </div>
          </nav>
          <div className="mx-auto max-w-2xl px-6 py-12">
            <p className="text-zinc-500 text-sm">Loading…</p>
          </div>
        </main>
      }
    >
      <FreeformContent />
    </Suspense>
  );
}
