import type {
  Clarification,
  DecisionRunResult,
  Lens,
  LensOutput,
  LensQuestion,
  ProviderSynthesis,
  SynthesisPoint,
  SynthesisSourceRef,
} from "@/types/decision";

/** Map legacy stored lens id `people` → canonical `stakeholders`. */
export function normalizeLensId(lens: string): Lens {
  if (lens === "people") return "stakeholders";
  return lens as Lens;
}

export function isStakeholdersLens(lens: string): boolean {
  return lens === "stakeholders" || lens === "people";
}

export function normalizeSynthesisSection(
  section: string
): SynthesisSourceRef["section"] {
  if (section === "people") return "stakeholders";
  return section as SynthesisSourceRef["section"];
}

function normalizeLensOutput(out: LensOutput): LensOutput {
  if (!isStakeholdersLens(out.lens)) return out;
  return { ...out, lens: "stakeholders" } as LensOutput;
}

function normalizeLensQuestion(q: LensQuestion): LensQuestion {
  return { ...q, lens: normalizeLensId(q.lens) };
}

function normalizeClarification(c: Clarification): Clarification {
  return {
    ...c,
    answers: c.answers.map((a) => ({ ...a, lens: normalizeLensId(a.lens) })),
  };
}

function normalizeSourceRef(ref: SynthesisSourceRef): SynthesisSourceRef {
  return { ...ref, section: normalizeSynthesisSection(ref.section) };
}

function normalizeSynthesisPoint(p: SynthesisPoint): SynthesisPoint {
  return {
    ...p,
    source_refs: p.source_refs?.map(normalizeSourceRef),
  };
}

function normalizeSynthesis(s: ProviderSynthesis): ProviderSynthesis {
  return {
    ...s,
    consensus: s.consensus?.map(normalizeSynthesisPoint) ?? [],
    majority_view: s.majority_view?.map(normalizeSynthesisPoint) ?? [],
    minority_opinions: s.minority_opinions?.map(normalizeSynthesisPoint) ?? [],
  };
}

/** Remap legacy `people` lens ids on a run doc (Mongo / session). */
export function normalizeRunLensFields(run: DecisionRunResult): DecisionRunResult {
  return {
    ...run,
    lens_outputs: run.lens_outputs?.map(normalizeLensOutput),
    clarification_questions: run.clarification_questions?.map(normalizeLensQuestion),
    clarifications: run.clarifications?.map(normalizeClarification),
    variants: run.variants?.map((v) => ({
      ...v,
      lens_outputs: v.lens_outputs?.map(normalizeLensOutput) ?? [],
    })),
    synthesis: run.synthesis ? normalizeSynthesis(run.synthesis) : run.synthesis,
  };
}
