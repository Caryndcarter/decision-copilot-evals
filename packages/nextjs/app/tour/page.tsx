import type { Metadata } from "next";
import Link from "next/link";
import { AppNavBrand } from "@/app/components/app-nav-brand";
import { SessionNav } from "@/app/components/session-nav";
import { TourDemo } from "@/app/tour/_components/tour-demo";

export const metadata: Metadata = {
  title: "Product tour — Decision Copilot",
  description:
    "Walk through a frozen multi-model decision run — intake, clarifying questions, individual briefs, and a unified synthesis.",
};

export default function TourPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <AppNavBrand />
          <SessionNav />
        </div>
      </nav>

      <section className="border-b border-zinc-200 bg-white pt-10 pb-6">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Interactive tour · no sign-up
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 lg:text-3xl">
            See your think tank work a decision
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
            Click through the same flow as a live run — pre-filled intake, follow-up questions, four model
            briefs, and a unified recommendation. Nothing hits the API.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            <Link href="/request-access" className="font-medium text-indigo-600 hover:text-indigo-700">
              Request access
            </Link>{" "}
            to run your own decisions.
          </p>
        </div>
      </section>

      <TourDemo />
    </div>
  );
}
