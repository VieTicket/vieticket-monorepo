import Mailgun from "mailgun.js";
import formData from "form-data";

interface MailerConfig {
  apiKey: string;
  domain: string;
  baseUrl?: string;
  defaultFrom?: string;
}

interface Attachment {
  data: Buffer | NodeJS.ReadableStream;
  filename: string;
  contentType?: string;
  contentId: string;
}

interface SendMailOptions {
  from?: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  inline?: Attachment | Attachment[];
}

class MailSender {
  private mg: ReturnType<InstanceType<typeof Mailgun>['client']>;
  private config: MailerConfig;

  constructor(config: MailerConfig) {
    this.config = config;
    const mailgun = new Mailgun(formData);
    this.mg = mailgun.client({
      username: "api",
      key: config.apiKey,
      url: config.baseUrl || "https://api.mailgun.net",
    });
  }

  async sendMail({
    from,
    to,
    subject,
    text,
    html,
    inline,
  }: SendMailOptions): Promise<void> {
    try {
      const messageData = {
        from: from || this.config.defaultFrom || `VieTicket <notifications@${this.config.domain}>`,
        to,
        subject,
        text,
        ...(html && { html }),
        // Handle inline attachments
        ...(inline && {
          inline: Array.isArray(inline)
            ? inline.map(att => ({
              data: att.data,
              filename: att.filename,
              ...(att.contentType && { contentType: att.contentType })
            }))
            : [{
              data: inline.data,
              filename: inline.filename,
              ...(inline.contentType && { contentType: inline.contentType })
            }]
        })
      };

      await this.mg.messages.create(this.config.domain, messageData);
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }
}

// Default instance using environment variables
let defaultMailSender: MailSender | null = null;

function getDefaultMailSender(): MailSender {
  if (!defaultMailSender) {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;

    if (!apiKey || !domain) {
      throw new Error(
        "MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables are required"
      );
    }

    defaultMailSender = new MailSender({
      apiKey,
      domain,
      baseUrl: process.env.MAILGUN_BASE_URL,
      defaultFrom: process.env.MAILGUN_DEFAULT_FROM,
    });
  }

  return defaultMailSender;
}

// Configure method for custom configuration
export function config(customConfig: MailerConfig): MailSender {
  return new MailSender(customConfig);
}

// Default export function that uses environment variables
export async function sendMail(options: SendMailOptions): Promise<void> {
  const mailSender = getDefaultMailSender();
  return mailSender.sendMail(options);
}

// Export the MailSender class for advanced usage
export { MailSender, type MailerConfig, type SendMailOptions };
