import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DynamoDBAdapter } from "@auth/dynamodb-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { dynamo, AUTH_TABLE } from "@/server/config/dynamodb";
import { findUserByEmail } from "@/lib/db/users";
import { INVITE_COOKIE_NAME, verifyInviteToken } from "@/lib/invite-token";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DynamoDBAdapter(dynamo, { tableName: AUTH_TABLE }),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await findUserByEmail(String(credentials.email));
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(String(credentials.password), user.passwordHash);
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          is_admin: user.is_admin ?? false,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      const email = user.email;
      if (!email) return false;

      const existing = await findUserByEmail(email);
      if (existing) return true;

      const jar = await cookies();
      const invite = jar.get(INVITE_COOKIE_NAME)?.value;
      const verified = verifyInviteToken(invite);
      if (!verified.ok) {
        return "/auth/signup?error=invite_required";
      }
      jar.delete(INVITE_COOKIE_NAME);
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.is_admin = (user as { is_admin?: boolean }).is_admin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as { is_admin?: boolean }).is_admin = token.is_admin as boolean;
      }
      return session;
    },
  },
});
