import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

// Server-side API URL (internal Docker network or local dev)
const API_URL =
  process.env.AUTH_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const body = new URLSearchParams({
          grant_type: "password",
          username: email,
          password,
          scope: "openid offline_access",
        });

        try {
          const res = await fetch(`${API_URL}/connect/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
          });

          if (!res.ok) return null;

          const tokens = await res.json();
          const payload = JSON.parse(
            Buffer.from((tokens.access_token as string).split(".")[1], "base64url").toString()
          );
          return {
            id: email,
            email,
            accessToken: tokens.access_token as string,
            refreshToken: tokens.refresh_token as string,
            expiresAt: payload.exp as number | undefined,
            role: payload.role as string | undefined,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign-in: persist tokens and expiry
      if (user) {
        const u = user as { accessToken: string; refreshToken: string; expiresAt?: number; role?: string };
        token.accessToken = u.accessToken;
        token.refreshToken = u.refreshToken;
        token.expiresAt = u.expiresAt;
        try {
          const base64Url = u.accessToken.split(".")[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const payload = JSON.parse(
            Buffer.from(base64, "base64").toString("utf-8"),
          );
          token.role = payload.role;
        } catch {
          // ignore
        }
        return token;
      }

      // Token still valid — return as-is
      if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
        return token;
      }

      // Token expired — attempt refresh
      try {
        const body = new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: token.refreshToken,
        });

        const res = await fetch(`${API_URL}/connect/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });

        if (!res.ok) return token;

        const tokens = await res.json();
        token.accessToken = tokens.access_token as string;
        token.refreshToken = (tokens.refresh_token as string) ?? token.refreshToken;

        const base64Url = (tokens.access_token as string).split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
        token.expiresAt = payload.exp;
        token.role = payload.role;
      } catch {
        // Refresh failed — keep stale token, session will fail naturally
      }

      return token;
    },
    session({ session, token }) {
      session.accessToken = token.accessToken as string;
      const role = token.role;
      session.user.role = Array.isArray(role) ? role[0] : role;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
