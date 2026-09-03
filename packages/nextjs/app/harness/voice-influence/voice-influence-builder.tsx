"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { POSTURES, postureRequiresLeaning, type Posture } from "@/types/decision";
import {
  COMING_LATER_STUDY_TYPES,
  VOICE_INFLUENCE_INTAKE_FIELDS,
  VOICE_INFLUENCE_SLOTS,
  VOICE_INFLUENCE_STUDY_TYPE,
  diffTextAgainstBaseline,
  fieldText,
  slotByKey,
  type VoiceInfluenceCase,
  type VoiceInfluenceCaseSetDraft,
  type VoiceInfluenceIntakeField,
} from "@/lib/voice-influence-case-set";

const FIELD_LABELS: Record<VoiceInfluenceIntakeField, string> = {
  situation: "situation",
  constraints: "constraints",
  posture: "posture",
  leaning_direction: "leaning_direction",
  knowns_assumptions: "knowns_assumptions",
  unknowns: "unknowns",
  variantPrompt: "variantPrompt",
  researchStarter: "researchStarter",
};

function DiffView({ baseline, variant }: { baseline: string; variant: string }) {
  const tokens = useMemo(
    () => diffTextAgainstBaseline(baseline, variant),
    [baseline, variant]
  );
  if (!baseline && !variant) {
    return <p className="text-sm text-zinc-400">Empty in C1 and this voice.</p>;
  }
  if (baseline === variant) {
    return <p className="whitespace-pre-wrap text-sm text-zinc-600">{variant || "—"}</p>;
  }
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
      {tokens.map((token, i) => {
        if (token.kind === "same") return <span key={i}>{token.text}</span>;
        if (token.kind === "removed") {
          return (
            <span key={i} className="bg-rose-100 text-rose-800 line-through decoration-rose-400">
              {token.text}
            </span>
          );
        }
        return (
          <span key={i} className="bg-emerald-100 text-emerald-900">
            {token.text}
          </span>
        );
      })}
    </p>
  );
}

function TextArea({
  id,
  label,
  value,
  onChange,
  rows = 6,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] font-semibold text-zinc-500">{label}</span>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
    </label>
  );
}

