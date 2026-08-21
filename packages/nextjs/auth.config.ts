import type { NextAuthConfig } from "next-auth";

const isProd = process.env.NODE_ENV === "production";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  cookies: {
    sessionToken: {
      // Port-suffixed locally to avoid collisions; stable name in production (e.g. Vercel).
      name: isProd
        ? "next-auth.session-token"
        : `next-auth.session-token.${process.env.PORT || "5001"}`,
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

      // Decision + admin APIs require a session (401 when unauthenticated).
      if (path.startsWith("/api/decision") || path.startsWith("/api/admin")) {
        return isLoggedIn;
      }

      const isProtectedPage =
        path === "/" ||
        path.startsWith("/admin") ||
        path.startsWith("/harness") ||
        path.startsWith("/intake") ||
        path.startsWith("/run") ||
        path.startsWith("/runs");

      if (isProtectedPage && !isLoggedIn) {
        const url = new URL("/auth/signin", nextUrl.origin);
        url.searchParams.set("callbackUrl", path === "/" ? "/runs" : path);
        return Response.redirect(url);
      }
      return true;
    },
  },
  providers: [],
};
