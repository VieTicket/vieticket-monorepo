import type { User } from "better-auth";

export const getVerificationEmail = ({ user, url }: { user: User; url: string }) => {
  const html = `
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

  const text = `
    🎫 VieTicket - Welcome! Please Verify Your Email

    Hi ${user.name || "there"},

    Thanks for signing up for VieTicket! We're thrilled to have you.

    To get started, please verify your email address by visiting this link: ${url}

    This link will expire in 24 hours.

    With VieTicket, you can:
    - Browse and discover exciting events
    - Purchase tickets securely online
    - Manage your bookings and tickets
    - Get personalized event recommendations

    If you didn't create this account, you can safely ignore this email.

    Need help? Contact our support team at support@vieticket.com

    © ${new Date().getFullYear()} VieTicket. All rights reserved.
  `;

  return { html, text };
};
