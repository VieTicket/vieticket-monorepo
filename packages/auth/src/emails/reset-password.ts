import type { User } from "better-auth";

export const getResetPasswordEmail = ({ user, url }: { user: User; url: string }) => {
  const html = `
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

  const text = `
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

  return { html, text };
};
