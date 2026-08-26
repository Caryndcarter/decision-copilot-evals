import type { Metadata } from "next";
import { RequestAccessForm } from "./request-access-form";

export const metadata: Metadata = {
  title: "Request access — Decision Copilot",
  description: "Accounts are invite-only. Request an invitation.",
};

export default function RequestAccessPage() {
  return <RequestAccessForm />;
}
