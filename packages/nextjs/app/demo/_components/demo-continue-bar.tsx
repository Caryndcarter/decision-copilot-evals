import type { ReactNode } from "react";
import Link from "next/link";
import { demoContentClass } from "@/app/demo/_components/demo-shell";

type BackLink = { href: string; label: string };

type ForwardLink = {
  href: string;
  label: string;
  spot?: string;
};

type ForwardSubmit = {
  form: string;
  label: string;
  spot?: string;
};

type ForwardButton = {
  onClick: () => void;
  label: string;
  spot?: string;
};

export function DemoContinueBar({
  back,
  forward,
  className = "",
}: {
  back?: BackLink;
  forward: ForwardLink | ForwardSubmit | ForwardButton;
  className?: string;
}) {
  const spot = "spot" in forward ? forward.spot : undefined;
  const forwardClass =
    "rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700";

  let forwardEl: ReactNode;
  if ("href" in forward) {
    forwardEl = (
      <Link href={forward.href} data-demo-spot={spot} className={forwardClass}>
        {forward.label}
      </Link>
    );
  } else if ("form" in forward) {
    forwardEl = (
      <button type="submit" form={forward.form} data-demo-spot={spot} className={forwardClass}>
        {forward.label}
      </button>
    );
  } else {
    forwardEl = (
      <button type="button" onClick={forward.onClick} data-demo-spot={spot} className={forwardClass}>
        {forward.label}
      </button>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-zinc-200 py-4 ${demoContentClass} ${className}`}
    >
      {back ? (
        <Link href={back.href} className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
          {back.label}
        </Link>
      ) : (
        <span />
      )}
      {forwardEl}
    </div>
  );
}
