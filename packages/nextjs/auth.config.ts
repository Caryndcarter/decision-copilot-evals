import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  cookies: {
    sessionToken: {
      name: `next-auth.session-token.${process.env.PORT || "5001"}`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: false },
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected =
        nextUrl.pathname.startsWith("/admin") ||
        nextUrl.pathname.startsWith("/intake") ||
        nextUrl.pathname.startsWith("/run") ||
        nextUrl.pathname.startsWith("/runs");
      if (isProtected && !isLoggedIn) {
        const url = new URL("/auth/signin", nextUrl.origin);
        url.searchParams.set("callbackUrl", nextUrl.pathname);
        return Response.redirect(url);
      }
      return true;
    },
  },
  providers: [],
};
