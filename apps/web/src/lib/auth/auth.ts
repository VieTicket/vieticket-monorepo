import { betterAuth, User } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import {
  account,
  session,
  user,
  verification,
  Role
} from "@vieticket/db/pg/schema";
import { sendMail } from "../mail-sender";
import { Session } from "better-auth/types";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "customer",
        required: true,
        input: true,
        output: true,
      },
      banned: {
        type: "boolean",
        defaultValue: false,
        required: false,
        input: false,
      },
      banReason: {
        type: "string",
        defaultValue: "",
        required: false,
        input: false,
      },
      banExpires: {
        type: "date",
        defaultValue: null,
        required: false,
        input: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }: { user: User; url: string }) => {
      await sendMail({
        to: user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${url}`,
      });
    },
  },
  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sendVerificationEmail: async ({ user, url, token }, req) => {
      await sendMail({
        to: user.email,
        subject: "Verify your email",
        html: `Click <a href="${url}">here</a> to verify.`,
        text: `Verify your email: ${url}`,
      });
    },
  },
  session: {
    cookieCache: {
      enabled: true,
    },
  },
});

type UserWithRole = Omit<User, "role"> & { role: Role };

export async function getAuthSession(headers: Headers): Promise<{
  session: Session;
  user: UserWithRole;
} | null> {
  const session = await auth.api.getSession({headers});
  return session as { session: Session; user: UserWithRole } | null;
}