import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";

const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.AUTH_RESEND_KEY;
const EMAIL_FROM = process.env.AUTH_EMAIL_FROM || process.env.EMAIL_FROM || "Lockedin <onboarding@resend.dev>";
const SITE_URL = process.env.SITE_URL || process.env.VITE_SITE_URL || "https://lock3din.vercel.app";

export const isEmailBackendConfigured = query({
  args: {},
  returns: v.boolean(),
  handler: () => {
    return !!RESEND_API_KEY;
  },
});

function base64Url(bytes: Uint8Array) {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  const b64 = btoa(str);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Hex(input: string) {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    throw new Error("Email backend not configured.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    let msg = "Failed to send email.";
    try {
      const json: any = await res.json();
      msg = json?.message || msg;
    } catch {}
    throw new Error(msg);
  }
}

export const createEmailVerificationToken = internalMutation({
  args: {
    userId: v.id("users"),
    tokenHash: v.string(),
    expiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("email_verification_tokens", {
      userId: args.userId,
      tokenHash: args.tokenHash,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const markEmailVerified = internalMutation({
  args: { userId: v.id("users"), tokenId: v.id("email_verification_tokens") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("users", args.userId, { emailVerificationTime: Date.now() });
    await ctx.db.patch("email_verification_tokens", args.tokenId, { usedAt: Date.now() });
    return null;
  },
});

export const getEmailVerificationUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (!user) return null;
    return {
      _id: user._id,
      email: user.email,
      emailVerificationTime: user.emailVerificationTime,
    };
  },
});

export const getRecentEmailVerificationToken = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("email_verification_tokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();
  },
});

export const getEmailVerificationTokenByHash = internalQuery({
  args: { tokenHash: v.string() },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("email_verification_tokens")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", args.tokenHash))
      .first();
  },
});

export const requestEmailVerification = action({
  args: {},
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const user = await ctx.runQuery(internal.emailVerification.getEmailVerificationUser, {
      userId,
    });
    if (!user?.email) throw new Error("Missing email.");

    if (user.emailVerificationTime) {
      return { success: true, message: "Email already verified." };
    }

    const now = Date.now();
    const recent = await ctx.runQuery(internal.emailVerification.getRecentEmailVerificationToken, {
      userId,
    });

    if (recent && !recent.usedAt && recent.createdAt > now - 60_000) {
      return { success: true, message: "Verification email already sent. Please check your inbox." };
    }

    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = base64Url(tokenBytes);
    const tokenHash = await sha256Hex(token);
    const expiresAt = now + 1000 * 60 * 60;

    await ctx.runMutation(internal.emailVerification.createEmailVerificationToken, {
      userId,
      tokenHash,
      expiresAt,
    });

    const url = `${SITE_URL.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = "Verify your email for Lockedin";
    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
        <h2 style="margin:0 0 12px 0;">Verify your email</h2>
        <p style="margin:0 0 16px 0;">Confirm this email address to activate your Lockedin account.</p>
        <p style="margin:0 0 24px 0;"><a href="${url}" style="display:inline-block;padding:12px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;">Verify Email</a></p>
        <p style="margin:0;color:#6b7280;font-size:12px;">This link expires in 60 minutes.</p>
      </div>
    `;

    await sendEmail(user.email, subject, html);

    return { success: true, message: "Verification email sent." };
  },
});

export const confirmEmailVerification = action({
  args: { token: v.string() },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const user = await ctx.runQuery(internal.emailVerification.getEmailVerificationUser, {
      userId,
    });
    if (!user) throw new Error("Identity verification failed.");
    if (user.emailVerificationTime) {
      return { success: true, message: "Email already verified." };
    }

    const tokenHash = await sha256Hex(args.token);
    const tokenRow = await ctx.runQuery(internal.emailVerification.getEmailVerificationTokenByHash, {
      tokenHash,
    });

    if (!tokenRow) return { success: false, message: "Invalid or expired token." };
    if (tokenRow.usedAt) return { success: false, message: "Token already used." };
    if (tokenRow.userId !== userId) return { success: false, message: "Token does not match your session." };
    if (tokenRow.expiresAt < Date.now()) return { success: false, message: "Token expired." };

    await ctx.runMutation(internal.emailVerification.markEmailVerified, {
      userId,
      tokenId: tokenRow._id,
    });

    return { success: true, message: "Email verified." };
  },
});
