"use client";

import { useCallback, useEffect, useState } from "react";

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  is_admin: boolean;
  created_at?: string;
};

type PendingRequest = {
  id: string;
  email: string;
  reason: string | null;
  created_at: string;
};

type ResolvedRequest = { url: string; expiresAt: string; copied: boolean };

export function AdminPanel({ currentUserEmail }: { currentUserEmail: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  const [inviteDays, setInviteDays] = useState(7);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Record<string, ResolvedRequest>>({});

  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/invite-requests");
      const data = (await res.json()) as {
        ok?: boolean;
        requests?: PendingRequest[];
        error?: string;
      };
      if (!res.ok || !data.ok || !data.requests) {
        setError(data.error || "Failed to load requests.");
        return;
      }
      setRequests(data.requests);
    } catch {
      setError("Failed to load requests.");
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function approveRequest(id: string) {
    setBusyRequestId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/invite-requests/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        url?: string;
        expiresAt?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.url || !data.expiresAt) {
        setError(data.error || "Failed to approve request.");
        return;
      }
      setResolved((prev) => ({
        ...prev,
        [id]: { url: data.url!, expiresAt: data.expiresAt!, copied: false },
      }));
    } catch {
      setError("Failed to approve request.");
    } finally {
      setBusyRequestId(null);
    }
  }

  async function denyRequest(id: string) {
    setBusyRequestId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/invite-requests/${id}/deny`, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to deny request.");
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError("Failed to deny request.");
    } finally {
      setBusyRequestId(null);
    }
  }

  async function copyResolvedUrl(id: string) {
    const entry = resolved[id];
    if (!entry) return;
    try {
      await navigator.clipboard.writeText(entry.url);
      setResolved((prev) => ({ ...prev, [id]: { ...entry, copied: true } }));
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  const loadUsers = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      const data = (await res.json()) as { ok?: boolean; users?: AdminUser[]; error?: string };
      if (!res.ok || !data.ok || !data.users) {
        setError(data.error || "Failed to load users.");
        return;
      }
      setUsers(data.users);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function toggleAdmin(user: AdminUser) {
    const next = !user.is_admin;
    setBusyEmail(user.email);
    setError(null);
    try {
      const res = await fetch("/api/admin/users/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, is_admin: next }),
      });
      const data = (await res.json()) as { ok?: boolean; user?: AdminUser; error?: string };
      if (!res.ok || !data.ok || !data.user) {
        setError(data.error || "Failed to update admin flag.");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.email === data.user!.email ? { ...u, is_admin: data.user!.is_admin } : u))
      );
    } catch {
      setError("Failed to update admin flag.");
    } finally {
      setBusyEmail(null);
    }
  }

  async function createInvite() {
    setInviteBusy(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: inviteDays }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        url?: string;
        expiresAt?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.url) {
        setError(data.error || "Failed to create invite.");
        return;
      }
      setInviteUrl(data.url);
      setInviteExpiresAt(data.expiresAt ?? null);
    } catch {
      setError("Failed to create invite.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  const selfEmail = currentUserEmail.toLowerCase().trim();

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Create invite</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Mint an expiring signup link. Share it privately — anyone with the link can create an
          account until it expires.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="invite-days" className="block text-sm font-medium text-zinc-700">
              Days valid
            </label>
            <input
              id="invite-days"
              type="number"
              min={1}
              max={90}
              value={inviteDays}
              onChange={(e) => setInviteDays(Math.max(1, Number(e.target.value) || 1))}
              className="mt-1.5 w-24 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={() => void createInvite()}
            disabled={inviteBusy}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {inviteBusy ? "Creating…" : "Create invite"}
          </button>
        </div>
        {inviteUrl && (
          <div className="mt-4 space-y-2">
            {inviteExpiresAt && (
              <p className="text-xs text-zinc-500">
                Expires {new Date(inviteExpiresAt).toLocaleString()}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                readOnly
                value={inviteUrl}
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-800"
              />
              <button
                type="button"
                onClick={() => void copyInvite()}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">
          Requests
          {requests.length > 0 && (
            <span className="ml-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              {requests.length} pending
            </span>
          )}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          From the public request-access form. Approving mints a 7-day invite scoped to that
          email — copy it and send it yourself, nothing is emailed automatically.
        </p>

        {requestsLoading ? (
          <p className="mt-6 text-sm text-zinc-500">Loading requests…</p>
        ) : requests.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">No pending requests.</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {requests.map((r) => {
              const done = resolved[r.id];
              return (
                <li key={r.id} className="rounded-lg border border-zinc-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{r.email}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {new Date(r.created_at).toLocaleString()}
                      </p>
                      {r.reason && (
                        <p className="mt-2 max-w-md text-sm text-zinc-600">{r.reason}</p>
                      )}
                    </div>
                    {!done && (
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => void approveRequest(r.id)}
                          disabled={busyRequestId === r.id}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busyRequestId === r.id ? "…" : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void denyRequest(r.id)}
                          disabled={busyRequestId === r.id}
                          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Deny
                        </button>
                      </div>
                    )}
                  </div>
                  {done && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-zinc-500">
                        Approved · expires {new Date(done.expiresAt).toLocaleString()}
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                        <input
                          readOnly
                          value={done.url}
                          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-800"
                        />
                        <button
                          type="button"
                          onClick={() => void copyResolvedUrl(r.id)}
                          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          {done.copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Users</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Toggle admin to grant broader run visibility. Recipients must sign out and back in for
          their session to update.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-zinc-500">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">No users yet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Admin</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.email.toLowerCase() === selfEmail;
                  return (
                    <tr key={user.id} className="border-b border-zinc-100">
                      <td className="py-3 pr-4 text-zinc-900">{user.email}</td>
                      <td className="py-3 pr-4 text-zinc-600">{user.name || "—"}</td>
                      <td className="py-3 pr-4">
                        {user.is_admin ? (
                          <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            Admin
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          disabled={busyEmail === user.email || (isSelf && user.is_admin)}
                          title={
                            isSelf && user.is_admin
                              ? "You cannot remove your own admin flag here"
                              : undefined
                          }
                          onClick={() => void toggleAdmin(user)}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busyEmail === user.email
                            ? "Saving…"
                            : user.is_admin
                              ? "Revoke admin"
                              : "Make admin"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}
    </div>
  );
}
