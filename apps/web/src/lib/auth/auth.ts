import { betterAuth, User } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import {
  account,
  session,
  user,
  verification,
  Role,
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
      const resetPasswordHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password - VieTicket</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .title {
              font-size: 24px;
              color: #1f2937;
              margin-bottom: 20px;
            }
            .content {
              font-size: 16px;
              color: #4b5563;
              margin-bottom: 30px;
            }
            .cta-button {
              display: inline-block;
              background-color: #2563eb;
              color: white;
              text-decoration: none;
              padding: 14px 28px;
              border-radius: 8px;
              font-weight: 600;
              text-align: center;
              margin: 20px 0;
              transition: background-color 0.3s ease;
            }
            .cta-button:hover {
              background-color: #1d4ed8;
            }
            .security-notice {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 16px;
              margin: 24px 0;
              border-radius: 4px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 14px;
              color: #6b7280;
              text-align: center;
            }
            .link-fallback {
              word-break: break-all;
              color: #2563eb;
              margin-top: 16px;
              padding: 12px;
              background-color: #f3f4f6;
              border-radius: 6px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎫 VieTicket</div>
              <h1 class="title">Reset Your Password</h1>
            </div>
            
            <div class="content">
              <p>Hi ${user.name || "there"},</p>
              
              <p>We received a request to reset the password for your VieTicket account associated with <strong>${user.email}</strong>.</p>
              
              <p>To reset your password, click the button below:</p>
              
              <div style="text-align: center;">
                <a href="${url}" class="cta-button">Reset My Password</a>
              </div>
              
              <div class="security-notice">
                <strong>🔒 Security Notice:</strong> This password reset link will expire in 1 hour for your security. If you didn't request this reset, you can safely ignore this email.
              </div>
              
              <p>If the button above doesn't work, you can copy and paste the following link into your browser:</p>
              <div class="link-fallback">${url}</div>
            </div>
            
            <div class="footer">
              <p>Need help? Contact our support team at <a href="mailto:support@vieticket.com" style="color: #2563eb;">support@vieticket.com</a></p>
              <p>This email was sent by VieTicket. If you didn't request this password reset, please contact us immediately.</p>
              <p style="margin-top: 20px;">&copy; ${new Date().getFullYear()} VieTicket. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const resetPasswordText = `
        🎫 VieTicket - Reset Your Password

        Hi ${user.name || "there"},

        We received a request to reset the password for your VieTicket account (${user.email}).

        To reset your password, visit this link: ${url}

        🔒 Security Notice: 
        - This link will expire in 1 hour for your security
        - If you didn't request this reset, you can safely ignore this email
        - Never share this link with anyone

        Need help? Contact our support team at support@vieticket.com

        © ${new Date().getFullYear()} VieTicket. All rights reserved.
      `;

      await sendMail({
        to: user.email,
        subject: "🔐 Reset Your VieTicket Password",
        html: resetPasswordHtml,
        text: resetPasswordText,
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
      const verificationHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - VieTicket</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .welcome-title {
              font-size: 24px;
              color: #1f2937;
              margin-bottom: 10px;
            }
            .subtitle {
              font-size: 16px;
              color: #6b7280;
              margin-bottom: 20px;
            }
            .content {
              font-size: 16px;
              color: #4b5563;
              margin-bottom: 30px;
            }
            .cta-button {
              display: inline-block;
              background-color: #10b981;
              color: white;
              text-decoration: none;
              padding: 16px 32px;
              border-radius: 8px;
              font-weight: 600;
              text-align: center;
              margin: 20px 0;
              transition: background-color 0.3s ease;
            }
            .cta-button:hover {
              background-color: #059669;
            }
            .features {
              background-color: #f8fafc;
              padding: 24px;
              border-radius: 8px;
              margin: 30px 0;
            }
            .feature-list {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .feature-list li {
              padding: 8px 0;
              display: flex;
              align-items: center;
            }
            .feature-list li:before {
              content: "✅";
              margin-right: 12px;
              font-size: 16px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 14px;
              color: #6b7280;
              text-align: center;
            }
            .link-fallback {
              word-break: break-all;
              color: #2563eb;
              margin-top: 16px;
              padding: 12px;
              background-color: #f3f4f6;
              border-radius: 6px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎫 VieTicket</div>
              <h1 class="welcome-title">Welcome to VieTicket!</h1>
              <p class="subtitle">Just one more step to get started</p>
            </div>
            
            <div class="content">
              <p>Hi ${user.name || "there"},</p>
              
              <p>Thank you for creating your VieTicket account! We're excited to have you join our community of event enthusiasts.</p>
              
              <p>To complete your registration and start discovering amazing events, please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${url}" class="cta-button">✉️ Verify My Email</a>
              </div>
              
              <div class="features">
                <h3 style="margin-top: 0; color: #1f2937;">What you can do with VieTicket:</h3>
                <ul class="feature-list">
                  <li>Browse and discover exciting events</li>
                  <li>Purchase tickets securely online</li>
                  <li>Manage your bookings and tickets</li>
                  <li>Get personalized event recommendations</li>
                  <li>Access exclusive member-only events</li>
                </ul>
              </div>
              
              <p><strong>Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
              
              <p>If the button above doesn't work, you can copy and paste the following link into your browser:</p>
              <div class="link-fallback">${url}</div>
            </div>
            
            <div class="footer">
              <p>Need help? Our support team is here for you at <a href="mailto:support@vieticket.com" style="color: #2563eb;">support@vieticket.com</a></p>
              <p>If you didn't create this account, you can safely ignore this email.</p>
              <p style="margin-top: 20px;">&copy; ${new Date().getFullYear()} VieTicket. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const verificationText = `
        🎫 VieTicket - Welcome! Please Verify Your Email

        Hi ${user.name || "there"},

        Welcome to VieTicket! Thank you for creating your account.

        To complete your registration and start discovering amazing events, please verify your email address by visiting this link: ${url}

        What you can do with VieTicket:
        ✅ Browse and discover exciting events
        ✅ Purchase tickets securely online  
        ✅ Manage your bookings and tickets
        ✅ Get personalized event recommendations
        ✅ Access exclusive member-only events

        Important: This verification link will expire in 24 hours for security reasons.

        Need help? Contact our support team at support@vieticket.com

        If you didn't create this account, you can safely ignore this email.

        © ${new Date().getFullYear()} VieTicket. All rights reserved.
      `;

      await sendMail({
        to: user.email,
        subject: "🎫 Welcome to VieTicket! Please verify your email",
        html: verificationHtml,
        text: verificationText,
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
  const session = await auth.api.getSession({ headers });
  return session as { session: Session; user: UserWithRole } | null;
}
