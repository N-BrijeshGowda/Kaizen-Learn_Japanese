import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyAgainstDummy, verifyPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Codes reach the sign-in form through signIn(...).code
class Deactivated extends CredentialsSignin {
  code = "deactivated";
}
class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts";
}

declare module "next-auth" {
  interface Session {
    user: { id: string; role: "learner" | "reviewer" | "admin"; sv: number } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    role?: "learner" | "reviewer" | "admin";
    sv?: number;
  }
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(128),
});

const FIFTEEN_MIN = 15 * 60 * 1000;
const MAX_FAILED = 10;

export const { handlers, auth, signIn, signOut } = NextAuth({
  // A wrong password is an expected outcome, not a server error worth a stack trace in the logs.
  logger: {
    error(error) {
      if (error.name === "CredentialsSignin" || (error as { type?: string }).type === "CredentialsSignin") return;
      console.error(error);
    },
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  pages: { signIn: "/signin" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        // Same message as a wrong password, so nothing about the input shape leaks.
        if (!parsed.success) throw new CredentialsSignin();
        const { email, password } = parsed.data;

        const ip = clientIp(request.headers);
        const byIp = rateLimit(`signin:ip:${ip}`, 40, FIFTEEN_MIN);
        const byEmail = rateLimit(`signin:email:${email}`, 20, FIFTEEN_MIN);
        if (!byIp.ok || !byEmail.ok) throw new TooManyAttempts();

        const user = await prisma.user.findUnique({ where: { email } });
        const now = new Date();

        if (user?.lockedUntil && user.lockedUntil > now) throw new TooManyAttempts();

        const passwordOk = user ? await verifyPassword(user.passwordHash, password) : await verifyAgainstDummy(password);

        if (!user || !passwordOk) {
          if (user) {
            const windowOpen = user.failedWindowStart && now.getTime() - user.failedWindowStart.getTime() < FIFTEEN_MIN;
            const attempts = windowOpen ? user.failedAttempts + 1 : 1;
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedAttempts: attempts,
                failedWindowStart: windowOpen ? user.failedWindowStart : now,
                lockedUntil: attempts >= MAX_FAILED ? new Date(now.getTime() + FIFTEEN_MIN) : null,
              },
            });
          }
          throw new CredentialsSignin();
        }

        if (user.status === "deactivated") throw new Deactivated();

        if (user.failedAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedAttempts: 0, failedWindowStart: null, lockedUntil: null },
          });
        }

        return { id: String(user.id), name: user.name, email: user.email, role: user.role, sv: user.sessionVersion } as never;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as unknown as { role: "learner" | "reviewer" | "admin" }).role;
        token.sv = (user as unknown as { sv: number }).sv;
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid) {
        session.user.id = token.uid;
        session.user.role = token.role ?? "learner";
        session.user.sv = token.sv ?? 0;
      }
      return session;
    },
  },
});
