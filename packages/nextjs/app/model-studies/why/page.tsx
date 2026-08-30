import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "../_components/site-nav";

export const metadata: Metadata = {
  title: "Why it matters — Model Studies",
  description: "Why we publish blind-coded model behavior instead of just claiming it.",
};

export default function WhyPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteNav />

      <section className="bg-zinc-950 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-400">
            The pitch
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white tracking-tight leading-tight sm:text-4xl">
            An AI that agrees with you isn&apos;t the same as an AI that&apos;s right
          </h1>
        </div>
      </section>

      <section className="bg-white py-16 border-b border-zinc-100">
        <div className="mx-auto max-w-3xl px-6 space-y-6 text-sm leading-relaxed text-zinc-600">
          <p>
            This site publishes blind-coded studies of how frontier AI models behave under one
            specific kind of pressure: a filer who has already leaned toward a decision, asking
            for advice anyway. Every case runs through several models, a judge model scores what
            came back against a fixed rubric, and the judge never sees which provider wrote which
            brief. That&apos;s the discipline the rest of this page is arguing for — because most
            claims about AI models catching each other&apos;s mistakes are feature descriptions, a
            product bullet point, not a tested result.
          </p>
          <p>
            Sycophancy — telling the decision-maker what they already believe instead of what they
            need to hear — is the specific failure mode our Voice Influence studies are built to
            catch. It&apos;s a different question from catching a hallucination: hallucination-checking
            asks whether a claim is true; sycophancy-checking asks whether the model is bending
            toward what the filer already wants to hear, true or not. Our studies focus on the
            second question today, since it&apos;s easier for a product to claim it&apos;s solved than
            to actually show its work — that&apos;s a choice of where we started, not a ceiling.
            Authorship studies test something related but distinct: whether a synthesizer&apos;s own
            judgment shifts based on which brand wrote the analysis it&apos;s combining, independent
            of the filer&apos;s opinion. Replication studies test something different again — whether
            the same synthesizer gives you the same answer twice. Fact-checking isn&apos;t part of
            the rubric yet; nothing about this design rules it out.
          </p>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
            <h2 className="text-sm font-semibold text-zinc-900">Grounded in existing research</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Sycophancy isn&apos;t a novel claim. Sharma et al. (2023), &ldquo;Towards
              Understanding Sycophancy in Language Models&rdquo; (Anthropic, arXiv:2310.13548),
              found the behavior across RLHF-trained assistants from multiple providers, and
              traced part of the cause to human preference data itself rewarding agreement over
              truthfulness. Perez et al. (2022), &ldquo;Discovering Language Model Behaviors with
              Model-Written Evaluations&rdquo; (arXiv:2212.09251), set the methodological
              precedent for model-written, systematically judged evaluations like the ones on this
              site. What&apos;s specific here isn&apos;t the phenomenon — it&apos;s testing it
              against a fixed decision rubric, with blind multi-model coding, on
              adversarially-framed intakes built to read like a real high-stakes call, not a chat
              turn. (Wei et al., 2023, &ldquo;Simple Synthetic Data Reduces Sycophancy in Large
              Language Models,&rdquo; is the closest published attempt at fixing this rather than
              just measuring it.)
            </p>
          </div>

          <h2 className="text-sm font-semibold text-zinc-900">
            The same bias risk shows up in the judge, not just the model
          </h2>
          <p>
            Sycophancy is usually framed as a problem between a model and a user — the model tells
            you what you want to hear. But the same underlying mechanism — preference for the
            familiar over the correct — threatens the step where multiple models&apos; work gets
            combined into one answer. A synthesizer that can see which provider wrote which
            analysis is positioned to develop its own version of that bias: favoring a familiar
            brand&apos;s phrasing, or its own outputs, independent of whether the reasoning
            underneath is actually stronger. Groupthink and conformity research (Asch&apos;s
            conformity experiments; Janis&apos;s work on groupthink) shows the same pattern in
            humans — once identity or authorship is visible, judgment starts tracking the source
            instead of the argument.
          </p>
          <p>
            So Decision Copilot&apos;s synthesizer is blind by default: it never sees which model
            produced which piece of analysis it&apos;s combining, only the reasoning itself.
            Revealed authorship (standard) and reassigned authorship — where the synthesizer sees
            real or deliberately relabeled provider identities — exist as research modes, used to
            test whether visibility changes what a synthesizer keeps or discards. That&apos;s the
            same question the sycophancy literature asks about individual models, asked again one
            layer up: does knowing the source change the judgment, even when the underlying
            reasoning hasn&apos;t changed at all.
          </p>

          <p>
            It&apos;s also why{" "}
            <Link href="/intake" className="font-semibold text-indigo-600 hover:text-indigo-800">
              Decision Copilot
            </Link>{" "}
            runs every decision through the same fixed rubric — Risk, Reversibility, Stakeholders —
            instead of a menu of conversation styles. A fixed rubric is what makes a study like
            this possible in the first place: you can only compare models against each other, and
            against themselves over time, if every brief is built the same way. Each study&apos;s
            own rubric on this site — premise_audit, filer_alignment, and the rest — is really Risk,
            Reversibility, and Stakeholders translated into that scenario&apos;s specific pressure
            test: does the brief catch the risk everyone&apos;s ignoring, keep the door open before
            committing, and say plainly who bears the downside. The studies on this site and the
            product are the same bet, just pointed in two directions — one at the models, one at
            your decision.
          </p>
        </div>
      </section>

      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
            See it on your own decision
          </h2>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link
              href="/intake"
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Start a decision →
            </Link>
            <Link
              href="/model-studies/results"
              className="rounded-lg border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Back to results
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
