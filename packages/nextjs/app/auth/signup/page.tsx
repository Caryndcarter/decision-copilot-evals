import { inviteErrorMessage, verifyInviteToken } from "@/lib/invite-token";
import { SignUpBlocked, SignUpForm } from "./signup-form";

type SearchParams = Promise<{ invite?: string; error?: string }>;

export default async function SignUpPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const invite = typeof params.invite === "string" ? params.invite : "";
  const errorParam = typeof params.error === "string" ? params.error : "";

  if (!invite) {
    const message =
      errorParam === "invite_required"
        ? "New Google accounts need a valid invitation link. Ask for an invite, then open that link to continue."
        : "New accounts require an invitation link. Ask for an invite to create an account.";
    return <SignUpBlocked message={message} />;
  }

  const verified = verifyInviteToken(invite);
  if (!verified.ok) {
    return <SignUpBlocked message={inviteErrorMessage(verified.reason)} />;
  }

  return <SignUpForm invite={invite} expiresAtIso={verified.expiresAt.toISOString()} />;
}
