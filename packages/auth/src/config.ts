import { db } from "@vieticket/db/pg/direct";
import { account, session, user, verification } from "@vieticket/db/pg/schemas/users";
import { betterAuth, type User } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getResetPasswordEmail } from "./emails/reset-password";
import { getVerificationEmail } from "./emails/verify-email";
import { sendMail } from "@vieticket/utils/mailer";
import organization from "./org-team"

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
        autoSignInAfterVerification: false,
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
    plugins: [
        organization
    ]
});
