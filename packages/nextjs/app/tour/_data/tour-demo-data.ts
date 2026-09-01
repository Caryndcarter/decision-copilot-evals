/**
 * Frozen demo content for `/tour` and `/demo/*`.
 *
 * This barrel selects which scenario the product tour runs. Shared types and
 * labels come from `./tour-demo-types`; the scenario content comes from one of
 * the sibling dataset modules.
 *
 * ── To swap the active scenario ──────────────────────────────────────────────
 * Change the single content re-export line below.
 *   Active:   Meran Tankers — Strait of Hormuz routing
 *   Archived: Vercel → AWS migration  (./tour-demo-data-vercel-aws)
 *
 * e.g. to restore the Vercel/AWS tour, replace
 *   export * from "./tour-demo-data-meran-tankers";
 * with
 *   export * from "./tour-demo-data-vercel-aws";
 * ─────────────────────────────────────────────────────────────────────────────
 */

export * from "./tour-demo-types";
export * from "./tour-demo-data-meran-tankers";
