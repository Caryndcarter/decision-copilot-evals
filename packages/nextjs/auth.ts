import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { clientPromise } from "@/server/config/database";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise, { databaseName: process.env.DB_NAME || "decision-copilot" }),
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
        const client = await clientPromise;
        const db = client.db(process.env.DB_NAME || "decision-copilot");
        const user = await db.collection("users").findOne({ email: String(credentials.email).toLowerCase() });
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(String(credentials.password), user.passwordHash);
        if (!valid) return null;
        return { id: String(user._id), email: user.email, name: user.name ?? null, is_admin: user.is_admin ?? false };
      },
    }),
  ],
  callbacks: {
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
