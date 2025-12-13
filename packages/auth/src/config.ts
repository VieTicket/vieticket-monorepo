import { db } from "@vieticket/db/pg/direct";
import { account, user, verification, member, organization, invitation } from "@vieticket/db/pg/schemas/users";
import { betterAuth } from "better-auth/minimal";
import { type User } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getResetPasswordEmail } from "./emails/reset-password";
import { getVerificationEmail } from "./emails/verify-email";
import { sendMail } from "@vieticket/utils/mailer";
import orgPlugin from "./org-team";
import { createOrganizer } from "@vieticket/repos/organizer";
import { redis } from "@vieticket/redis"

const SECONDARY_STORAGE_PREFIX = "vtkauth:";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      account,
      verification,
      member,
      organization,
      invitation
    },
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "customer",
        required: true,
        input: true,
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
      const { html, text } = getResetPasswordEmail({ user, url });
      await sendMail({
        to: user.email,
        subject: "🔐 Reset Your VieTicket Password",
        html,
        text,
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
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { html, text } = getVerificationEmail({ user, url });
      await sendMail({
        to: user.email,
        subject: "✅ Verify Your VieTicket Email Address",
        html,
        text,
      });
    },
  },
  session: {
    cookieCache: {
      enabled: true,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Automatically create organizer profile for users with role "organizer"
          if (user.role === "organizer") {
            try {
              // Create organizer profile with isActive = false (pending approval)
              await createOrganizer({
                id: user.id,
                name: user.name || "New Organizer",
                isActive: false,
              });

              console.log(`✅ Organizer profile created for user: ${user.email}`);
            } catch (error) {
              console.error(`❌ Failed to create organizer profile for ${user.email}:`, error);
              // Note: We don't throw here to avoid blocking user creation
              // The organizer profile can be created manually later if needed
            }
          }
        },
      },
    },
  },
  secondaryStorage: {
    get: async (key) => {
      return await redis.get(`${SECONDARY_STORAGE_PREFIX}${key}`);
    },
    set: async (key, value, ttl) => {
      const prefixedKey = `${SECONDARY_STORAGE_PREFIX}${key}`;
      if (ttl) await redis.set(prefixedKey, value, { ex: ttl });
      else await redis.set(prefixedKey, value);
    },
    delete: async (key) => {
      await redis.del(`${SECONDARY_STORAGE_PREFIX}${key}`);
    },
  },
  rateLimit: {
    enabled: true,
    storage: "secondary-storage",
  },
  plugins: [
    orgPlugin,
  ]
});
