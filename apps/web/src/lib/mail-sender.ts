import Mailgun from "mailgun.js";
import formData from "form-data";

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY!,
  url: "https://api.mailgun.net",
});

interface SendMailOptions {
  from?: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail({
  from,
  to,
  subject,
  text,
  html,
}: SendMailOptions): Promise<void> {
  console.log("Invoked sendMail"); // TODO: remove
  try {
    const messageData = {
      from: from || `VieTicket <notifications@${process.env.MAILGUN_DOMAIN}>`,
      to,
      subject,
      text,
      ...(html && { html }),
    };

    const response = await mg.messages.create(
      process.env.MAILGUN_DOMAIN as string,
      messageData
    );
    console.log("Email sent:", response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}