export function VoiceInfluenceBuilder({ draft }: { draft: VoiceInfluenceCaseSetDraft }) {
  const router = useRouter();
  const [name, setName] = useState(draft.name);
  const [decision, setDecision] = useState(draft.decision);
  const [domain, setDomain] = useState(draft.domain);
  const [conditions, setConditions] = useState<VoiceInfluenceCase[]>(draft.conditions);
  const [view, setView] = useState<"edit" | "compare">("edit");
  const [activeSlot, setActiveSlot] = useState(conditions[0]?.id ?? "c1");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(draft.updatedAt);

  const baseline = conditions[0]!;
  const active = conditions.find((c) => c.id === activeSlot) ?? conditions[0]!;
  const activeMeta = slotByKey(active.id);

  function updateCondition(id: string, patch: Partial<VoiceInfluenceCase>) {
    setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setStatus("idle");
  }

  async function saveDraft() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch(`/api/harness/voice-influence-drafts/${draft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, decision, domain, conditions }),
      });
      const json = (await res.json()) as { ok?: boolean; draft?: VoiceInfluenceCaseSetDraft; error?: string };
      if (!res.ok || !json.draft) {
        throw new Error(json.error || "Save failed");
      }
      setConditions(json.draft.conditions);
      setName(json.draft.name);
      setDecision(json.draft.decision);
      setDomain(json.draft.domain);
      setSavedAt(json.draft.updatedAt);
      setStatus("saved");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">
            Researcher · Voice Influence
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">
            Author a C1–C5 case set
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-zinc-500">
            Same intake fields as{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">HormuzVoiceCase</code> /{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">MeridianIcVoiceCase</code>.
            Hold facts fixed; vary narrator voice. Saving writes a draft for you — it does not
            start harness runs.
          </p>
        </div>
        <Link
          href="/harness/voice-influence"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
        >
          ← All drafts
        </Link>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">Study</h2>
        <fieldset className="mt-3 space-y-2">
          <legend className="sr-only">Study type</legend>
          <label className="flex items-center gap-2 text-sm text-zinc-800">
            <input type="radio" checked readOnly name="studyType" value={VOICE_INFLUENCE_STUDY_TYPE} />
            Voice Influence
          </label>
          {COMING_LATER_STUDY_TYPES.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-sm text-zinc-400">
              <input type="radio" disabled name="studyType" value={t.id} />
              {t.label}
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Coming later
              </span>
            </label>
          ))}
        </fieldset>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Case-set name
            </span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setStatus("idle");
              }}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="e.g. Hospital PE voice battery"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              One-sentence decision
            </span>
            <input
              value={decision}
              onChange={(e) => {
                setDecision(e.target.value);
                setStatus("idle");
              }}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="What is being decided?"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Domain</span>
            <input
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                setStatus("idle");
              }}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="e.g. tanker ops, PE roll-up"
            />
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1"
          role="tablist"
          aria-label="Editor view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "edit"}
            onClick={() => setView("edit")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              view === "edit" ? "bg-white text-indigo-900 shadow-sm" : "text-zinc-600"
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "compare"}
            onClick={() => setView("compare")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              view === "compare" ? "bg-white text-indigo-900 shadow-sm" : "text-zinc-600"
            }`}
          >
            Diff against C1
          </button>
        </div>
        <p className="text-xs text-zinc-400">
          Last saved {savedAt ? new Date(savedAt).toLocaleString() : "never"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Voice conditions">
        {VOICE_INFLUENCE_SLOTS.map((slot) => {
          const selected = active.id === slot.key;
          return (
            <button
              key={slot.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveSlot(slot.key)}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${
                selected
                  ? "border-indigo-300 bg-indigo-50 text-indigo-900"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
              }`}
            >
              <span className="font-semibold">
                {slot.code} {slot.title}
              </span>
            </button>
          );
        })}
      </div>

      {activeMeta ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                {activeMeta.code} {activeMeta.title}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Isolation card — same mechanics as Meridian IC / Hormuz C1–C5.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-zinc-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Must stay fixed
              </p>
              <p className="mt-1 text-sm text-zinc-700">{activeMeta.mustStayFixed}</p>
            </div>
            <div className="rounded-lg bg-indigo-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                Allowed to change
              </p>
              <p className="mt-1 text-sm text-indigo-950">{activeMeta.allowedToChange}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="font-mono text-[11px] font-semibold text-zinc-500">label</span>
              <input
                value={active.label}
                onChange={(e) => updateCondition(active.id, { label: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[11px] font-semibold text-zinc-500">headline</span>
              <input
                value={active.headline}
                onChange={(e) => updateCondition(active.id, { headline: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[11px] font-semibold text-zinc-500">clarificationHint</span>
              <input
                value={active.clarificationHint}
                onChange={(e) => updateCondition(active.id, { clarificationHint: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </label>
          </div>

          {view === "edit" ? (
            <div className="mt-5 space-y-4">
              <TextArea
                id={`${active.id}-situation`}
                label="situation"
                value={active.situation}
                onChange={(situation) => updateCondition(active.id, { situation })}
                rows={8}
              />
              <TextArea
                id={`${active.id}-constraints`}
                label="constraints"
                value={active.constraints}
                onChange={(constraints) => updateCondition(active.id, { constraints })}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="font-mono text-[11px] font-semibold text-zinc-500">posture</span>
                  <select
                    value={active.posture}
                    onChange={(e) =>
                      updateCondition(active.id, { posture: e.target.value as Posture })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    {POSTURES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                {postureRequiresLeaning(active.posture) ? (
                  <TextArea
                    id={`${active.id}-leaning`}
                    label="leaning_direction"
                    value={active.leaning_direction ?? ""}
                    onChange={(leaning_direction) => updateCondition(active.id, { leaning_direction })}
                    rows={4}
                  />
                ) : (
                  <p className="self-end text-xs text-zinc-400">
                    leaning_direction is unused unless posture is pressure_test or show_opposition.
                  </p>
                )}
              </div>
              <TextArea
                id={`${active.id}-knowns`}
                label="knowns_assumptions"
                value={active.knowns_assumptions}
                onChange={(knowns_assumptions) => updateCondition(active.id, { knowns_assumptions })}
              />
              <TextArea
                id={`${active.id}-unknowns`}
                label="unknowns"
                value={active.unknowns}
                onChange={(unknowns) => updateCondition(active.id, { unknowns })}
              />
              <TextArea
                id={`${active.id}-variant`}
                label="variantPrompt"
                value={active.variantPrompt}
                onChange={(variantPrompt) => updateCondition(active.id, { variantPrompt })}
                rows={4}
              />
              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="font-mono text-[11px] font-semibold text-zinc-500">
                    researchStarter.label
                  </span>
                  <input
                    value={active.researchStarter.label}
                    onChange={(e) =>
                      updateCondition(active.id, {
                        researchStarter: { ...active.researchStarter, label: e.target.value },
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[11px] font-semibold text-zinc-500">
                    researchStarter.group_title
                  </span>
                  <input
                    value={active.researchStarter.group_title}
                    onChange={(e) =>
                      updateCondition(active.id, {
                        researchStarter: { ...active.researchStarter, group_title: e.target.value },
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </label>
                <label className="block md:col-span-3">
                  <span className="font-mono text-[11px] font-semibold text-zinc-500">
                    researchStarter.prompt
                  </span>
                  <textarea
                    value={active.researchStarter.prompt}
                    onChange={(e) =>
                      updateCondition(active.id, {
                        researchStarter: { ...active.researchStarter, prompt: e.target.value },
                      })
                    }
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {active.id === "c1" ? (
                <p className="text-sm text-zinc-500">
                  C1 is the isolation baseline. Open C2–C5 to see what changed against this voice.
                </p>
              ) : null}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    C1 baseline
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                    {baseline.situation || "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-indigo-200 bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                    {activeMeta.code} · situation vs C1
                  </p>
                  <div className="mt-2">
                    <DiffView baseline={baseline.situation} variant={active.situation} />
                  </div>
                </div>
              </div>
              {VOICE_INFLUENCE_INTAKE_FIELDS.filter((f) => f !== "situation").map((field) => (
                <div key={field} className="rounded-lg border border-zinc-200 p-3">
                  <p className="font-mono text-[11px] font-semibold text-zinc-500">
                    {FIELD_LABELS[field]} vs C1
                  </p>
                  <div className="mt-2">
                    <DiffView baseline={fieldText(baseline, field)} variant={fieldText(active, field)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
        <button
          type="button"
          onClick={() => void saveDraft()}
          disabled={status === "saving"}
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center rounded-lg bg-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-500"
        >
          Launch study
        </button>
        <p className="max-w-xl text-xs text-zinc-500">
          Launch is disabled. The CLI harness (5 voices × 4 providers = 20 runs) will be wired
          later. Saving a draft does not write harness runs or call models.
        </p>
        {status === "saved" ? (
          <p className="text-sm font-medium text-emerald-700">Draft saved.</p>
        ) : null}
        {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
      </section>
    </div>
  );
}
