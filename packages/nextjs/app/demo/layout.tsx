import type { Metadata } from "next";
import { DemoShell } from "@/app/demo/_components/demo-shell";

export const metadata: Metadata = {
  title: "Demo — Decision Copilot",
  description: "Walk through a frozen sample decision using the real product UI.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoShell>{children}</DemoShell>;
}
