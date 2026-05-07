/**
 * Full logo lockup: icon mark + wordmark.
 * The SVG fills the indigo box directly, matching the original inline nav style.
 */
export function LogoLockup({ className }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className ?? ""}`}>
      <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      </div>
      <span className="text-white font-semibold tracking-tight">Decision Copilot</span>
    </span>
  );
}
