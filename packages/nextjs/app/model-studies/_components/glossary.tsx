const GLOSSARY: { term: string; def: string }[] = [
  {
    term: "Filer",
    def: "The person the case file is written as — someone who has already leaned toward one option before asking for advice.",
  },
  {
    term: "Intake",
    def: "The situation, constraints, and question as originally submitted — the input every model responds to.",
  },
  {
    term: "Decision Brief",
    def: "One model's own structured response to an intake — its analysis and recommendation, on its own.",
  },
  {
    term: "Unified Brief",
    def: "A single combined recommendation produced by merging several models' Decision Briefs into one.",
  },
  {
    term: "Synthesizer",
    def: "The model doing the merging — the one that produces the Unified Brief from the others' Decision Briefs.",
  },
  {
    term: "Harness",
    def: "The automated pipeline that runs a case through every model and collects the results — the machinery behind a study.",
  },
  {
    term: "Case file",
    def: "One specific scenario used as a test. A study is usually built from several of these.",
  },
  {
    term: "Test type",
    def: "The broad question being investigated — e.g. does filer voice change model behavior? The category a study belongs to.",
  },
  {
    term: "Study",
    def: "One specific test of a test type's question — a defined set of case files, run and reported together.",
  },
  {
    term: "Judge model",
    def: "The model that scores each brief against the rubric, kept blind to which provider wrote it.",
  },
  {
    term: "Blind coding",
    def: "Scoring a brief without being told which model produced it, so the score can't be influenced by a model's reputation or brand.",
  },
];

/**
 * Collapsible reference for the terms used throughout Model Studies. Plain
 * <details>/<summary> — no JS, keyboard-accessible by default.
 */
export function Glossary() {
  return (
    <details className="group rounded-xl border border-zinc-200 bg-white open:pb-2">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-zinc-900 marker:content-none flex items-center justify-between">
        Glossary — terms used on this site
        <span className="text-zinc-400 transition-transform group-open:rotate-180">▾</span>
      </summary>
      <dl className="grid gap-4 px-5 pb-3 pt-1 sm:grid-cols-2">
        {GLOSSARY.map((g) => (
          <div key={g.term}>
            <dt className="text-sm font-semibold text-zinc-800">{g.term}</dt>
            <dd className="mt-0.5 text-sm leading-relaxed text-zinc-500">{g.def}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
