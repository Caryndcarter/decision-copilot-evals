/**
 * Multi-demo authorship moral coding (generic Unified Brief audit)
 *
 * Blind-audits every Unified Brief in a multi-demo-authorship harness batch
 * (synthesizer × open/blind/reassigned) with the product 8-dimension rubric.
 * Persists audits onto the decision persist run and writes a report JSON.
 *
 * From repo root:
 *   npm run harness:demos:authorship:moral -- --batch-id=<uuid>
 *   npm run harness:demos:authorship:moral -- --user-email=you@example.com
 *   npm run harness:demos:authorship:moral -- --decision-id=<uuid>[,uuid…]
 *
 * Env:
 *   UNIFIED_BRIEF_AUDIT_JUDGE=anthropic   # default
 *   MORAL_CONCURRENCY=3
 */

import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEMO_HARNESS_CASES } from "../lib/demo-harness-cases";
import { getRun, getRunsByDecisionId, listRunsForUser, replaceRun } from "../lib/db/runs";
import { findUserByEmail } from "../lib/db/users";
import {
  consolidateUnifiedAuthorshipOntoRun,
  pickPersistRunForUnifiedBrief,
} from "../lib/unified-brief-persist-run";
import {
  getUnifiedBriefAuditForAuthor,
  getUnifiedBriefForAuthor,
  mergeUnifiedBriefAuditIntoRun,
  UNIFIED_BRIEF_SYNTHESIZERS,
  type UnifiedBriefSynthesizer,
} from "../lib/unified-briefs";
import { runUnifiedBriefAudit } from "../lenses/unified-brief-audit";
import type {
  DecisionRunResult,
  UnifiedBriefAudit,
  UnifiedBriefAuthorshipMode,
} from "../types/decision";

const AUTHORSHIP_MODES: UnifiedBriefAuthorshipMode[] = ["open", "blind", "reassigned"];

type AuditJob = {
  decision_id: string;
  demo_id: string;
  demo_label: string;
  harness_trial?: number;
  harness_batch_id?: string;
  synthesizer: UnifiedBriefSynthesizer;
  mode: UnifiedBriefAuthorshipMode;
};

type AuditItem = AuditJob & {
  ok: boolean;
  error?: string;
  codes?: UnifiedBriefAudit["codes"];
  generated_at?: string;
};

function log(msg: string, extra?: unknown) {
  const ts = new Date().toISOString().slice(11, 19);
  if (extra !== undefined) console.log(`[${ts}] ${msg}`, extra);
  else console.log(`[${ts}] ${msg}`);
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function parseArgs(argv: string[]) {
  const get = (name: string) => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : undefined;
  };
  return {
    batchId: (get("batch-id") ?? process.env.HARNESS_BATCH_ID ?? "").trim(),
    userEmail: (get("user-email") ?? process.env.HARNESS_USER_EMAIL ?? "").trim(),
    decisionIds: (get("decision-id") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    concurrency: Number(get("concurrency") ?? process.env.MORAL_CONCURRENCY ?? 3),
    force: argv.includes("--force"),
  };
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) || 1 }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
  return results;
}

function demoMeta(run: DecisionRunResult): { demo_id: string; demo_label: string } {
  const id = run.demo_scenario_id ?? "unknown";
  const label = DEMO_HARNESS_CASES.find((c) => c.id === id)?.label ?? id;
  return { demo_id: id, demo_label: label };
}

