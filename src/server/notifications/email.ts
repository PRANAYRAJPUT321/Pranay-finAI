import { env } from "@/server/env";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Email delivery abstraction. "console" is for local development only: it
 * prints the message (including verification/reset links) to the server log.
 */
export async function sendEmail(message: EmailMessage): Promise<{ delivered: boolean; provider: string }> {
  if (env.emailProvider === "resend" && env.resendApiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.emailFrom, to: message.to, subject: message.subject, text: message.text }),
    });
    if (!res.ok) {
      console.error("[email] Resend delivery failed", res.status);
      return { delivered: false, provider: "resend" };
    }
    return { delivered: true, provider: "resend" };
  }
  if (env.isProduction) {
    console.error("[email] No email provider configured; message not delivered:", message.subject);
    return { delivered: false, provider: "none" };
  }
  console.info(`\n[email:console] To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`);
  return { delivered: true, provider: "console" };
}
