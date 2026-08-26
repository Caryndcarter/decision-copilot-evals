import { redirect } from "next/navigation";

/** Canonical multi-study hub is `/harness/findings`. */
export default function CivitasMoralPage() {
  redirect("/harness/findings?study=civitas-replication-moral");
}
