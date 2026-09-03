import type { NextAuthConfig } from "next-auth";

const isProd = process.env.NODE_ENV === "production";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  cookies: {
    sessionToken: {
      // Port-suffixed locally to avoid collisions; stable name in production (e.g. Vercel).
      name: isProd
        ? "next-auth.session-token"
        : `next-auth.session-token.${process.env.PORT || "5002"}`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      // Public: health checks only (api/auth is already excluded by the proxy matcher).
      if (path === "/api/health") {
        return true;
      }

      // Decision + admin + researcher harness APIs require a session (401 when unauthenticated).
      if (
        path.startsWith("/api/decision") ||
        path.startsWith("/api/admin") ||
        path.startsWith("/api/harness")
      ) {
        return isLoggedIn;
      }

      // Public marketing / demo paths (no sign-in).
      if (path.startsWith("/demo") || path.startsWith("/tour")) {
        return true;
      }

      // /intake is publicly viewable so visitors can see how a decision starts;
      // the underlying /api/decision calls still require a session (401), so a
      // logged-out visitor can explore the form but cannot start a real run.
      const isProtectedPage =
        path.startsWith("/admin") ||
        path.startsWith("/harness") ||
        path.startsWith("/run") ||
        path.startsWith("/runs");

      if (isProtectedPage && !isLoggedIn) {
        const url = new URL("/auth/signin", nextUrl.origin);
        url.searchParams.set("callbackUrl", path);
        return Response.redirect(url);
      }
      return true;
    },
  },
  providers: [],
};
