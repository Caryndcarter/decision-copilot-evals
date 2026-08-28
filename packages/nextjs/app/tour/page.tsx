import type { Metadata } from "next";
import Link from "next/link";
import { AppNavBrand } from "@/app/components/app-nav-brand";
import { SessionNav } from "@/app/components/session-nav";
import { TourWizard } from "@/app/tour/_components/tour-wizard";

export const metadata: Metadata = {
  title: "Product tour — Decision Copilot",
  description:
    "See how Decision Copilot turns a real decision into multi-model analysis and a synthesized brief — no sign-up required.",
};

export default function TourPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Nav — matches the app chrome */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <AppNavBrand />
          <SessionNav />
        </div>
      </nav>

      {/* Intro */}
      <section className="border-b border-white/5 bg-zinc-950 pt-12 pb-6">
        <div className="mx-auto max-w-3xl px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            Interactive tour · no sign-up · a real, frozen example
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            See your think tank work a real decision.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
            Walk through a genuine multi-model run — from intake, to clarifying questions, to a
            structured brief, to a synthesized recommendation across four models. This is frozen
            example output, so you can explore the whole flow without an account.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            Ready to use it for real?{" "}
            <Link href="/request-access" className="font-medium text-indigo-400 hover:text-indigo-300">
              Request access →
            </Link>
          </p>
        </div>
      </section>

      <TourWizard />
    </div>
  );
}
