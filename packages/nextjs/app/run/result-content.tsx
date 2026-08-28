"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import type {
  DecisionRunResult,
  LensOutput,
  StakeholdersLensOutput,
  BlindSpot,
  Tradeoff,
  StakeholderImpact,
  DecisionBrief,
} from "@/types/decision";
import { normalizeRunLensFields } from "@/lib/normalize-lens";
import {
  LensBoxEditor,
  ClarificationAnswerEditor,
  type LensBoxEditorHandle,
  type ClarificationAnswerEditorHandle,
} from "./tiptap-dynamic";
import { CollapsibleBlock } from "./collapsible-block";
import { ResearchMarkdown, ResearchMarkdownInline } from "./research-markdown";
import { runHeadline } from "@/lib/run-display-name";
import { formatBriefDate } from "@/lib/format-brief-date";
import { BriefGeneratedDateLine } from "@/app/components/brief-generated-date";

function Section({
  title,
  children,
  className = "",
  updated,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  /** When true, show an "Updated" badge (analysis changed after clarification) */
  updated?: boolean;
}) {
  return (
    <section className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-zinc-500">
          <span className="h-3 w-0.5 rounded-full bg-indigo-500 shrink-0" aria-hidden />
          {title}
        </h2>
        {updated && (
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
            Updated
          </span>
        )}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

const POSTURE_LABELS: Record<string, string> = {
  explore: "Explore",
  pressure_test: "Pressure test",
  surface_risks: "Surface risks",
  generate_alternatives: "Generate alternatives",
  show_opposition: "Show opposition",
};

function postureLabel(posture: string): string {
  return POSTURE_LABELS[posture] ?? posture.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function EditableList({
  items,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-800"
            placeholder="Item"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="text-zinc-400 hover:text-red-600"
            aria-label="Remove"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="text-sm text-indigo-600 hover:text-indigo-700"
      >
        + Add item
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
          Cancel
        </button>
      </div>
    </div>
  );
}

const SENTIMENT_OPTIONS: StakeholderImpact["sentiment"][] = ["positive", "negative", "neutral"];

function EditableBlindSpots({
  items,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
}: {
  items: BlindSpot[];
  onChange: (items: BlindSpot[]) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 rounded border border-zinc-200 bg-white p-2">
          <input
            type="text"
            value={item.area}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], area: e.target.value };
              onChange(next);
            }}
            placeholder="Area"
            className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <input
            type="text"
            value={item.description}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], description: e.target.value };
              onChange(next);
            }}
            placeholder="Description"
            className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-zinc-400 hover:text-red-600" aria-label="Remove">
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { area: "", description: "" }])} className="text-sm text-indigo-600 hover:text-indigo-700">
        + Add blind spot
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onSave} disabled={saving} className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">Cancel</button>
      </div>
    </div>
  );
}

function EditableTradeoffs({
  items,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
}: {
  items: Tradeoff[];
  onChange: (items: Tradeoff[]) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded border border-zinc-200 bg-white p-2">
          <input
            type="text"
            value={item.option}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], option: e.target.value };
              onChange(next);
            }}
            placeholder="Option"
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <input
            type="text"
            value={item.upside}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], upside: e.target.value };
              onChange(next);
            }}
            placeholder="Upside"
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <input
            type="text"
            value={item.downside}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], downside: e.target.value };
              onChange(next);
            }}
            placeholder="Downside"
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-zinc-400 hover:text-red-600" aria-label="Remove">
            × Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { option: "", upside: "", downside: "" }])} className="text-sm text-indigo-600 hover:text-indigo-700">
        + Add tradeoff
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onSave} disabled={saving} className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">Cancel</button>
      </div>
    </div>
  );
}

function EditableStakeholderImpacts({
  items,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
}: {
  items: StakeholderImpact[];
  onChange: (items: StakeholderImpact[]) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded border border-zinc-200 bg-white p-2">
          <input
            type="text"
            value={item.stakeholder}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], stakeholder: e.target.value };
              onChange(next);
            }}
            placeholder="Stakeholder"
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <select
            value={item.sentiment}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], sentiment: e.target.value as StakeholderImpact["sentiment"] };
              onChange(next);
            }}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            {SENTIMENT_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            type="text"
            value={item.impact}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], impact: e.target.value };
              onChange(next);
            }}
            placeholder="Impact"
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-zinc-400 hover:text-red-600" aria-label="Remove">
            × Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { stakeholder: "", impact: "", sentiment: "neutral" }])} className="text-sm text-indigo-600 hover:text-indigo-700">
        + Add stakeholder impact
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onSave} disabled={saving} className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">Cancel</button>
      </div>
    </div>
  );
}

/** Section key for edit state, e.g. "risk.top_risks" */
function sectionKey(lens: string, field: string) {
  return `${lens}.${field}`;
}

/** Compare first-draft vs current to see which sections changed after clarification */
function getAnalysisChanges(result: DecisionRunResult): {
  risk: boolean;
  reversibility: boolean;
  stakeholders: boolean;
  brief: boolean;
  hasAny: boolean;
} {
  const first = result.lens_outputs_first_draft;
  const current = result.lens_outputs;
  const briefFirst = result.decision_brief_first_draft;
  const briefCurrent = result.decision_brief;
  const noFirstDraft = !first?.length;
  const noClarifications = !result.clarifications?.length;
  if (noFirstDraft || noClarifications) {
    return { risk: false, reversibility: false, stakeholders: false, brief: false, hasAny: false };
  }
  const riskFirst = first.find((o) => o.lens === "risk");
  const riskCurrent = current?.find((o) => o.lens === "risk");
  const revFirst = first.find((o) => o.lens === "reversibility");
  const revCurrent = current?.find((o) => o.lens === "reversibility");
  const stakeholdersFirst = first.find((o) => o.lens === "stakeholders");
  const stakeholdersCurrent = current?.find((o) => o.lens === "stakeholders");
  const risk =
    !!riskFirst &&
    !!riskCurrent &&
    JSON.stringify(riskFirst) !== JSON.stringify(riskCurrent);
  const reversibility =
    !!revFirst &&
    !!revCurrent &&
    JSON.stringify(revFirst) !== JSON.stringify(revCurrent);
  const stakeholders =
    !!stakeholdersFirst &&
    !!stakeholdersCurrent &&
    JSON.stringify(stakeholdersFirst) !== JSON.stringify(stakeholdersCurrent);
  const brief =
    !!briefFirst &&
    !!briefCurrent &&
    (briefFirst.summary !== briefCurrent.summary ||
      briefFirst.recommendation !== briefCurrent.recommendation ||
      JSON.stringify(briefFirst.key_considerations ?? []) !== JSON.stringify(briefCurrent.key_considerations ?? []) ||
      JSON.stringify(briefFirst.next_steps ?? []) !== JSON.stringify(briefCurrent.next_steps ?? []));
  const hasAny = risk || reversibility || stakeholders || brief;
  return { risk, reversibility, stakeholders, brief, hasAny };
}

