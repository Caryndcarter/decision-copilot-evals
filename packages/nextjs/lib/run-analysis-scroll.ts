/**
 * Scroll the main analysis column to the relevant block after switching
 * base vs variant (Analysis versions buttons on chat/result pages).
 */
export function scrollToAnalysisVersion(variantId: string | null, hasCustomSections = false): void {
  if (typeof document === "undefined") return;
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (variantId && hasCustomSections) {
        document.getElementById("rc-variant-sections")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (variantId) {
        document.getElementById("rc-brief")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        document.getElementById("rc-decision-brief-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);
  });
}
