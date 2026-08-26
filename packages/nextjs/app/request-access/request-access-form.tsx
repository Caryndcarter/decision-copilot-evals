"use client";

import { useState } from "react";
import Link from "next/link";
import { AppNavBrand } from "@/app/components/app-nav-brand";
import { HONEYPOT_FIELD_NAME } from "@/lib/invite-request-guard";

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <AppNavBrand />
        </div>
      </nav>
      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </main>
  );
}

// Captured once, when the component first renders — the server checks this
// wasn't submitted implausibly fast. See lib/invite-request-guard.ts.
const renderedAt = Date.now();

export function RequestAccessForm() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/invite-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          reason,
          renderedAt,
          [HONEYPOT_FIELD_NAME]: honeypot,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      // Always the same success state, whether this was a new request, a
      // repeat of an existing one, or silently dropped as spam — nothing
      // here should let a bot (or a curious human) tell those apart.
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <AuthShell>
        <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Request sent</h1>
          <p className="mt-3 text-sm text-zinc-500">
            If it&apos;s approved, you&apos;ll get an invitation link at that email address from
            Finlayson Studio.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            Back home
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Request access</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Accounts are invite-only. Tell us who you are and we&apos;ll follow up.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-zinc-700">
              What are you hoping to use it for?{" "}
              <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="A sentence or two is plenty"
            />
          </div>

          {/* Honeypot — hidden from real users, most bots fill every field they find. */}
          <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor={HONEYPOT_FIELD_NAME}>Company website</label>
            <input
              id={HONEYPOT_FIELD_NAME}
              name={HONEYPOT_FIELD_NAME}
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
          >
            {loading ? "Sending…" : "Request access"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an invite?{" "}
          <Link href="/auth/signin" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
