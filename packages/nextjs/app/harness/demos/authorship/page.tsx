import { redirect } from "next/navigation";

/** Canonical multi-study hub is `/harness/findings`. */
export default function AuthorshipHarnessSummaryPage() {
  redirect("/harness/findings?study=multi-demo-authorship");
}
