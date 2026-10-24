/** Centralised, server-only access to configuration. Never import from client components. */
import "server-only";

export const env = {
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  isProduction: process.env.NODE_ENV === "production",
  enforceEntitlements: process.env.ENFORCE_ENTITLEMENTS === "true",
  emailProvider: process.env.EMAIL_PROVIDER ?? "console",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "PD FinPrep <no-reply@example.com>",
  tutorHourlyLimit: Number(process.env.AI_TUTOR_HOURLY_LIMIT ?? 30),
};
