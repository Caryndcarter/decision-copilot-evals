import snapshot from "@/data/authorship-brand-favoritism.json";

export type BrandFavorCount = {
  high: number;
  n: number;
  mean: number;
};

export type AuthorshipBrandFavoritismSnapshot = {
  id: string;
  title: string;
  rater_note: string;
  batches: Array<{ id: string; label: string; decisions: number }>;
  decisions: number;
  peer_ratings_per_mode: number;
  remap_cells: number;
  grok_peer_high: Record<"revealed" | "blind" | "reassigned", BrandFavorCount>;
  credit_when_labeled: Record<string, BrandFavorCount & { label: string }>;
  grok_work_shown_as: Record<string, BrandFavorCount & { label: string }>;
  chatgpt_rates_grok: Record<"revealed" | "blind" | "reassigned", BrandFavorCount>;
  adequate_grok_peer_high: Record<"revealed" | "blind" | "reassigned", BrandFavorCount>;
  think_tank: {
    constrained: Record<"openai" | "anthropic" | "gemini" | "xai", string>;
    adequate: Record<"openai" | "anthropic" | "gemini" | "xai", string>;
  };
  grok_swaps: Array<{
    shown_as_key: string;
    label: string;
    n: number;
    high: number;
    mean: number;
    mean_revealed: number;
    mean_blind: number;
    lift_vs_revealed: number;
    unique_demos: number;
    chatgpt_as_rater_n: number;
    by_batch: Record<
      "constrained" | "adequate",
      {
        real_model: string;
        shown_as_model: string;
        n: number;
        high: number;
        mean: number;
        mean_revealed: number;
        lift_vs_revealed: number;
      }
    >;
  }>;
};

export const AUTHORSHIP_BRAND_FAVORITISM_SNAPSHOT =
  snapshot as AuthorshipBrandFavoritismSnapshot;
