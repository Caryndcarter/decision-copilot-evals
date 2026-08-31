/**
 * Maps a public case page (FINDINGS_STUDIES id) to the actual intake(s) that were
 * submitted to the harness — the /intake write-up, not a paragraph summary. The
 * findings themselves live on the story pages; the case page is the setup.
 *
 * Labels are inlined here on purpose so case pages don't import the coded moral
 * JSON (which is story-side data).
 */

import { HORMUZ_VOICE_CASES } from "@/lib/hormuz-voice-cases";
import { MERIDIAN_IC_VOICE_CASES } from "@/lib/meridian-ic-voice-cases";

export type CaseIntakeCondition = {
  id: string;
  /** Short tab label, e.g. "C2 · Confident tone". */
  label: string;
  /** One-line note on what this condition's filer prefers / changes. */
  sub?: string;
  situation: string;
  constraints: string;
  leaningDirection?: string;
  knownsAssumptions: string;
  unknowns: string;
};

export type CaseIntake = {
  scenarioTitle: string;
  intro: string;
  /** Noun for the switcher, e.g. "filer condition". */
  conditionNoun: string;
  conditions: CaseIntakeCondition[];
};

type VoiceLike = {
  id: string;
  situation: string;
  constraints: string;
  leaning_direction?: string;
  knowns_assumptions: string;
  unknowns: string;
};

function fromVoice(c: VoiceLike, label: string, sub?: string): CaseIntakeCondition {
  return {
    id: c.id,
    label,
    sub,
    situation: c.situation,
    constraints: c.constraints,
    leaningDirection: c.leaning_direction,
    knownsAssumptions: c.knowns_assumptions,
    unknowns: c.unknowns,
  };
}

const MERIDIAN_CONDITION_LABELS: { label: string; sub: string }[] = [
  { label: "C1 · LP voice", sub: "Neutral register; filer leans phased (option 2)" },
  { label: "C2 · Confident tone", sub: "Same lean, stated as settled fact" },
  { label: "C3 · Inflated urgency", sub: "Overstated cost pressure toward a faster cut" },
  { label: "C4 · Optimistic fast-path", sub: "A too-good story about capturing tribal knowledge" },
  { label: "C5 · Honest aggressive", sub: "Openly names the human cost, no false premise" },
];

const HORMUZ_CONDITION_LABELS: { label: string; sub: string }[] = [
  { label: "C1 · Shipping-company voice", sub: "Provisional lean; crew risk present but decentered" },
  { label: "C2 · Confident tone", sub: "Same facts, stated as a settled commercial call" },
  { label: "C3 · False urgency", sub: "\u201crelationship doesn\u2019t come back\u201d vs an in-doc first-refusal clause" },
  { label: "C4 · Safety-adjacent false claim", sub: "\u201cnear-peacetime\u201d risk next to a ~100\u00d7 premium" },
  { label: "C5 · Honest unapologetic", sub: "Names the crew-risk tradeoff openly" },
];

const MERIDIAN_INTAKE: CaseIntake = {
  scenarioTitle: "Civitas modernization \u2014 investment-committee intake",
  intro:
    "The same Civitas decision, filed five ways. Every condition below is a real intake submitted to the harness; the facts are held constant and only the framing changes.",
  conditionNoun: "filer condition",
  conditions: MERIDIAN_IC_VOICE_CASES.map((c, i) =>
    fromVoice(c, MERIDIAN_CONDITION_LABELS[i]?.label ?? `C${i + 1}`, MERIDIAN_CONDITION_LABELS[i]?.sub)
  ),
};

const HORMUZ_INTAKE: CaseIntake = {
  scenarioTitle: "Strait of Hormuz routing \u2014 Meran Tankers intake",
  intro:
    "One shipping decision, filed five ways. The casualty figures, premium, and fleet facts stay identical throughout; only how the company frames the ask changes.",
  conditionNoun: "filer condition",
  conditions: HORMUZ_VOICE_CASES.map((c, i) =>
    fromVoice(c, HORMUZ_CONDITION_LABELS[i]?.label ?? `C${i + 1}`, HORMUZ_CONDITION_LABELS[i]?.sub)
  ),
};

/** The single Civitas LP-voice intake, reused by the replication and budget cases. */
const CIVITAS_NEUTRAL = MERIDIAN_IC_VOICE_CASES[0];

const CIVITAS_REPLICATION_INTAKE: CaseIntake = {
  scenarioTitle: "Civitas modernization \u2014 investment-committee intake",
  intro:
    "The single intake that was run five times, end to end, for the replication study \u2014 intake, research, variant, and Unified Brief synthesis on every trial.",
  conditionNoun: "scenario",
  conditions: [fromVoice(CIVITAS_NEUTRAL, "The scenario, as submitted")],
};

const AUTHORSHIP_BUDGET_INTAKE: CaseIntake = {
  scenarioTitle: "Civitas modernization \u2014 investment-committee intake",
  intro:
    "The Civitas intake whose synthesized Unified Briefs were re-analyzed for contribution credit under different token budgets.",
  conditionNoun: "scenario",
  conditions: [fromVoice(CIVITAS_NEUTRAL, "The scenario, as submitted")],
};

const CASE_INTAKES: Record<string, CaseIntake> = {
  "meridian-ic": MERIDIAN_INTAKE,
  hormuz: HORMUZ_INTAKE,
  "civitas-replication": CIVITAS_REPLICATION_INTAKE,
  "authorship-budget-conditions": AUTHORSHIP_BUDGET_INTAKE,
};

export function getCaseIntake(studyId: string): CaseIntake | undefined {
  return CASE_INTAKES[studyId];
}
