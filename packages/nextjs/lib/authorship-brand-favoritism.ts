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
};

export const AUTHORSHIP_BRAND_FAVORITISM_SNAPSHOT =
  snapshot as AuthorshipBrandFavoritismSnapshot;
