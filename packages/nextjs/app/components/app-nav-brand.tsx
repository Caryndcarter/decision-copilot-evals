import Link from "next/link";
import { LogoLockup } from "@/app/components/logo-icon";

/** Logo + Model Studies link — left side of the dark app nav (matches homepage). */
export function AppNavBrand() {
  return (
    <div className="flex items-center gap-6">
      <Link href="/" className="flex items-center gap-2">
        <LogoLockup />
      </Link>
      <Link
        href="/model-studies"
        className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
      >
        Model Studies
      </Link>
    </div>
  );
}
