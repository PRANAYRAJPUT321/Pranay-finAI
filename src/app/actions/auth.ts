"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { clientIp, endSession, getCurrentUser, startSession } from "@/server/auth/current";
import {
  AccountError,
  authenticate,
  loginSchema,
  registerSchema,
  registerUser,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
} from "@/server/auth/service";
import { env } from "@/server/env";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
}

function fieldErrors(e: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of e.issues) out[String(issue.path[0])] ??= issue.message;
  return out;
}

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : null;
}

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  const ip = await clientIp();
  const rl = await checkRateLimit(`register:${ip}`, 10, 3600);
  if (!rl.allowed) return { error: `Too many sign-up attempts. Try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minutes.` };
  const parsed = registerSchema.safeParse({ name: form.get("name"), email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (form.get("consent") !== "on") return { fieldErrors: { consent: "Please confirm you have read how we use your data" } };
  try {
    const user = await registerUser(parsed.data, env.appUrl);
    await startSession(user.id);
  } catch (e) {
    if (e instanceof AccountError) return { error: e.message };
    throw e;
  }
  redirect("/onboarding");
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const ip = await clientIp();
  const rl = await checkRateLimit(`login:${ip}:${parsed.data.email}`, 8, 900);
  if (!rl.allowed) return { error: `Too many sign-in attempts. Try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minutes.` };
  const user = await authenticate(parsed.data);
  if (!user) return { error: "Email or password is incorrect" };
  await startSession(user.id);
  redirect(safeNext(form.get("next")) ?? (user.role === "STUDENT" ? "/dashboard" : "/dashboard"));
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}

export async function forgotPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const email = z.string().trim().toLowerCase().email().safeParse(form.get("email"));
  if (!email.success) return { fieldErrors: { email: "Enter a valid email address" } };
  const ip = await clientIp();
  const rl = await checkRateLimit(`forgot:${ip}`, 5, 3600);
  if (!rl.allowed) return { error: "Too many requests. Try again later." };
  await requestPasswordReset(email.data, env.appUrl);
  return { message: "If an account exists for that email, a reset link has been sent. It expires in one hour." };
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (password !== String(form.get("confirm") ?? "")) return { fieldErrors: { confirm: "Passwords do not match" } };
  try {
    await resetPassword(token, password);
  } catch (e) {
    if (e instanceof z.ZodError) return { fieldErrors: { password: e.issues[0].message } };
    if (e instanceof AccountError) return { error: e.message };
    throw e;
  }
  redirect("/login?reset=1");
}

export async function resendVerificationAction(): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first" };
  const rl = await checkRateLimit(`verify:${user.id}`, 3, 3600);
  if (!rl.allowed) return { error: "Verification email already sent recently." };
  await sendVerificationEmail(user.id, env.appUrl);
  return { message: "Verification email sent." };
}