async function collectJobs(args: ReturnType<typeof parseArgs>): Promise<AuditJob[]> {
  const decisionIds = new Set<string>();

  for (const id of args.decisionIds) decisionIds.add(id);

  if (args.userEmail) {
    const user = await findUserByEmail(args.userEmail);
    if (!user) throw new Error(`User not found: ${args.userEmail}`);
    const runs = await listRunsForUser(user.id, { limit: 500 });
    for (const run of runs) {
      if (!run.harness_run) continue;
      const isAuthorship =
        run.harness_kind === "multi-demo-authorship" ||
        (!run.harness_kind &&
          !!run.demo_scenario_id &&
          DEMO_HARNESS_CASES.some((c) => c.id === run.demo_scenario_id));
      if (!isAuthorship) continue;
      if (args.batchId && run.harness_batch_id !== args.batchId) continue;
      decisionIds.add(run.decision_id);
    }
  } else if (args.batchId) {
    throw new Error("Pass --user-email=… with --batch-id=… (batch filter needs a user run list).");
  }

  if (decisionIds.size === 0) {
    throw new Error("No decisions found. Pass --user-email and/or --decision-id=…");
  }

  const jobs: AuditJob[] = [];
  for (const decision_id of decisionIds) {
    const runs = await getRunsByDecisionId(decision_id);
    const persist = pickPersistRunForUnifiedBrief(runs);
    if (!persist) continue;
    const { demo_id, demo_label } = demoMeta(persist);
    for (const synthesizer of UNIFIED_BRIEF_SYNTHESIZERS) {
      for (const mode of AUTHORSHIP_MODES) {
        const brief = getUnifiedBriefForAuthor(persist, synthesizer, mode);
        if (!brief) continue;
        jobs.push({
          decision_id,
          demo_id,
          demo_label,
          harness_trial: persist.harness_trial,
          harness_batch_id: persist.harness_batch_id,
          synthesizer,
          mode,
        });
      }
    }
  }
  return jobs;
}

async function auditOne(job: AuditJob, force: boolean): Promise<AuditItem> {
  const key = `${job.demo_id} · ${job.synthesizer}/${job.mode}`;
  try {
    const runs = await getRunsByDecisionId(job.decision_id);
    const persist = pickPersistRunForUnifiedBrief(runs);
    if (!persist) throw new Error("Persist run missing");
    const brief = getUnifiedBriefForAuthor(persist, job.synthesizer, job.mode);
    if (!brief) throw new Error("Brief missing");

    if (!force) {
      const existing = getUnifiedBriefAuditForAuthor(persist, job.synthesizer, job.mode);
      if (existing?.codes) {
        log(`skip (exists) ${key}`);
        return {
          ...job,
          ok: true,
          codes: existing.codes,
          generated_at: existing.generated_at,
        };
      }
    }

    log(`audit → ${key}`);
    const audit = await runUnifiedBriefAudit(persist.intake, brief);
    const fresh = (await getRun(persist.run_id)) ?? persist;
    const latest = await getRunsByDecisionId(job.decision_id);
    let base = consolidateUnifiedAuthorshipOntoRun(fresh, latest);
    base = mergeUnifiedBriefAuditIntoRun(base, job.synthesizer, audit, job.mode);
    await replaceRun(persist.run_id, base);
    log(`wrote ${key}`);
    return {
      ...job,
      ok: true,
      codes: audit.codes,
      generated_at: audit.generated_at,
    };
  } catch (err) {
    const message = errMessage(err);
    log(`FAILED ${key}`, message);
    return { ...job, ok: false, error: message };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const concurrency = Math.max(1, Math.floor(args.concurrency) || 3);
  log("Multi-demo authorship moral coding (generic Unified Brief audit)");
  log(`  batch-id: ${args.batchId || "(any authorship for user)"}`);
  log(`  user: ${args.userEmail || "(none)"}`);
  log(`  concurrency: ${concurrency}`);
  log(`  force: ${args.force}`);

  const jobs = await collectJobs(args);
  log(`  jobs: ${jobs.length}`);
  if (jobs.length === 0) {
    console.error("Nothing to audit.");
    process.exit(1);
  }

  const items = await mapPool(jobs, concurrency, (job) => auditOne(job, args.force));
  const ok = items.filter((i) => i.ok).length;
  const failed = items.length - ok;

  const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "output");
  await mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(outDir, `multi-demo-authorship-moral-${stamp}.json`);
  await writeFile(
    outPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        study: "multi-demo-authorship",
        rubric: "generic-v1",
        harness_batch_id: args.batchId || undefined,
        summary: { total: items.length, ok, failed },
        items,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`\nMoral audits: ${ok}/${items.length} ok (${failed} failed)`);
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