/** Build new lens_outputs with one list field updated (string[] or object[]) */
function withUpdatedList(
  lensOutputs: LensOutput[],
  lensName: "risk" | "reversibility" | "stakeholders",
  field: string,
  value: string[]
): LensOutput[] {
  return lensOutputs.map((out) => {
    if (out.lens !== lensName) return out;
    return { ...out, [field]: value } as LensOutput;
  });
}

function withUpdatedField(
  lensOutputs: LensOutput[],
  lensName: "risk" | "reversibility" | "stakeholders",
  field: string,
  value: BlindSpot[] | Tradeoff[] | StakeholderImpact[]
): LensOutput[] {
  return lensOutputs.map((out) => {
    if (out.lens !== lensName) return out;
    return { ...out, [field]: value } as LensOutput;
  });
}

export interface ResultContentProps {
  result: DecisionRunResult;
  className?: string;
  /** When provided, lens sections show Edit and can be updated (saved to DB) */
  onRunUpdate?: (updated: DecisionRunResult) => void;
  /** When editing a variant, pass its ID so edits are saved to the variant */
  variantId?: string;
  /** Called when brief draft changes (so parent can pass to chat for LLM context) */
  onBriefChange?: (brief: DecisionBrief) => void;
  /** Called when the user clicks Expand all / Collapse all so siblings can sync */
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  /** Opens and scrolls to the research output panel. */
  onJumpToResearch?: () => void;
  /** Opens and scrolls to the cross-provider synthesis section. */
  onJumpToSynthesis?: () => void;
}

export interface ResultContentHandle {
  /** Return the current brief with latest edits from all editors (for chat context at send time) */
  getCurrentBrief(): DecisionBrief | null;
}

