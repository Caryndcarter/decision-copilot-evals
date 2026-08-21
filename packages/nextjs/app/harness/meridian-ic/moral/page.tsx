import { redirect } from "next/navigation";

/** Canonical multi-study hub is `/harness/findings`. */
export default function MeridianIcMoralPage() {
  redirect("/harness/findings?study=meridian-ic-moral");
}
