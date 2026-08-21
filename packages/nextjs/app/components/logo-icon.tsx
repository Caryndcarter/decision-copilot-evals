/**
 * Full logo lockup: brand mark + wordmark.
 * Mark is the periwinkle app-icon brain from the color/design update.
 */
export function LogoLockup({ className }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-mark.png"
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 shrink-0 rounded-lg object-contain"
      />
      <span className="text-white font-semibold tracking-tight">Decision Copilot</span>
    </span>
  );
}