export const ResultContent = forwardRef<ResultContentHandle, ResultContentProps>(function ResultContent(
  {
    result: resultRaw,
    className = "",
    onRunUpdate,
    variantId,
    onBriefChange,
    onExpandAll,
    onCollapseAll,
    onJumpToResearch,
    onJumpToSynthesis,
  },
  ref
) {
  const result = useMemo(() => normalizeRunLensFields(resultRaw), [resultRaw]);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [draftBlindSpots, setDraftBlindSpots] = useState<BlindSpot[]>([]);
  const [draftTradeoffs, setDraftTradeoffs] = useState<Tradeoff[]>([]);
  const [draftStakeholderImpacts, setDraftStakeholderImpacts] = useState<StakeholderImpact[]>([]);
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    riskAnalysis: false,
    reversibility: false,
    stakeholders: false,
    brief: false,
    variantAdditions: false,
  });
  const toggleSection = (key: string, val: boolean) =>
    setOpenSections((prev) => ({ ...prev, [key]: val }));
  const expandAll = () => { setOpenSections((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, true]))); onExpandAll?.(); };
  const collapseAll = () => { setOpenSections((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, false]))); onCollapseAll?.(); };

  const lastOpenedVariantIdRef = useRef<string | null>(null);
  // When the user selects a different saved variant, open brief + variant-additions for scroll targets.
  useEffect(() => {
    if (!variantId) {
      lastOpenedVariantIdRef.current = null;
      return;
    }
    if (lastOpenedVariantIdRef.current === variantId) return;
    lastOpenedVariantIdRef.current = variantId;
    const hasCustom = (result.decision_brief?.custom_sections?.length ?? 0) > 0;
    setOpenSections((prev) => ({
      ...prev,
      brief: true,
      ...(hasCustom ? { variantAdditions: true } : {}),
    }));
  }, [variantId, result.decision_brief]);

  useEffect(() => {
    if (variantId) setBriefTab("standard");
  }, [variantId]);

  /** Open the matching collapsible and scroll when the URL hash targets an analysis block (e.g. synthesis deep links). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    type CollapsibleKey = "riskAnalysis" | "reversibility" | "stakeholders" | "brief" | "variantAdditions";
    const HASH_TO_SECTION: Record<string, CollapsibleKey | "__scroll_only"> = {
      "rc-risk": "riskAnalysis",
      "rc-reversibility": "reversibility",
      "rc-stakeholders": "stakeholders",
      "rc-people": "stakeholders", // legacy fragment
      "rc-brief": "brief",
      "rc-variant-sections": "variantAdditions",
      "rc-context": "__scroll_only",
      "rc-after-clarification": "__scroll_only",
      "rc-decision-brief-title": "__scroll_only",
    };
    const applyHash = () => {
      const raw = window.location.hash.replace(/^#/, "");
      if (!raw) return;
      const id = decodeURIComponent(raw);
      const section = HASH_TO_SECTION[id];
      if (section && section !== "__scroll_only") {
        setOpenSections((prev) => ({ ...prev, [section]: true }));
      }
      if (section !== undefined || document.getElementById(id)) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 120);
        });
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [result.run_id, variantId]);

  const [editError, setEditError] = useState<string | null>(null);
  const [briefSaving, setBriefSaving] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  /** Standard brief vs integrated brief (research + all variants) */
  const [briefTab, setBriefTab] = useState<"standard" | "comprehensive">("standard");
  const [comprehensiveGenerating, setComprehensiveGenerating] = useState(false);
  const [comprehensiveError, setComprehensiveError] = useState<string | null>(null);
  const [briefDraft, setBriefDraft] = useState<DecisionBrief | null>(null);
  const briefDraftRef = useRef<DecisionBrief | null>(null);
  briefDraftRef.current = briefDraft;
  const keyConsiderationsRef = useRef<LensBoxEditorHandle>(null);
  const nextStepsRef = useRef<LensBoxEditorHandle>(null);
  const titleRef = useRef<ClarificationAnswerEditorHandle>(null);
  const summaryRef = useRef<ClarificationAnswerEditorHandle>(null);
  const recommendationBodyRef = useRef<ClarificationAnswerEditorHandle>(null);

  /** `?debugFocus=1` — on-page HUD so you need not focus DevTools (which forces activeElement to <body>). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("debugFocus")) return;
    const hud = document.createElement("div");
    hud.setAttribute("role", "status");
    hud.style.cssText =
      "position:fixed;bottom:10px;right:10px;z-index:2147483647;max-width:min(440px,92vw);background:#0f172a;color:#f8fafc;padding:10px 12px;font:11px/1.35 ui-monospace,monospace;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.35);pointer-events:none;white-space:pre-wrap;word-break:break-word;";
    document.body.appendChild(hud);
    const fmt = (el: EventTarget | null) => {
      if (!el || !(el instanceof Element)) return String(el);
      const tag = el.tagName;
      const id = el.id ? `#${el.id}` : "";
      const cls =
        el.className && typeof el.className === "string"
          ? `.${el.className.toString().split(/\s+/).filter(Boolean).slice(0, 4).join(".")}`
          : "";
      const ce = (el as HTMLElement).getAttribute?.("contenteditable");
      return `${tag}${id}${cls}${ce != null ? ` contenteditable=${JSON.stringify(ce)}` : ""}`;
    };
    const log = (e: PointerEvent) => {
      queueMicrotask(() => {
        hud.textContent = [
          `pointer: ${fmt(e.target)}`,
          `active:  ${fmt(document.activeElement)}`,
          "",
          "Tip: DevTools/Console focus often shows active=<body>. This HUD updates without focusing DevTools.",
        ].join("\n");
      });
    };
    document.addEventListener("pointerdown", log, true);
    return () => {
      document.removeEventListener("pointerdown", log, true);
      hud.remove();
    };
  }, []);

  const analysisChanges = getAnalysisChanges(result);

  const riskLens = result.lens_outputs?.find((o) => o.lens === "risk") as
    | (LensOutput & { top_risks?: string[] })
    | undefined;
  const reversibilityLens = result.lens_outputs?.find((o) => o.lens === "reversibility") as
    | (LensOutput & { irreversible_steps?: string[]; safe_to_try_first?: string[] })
    | undefined;
  const stakeholdersLens = result.lens_outputs?.find((o) => o.lens === "stakeholders") as StakeholdersLensOutput | undefined;
  const hasCollapsibleLensOrBrief = Boolean(
    riskLens || reversibilityLens || stakeholdersLens || result.decision_brief,
  );
  const showAnalysisSectionBar = hasCollapsibleLensOrBrief || Boolean(onJumpToResearch) || Boolean(onJumpToSynthesis);
  const statusLabel =
    result.status === "awaiting_clarification"
      ? "Awaiting clarification"
      : result.status === "complete"
        ? "Complete"
        : result.status === "pending_brief"
          ? "Lenses complete (brief pending)"
          : result.status;

  async function saveLensUpdate(nextLensOutputs: LensOutput[]) {
    if (!onRunUpdate) return;
    setEditError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/decision/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "update_lens_outputs", run_id: result.run_id, lens_outputs: nextLensOutputs }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Failed to save");
        return;
      }
      onRunUpdate(data as DecisionRunResult);
      setEditingSection(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function saveLensListUpdate(
    lensName: "risk" | "reversibility" | "stakeholders",
    field: string,
    items: string[]
  ) {
    await saveLensUpdate(withUpdatedList(result.lens_outputs, lensName, field, items));
  }

  function cancelEditing() {
    setEditingSection(null);
    setEditError(null);
  }

  function startEditingBlindSpots(current: BlindSpot[]) {
    setEditingSection(sectionKey("risk", "blind_spots"));
    setDraftBlindSpots(current.length ? current.map((b) => ({ ...b })) : [{ area: "", description: "" }]);
    setEditError(null);
  }
  function startEditingTradeoffs(current: Tradeoff[]) {
    setEditingSection(sectionKey("risk", "tradeoffs"));
    setDraftTradeoffs(current.length ? current.map((t) => ({ ...t })) : [{ option: "", upside: "", downside: "" }]);
    setEditError(null);
  }
  function startEditingStakeholderImpacts(current: StakeholderImpact[]) {
    setEditingSection(sectionKey("stakeholders", "stakeholder_impacts"));
    setDraftStakeholderImpacts(
      current.length ? current.map((s) => ({ ...s })) : [{ stakeholder: "", impact: "", sentiment: "neutral" }]
    );
    setEditError(null);
  }

  const canEdit =
    Boolean(onRunUpdate) &&
    (result.status === "complete" || result.status === "pending_brief");

  useEffect(() => {
    if (result.decision_brief) {
      setBriefDraft({
        ...result.decision_brief,
        custom_sections: result.decision_brief.custom_sections ?? [],
      });
    }
  }, [result.decision_brief]);

  // Notify parent of brief changes so chat can use latest content
  useEffect(() => {
    if (briefDraft && onBriefChange) {
      onBriefChange(briefDraft);
    }
  }, [briefDraft, onBriefChange]);

  async function saveBrief(updates: Partial<DecisionBrief>) {
    if (!onRunUpdate || !result.decision_brief) return;
    setBriefError(null);
    setBriefSaving(true);
    try {
      const res = await fetch("/api/decision/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "update_brief",
          run_id: result.run_id,
          decision_brief: { ...result.decision_brief, ...updates },
          ...(variantId && { variant_id: variantId }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBriefError(data.error || "Failed to save brief");
        return;
      }
      onRunUpdate(data as DecisionRunResult);
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : "Failed to save brief");
    } finally {
      setBriefSaving(false);
    }
  }

  async function generateComprehensiveBrief() {
    if (!onRunUpdate) return;
    setComprehensiveError(null);
    setComprehensiveGenerating(true);
    try {
      const res = await fetch("/api/decision/run/comprehensive-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: result.run_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setComprehensiveError(data.error || `Request failed (${res.status})`);
        return;
      }
      onRunUpdate(data as DecisionRunResult);
    } catch (err) {
      setComprehensiveError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setComprehensiveGenerating(false);
    }
  }

  const isStubBrief =
    result.decision_brief &&
    result.decision_brief.summary === "Pending implementation" &&
    result.decision_brief.recommendation === "Pending implementation" &&
    !result.decision_brief.key_considerations?.length &&
    !result.decision_brief.next_steps?.length;

  const hasMergeSources =
    (result.research_completions?.length ?? 0) > 0 || (result.variants?.length ?? 0) > 0;
  const showIntegratedBriefToggle =
    !variantId &&
    Boolean(result.decision_brief) &&
    !isStubBrief &&
    (hasMergeSources || Boolean(result.decision_brief_comprehensive));

  useEffect(() => {
    if (!showIntegratedBriefToggle && briefTab === "comprehensive") {
      setBriefTab("standard");
    }
  }, [showIntegratedBriefToggle, briefTab]);

  const variantCustomSections =
    canEdit && briefDraft ? briefDraft.custom_sections ?? [] : result.decision_brief?.custom_sections ?? [];
  const hasVariantSections = variantCustomSections.length > 0;

  /** Sticky banner above Context: brief title (or draft), else first-pass `decision_title`, else headline. */
  const stickyBriefBannerTitle = useMemo(() => {
    if (briefTab === "comprehensive" && result.decision_brief_comprehensive?.title?.trim()) {
      return result.decision_brief_comprehensive.title.trim();
    }
    const fromBrief = (briefDraft?.title ?? result.decision_brief?.title)?.trim() ?? "";
    const fromStored = result.decision_title?.trim() ?? "";
    let raw = fromBrief;
    if (!raw || (raw === "Decision brief" && isStubBrief)) {
      raw = fromStored;
    }
    if (!raw || (raw === "Decision brief" && isStubBrief)) {
      return runHeadline(result);
    }
    return raw;
  }, [briefDraft?.title, briefTab, result, isStubBrief]);

  const activeBriefGeneratedAt = useMemo(() => {
    const brief =
      briefTab === "comprehensive" && result.decision_brief_comprehensive
        ? result.decision_brief_comprehensive
        : result.decision_brief;
    return brief?.generated_at?.trim() || undefined;
  }, [briefTab, result.decision_brief, result.decision_brief_comprehensive]);

  function persistBrief() {
    if (!briefDraft || !result.decision_brief) return;
    const merged = getCurrentBriefMerged();
    if (!merged) return;
    saveBrief(merged);
  }

  /** Build current brief from refs + briefDraft so chat always gets latest at send time */
  function getCurrentBriefMerged(): Partial<DecisionBrief> | null {
    const draft = briefDraftRef.current;
    if (!draft || !result.decision_brief) return null;
    const title = titleRef.current?.getValue() ?? draft.title;
    const summary = summaryRef.current?.getValue() ?? draft.summary;
    const recommendation =
      recommendationBodyRef.current?.getValue() ??
      ((draft.recommendation ?? "").includes("\n")
        ? (draft.recommendation ?? "").split("\n").slice(1).join("\n")
        : draft.recommendation ?? "");
    const keyConsiderations = keyConsiderationsRef.current?.getItems() ?? draft.key_considerations ?? [];
    const nextSteps = nextStepsRef.current?.getItems() ?? draft.next_steps ?? [];
    return {
      ...draft,
      title: title || "Decision brief",
      summary: summary ?? "",
      recommendation: recommendation ?? "",
      key_considerations: keyConsiderations,
      next_steps: nextSteps,
      custom_sections: draft.custom_sections ?? result.decision_brief.custom_sections ?? [],
    };
  }

  const getCurrentBrief = useCallback((): DecisionBrief | null => {
    const merged = getCurrentBriefMerged();
    const draft = briefDraftRef.current;
    if (!merged || !draft) return null;
    return {
      ...draft,
      ...merged,
      generated_at: draft.generated_at ?? result.decision_brief?.generated_at ?? new Date().toISOString(),
    };
  }, [result.decision_brief]);

  useImperativeHandle(ref, () => ({ getCurrentBrief }), [getCurrentBrief]);

  return (
    <div className={className}>
      <div
        id="rc-decision-brief-title"
        className="scroll-mt-32 sticky top-[4.75rem] z-30 mb-4 border-b border-zinc-200/90 bg-white/95 py-2.5 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-white/85 print:static print:top-auto print:z-auto print:border-zinc-200 print:shadow-none sm:top-20"
      >
        <h2 className="text-lg font-semibold leading-snug text-zinc-900 sm:text-xl">{stickyBriefBannerTitle}</h2>
        {!isStubBrief && activeBriefGeneratedAt ? (
          <BriefGeneratedDateLine iso={activeBriefGeneratedAt} className="mt-1" />
        ) : null}
      </div>
      {/* Context — always expanded; includes “updated after clarification” when applicable */}
      <CollapsibleBlock
        id="rc-context"
        title="Context"
        className={`border-zinc-200 bg-white ${showAnalysisSectionBar ? "mb-4" : "mb-6"}`}
        collapsible={false}
      >
        <p className="text-zinc-800">
          <span className="font-medium">Situation:</span> {result.intake.situation}
        </p>
        <p className="mt-2 text-zinc-800">
          <span className="font-medium">Constraints:</span> {result.intake.constraints}
        </p>
        {result.intake.knowns_assumptions?.trim() ? (
          <p className="mt-2 whitespace-pre-wrap text-zinc-800">
            <span className="font-medium">What I know / am assuming:</span> {result.intake.knowns_assumptions}
          </p>
        ) : null}
        {result.intake.unknowns?.trim() ? (
          <p className="mt-2 whitespace-pre-wrap text-zinc-800">
            <span className="font-medium">What I don’t know:</span> {result.intake.unknowns}
          </p>
        ) : null}
        <p className="mt-2 text-zinc-600">
          <span className="font-medium">Posture:</span> {postureLabel(result.intake.posture)}
          {result.intake.leaning_direction && ` · Leaning toward: ${result.intake.leaning_direction}`}
        </p>
        <div className="mt-3">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              result.status === "complete"
                ? "bg-emerald-100 text-emerald-800"
                : result.status === "awaiting_clarification"
                  ? "bg-amber-100 text-amber-800"
                  : result.status === "pending_brief"
                    ? "bg-indigo-100 text-indigo-800"
                    : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {statusLabel}
          </span>
        </div>
        {analysisChanges.hasAny && (
          <div
            id="rc-after-clarification"
            className="mt-5 rounded-lg border border-emerald-200/90 bg-emerald-50/80 px-3 py-3"
          >
            <p className="text-sm font-semibold text-emerald-900">Updated after clarification</p>
            <p className="mt-0.5 text-xs text-emerald-800/90">
              Your answers refined the analysis — these areas were updated
            </p>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm text-emerald-800">
              {analysisChanges.risk && (
                <li className="rounded bg-emerald-100 px-2 py-0.5 font-medium">Risk analysis</li>
              )}
              {analysisChanges.reversibility && (
                <li className="rounded bg-emerald-100 px-2 py-0.5 font-medium">Reversibility</li>
              )}
              {analysisChanges.stakeholders && (
                <li className="rounded bg-emerald-100 px-2 py-0.5 font-medium">Stakeholders</li>
              )}
              {analysisChanges.brief && (
                <li className="rounded bg-emerald-100 px-2 py-0.5 font-medium">Decision brief</li>
              )}
            </ul>
          </div>
        )}
      </CollapsibleBlock>

      {showAnalysisSectionBar ? (
        <div className="mb-6 overflow-hidden rounded-lg border border-zinc-200 bg-white text-xs shadow-sm">
          <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2.5">
            <h2 className="text-sm font-semibold text-zinc-800">Analysis sections</h2>
            <p className="mt-0.5 max-w-2xl text-[0.8125rem] font-normal normal-case leading-snug text-zinc-500">
              Lenses, brief, and research output below can be opened or closed. Use the links to jump and open a
              section, or expand or collapse all at once.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 flex-1 min-w-0">
              <span className="text-zinc-400">Jump to:</span>
              {([
                ...(riskLens ? [{ key: "riskAnalysis", label: "Risk", href: "#rc-risk" }] : []),
                ...(reversibilityLens ? [{ key: "reversibility", label: "Reversibility", href: "#rc-reversibility" }] : []),
                ...(stakeholdersLens ? [{ key: "stakeholders", label: "Stakeholders", href: "#rc-stakeholders" }] : []),
                ...(result.decision_brief ? [{ key: "brief", label: "Brief", href: "#rc-brief" }] : []),
                ...(hasVariantSections
                  ? [{ key: "variantAdditions", label: "Extra sections", href: "#rc-variant-sections" }]
                  : []),
                ...(onJumpToResearch ? [{ key: "research", label: "Research", href: "#research-output-panel" }] : []),
                ...(onJumpToSynthesis ? [{ key: "synthesis", label: "Comparison", href: "#synthesis-section" }] : []),
              ] as { key: string; label: string; href: string }[]).map(({ key, label, href }) => (
                <a
                  key={key}
                  href={href}
                  onClick={(e) => {
                    if (key === "research" && onJumpToResearch) {
                      e.preventDefault();
                      onJumpToResearch();
                      return;
                    }
                    if (key === "synthesis" && onJumpToSynthesis) {
                      e.preventDefault();
                      onJumpToSynthesis();
                      return;
                    }
                    toggleSection(key, true);
                  }}
                  className="text-zinc-500 hover:text-indigo-600 hover:underline"
                >
                  {label}
                </a>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={expandAll} className="text-zinc-500 hover:text-indigo-600">
                Expand all
              </button>
              <span className="text-zinc-300">·</span>
              <button type="button" onClick={collapseAll} className="text-zinc-500 hover:text-indigo-600">
                Collapse all
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Risk (rose tint) */}
      {riskLens && (
        <CollapsibleBlock
          id="rc-risk"
          title="Risk analysis"
          className="mt-0 border-rose-200 bg-rose-50/30"
          open={openSections.riskAnalysis}
          onOpenChange={(v) => toggleSection("riskAnalysis", v)}
          bodyClassName="space-y-4 px-3 pb-4 pt-1"
        >
          {(riskLens.top_risks?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
              <Section title="Top risks" updated={analysisChanges.risk}>
                {canEdit ? (
                  <LensBoxEditor
                    editorKey={sectionKey("risk", "top_risks")}
                    items={riskLens.top_risks ?? []}
                    onSave={(items) => saveLensListUpdate("risk", "top_risks", items)}
                    editable={true}
                    hideSaveHint
                  />
                ) : riskLens.top_risks?.length ? (
                  <ul className="list-inside list-disc space-y-1.5 text-zinc-700">
                    {riskLens.top_risks.map((r, i) => (
                      <li key={i}>
                        <ResearchMarkdownInline source={r} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-zinc-500 text-sm">No items.</p>
                )}
              </Section>
            </div>
          )}
          {(riskLens.assumptions_detected?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
              <Section title="Assumptions detected">
                {canEdit ? (
                  <LensBoxEditor
                    editorKey={sectionKey("risk", "assumptions_detected")}
                    items={riskLens.assumptions_detected ?? []}
                    onSave={(items) => saveLensListUpdate("risk", "assumptions_detected", items)}
                    editable={true}
                    hideSaveHint
                  />
                ) : riskLens.assumptions_detected?.length ? (
                  <ul className="list-inside list-disc space-y-1.5 text-zinc-700">
                    {riskLens.assumptions_detected.map((a, i) => (
                      <li key={i}>
                        <ResearchMarkdownInline source={a} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-zinc-500 text-sm">No items.</p>
                )}
              </Section>
            </div>
          )}
          {(riskLens.blind_spots?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
              <Section title="Blind spots">
                {editingSection === sectionKey("risk", "blind_spots") ? (
                  <EditableBlindSpots
                    items={draftBlindSpots}
                    onChange={setDraftBlindSpots}
                    onSave={() => saveLensUpdate(withUpdatedField(result.lens_outputs, "risk", "blind_spots", draftBlindSpots.filter((b) => b.area.trim() || b.description.trim())))}
                    onCancel={cancelEditing}
                    saving={saving}
                    error={editError}
                  />
                ) : (
                  <>
                    {riskLens.blind_spots?.length ? (
                      <ul className="space-y-3">
                        {riskLens.blind_spots.map((b, i) => (
                          <li key={i} className="border-l-2 border-amber-300 pl-3">
                            <span className="font-medium text-zinc-800">
                              <ResearchMarkdownInline source={b.area} />
                            </span>
                            <span className="font-medium text-zinc-800">:</span>{" "}
                            <span className="text-zinc-700">
                              <ResearchMarkdownInline source={b.description} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-zinc-500 text-sm">No items. Edit to add.</p>
                    )}
                    {canEdit && (
                      <button type="button" onClick={() => startEditingBlindSpots(riskLens.blind_spots ?? [])} className="mt-2 text-sm text-indigo-600 hover:text-indigo-700">
                        Edit
                      </button>
                    )}
                  </>
                )}
              </Section>
            </div>
          )}
          {(riskLens.tradeoffs?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
              <Section title="Tradeoffs">
                {editingSection === sectionKey("risk", "tradeoffs") ? (
                  <EditableTradeoffs
                    items={draftTradeoffs}
                    onChange={setDraftTradeoffs}
                    onSave={() => saveLensUpdate(withUpdatedField(result.lens_outputs, "risk", "tradeoffs", draftTradeoffs.filter((t) => t.option.trim() || t.upside.trim() || t.downside.trim())))}
                    onCancel={cancelEditing}
                    saving={saving}
                    error={editError}
                  />
                ) : (
                  <>
                    {riskLens.tradeoffs?.length ? (
                      <div className="space-y-4">
                        {riskLens.tradeoffs.map((t, i) => (
                          <div key={i} className="rounded border border-zinc-200 bg-zinc-50/50 p-3">
                            <p className="font-medium text-zinc-800">
                              <ResearchMarkdownInline source={t.option} />
                            </p>
                            <p className="mt-1 text-sm text-emerald-700">
                              <span className="font-medium">Upside:</span>{" "}
                              <ResearchMarkdownInline source={t.upside} />
                            </p>
                            <p className="mt-1 text-sm text-zinc-600">
                              <span className="font-medium">Downside:</span>{" "}
                              <ResearchMarkdownInline source={t.downside} />
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-sm">No items. Edit to add.</p>
                    )}
                    {canEdit && (
                      <button type="button" onClick={() => startEditingTradeoffs(riskLens.tradeoffs ?? [])} className="mt-2 text-sm text-indigo-600 hover:text-indigo-700">
                        Edit
                      </button>
                    )}
                  </>
                )}
              </Section>
            </div>
          )}
          {(riskLens.remaining_uncertainty?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
              <Section title="Remaining uncertainty">
                {canEdit ? (
                  <LensBoxEditor
                    editorKey={sectionKey("risk", "remaining_uncertainty")}
                    items={riskLens.remaining_uncertainty ?? []}
                    onSave={(items) => saveLensListUpdate("risk", "remaining_uncertainty", items)}
                    editable={true}
                    hideSaveHint
                  />
                ) : riskLens.remaining_uncertainty?.length ? (
                  <ul className="list-inside list-disc space-y-1.5 text-zinc-700">
                    {riskLens.remaining_uncertainty.map((u, i) => (
                      <li key={i}>
                        <ResearchMarkdownInline source={u} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-zinc-500 text-sm">No items.</p>
                )}
              </Section>
            </div>
          )}
        </CollapsibleBlock>
      )}

      {/* Reversibility (amber) */}
      {reversibilityLens && (
        <CollapsibleBlock
          id="rc-reversibility"
          title="Reversibility"
          className="mt-6 border-amber-200 bg-amber-50/40"
          open={openSections.reversibility}
          onOpenChange={(v) => toggleSection("reversibility", v)}
          bodyClassName="space-y-4 px-3 pb-4 pt-1"
        >
          {(reversibilityLens.irreversible_steps?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
              <Section title="Irreversible steps" updated={analysisChanges.reversibility}>
                <p className="mb-2 text-sm text-zinc-600">
                  Steps or commitments that would be hard or impossible to undo.
                </p>
                {canEdit ? (
                  <LensBoxEditor
                    editorKey={sectionKey("reversibility", "irreversible_steps")}
                    items={reversibilityLens.irreversible_steps ?? []}
                    onSave={(items) => saveLensListUpdate("reversibility", "irreversible_steps", items)}
                    editable={true}
                    hideSaveHint
                  />
                ) : reversibilityLens.irreversible_steps?.length ? (
                  <ul className="list-inside list-disc space-y-1.5 text-zinc-700">
                    {reversibilityLens.irreversible_steps.map((s, i) => (
                      <li key={i}>
                        <ResearchMarkdownInline source={s} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-zinc-500 text-sm">No items.</p>
                )}
              </Section>
            </div>
          )}
          {(reversibilityLens.safe_to_try_first?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
              <Section title="Safe to try first">
                <p className="mb-2 text-sm text-zinc-600">
                  Low-commitment steps or experiments you could try with minimal downside.
                </p>
                {canEdit ? (
                  <LensBoxEditor
                    editorKey={sectionKey("reversibility", "safe_to_try_first")}
                    items={reversibilityLens.safe_to_try_first ?? []}
                    onSave={(items) => saveLensListUpdate("reversibility", "safe_to_try_first", items)}
                    editable={true}
                    hideSaveHint
                  />
                ) : reversibilityLens.safe_to_try_first?.length ? (
                  <ul className="list-inside list-disc space-y-1.5 text-zinc-700">
                    {reversibilityLens.safe_to_try_first.map((s, i) => (
                      <li key={i}>
                        <ResearchMarkdownInline source={s} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-zinc-500 text-sm">No items.</p>
                )}
              </Section>
            </div>
          )}
        </CollapsibleBlock>
      )}

      {/* Stakeholders (violet tint) */}
      {stakeholdersLens && (
        <CollapsibleBlock
          id="rc-stakeholders"
          title="Stakeholders"
          className="mt-6 border-violet-200 bg-violet-50/40"
          open={openSections.stakeholders}
          onOpenChange={(v) => toggleSection("stakeholders", v)}
          bodyClassName="space-y-4 px-3 pb-4 pt-1"
        >
          {(stakeholdersLens.stakeholder_impacts?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-violet-200 bg-violet-50/80 p-4 shadow-sm">
              <Section title="Stakeholder impacts" updated={analysisChanges.stakeholders}>
                <p className="mb-3 text-sm text-zinc-600">Who is affected by this decision and how.</p>
                {editingSection === sectionKey("stakeholders", "stakeholder_impacts") ? (
                  <EditableStakeholderImpacts
                    items={draftStakeholderImpacts}
                    onChange={setDraftStakeholderImpacts}
                    onSave={() => saveLensUpdate(withUpdatedField(result.lens_outputs, "stakeholders", "stakeholder_impacts", draftStakeholderImpacts.filter((s) => s.stakeholder.trim() || s.impact.trim())))}
                    onCancel={cancelEditing}
                    saving={saving}
                    error={editError}
                  />
                ) : (
                  <>
                    {stakeholdersLens.stakeholder_impacts?.length ? (
                      <ul className="space-y-3">
                        {stakeholdersLens.stakeholder_impacts.map((s, i) => (
                          <li key={i} className="flex flex-col gap-1">
                            <span className="font-medium text-zinc-800">
                              <ResearchMarkdownInline source={s.stakeholder} />
                            </span>
                            <span
                              className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${
                                s.sentiment === "positive"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : s.sentiment === "negative"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-zinc-200 text-zinc-700"
                              }`}
                            >
                              {s.sentiment}
                            </span>
                            <span className="text-zinc-700">
                              <ResearchMarkdownInline source={s.impact} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-zinc-500 text-sm">No items. Edit to add.</p>
                    )}
                    {canEdit && (
                      <button type="button" onClick={() => startEditingStakeholderImpacts(stakeholdersLens.stakeholder_impacts ?? [])} className="mt-2 text-sm text-indigo-600 hover:text-indigo-700">
                        Edit
                      </button>
                    )}
                  </>
                )}
              </Section>
            </div>
          )}
          {(stakeholdersLens.execution_risks?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-violet-200 bg-violet-50/80 p-4 shadow-sm">
              <Section title="Execution risks">
                <p className="mb-2 text-sm text-zinc-600">
                  Risks to successful execution: adoption, resistance, capability gaps, coordination.
                </p>
                {canEdit ? (
                  <LensBoxEditor
                    editorKey={sectionKey("stakeholders", "execution_risks")}
                    items={stakeholdersLens.execution_risks ?? []}
                    onSave={(items) => saveLensListUpdate("stakeholders", "execution_risks", items)}
                    editable={true}
                    hideSaveHint
                  />
                ) : stakeholdersLens.execution_risks?.length ? (
                  <ul className="list-inside list-disc space-y-1.5 text-zinc-700">
                    {stakeholdersLens.execution_risks.map((r, i) => (
                      <li key={i}>
                        <ResearchMarkdownInline source={r} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-zinc-500 text-sm">No items.</p>
                )}
              </Section>
            </div>
          )}
        </CollapsibleBlock>
      )}

      {/* Decision brief */}
      {result.decision_brief && (
        <CollapsibleBlock
          id="rc-brief"
          title="Decision brief and recommendations"
          subtitle={
            activeBriefGeneratedAt
              ? briefTab === "comprehensive"
                ? `Integrated · ${formatBriefDate(activeBriefGeneratedAt)}`
                : showIntegratedBriefToggle
                  ? `Standard · ${formatBriefDate(activeBriefGeneratedAt)}`
                  : `Generated ${formatBriefDate(activeBriefGeneratedAt)}`
              : undefined
          }
          badge={
            analysisChanges.brief ? (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
                Updated
              </span>
            ) : undefined
          }
          className="mt-6 scroll-mt-32 border-indigo-200 bg-indigo-50"
          open={openSections.brief}
          onOpenChange={(v) => toggleSection("brief", v)}
        >
          {showIntegratedBriefToggle && (
            <div className="mb-4 flex flex-col gap-2 border-b border-indigo-200/80 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Brief view</span>
                <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setBriefTab("standard")}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                      briefTab === "standard"
                        ? "bg-indigo-600 text-white"
                        : "text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setBriefTab("comprehensive")}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                      briefTab === "comprehensive"
                        ? "bg-indigo-600 text-white"
                        : "text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    Research &amp; variants
                  </button>
                </div>
                {briefTab === "comprehensive" && hasMergeSources && onRunUpdate ? (
                  <button
                    type="button"
                    onClick={() => void generateComprehensiveBrief()}
                    disabled={comprehensiveGenerating}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {comprehensiveGenerating
                      ? "Working…"
                      : result.decision_brief_comprehensive
                        ? "Refresh integrated"
                        : "Generate integrated"}
                  </button>
                ) : null}
              </div>
              {briefTab === "comprehensive" && (
                <p className="text-xs leading-relaxed text-zinc-600">
                  Integrated brief merges the base lens analysis with all research tasks and every saved analysis
                  version on this run. It is read-only; chat and edits still use the standard brief unless you
                  change that later.
                </p>
              )}
              {comprehensiveError ? (
                <p className="text-sm text-red-600">{comprehensiveError}</p>
              ) : null}
            </div>
          )}

          {briefTab === "comprehensive" ? (
            result.decision_brief_comprehensive ? (
              <>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-zinc-900">
                    {result.decision_brief_comprehensive.title || "Decision brief"}
                  </h2>
                  <BriefGeneratedDateLine
                    iso={result.decision_brief_comprehensive.generated_at}
                    className="mt-1"
                  />
                </div>
                <div className="mt-3 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Summary</h3>
                    <div className="mt-2 text-zinc-800">
                      <ResearchMarkdown source={result.decision_brief_comprehensive.summary ?? ""} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Recommendation</h3>
                    <div className="mt-2 text-zinc-800">
                      <ResearchMarkdown
                        source={
                          result.decision_brief_comprehensive.recommendation?.includes("\n")
                            ? result.decision_brief_comprehensive.recommendation
                                .split("\n")
                                .slice(1)
                                .join("\n") || result.decision_brief_comprehensive.recommendation
                            : (result.decision_brief_comprehensive.recommendation ?? "")
                        }
                      />
                    </div>
                  </div>
                  {result.decision_brief_comprehensive.key_considerations &&
                    result.decision_brief_comprehensive.key_considerations.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                          Key considerations
                        </h3>
                        <ul className="mt-2 list-inside list-disc text-zinc-700">
                          {result.decision_brief_comprehensive.key_considerations.map((k, i) => (
                            <li key={i}>
                              <ResearchMarkdownInline source={k} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  {result.decision_brief_comprehensive.next_steps &&
                    result.decision_brief_comprehensive.next_steps.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Next steps</h3>
                        <ul className="mt-2 list-inside list-disc text-zinc-700">
                          {result.decision_brief_comprehensive.next_steps.map((n, i) => (
                            <li key={i}>
                              <ResearchMarkdownInline source={n} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  {result.decision_brief_comprehensive.custom_sections &&
                    result.decision_brief_comprehensive.custom_sections.length > 0 && (
                      <div className="mt-4 space-y-3 border-t border-indigo-200/80 pt-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                          Additional sections
                        </h3>
                        {result.decision_brief_comprehensive.custom_sections.map((section, i) => (
                          <div
                            key={i}
                            className="rounded-lg border border-indigo-200/80 bg-white/90 p-4 shadow-sm"
                          >
                            <h4 className="text-sm font-semibold text-zinc-700">
                              {section.heading?.trim() ? (
                                <ResearchMarkdownInline source={section.heading} />
                              ) : (
                                "Section"
                              )}
                            </h4>
                            <div className="mt-2 text-zinc-700">
                              {section.content?.trim() ? (
                                <ResearchMarkdown source={section.content} />
                              ) : (
                                <p className="text-sm text-zinc-400 italic">No content.</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-white/60 px-4 py-6 text-center">
                <p className="text-sm font-medium text-zinc-800">No integrated brief yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
                  Generate one to fold in everything from the research panel and every saved analysis version.
                  Your standard brief stays the default for editing.
                </p>
              </div>
            )
          ) : (
            <>
              <div className="min-w-0">
                {canEdit && !isStubBrief && briefDraft ? (
                  <ClarificationAnswerEditor
                    ref={titleRef}
                    editorKey="brief.title"
                    value={briefDraft.title || "Decision brief"}
                    onChange={(v) => {
                      setBriefDraft((b) => (b ? { ...b, title: v || "Decision brief" } : null));
                      persistBrief();
                    }}
                    variant="inline"
                    className="text-lg font-semibold text-zinc-900"
                  />
                ) : (
                  <h2 className="text-lg font-semibold text-zinc-900">
                    {result.decision_brief.title || "Decision brief"}
                  </h2>
                )}
                {!isStubBrief ? (
                  <BriefGeneratedDateLine
                    iso={briefDraft?.generated_at ?? result.decision_brief.generated_at}
                    className="mt-1"
                  />
                ) : null}
              </div>
              <div className="mt-3">
                {isStubBrief ? (
                  <p className="text-zinc-500 italic">
                    Brief synthesis not yet implemented. Your answers were used to re-run the lenses above; a
                    summarized recommendation will appear here once synthesis is added.
                  </p>
                ) : canEdit && briefDraft ? (
                  <>
                    <div className="mt-3">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Summary</h2>
                      <ClarificationAnswerEditor
                        ref={summaryRef}
                        editorKey="brief.summary"
                        value={briefDraft.summary}
                        onChange={(v) => {
                          setBriefDraft((b) => (b ? { ...b, summary: v } : null));
                          persistBrief();
                        }}
                        variant="inline"
                        className="mt-2"
                      />
                    </div>
                    <div className="mt-3">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Recommendation</h2>
                      <ClarificationAnswerEditor
                        ref={recommendationBodyRef}
                        editorKey="brief.recommendation_body"
                        value={
                          (briefDraft.recommendation ?? "").includes("\n")
                            ? (briefDraft.recommendation ?? "").split("\n").slice(1).join("\n")
                            : briefDraft.recommendation ?? ""
                        }
                        onChange={(body) => {
                          setBriefDraft((b) => (b ? { ...b, recommendation: body } : null));
                          persistBrief();
                        }}
                        variant="inline"
                        className="mt-2"
                      />
                    </div>
                    <div className="mt-3">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Key considerations</h2>
                      <div className="mt-2">
                        <LensBoxEditor
                          ref={keyConsiderationsRef}
                          editorKey="brief.key_considerations"
                          items={briefDraft.key_considerations ?? []}
                          onSave={(items) => {
                            setBriefDraft((b) => (b ? { ...b, key_considerations: items } : null));
                            persistBrief();
                          }}
                          editable={true}
                          hideSaveHint
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Next steps</h2>
                      <div className="mt-2">
                        <LensBoxEditor
                          ref={nextStepsRef}
                          editorKey="brief.next_steps"
                          items={briefDraft.next_steps ?? []}
                          onSave={(items) => {
                            setBriefDraft((b) => (b ? { ...b, next_steps: items } : null));
                            persistBrief();
                          }}
                          editable={true}
                          hideSaveHint
                        />
                      </div>
                    </div>
                    {briefError && <p className="mt-2 text-sm text-red-600">{briefError}</p>}
                  </>
                ) : (
                  <>
                    <div className="text-zinc-800">
                      <ResearchMarkdown source={result.decision_brief.summary ?? ""} />
                    </div>
                    <div className="mt-3 text-zinc-800">
                      <ResearchMarkdown
                        source={
                          result.decision_brief.recommendation?.includes("\n")
                            ? result.decision_brief.recommendation.split("\n").slice(1).join("\n") ||
                              result.decision_brief.recommendation
                            : (result.decision_brief.recommendation ?? "")
                        }
                      />
                    </div>
                    {result.decision_brief.key_considerations?.length > 0 && (
                      <ul className="mt-2 list-inside list-disc text-zinc-700">
                        {result.decision_brief.key_considerations.map((k, i) => (
                          <li key={i}>
                            <ResearchMarkdownInline source={k} />
                          </li>
                        ))}
                      </ul>
                    )}
                    {result.decision_brief.next_steps?.length > 0 && (
                      <ul className="mt-2 list-inside list-disc text-zinc-700">
                        {result.decision_brief.next_steps.map((n, i) => (
                          <li key={i}>
                            <ResearchMarkdownInline source={n} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </CollapsibleBlock>
      )}

      {briefTab === "standard" && result.decision_brief && hasVariantSections && (
        <CollapsibleBlock
          id="rc-variant-sections"
          title="Additional brief sections"
          subtitle="Optional appendices from the model after clarification, or extra sections from saved format variants"
          className="mt-6 scroll-mt-32 border-amber-200 bg-amber-50/40"
          open={openSections.variantAdditions}
          onOpenChange={(v) => toggleSection("variantAdditions", v)}
          bodyClassName="space-y-4 px-3 pb-4 pt-1"
        >
          {canEdit && briefDraft ? (
            <>
              {briefDraft.custom_sections?.map((section, i) => (
                <div key={i} className="rounded-lg border border-amber-200/80 bg-white/90 p-4 shadow-sm">
                  <ClarificationAnswerEditor
                    editorKey={`brief.custom_section_heading_${i}`}
                    value={section.heading}
                    onChange={(v) => {
                      const updatedSections = [...(briefDraft.custom_sections ?? [])];
                      updatedSections[i] = { ...updatedSections[i], heading: v };
                      setBriefDraft((b) => (b ? { ...b, custom_sections: updatedSections } : null));
                      saveBrief({ custom_sections: updatedSections });
                    }}
                    variant="inline"
                    className="text-sm font-semibold uppercase tracking-wide text-zinc-600"
                  />
                  <div className="mt-2 min-w-0 rounded-md border border-zinc-100 bg-white px-3 py-2">
                    {section.content?.trim() ? (
                      <ResearchMarkdown source={section.content} />
                    ) : (
                      <p className="text-sm text-zinc-400 italic">No section body yet.</p>
                    )}
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-indigo-700 hover:text-indigo-900">
                      Edit markdown source
                    </summary>
                    <textarea
                      value={section.content}
                      onChange={(e) => {
                        const v = e.target.value;
                        const updatedSections = [...(briefDraft.custom_sections ?? [])];
                        updatedSections[i] = { ...updatedSections[i], content: v };
                        setBriefDraft((b) => (b ? { ...b, custom_sections: updatedSections } : null));
                        saveBrief({ custom_sections: updatedSections });
                      }}
                      spellCheck={false}
                      rows={12}
                      className="mt-2 w-full resize-y rounded-md border border-zinc-200 bg-zinc-50/80 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      aria-label={`Variant section ${i + 1} markdown source`}
                    />
                  </details>
                </div>
              ))}
            </>
          ) : (
            <>
              {result.decision_brief.custom_sections?.map((section, i) => (
                <div key={i} className="rounded-lg border border-amber-200/80 bg-white/90 p-4 shadow-sm">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">
                    {section.heading?.trim() ? (
                      <ResearchMarkdownInline source={section.heading} />
                    ) : (
                      "Additional section"
                    )}
                  </h3>
                  <div className="mt-2 min-w-0 rounded-md border border-zinc-100 bg-white px-3 py-2 text-zinc-700">
                    {section.content?.trim() ? (
                      <ResearchMarkdown source={section.content} />
                    ) : (
                      <p className="text-sm text-zinc-400 italic">No content.</p>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </CollapsibleBlock>
      )}
    </div>
  );
});

ResultContent.displayName = "ResultContent";
