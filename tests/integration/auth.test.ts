import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { AccountError, authenticate, deleteAccount, exportUserData, registerUser, requestPasswordReset, resetPassword, verifyEmail } from "@/server/auth/service";
import { createSession, invalidateSession, validateSessionToken } from "@/server/auth/session";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { generateToken, sha256 } from "@/server/auth/crypto";

const APP = "http://localhost:3000";

describe("registration and login", () => {
  it("registers with a hashed password and rejects duplicates", async () => {
    const email = `reg${Date.now()}@test.local`;
    const user = await registerUser({ name: "Reg", email, password: "Password1234" }, APP);
    expect(user.passwordHash).not.toContain("Password1234");
    expect(user.passwordHash.startsWith("$2")).toBe(true);
    await expect(registerUser({ name: "Again", email: email.toUpperCase(), password: "Password1234" }, APP)).rejects.toBeInstanceOf(AccountError);
  });
  it("enforces the password policy", async () => {
    await expect(registerUser({ name: "Weak", email: `weak${Date.now()}@test.local`, password: "short" }, APP)).rejects.toThrow();
    await expect(registerUser({ name: "Weak", email: `weak2${Date.now()}@test.local`, password: "onlyletterslong" }, APP)).rejects.toThrow();
  });
  it("authenticates only with the right password", async () => {
    const email = `login${Date.now()}@test.local`;
    await registerUser({ name: "L", email, password: "Password1234" }, APP);
    expect(await authenticate({ email, password: "Password1234" })).not.toBeNull();
    expect(await authenticate({ email, password: "WrongPass999" })).toBeNull();
    expect(await authenticate({ email: "nobody@test.local", password: "Password1234" })).toBeNull();
  });
});

describe("sessions", () => {
  it("stores only a hash of the token and can be invalidated", async () => {
    const email = `sess${Date.now()}@test.local`;
    const user = await registerUser({ name: "S", email, password: "Password1234" }, APP);
    const { token } = await createSession(user.id, "vitest");
    expect(await prisma.session.findUnique({ where: { id: token } })).toBeNull();
    expect(await prisma.session.findUnique({ where: { id: sha256(token) } })).not.toBeNull();
    expect((await validateSessionToken(token))?.user.id).toBe(user.id);
    expect(await validateSessionToken(generateToken())).toBeNull();
    await invalidateSession(token);
    expect(await validateSessionToken(token)).toBeNull();
  });
  it("rejects expired sessions", async () => {
    const user = await registerUser({ name: "E", email: `exp${Date.now()}@test.local`, password: "Password1234" }, APP);
    const { token } = await createSession(user.id);
    await prisma.session.update({ where: { id: sha256(token) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await validateSessionToken(token)).toBeNull();
  });
});

describe("email verification and password reset", () => {
  it("verifies email with a single-use token", async () => {
    const user = await registerUser({ name: "V", email: `ver${Date.now()}@test.local`, password: "Password1234" }, APP);
    const token = generateToken();
    await prisma.authToken.create({ data: { userId: user.id, type: "EMAIL_VERIFICATION", tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60_000) } });
    expect(await verifyEmail(token)).toBe(true);
    expect(await verifyEmail(token)).toBe(false);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerifiedAt).not.toBeNull();
  });
  it("resets the password, revokes sessions and rejects reuse", async () => {
    const email = `reset${Date.now()}@test.local`;
    const user = await registerUser({ name: "R", email, password: "Password1234" }, APP);
    await createSession(user.id);
    await requestPasswordReset(email, APP);
    expect(await prisma.authToken.count({ where: { userId: user.id, type: "PASSWORD_RESET" } })).toBe(1);
    const token = generateToken();
    await prisma.authToken.deleteMany({ where: { userId: user.id, type: "PASSWORD_RESET" } });
    await prisma.authToken.create({ data: { userId: user.id, type: "PASSWORD_RESET", tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60_000) } });
    await resetPassword(token, "NewPassword5678");
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
    expect(await authenticate({ email, password: "NewPassword5678" })).not.toBeNull();
    await expect(resetPassword(token, "Another1234567")).rejects.toBeInstanceOf(AccountError);
  });
  it("does not reveal whether an email exists", async () => {
    await expect(requestPasswordReset("missing@test.local", APP)).resolves.toBeUndefined();
  });
});

describe("rate limiting", () => {
  it("blocks after the limit within a window", async () => {
    const key = `test:${Date.now()}`;
    for (let i = 0; i < 3; i++) expect((await checkRateLimit(key, 3, 60)).allowed).toBe(true);
    const blocked = await checkRateLimit(key, 3, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("data rights", () => {
  it("exports and deletes an account (password required)", async () => {
    const user = await registerUser({ name: "D", email: `del${Date.now()}@test.local`, password: "Password1234" }, APP);
    const data = await exportUserData(user.id);
    expect(data.user.email).toBe(user.email);
    expect(JSON.stringify(data)).not.toContain("passwordHash");
    await expect(deleteAccount(user.id, "wrong-password1")).rejects.toBeInstanceOf(AccountError);
    await deleteAccount(user.id, "Password1234");
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
  });
});
