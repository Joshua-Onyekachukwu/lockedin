import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

function getAdminEmailAllowlist() {
  const env = (process.env.ADMIN_EMAIL_ALLOWLIST || "").trim();
  if (!env) return [];

  const normalize = (raw: string) =>
    raw
      .trim()
      .replace(/^[\s"'[\]]+/, "")
      .replace(/[\s"'[\]]+$/, "")
      .trim();

  if (env.startsWith("[")) {
    try {
      const parsed = JSON.parse(env);
      if (Array.isArray(parsed)) {
        return parsed.map((e) => normalize(String(e))).filter(Boolean);
      }
    } catch {}
  }

  return env
    .split(",")
    .map((e) => normalize(e))
    .filter(Boolean);
}

function isAllowlistedAdminEmail(allowlist: Array<string>, email?: string | null) {
  if (!email) return false;
  return allowlist.some((entry) => entry.toLowerCase() === email.toLowerCase());
}

function maskAccountNumber(accountNumber?: string | null) {
  const digits = String(accountNumber ?? "").replace(/\D/g, "");
  if (!digits) return "—";
  if (digits.length <= 4) return digits;
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

async function verifyPaystackTransaction(reference: string) {
  if (!PAYSTACK_SECRET) {
    return { ok: false, message: "Payment backend not configured." };
  }
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
    });

    let json: any = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }

    if (!response.ok) {
      return { ok: false, message: json?.message || "Unable to verify transaction." };
    }
    if (!json?.status) {
      return { ok: false, message: json?.message || "Unable to verify transaction." };
    }
    return { ok: true, json };
  } catch {
    return { ok: false, message: "Unable to verify transaction." };
  }
}

async function checkAdmin(ctx: any) {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("UNAUTHORIZED: ACCESS DENIED");
    
    const user = await ctx.db.get("users", userId);
    if (!user) {
        throw new Error("SECURITY ALERT: Administrative privileges required.");
    }

    if (!user.emailVerificationTime) {
        throw new Error("Email verification required.");
    }
    
    const allowlist = getAdminEmailAllowlist();
    if (allowlist.length === 0) {
        throw new Error("SECURITY ALERT: ADMIN_EMAIL_ALLOWLIST is not configured.");
    }

    const isEmailAdmin = isAllowlistedAdminEmail(allowlist, user.email);
    const isDbAdmin = user.isAdmin === true;
    
    if (!isDbAdmin) {
        throw new Error("SECURITY ALERT: Database admin role required.");
    }
    if (!isEmailAdmin) {
        throw new Error("SECURITY ALERT: Email is not on the admin allowlist.");
    }
    return user;
}


const MISSION_VAULT_STATUSES = ["active", "completed", "failed"] as const;

async function buildMissionCountMap(ctx: any, userIds: Array<Id<"users">>) {
  const allowed = new Set(userIds);
  const counts = new Map<Id<"users">, number>();
  for (const status of MISSION_VAULT_STATUSES) {
    const vaults = await ctx.db
      .query("vaults")
      .withIndex("by_status", (q: any) => q.eq("status", status))
      .collect();
    for (const vault of vaults) {
      if (!allowed.has(vault.userId)) continue;
      counts.set(vault.userId, (counts.get(vault.userId) ?? 0) + 1);
    }
  }
  return counts;
}

export const logAudit = internalMutation({
  args: {
    adminUserId: v.id("users"),
    action: v.string(),
    message: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("admin_audit", {
      adminUserId: args.adminUserId,
      action: args.action,
      message: args.message,
      targetType: args.targetType,
      targetId: args.targetId,
      metadata: args.metadata,
    });
    return null;
  },
});

export const logSystemAudit = internalMutation({
  args: { action: v.string(), message: v.string(), metadata: v.optional(v.any()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("system_audit", {
      action: args.action,
      message: args.message,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const insertSeedRun = internalMutation({
  args: {
    domain: v.string(),
    startedAt: v.number(),
    dryRun: v.boolean(),
    requestedLimit: v.optional(v.number()),
    usersDeleted: v.number(),
    vaultsDeleted: v.number(),
    goalsDeleted: v.number(),
    goalLogsDeleted: v.number(),
    partnersDeleted: v.number(),
    transactionsDeleted: v.number(),
    notificationsDeleted: v.number(),
    depositsDeleted: v.number(),
    withdrawalsDeleted: v.number(),
    verificationTokensDeleted: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("seed_runs", args);
    return null;
  },
});

export const findUserByEmail = internalQuery({
  args: { email: v.string() },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
    return user ?? null;
  },
});

export const getUserByIdUnsafe = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    return (await ctx.db.get("users", args.userId)) ?? null;
  },
});

export const listWithdrawalsByUser = internalQuery({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("withdrawals")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

export const getWithdrawalByPaystackReference = internalQuery({
  args: { reference: v.string() },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    return (
      (await ctx.db
        .query("withdrawals")
        .withIndex("by_paystack_reference", (q) => q.eq("paystack_reference", args.reference))
        .unique()) ?? null
    );
  },
});

export const findWithdrawalByIdentifiers = internalQuery({
  args: { query: v.string() },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const q = args.query.trim();
    if (!q) return null;
    const transferId = /^[0-9]+$/.test(q) ? Number(q) : NaN;

    const byReference = await ctx.db
      .query("withdrawals")
      .withIndex("by_paystack_reference", (qq) => qq.eq("paystack_reference", q))
      .unique();
    if (byReference) return byReference;

    const rows = await ctx.db.query("withdrawals").order("desc").take(2000);
    return (
      rows.find((w: any) => w?.paystack_transfer_code === q) ??
      rows.find((w: any) => typeof transferId === "number" && !Number.isNaN(transferId) && w?.paystack_transfer_id === transferId) ??
      null
    );
  },
});

export const getAuditLog = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    const limit = args.limit ?? 100;
    const adminRows = await ctx.db.query("admin_audit").order("desc").take(limit);
    const systemRows = await ctx.db
      .query("system_audit")
      .withIndex("by_created_at", (q) => q.gt("createdAt", 0))
      .order("desc")
      .take(limit);

    const adminResults = [];
    for (const row of adminRows) {
      const admin = await ctx.db.get("users", row.adminUserId);
      adminResults.push({ ...row, kind: "admin", admin });
    }

    const systemResults = systemRows.map((row) => ({
      ...row,
      kind: "system",
      _creationTime: row._creationTime,
      admin: null,
    }));

    return [...adminResults, ...systemResults]
      .sort((a: any, b: any) => (b._creationTime ?? 0) - (a._creationTime ?? 0))
      .slice(0, limit);
  },
});

export const searchUsers = query({
  args: { q: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      tier: v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold")),
      integrityScore: v.number(),
      streak_count: v.number(),
      goals_completed: v.number(),
      balance: v.number(),
      bvn_verified: v.boolean(),
      is_discoverable: v.boolean(),
      witness_discoverable: v.optional(v.boolean()),
      isAdmin: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    const qRaw = args.q.trim();
    const q = qRaw.toLowerCase();
    const limit = args.limit ?? 20;
    if (!q) return [];

    if (q.includes("@")) {
      const direct =
        (await ctx.db
          .query("users")
          .withIndex("email", (qq) => qq.eq("email", qRaw))
          .unique()) ||
        (await ctx.db
          .query("users")
          .withIndex("email", (qq) => qq.eq("email", q))
          .unique());
      if (!direct) return [];
      const missionCounts = await buildMissionCountMap(ctx, [direct._id]);
      return [
        {
          _id: direct._id,
          _creationTime: direct._creationTime,
          name: direct.name,
          email: direct.email,
          tier: direct.tier,
          integrityScore: direct.integrityScore,
          streak_count: direct.streak_count,
          goals_completed: missionCounts.get(direct._id) ?? 0,
          balance: direct.balance,
          bvn_verified: direct.bvn_verified,
          is_discoverable: direct.is_discoverable,
          witness_discoverable: direct.witness_discoverable,
          isAdmin: direct.isAdmin,
        },
      ];
    }

    const users = await ctx.db.query("users").order("desc").take(2000);
    const filtered = users
      .filter((u) => {
        const name = (u.name || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        return name.includes(q) || email.includes(q);
      })
      .slice(0, limit);
    const missionCounts = await buildMissionCountMap(ctx, filtered.map((u) => u._id));
    return filtered.map((u) => ({
        _id: u._id,
        _creationTime: u._creationTime,
        name: u.name,
        email: u.email,
        tier: u.tier,
        integrityScore: u.integrityScore,
        streak_count: u.streak_count,
        goals_completed: missionCounts.get(u._id) ?? 0,
        balance: u.balance,
        bvn_verified: u.bvn_verified,
        is_discoverable: u.is_discoverable,
        witness_discoverable: u.witness_discoverable,
        isAdmin: u.isAdmin,
      }));
  },
});

export const listUsersPage = query({
  args: { cursor: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("users"),
        _creationTime: v.number(),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        tier: v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold")),
        integrityScore: v.number(),
        streak_count: v.number(),
        goals_completed: v.number(),
        balance: v.number(),
        bvn_verified: v.boolean(),
        is_discoverable: v.boolean(),
        witness_discoverable: v.optional(v.boolean()),
        isAdmin: v.optional(v.boolean()),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.union(v.null(), v.string()),
  }),
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    const limit = Math.max(1, Math.min(args.limit ?? 25, 100));
    const result = await (ctx.db.query("users").order("desc") as any).paginate({
      cursor: args.cursor ?? null,
      numItems: limit,
    });
    const missionCounts = await buildMissionCountMap(
      ctx,
      result.page.map((u: any) => u._id),
    );
    return {
      page: result.page.map((u: any) => ({
        _id: u._id,
        _creationTime: u._creationTime,
        name: u.name,
        email: u.email,
        tier: u.tier,
        integrityScore: u.integrityScore,
        streak_count: u.streak_count,
        goals_completed: missionCounts.get(u._id) ?? 0,
        balance: u.balance,
        bvn_verified: u.bvn_verified,
        is_discoverable: u.is_discoverable,
        witness_discoverable: u.witness_discoverable,
        isAdmin: u.isAdmin,
      })),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const getUserDetail = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      tier: v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold")),
      integrityScore: v.number(),
      streak_count: v.number(),
      goals_completed: v.number(),
      balance: v.number(),
      shields: v.number(),
      credits: v.number(),
      bvn_verified: v.boolean(),
      bvn_last4: v.optional(v.string()),
      is_discoverable: v.boolean(),
      witness_discoverable: v.optional(v.boolean()),
      isAdmin: v.optional(v.boolean()),
      vaultStats: v.object({
        total: v.number(),
        awaiting_funding: v.number(),
        active: v.number(),
        completed: v.number(),
        failed: v.number(),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    const user = await ctx.db.get("users", args.userId);
    if (!user) return null;

    const vaults = await ctx.db
      .query("vaults")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const vaultStats = {
      total: vaults.length,
      awaiting_funding: 0,
      active: 0,
      completed: 0,
      failed: 0,
    };

    for (const v of vaults) {
      if (v.status === "awaiting_funding") vaultStats.awaiting_funding += 1;
      else if (v.status === "active") vaultStats.active += 1;
      else if (v.status === "completed") vaultStats.completed += 1;
      else if (v.status === "failed") vaultStats.failed += 1;
    }
    const missionCount = vaultStats.active + vaultStats.completed + vaultStats.failed;

    return {
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      email: user.email,
      emailVerificationTime: user.emailVerificationTime,
      tier: user.tier,
      integrityScore: user.integrityScore,
      streak_count: user.streak_count,
      goals_completed: missionCount,
      balance: user.balance,
      shields: user.shields,
      credits: user.credits,
      bvn_verified: user.bvn_verified,
      bvn_last4: user.bvn_last4,
      is_discoverable: user.is_discoverable,
      witness_discoverable: user.witness_discoverable,
      isAdmin: user.isAdmin,
      vaultStats,
    };
  },
});

export const getAuditById = query({
  args: { auditId: v.id("admin_audit") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("admin_audit"),
      _creationTime: v.number(),
      adminUserId: v.id("users"),
      action: v.string(),
      message: v.string(),
      targetType: v.optional(v.string()),
      targetId: v.optional(v.string()),
      metadata: v.optional(v.any()),
      admin: v.optional(v.any()),
    }),
  ),
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    const row = await ctx.db.get("admin_audit", args.auditId);
    if (!row) return null;
    const admin = await ctx.db.get("users", row.adminUserId);
    return { ...row, admin };
  },
});

export const listTransactionsPage = query({
  args: { cursor: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("transactions"),
        _creationTime: v.number(),
        userId: v.id("users"),
        userEmail: v.optional(v.string()),
        amount: v.number(),
        type: v.union(
          v.literal("deposit"),
          v.literal("stake"),
          v.literal("penalty"),
          v.literal("refund"),
          v.literal("dividend"),
          v.literal("platform_fee"),
          v.literal("wallet_withdrawal"),
        ),
        status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
        vaultId: v.optional(v.id("vaults")),
        withdrawalId: v.optional(v.id("withdrawals")),
        description: v.optional(v.string()),
        metadata: v.optional(v.any()),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.union(v.null(), v.string()),
  }),
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    const limit = Math.max(1, Math.min(args.limit ?? 25, 100));
    const result = await (ctx.db.query("transactions").order("desc") as any).paginate({
      cursor: args.cursor ?? null,
      numItems: limit,
    });

    const usersById = new Map<string, any>();
    for (const tx of result.page as Array<any>) {
      const id = String(tx.userId);
      if (!usersById.has(id)) {
        usersById.set(id, await ctx.db.get("users", tx.userId));
      }
    }

    return {
      page: (result.page as Array<any>).map((t) => ({
        _id: t._id,
        _creationTime: t._creationTime,
        userId: t.userId,
        userEmail: usersById.get(String(t.userId))?.email,
        amount: t.amount,
        type: t.type,
        status: t.status,
        vaultId: t.vaultId,
        withdrawalId: t.withdrawalId,
        description: t.description,
        metadata: t.metadata,
      })),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const getTransactionById = query({
  args: { transactionId: v.id("transactions") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("transactions"),
      _creationTime: v.number(),
      userId: v.id("users"),
      amount: v.number(),
      type: v.union(
        v.literal("deposit"),
        v.literal("stake"),
        v.literal("penalty"),
        v.literal("refund"),
        v.literal("dividend"),
        v.literal("platform_fee"),
        v.literal("wallet_withdrawal"),
      ),
      vaultId: v.optional(v.id("vaults")),
      withdrawalId: v.optional(v.id("withdrawals")),
      status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
      description: v.optional(v.string()),
      metadata: v.optional(v.any()),
      user: v.optional(v.any()),
    }),
  ),
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    const row = await ctx.db.get("transactions", args.transactionId);
    if (!row) return null;
    const user = await ctx.db.get("users", row.userId);
    return { ...row, user };
  },
});

export const getOverview = query({
  args: {},
  returns: v.object({
    pendingWithdrawals: v.number(),
    pendingWithdrawalAmount: v.number(),
    deposits24h: v.number(),
    depositVolume24h: v.number(),
    protocols24h: v.number(),
    activeVaults: v.number(),
  }),
  handler: async (ctx) => {
    await checkAdmin(ctx);

    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const pendingWithdrawals = await ctx.db
      .query("withdrawals")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(1000);

    const recentTx = await ctx.db.query("transactions").order("desc").take(1500);
    const deposits24h = recentTx.filter(
      (t) => t.type === "deposit" && t.status === "completed" && t._creationTime >= dayAgo,
    );

    const recentVaults = await ctx.db.query("vaults").order("desc").take(1500);
    const protocols24h = recentVaults.filter((v) => v._creationTime >= dayAgo).length;

    const activeVaults = await ctx.db
      .query("vaults")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(5000);

    return {
      pendingWithdrawals: pendingWithdrawals.length,
      pendingWithdrawalAmount: pendingWithdrawals.reduce((s, w) => s + w.amount, 0),
      deposits24h: deposits24h.length,
      depositVolume24h: deposits24h.reduce((s, t) => s + t.amount, 0),
      protocols24h,
      activeVaults: activeVaults.length,
    };
  },
});

/**
 * Dedicated Admin Authorization Helper
 */
export const checkAdminStatus = query({
    args: {},
    returns: v.object({
      isAdmin: v.boolean(),
      user: v.optional(v.any()),
      reason: v.optional(v.string()),
      debug: v.optional(
        v.object({
          email: v.optional(v.string()),
          isVerified: v.boolean(),
          isDbAdmin: v.boolean(),
          isAllowlistAdmin: v.boolean(),
        }),
      ),
    }),
    handler: async (ctx) => {
        try {
            const user = await checkAdmin(ctx);
            return { isAdmin: true, user };
        } catch (e) {
            const userId = await auth.getUserId(ctx);
            const user = userId ? await ctx.db.get("users", userId) : null;
            const allowlist = getAdminEmailAllowlist();
            const email = (user?.email) ?? undefined;
            const isAllowlistAdmin = isAllowlistedAdminEmail(allowlist, email);
            const isDbAdmin = user?.isAdmin === true;
            const isVerified = !!user?.emailVerificationTime;
            const reason = e instanceof Error ? e.message : String(e);
            return {
              isAdmin: false,
              reason,
              debug: { email, isVerified, isDbAdmin, isAllowlistAdmin },
            };
        }
    }
});

export const handlePaystackTransferSuccess = internalMutation({
  args: {
    reference: v.string(),
    transferCode: v.optional(v.string()),
    transferId: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({ ok: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const withdrawal = await ctx.db
      .query("withdrawals")
      .withIndex("by_paystack_reference", (q) => q.eq("paystack_reference", args.reference))
      .unique();

    if (!withdrawal) {
      await ctx.db.insert("system_audit", {
        action: "paystack_transfer_unmatched",
        message: `Paystack transfer.success received but no matching withdrawal found. reference=${args.reference}`,
        metadata: { kind: "transfer.success", ...args },
        createdAt: Date.now(),
      });
      return { ok: true, message: "No matching withdrawal." };
    }
    if (withdrawal.status === "completed") return { ok: true, message: "Already completed." };

    await ctx.db.patch("withdrawals", withdrawal._id, {
      status: "completed",
      processed_at: Date.now(),
      paystack_status: "success",
      paystack_transfer_code: args.transferCode ?? withdrawal.paystack_transfer_code,
      paystack_transfer_id: args.transferId ?? withdrawal.paystack_transfer_id,
      metadata: args.metadata,
    });

    await ctx.db.insert("notifications", {
      userId: withdrawal.userId,
      title: "Extraction Protocol Complete",
      message: `Your capital of ₦${(withdrawal.amount / 100).toLocaleString()} has been dispersed to your bank account.`,
      type: "wallet_withdrawal",
      read: false,
    });

    const tx = await ctx.db
      .query("transactions")
      .withIndex("by_withdrawal", (q) => q.eq("withdrawalId", withdrawal._id))
      .unique();

    if (tx) {
      await ctx.db.patch("transactions", tx._id, { status: "completed" });
    }

    return { ok: true, message: "Withdrawal completed." };
  },
});

export const handlePaystackTransferFailed = internalMutation({
  args: {
    reference: v.string(),
    reason: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({ ok: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const withdrawal = await ctx.db
      .query("withdrawals")
      .withIndex("by_paystack_reference", (q) => q.eq("paystack_reference", args.reference))
      .unique();

    if (!withdrawal) {
      await ctx.db.insert("system_audit", {
        action: "paystack_transfer_unmatched",
        message: `Paystack transfer.failed received but no matching withdrawal found. reference=${args.reference}`,
        metadata: { kind: "transfer.failed", ...args },
        createdAt: Date.now(),
      });
      return { ok: true, message: "No matching withdrawal." };
    }
    if (withdrawal.status === "completed") return { ok: true, message: "Already completed." };

    const user = await ctx.db.get("users", withdrawal.userId);
    if (user) {
      await ctx.db.patch("users", user._id, { balance: (user.balance || 0) + withdrawal.amount });
    }

    await ctx.db.patch("withdrawals", withdrawal._id, {
      status: "failed",
      processed_at: Date.now(),
      paystack_status: "failed",
      metadata: { reason: args.reason, ...(args.metadata ?? {}) },
    });

    await ctx.db.insert("notifications", {
      userId: withdrawal.userId,
      title: "Extraction Failed",
      message: `Your extraction could not be completed. ₦${(withdrawal.amount / 100).toLocaleString()} has been returned to your wallet.`,
      type: "wallet_withdrawal",
      read: false,
    });

    const tx = await ctx.db
      .query("transactions")
      .withIndex("by_withdrawal", (q) => q.eq("withdrawalId", withdrawal._id))
      .unique();

    if (tx) {
      await ctx.db.patch("transactions", tx._id, { status: "failed" });
    }

    return { ok: true, message: "Withdrawal failed; escrow released." };
  },
});

export const previewPaystackTransaction = action({
  args: { reference: v.string() },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    reference: v.optional(v.string()),
    paystackStatus: v.optional(v.string()),
    amountKobo: v.optional(v.number()),
    currency: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    paidAt: v.optional(v.string()),
    channel: v.optional(v.string()),
    alreadyCredited: v.optional(v.boolean()),
    creditedUserId: v.optional(v.id("users")),
    depositId: v.optional(v.id("deposits")),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    message: string;
    reference?: string;
    paystackStatus?: string;
    amountKobo?: number;
    currency?: string;
    customerEmail?: string;
    paidAt?: string;
    channel?: string;
    alreadyCredited?: boolean;
    creditedUserId?: Id<"users">;
    depositId?: Id<"deposits">;
  }> => {
    const adminStatus = await ctx.runQuery(api.admin.checkAdminStatus, {});
    if (!adminStatus?.isAdmin || !adminStatus?.user) {
      throw new Error("SECURITY ALERT: Administrative privileges required.");
    }

    const res = await verifyPaystackTransaction(args.reference);
    if (!res.ok) return { success: false, message: res.message };

    const tx = res.json.data;
    const customerEmail = tx?.customer?.email as string | undefined;
    const paystackStatus = tx?.status as string | undefined;
    const amountKobo = tx?.amount as number | undefined;

    const existing = (await ctx.runQuery(internal.payments.getPaystackReconciliationByReference, {
      reference: args.reference,
    })) as
      | {
          creditedUserId?: Id<"users">;
          depositId?: Id<"deposits">;
        }
      | null;

    return {
      success: true,
      message: `Transaction status: ${paystackStatus ?? "unknown"}`,
      reference: args.reference,
      paystackStatus,
      amountKobo,
      currency: tx?.currency,
      customerEmail,
      paidAt: tx?.paid_at,
      channel: tx?.channel,
      alreadyCredited: !!existing,
      creditedUserId: existing?.creditedUserId,
      depositId: existing?.depositId,
    };
  },
});

export const recoverPaystackTransaction = action({
  args: { reference: v.string() },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    resultStatus: v.optional(v.string()),
    creditedUserId: v.optional(v.id("users")),
    depositId: v.optional(v.id("deposits")),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    message: string;
    resultStatus?: string;
    creditedUserId?: Id<"users">;
    depositId?: Id<"deposits">;
  }> => {
    const adminStatus = await ctx.runQuery(api.admin.checkAdminStatus, {});
    if (!adminStatus?.isAdmin || !adminStatus?.user) {
      throw new Error("SECURITY ALERT: Administrative privileges required.");
    }

    const res = await verifyPaystackTransaction(args.reference);
    if (!res.ok) return { success: false, message: res.message };

    const tx = res.json.data;
    if (tx?.status !== "success") {
      return { success: false, message: `Transaction not successful: ${tx?.status || "unknown"}` };
    }

    const amountKobo = tx?.amount as number;
    const customerEmail = tx?.customer?.email as string | undefined;

    const result = (await ctx.runMutation(internal.payments.reconcilePaystackPayment, {
      reference: args.reference,
      amountKobo,
      customerEmail,
      source: "admin",
      metadata: tx,
    })) as {
      status: "credited" | "already_credited" | "unmatched" | "mismatch";
      creditedUserId?: Id<"users">;
      depositId?: Id<"deposits">;
    };

    await ctx.runMutation(internal.admin.logAudit, {
      adminUserId: (adminStatus.user)._id as Id<"users">,
      action: "paystack_recovery",
      message: `Recovery attempted for reference ${args.reference}. Result: ${result.status}.`,
      targetType: "paystack",
      targetId: args.reference,
      metadata: { amountKobo, customerEmail, result },
    });

    if (result.status === "credited") {
      return {
        success: true,
        message: `Wallet credited. ₦${(amountKobo / 100).toLocaleString()} added.`,
        resultStatus: result.status,
        creditedUserId: result.creditedUserId,
        depositId: result.depositId,
      };
    }

    if (result.status === "already_credited") {
      return {
        success: true,
        message: "Already credited for this reference.",
        resultStatus: result.status,
        creditedUserId: result.creditedUserId,
        depositId: result.depositId,
      };
    }

    const failureMessage =
      result.status === "mismatch"
        ? "Amount mismatch between Paystack and stored deposit."
        : "Unable to match transaction to a user (missing/unknown email).";

    return {
      success: false,
      message: failureMessage,
      resultStatus: result.status,
      creditedUserId: result.creditedUserId,
      depositId: result.depositId,
    };
  },
});

export const paymentsExplorerLookup = action({
  args: { query: v.string() },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    mode: v.union(v.literal("reference"), v.literal("email"), v.literal("payout")),
    query: v.string(),
    paystackOk: v.optional(v.boolean()),
    paystackMessage: v.optional(v.string()),
    paystack: v.optional(v.any()),
    reconciliation: v.optional(v.any()),
    unmatched: v.optional(v.any()),
    deposit: v.optional(v.any()),
    user: v.optional(v.any()),
    recentTransactions: v.optional(v.array(v.any())),
    reconciliationsByEmail: v.optional(v.array(v.any())),
    unmatchedByEmail: v.optional(v.array(v.any())),
    withdrawal: v.optional(v.any()),
    withdrawalsByEmail: v.optional(v.array(v.any())),
  }),
  handler: async (ctx, args): Promise<any> => {
    const adminStatus = await ctx.runQuery(api.admin.checkAdminStatus, {});
    if (!adminStatus?.isAdmin || !adminStatus?.user) {
      throw new Error("SECURITY ALERT: Administrative privileges required.");
    }

    const q = args.query.trim();
    if (!q) {
      return { success: false, message: "Enter a reference or email.", mode: "reference", query: q };
    }

    const isEmail = q.includes("@");
    if (isEmail) {
      const user: any =
        (await ctx.runQuery(internal.admin.findUserByEmail, { email: q })) ||
        (await ctx.runQuery(internal.admin.findUserByEmail, { email: q.toLowerCase() }));

      const reconciliationsByEmail = (await ctx.runQuery(
        internal.payments.listPaystackReconciliationsByCustomerEmail,
        { customerEmail: q, limit: 50 },
      )) as Array<any>;
      const unmatchedByEmail = (await ctx.runQuery(internal.payments.listPaystackUnmatchedByCustomerEmail, {
        customerEmail: q,
        limit: 50,
      })) as Array<any>;
      const withdrawalsByEmail = user
        ? await ctx.runQuery(internal.admin.listWithdrawalsByUser, { userId: user._id, limit: 50 })
        : [];

      const recentTransactions: Array<any> = user
        ? await ctx.runQuery(internal.admin.listRecentTransactionsForUser, { userId: user._id, limit: 25 })
        : [];

      return {
        success: true,
        message: user ? "User located." : "No user found for this email.",
        mode: "email",
        query: q,
        user: user ?? undefined,
        recentTransactions,
        reconciliationsByEmail,
        unmatchedByEmail,
        withdrawalsByEmail,
      };
    }

    const transferCodeMatch = /^TRF_[a-zA-Z0-9]+$/.test(q);
    const numericMaybe = /^[0-9]+$/.test(q);
    if (transferCodeMatch || numericMaybe || q.startsWith("ext_")) {
      const withdrawal = await ctx.runQuery(internal.admin.findWithdrawalByIdentifiers, { query: q });
      if (withdrawal) {
        const user = await ctx.runQuery(internal.admin.getUserByIdUnsafe, { userId: withdrawal.userId });
        const recentTransactions: Array<any> = user
          ? await ctx.runQuery(internal.admin.listRecentTransactionsForUser, { userId: (user as any)._id, limit: 25 })
          : [];
        return {
          success: true,
          message: "Withdrawal located.",
          mode: "payout",
          query: q,
          withdrawal,
          user: user ?? undefined,
          recentTransactions,
        };
      }
    }

    const paystackRes = await verifyPaystackTransaction(q);
    const paystack = paystackRes.ok ? paystackRes.json?.data : undefined;

    const reconciliation: any = await ctx.runQuery(internal.payments.getPaystackReconciliationByReference, {
      reference: q,
    });
    const unmatched: any = await ctx.runQuery(internal.payments.getPaystackUnmatchedByReference, { reference: q });
    const deposit: any = await ctx.runQuery(internal.payments.getDepositByReference, { reference: q });
    const withdrawalByReference = await ctx.runQuery(internal.admin.getWithdrawalByPaystackReference, { reference: q });

    let creditedUserId: Id<"users"> | undefined = (reconciliation)?.creditedUserId;
    if (!creditedUserId) creditedUserId = (deposit)?.userId;
    if (!creditedUserId) {
      const email = (paystack)?.customer?.email as string | undefined;
      if (email) {
        const byEmail = (await ctx.runQuery(internal.admin.findUserByEmail, { email })) as any;
        creditedUserId = byEmail?._id as Id<"users"> | undefined;
      }
    }

    const user: any = creditedUserId
      ? await ctx.runQuery(internal.admin.getUserByIdUnsafe, { userId: creditedUserId })
      : null;
    const recentTransactions: Array<any> = user
      ? await ctx.runQuery(internal.admin.listRecentTransactionsForUser, { userId: (user)._id, limit: 25 })
      : [];

    return {
      success: true,
      message: paystackRes.ok ? "Paystack verification fetched." : paystackRes.message,
      mode: "reference",
      query: q,
      paystackOk: paystackRes.ok,
      paystackMessage: paystackRes.ok ? undefined : paystackRes.message,
      paystack,
      reconciliation: reconciliation ?? undefined,
      unmatched: unmatched ?? undefined,
      deposit: deposit ?? undefined,
      withdrawal: withdrawalByReference ?? undefined,
      user: user ?? undefined,
      recentTransactions,
    };
  },
});

export const listUnresolvedPaystackUnmatchedPage = query({
  args: { cursor: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("paystack_unmatched"),
        reference: v.string(),
        amount: v.number(),
        customerEmail: v.optional(v.string()),
        source: v.union(v.literal("verify"), v.literal("webhook"), v.literal("admin"), v.literal("cron")),
        reason: v.string(),
        resolved: v.boolean(),
        createdAt: v.number(),
        metadata: v.optional(v.any()),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.union(v.null(), v.string()),
  }),
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    const limit = Math.max(1, Math.min(args.limit ?? 25, 100));
    const result = await (ctx.db
      .query("paystack_unmatched")
      .withIndex("by_resolved", (q) => q.eq("resolved", false))
      .order("desc") as any).paginate({
      cursor: args.cursor ?? null,
      numItems: limit,
    });
    return {
      page: result.page.map((r: any) => ({
        _id: r._id,
        reference: r.reference,
        amount: r.amount,
        customerEmail: r.customerEmail,
        source: r.source,
        reason: r.reason,
        resolved: r.resolved,
        createdAt: r.createdAt,
        metadata: r.metadata,
      })),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const markPaystackUnmatchedResolved = mutation({
  args: { unmatchedId: v.id("paystack_unmatched"), reason: v.string() },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const admin = await checkAdmin(ctx);
    const row = await ctx.db.get("paystack_unmatched", args.unmatchedId);
    if (!row) return { success: false, message: "Row not found." };
    const reason = args.reason.trim();
    if (!reason) return { success: false, message: "Reason required." };

    await ctx.db.patch("paystack_unmatched", row._id, { resolved: true });

    await ctx.db.insert("admin_audit", {
      adminUserId: admin._id,
      action: "paystack_unmatched_resolved",
      message: `Paystack unmatched resolved by admin. Ref: ${row.reference} (Reason: ${reason})`,
      targetType: "paystack_unmatched",
      targetId: row._id,
      metadata: { reference: row.reference, amount: row.amount, customerEmail: row.customerEmail, reason },
    });

    return { success: true, message: "Marked resolved." };
  },
});

export const retryUnmatchedPaystackPaymentsNow = action({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    processed: v.optional(v.number()),
    credited: v.optional(v.number()),
    alreadyCredited: v.optional(v.number()),
    stillUnmatched: v.optional(v.number()),
    mismatched: v.optional(v.number()),
  }),
  handler: async (ctx, args): Promise<any> => {
    const adminStatus = await ctx.runQuery(api.admin.checkAdminStatus, {});
    if (!adminStatus?.isAdmin || !adminStatus?.user) {
      throw new Error("SECURITY ALERT: Administrative privileges required.");
    }

    const result = await ctx.runAction(internal.payments.retryUnmatchedPaystackPayments, {
      limit: args.limit ?? 25,
    });

    await ctx.runMutation(internal.admin.logAudit, {
      adminUserId: (adminStatus.user)._id as Id<"users">,
      action: "paystack_unmatched_retry_sweep",
      message: `Admin triggered unmatched Paystack retry sweep. Processed: ${(result as any).processed ?? 0}. Credited: ${(result as any).credited ?? 0}.`,
      targetType: "paystack_unmatched",
      targetId: "sweep",
      metadata: { result },
    });

    return { success: true, message: "Retry sweep completed.", ...(result as any) };
  },
});

export const getSystemStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    await checkAdmin(ctx);

    const stats = await ctx.db.query("system_stats").unique();
    const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const weekPenaltyEntries = await ctx.db
      .query("reward_pool")
      .withIndex("by_week_and_type", (q) => q.eq("week_number", weekNumber).eq("type", "penalty"))
      .collect();
    const weekDistributionEntries = await ctx.db
      .query("reward_pool")
      .withIndex("by_week_and_type", (q) =>
        q.eq("week_number", weekNumber).eq("type", "distribution"),
      )
      .collect();
    const rewardPoolWeek =
      weekPenaltyEntries.reduce((sum, e) => sum + e.amount, 0) +
      weekDistributionEntries.reduce((sum, e) => sum + e.amount, 0);
    const users = await ctx.db.query("users").order("desc").take(5000);
    const totalUsers = users.length;
    const verifiedUsers = users.filter((u) => !!u.emailVerificationTime).length;
    const unverifiedUsers = totalUsers - verifiedUsers;
    const adminUsers = users.filter((u) => u.isAdmin === true).length;
    const activeVaults = await ctx.db
      .query("vaults")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(5000);
    const totalStaked = activeVaults.reduce((sum, v) => sum + v.amount, 0);

    const totalRewardPoolContributed = stats?.total_reward_pool_contributed || 0;
    const totalDistributed = stats?.total_distributed || 0;

    return {
      revenue: stats?.total_revenue || 0,
      distributed: totalDistributed,
      totalPenaltiesCollected: stats?.total_penalties_collected || 0,
      totalRewardPoolContributed,
      rewardPoolBalanceAllTime: totalRewardPoolContributed - totalDistributed,
      rewardPoolWeek,
      totalUsers,
      verifiedUsers,
      unverifiedUsers,
      adminUsers,
      activeVaults: activeVaults.length,
      totalStaked,
    };
  }
});

export const recomputeSystemAccounting = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    totals: v.any(),
  }),
  handler: async (ctx) => {
    await checkAdmin(ctx);

    const penaltyTxs = await ctx.db
      .query("transactions")
      .withIndex("by_type", (q) => q.eq("type", "penalty"))
      .collect();

    let totalPenaltiesCollected = 0;
    let totalRevenue = 0;
    let totalRewardPoolContributed = 0;

    for (const t of penaltyTxs) {
      const penalty = Math.max(0, -t.amount);
      if (!penalty) continue;
      totalPenaltiesCollected += penalty;
      const platformShare = Math.floor(penalty * 0.7);
      const rewardShare = penalty - platformShare;
      totalRevenue += platformShare;
      totalRewardPoolContributed += rewardShare;
    }

    const rewardPoolEntries = await ctx.db.query("reward_pool").collect();
    const totalDistributed = rewardPoolEntries
      .filter((e) => e.type === "distribution" && e.amount < 0)
      .reduce((sum, e) => sum + -e.amount, 0);

    const stats = await ctx.db.query("system_stats").unique();
    const statsId =
      stats?._id ??
      (await ctx.db.insert("system_stats", {
        total_revenue: 0,
        total_distributed: 0,
        active_users: 0,
        total_penalties_collected: 0,
        total_reward_pool_contributed: 0,
      }));

    await ctx.db.patch("system_stats", statsId, {
      total_revenue: totalRevenue,
      total_distributed: totalDistributed,
      total_penalties_collected: totalPenaltiesCollected,
      total_reward_pool_contributed: totalRewardPoolContributed,
    });

    return {
      success: true,
      message: "System accounting recomputed.",
      totals: {
        totalPenaltiesCollected,
        totalRevenue,
        totalRewardPoolContributed,
        totalDistributed,
        rewardPoolBalanceAllTime: totalRewardPoolContributed - totalDistributed,
      },
    };
  },
});


export const listRecentTransactionsForUser = internalQuery({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 25;
    return await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

export const seedDummyUserHistory = action({
  args: {
    domain: v.optional(v.string()),
    limit: v.optional(v.number()),
    goalsPerUser: v.optional(v.number()),
    logsPerGoal: v.optional(v.number()),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    const adminStatus = await ctx.runQuery(api.admin.checkAdminStatus, {});
    if (!adminStatus?.isAdmin || !adminStatus?.user) {
      throw new Error("SECURITY ALERT: Administrative privileges required.");
    }

    const domain = args.domain ?? "protocol.io";
    const limit = args.limit ?? 20;
    const userIds: Array<Id<"users">> = [];
    let cursor: string | null = null;
    while (userIds.length < limit) {
      const scan: any = await ctx.runQuery(internal.seed.scanUsersByEmailDomainPage, {
        domain,
        cursor: cursor ?? undefined,
        numItems: 200,
      });
      userIds.push(...(scan.userIds as Array<Id<"users">>));
      cursor = scan.continueCursor;
      if (scan.isDone) break;
    }
    userIds.splice(limit);

    const goalsPerUser = args.goalsPerUser ?? 3;
    const logsPerGoal = args.logsPerGoal ?? 10;

    for (const userId of userIds) {
      await ctx.runMutation(internal.seed.seedHistoryForUser, {
        userId,
        goalsPerUser,
        logsPerGoal,
      });
    }

    await ctx.runMutation(internal.admin.logAudit, {
      adminUserId: (adminStatus.user)._id as Id<"users">,
      action: "seed_dummy_history",
      message: `Seeded ${goalsPerUser} goal(s) per user for ${userIds.length} user(s) @${domain}.`,
      metadata: { domain, goalsPerUser, logsPerGoal, users: userIds.length },
    });

    return {
      success: true,
      message: `Seeded historical logs for ${userIds.length} user(s) @${domain}.`,
    };
  },
});

export const populateExistingUserHistory = action({
  args: {
    domain: v.optional(v.string()),
    limit: v.optional(v.number()),
    logsPerGoal: v.optional(v.number()),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    const adminStatus = await ctx.runQuery(api.admin.checkAdminStatus, {});
    if (!adminStatus?.isAdmin || !adminStatus?.user) {
      throw new Error("SECURITY ALERT: Administrative privileges required.");
    }

    const domain = args.domain ?? "protocol.io";
    const limit = args.limit ?? 20;
    const userIds: Array<Id<"users">> = [];
    let cursor: string | null = null;
    while (userIds.length < limit) {
      const scan: any = await ctx.runQuery(internal.seed.scanUsersByEmailDomainPage, {
        domain,
        cursor: cursor ?? undefined,
        numItems: 200,
      });
      userIds.push(...(scan.userIds as Array<Id<"users">>));
      cursor = scan.continueCursor;
      if (scan.isDone) break;
    }
    userIds.splice(limit);

    const logsPerGoal = args.logsPerGoal ?? 14;

    let totalGoals = 0;
    let totalInserted = 0;
    let totalSkipped = 0;

    for (const userId of userIds) {
      const res = (await ctx.runMutation(internal.seed.populateExistingLogsForUser, {
        userId,
        logsPerGoal,
      }));
      totalGoals += res.goalsProcessed;
      totalInserted += res.logsInserted;
      totalSkipped += res.logsSkipped;
    }

    await ctx.runMutation(internal.admin.logAudit, {
      adminUserId: (adminStatus.user)._id as Id<"users">,
      action: "populate_existing_history",
      message: `Populated historical logs for ${userIds.length} user(s) @${domain}. Inserted ${totalInserted} log(s), skipped ${totalSkipped} existing log(s) across ${totalGoals} goal(s).`,
      metadata: { domain, logsPerGoal, users: userIds.length, totalGoals, totalInserted, totalSkipped },
    });

    return {
      success: true,
      message: `Populated existing protocols: ${totalInserted} new log(s) added, ${totalSkipped} already present.`,
    };
  },
});

export const purgeSeedDataByDomain: any = action({
  args: { domain: v.optional(v.string()), limit: v.optional(v.number()), dryRun: v.optional(v.boolean()) },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    result: v.optional(v.any()),
  }),
  handler: async (ctx, args): Promise<any> => {
    const adminStatus = await ctx.runQuery(api.admin.checkAdminStatus, {});
    if (!adminStatus?.isAdmin || !adminStatus?.user) {
      throw new Error("SECURITY ALERT: Administrative privileges required.");
    }

    const domain = (args.domain ?? "protocol.io").trim();
    const dryRun = !!args.dryRun;
    const limit = args.limit ?? 200;

    let cursor: string | null = null;
    let done = false;
    let remaining = limit;

    const result: any = {
      domain,
      dryRun,
      usersDeleted: 0,
      vaultsDeleted: 0,
      goalsDeleted: 0,
      goalLogsDeleted: 0,
      partnersDeleted: 0,
      transactionsDeleted: 0,
      notificationsDeleted: 0,
      depositsDeleted: 0,
      withdrawalsDeleted: 0,
      verificationTokensDeleted: 0,
    };

    while (!done && remaining > 0) {
      const scan: any = await ctx.runQuery(internal.seed.scanUsersByEmailDomainPage, {
        domain,
        cursor: cursor ?? undefined,
        numItems: 200,
      });

      cursor = scan.continueCursor;
      done = scan.isDone;

      if (dryRun) {
        const takeCount = Math.min(remaining, scan.userIds.length);
        result.usersDeleted += takeCount;
        remaining -= takeCount;
        continue;
      }

      let ids = scan.userIds;
      while (ids.length > 0 && remaining > 0) {
        const chunk = ids.slice(0, Math.min(5, remaining));
        ids = ids.slice(chunk.length);

        const res = await ctx.runMutation(internal.seed.purgeUsersAndLinkedDataBatch, {
          userIds: chunk,
          dryRun: false,
        });

        result.usersDeleted += res.usersDeleted;
        result.vaultsDeleted += res.vaultsDeleted;
        result.goalsDeleted += res.goalsDeleted;
        result.goalLogsDeleted += res.goalLogsDeleted;
        result.partnersDeleted += res.partnersDeleted;
        result.transactionsDeleted += res.transactionsDeleted;
        result.notificationsDeleted += res.notificationsDeleted;
        result.depositsDeleted += res.depositsDeleted;
        result.withdrawalsDeleted += res.withdrawalsDeleted;
        result.verificationTokensDeleted += res.verificationTokensDeleted;

        remaining -= res.usersDeleted;
      }
    }

    await ctx.runMutation(internal.admin.logAudit, {
      adminUserId: (adminStatus.user)._id as Id<"users">,
      action: "purge_seed_data",
      message: dryRun
        ? `Dry-run purge completed for @${domain}.`
        : `Purged seeded users/data for @${domain}.`,
      metadata: result,
    });

    await ctx.runMutation(internal.admin.logSystemAudit, {
      action: "purge_seed_data",
      message: dryRun
        ? `Dry-run purge completed for @${domain}.`
        : `Purged seeded users/data for @${domain}.`,
      metadata: result,
    });

    await ctx.runMutation(internal.admin.insertSeedRun, {
      domain,
      startedAt: Date.now(),
      dryRun,
      requestedLimit: args.limit,
      usersDeleted: result.usersDeleted,
      vaultsDeleted: result.vaultsDeleted,
      goalsDeleted: result.goalsDeleted,
      goalLogsDeleted: result.goalLogsDeleted,
      partnersDeleted: result.partnersDeleted,
      transactionsDeleted: result.transactionsDeleted,
      notificationsDeleted: result.notificationsDeleted,
      depositsDeleted: result.depositsDeleted,
      withdrawalsDeleted: result.withdrawalsDeleted,
      verificationTokensDeleted: result.verificationTokensDeleted,
    });

    return {
      success: true,
      message: dryRun
        ? `Dry run complete. Found ${result.usersDeleted} user(s) to delete for @${domain}.`
        : `Deleted ${result.usersDeleted} user(s) (and linked data) for @${domain}.`,
      result,
    };
  },
});

export const deleteWaitlistEntry = mutation({
  args: { waitlistId: v.id("waitlist") },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const admin = await checkAdmin(ctx);
    const entry = await ctx.db.get("waitlist", args.waitlistId);
    if (!entry) return { success: false, message: "Waitlist entry not found." };

    await ctx.db.delete("waitlist", args.waitlistId);
    await ctx.db.insert("admin_audit", {
      adminUserId: admin._id,
      action: "waitlist_remove",
      message: `Removed ${entry.email} from waitlist.`,
      targetType: "waitlist",
      targetId: args.waitlistId,
      metadata: { email: entry.email },
    });

    return { success: true, message: "Removed from waitlist." };
  },
});

export const triggerMidnightSweep = mutation({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
        const admin = await checkAdmin(ctx);
        await ctx.scheduler.runAfter(0, internal.penalties.midnightSweep, {});
        await ctx.db.insert("admin_audit", {
          adminUserId: admin._id,
          action: "trigger_midnight_sweep",
          message: "Midnight sweep protocol triggered.",
        });
        return null;
    }
});

export const triggerWeeklyDistribution = mutation({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
        const admin = await checkAdmin(ctx);
        await ctx.scheduler.runAfter(0, internal.rewards.distributeWeeklyRewards, {});
        await ctx.db.insert("admin_audit", {
          adminUserId: admin._id,
          action: "trigger_weekly_distribution",
          message: "Weekly distribution protocol triggered.",
        });
        return null;
    }
});

export const getPendingWithdrawals = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    await checkAdmin(ctx);
    const pending = await ctx.db
      .query("withdrawals")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(1000);
    const processing = await ctx.db
      .query("withdrawals")
      .withIndex("by_status", (q) => q.eq("status", "processing"))
      .take(1000);
    const withdrawals = [...pending, ...processing];

    const results = [];
    for (const w of withdrawals) {
      const user = await ctx.db.get("users", w.userId);
      results.push({
        ...w,
        bank_details: w.bank_details
          ? {
              ...w.bank_details,
              account_number: maskAccountNumber(w.bank_details.account_number),
            }
          : w.bank_details,
        user,
      });
    }
    return results;
  },
});

export const getWithdrawalById = internalQuery({
    args: { withdrawalId: v.id("withdrawals") },
    returns: v.any(),
    handler: async (ctx, args) => {
        return await ctx.db.get("withdrawals", args.withdrawalId);
    }
});

export const getWithdrawalTransactionById = internalQuery({
  args: { withdrawalId: v.id("withdrawals") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_withdrawal", (q) => q.eq("withdrawalId", args.withdrawalId))
      .unique();
  },
});

/**
 * PRODUCTION EXTRACTION PROTOCOL (Paystack Transfer)
 * This is an action because it communicates with the external Paystack API.
 */
export const approveWithdrawal = action({
  args: { withdrawalId: v.id("withdrawals") },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    // 1. Authenticate Admin
    const adminStatus = await ctx.runQuery(api.admin.checkAdminStatus, {});
    if (!adminStatus?.isAdmin || !adminStatus?.user) {
      throw new Error("SECURITY ALERT: Administrative privileges required.");
    }

    // 2. Fetch withdrawal details
    const withdrawal = await ctx.runQuery(internal.admin.getWithdrawalById, { 
        withdrawalId: args.withdrawalId 
    });

    if (!withdrawal || withdrawal.status !== "pending") {
        return { success: false, message: "Request already processed or not found." };
    }

    const { bank_details, amount } = withdrawal;

    if (!bank_details) {
        return { success: false, message: "Invalid extraction details: Missing bank data." };
    }

    try {
        // 3. Create Transfer Recipient
        const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                type: "nuban",
                name: bank_details.account_name,
                account_number: bank_details.account_number,
                bank_code: bank_details.bank_code,
                currency: "NGN",
            }),
        });

        const recipientData = await recipientRes.json();
        if (!recipientData.status) throw new Error(recipientData.message);

        const recipientCode = recipientData.data.recipient_code;

        // 4. Initiate Transfer
        const reference = `ext_${args.withdrawalId.slice(0, 8)}_${Date.now()}`;
        const transferRes = await fetch("https://api.paystack.co/transfer", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                source: "balance",
                amount: amount, // amount is already in kobo
                recipient: recipientCode,
                reason: "Lockedin Extraction",
                reference,
            }),
        });

        const transferData = await transferRes.json();
        if (!transferData.status) throw new Error(transferData.message);

        await ctx.runMutation(internal.admin.logAudit, {
          adminUserId: (adminStatus.user)._id as Id<"users">,
          action: "approve_withdrawal",
          message: `Withdrawal approved and transfer queued. Amount: ₦${(amount / 100).toLocaleString()}.`,
          targetType: "withdrawal",
          targetId: args.withdrawalId,
          metadata: { amount, reference, recipientCode, transferData: transferData?.data },
        });

        await ctx.runMutation(internal.admin.updateWithdrawalPaystackMeta, {
          withdrawalId: args.withdrawalId,
          reference,
          transferCode: transferData?.data?.transfer_code,
          transferId: transferData?.data?.id,
          paystackStatus: transferData?.data?.status,
          metadata: transferData?.data,
        });

        return { success: true, message: "Capital extraction queued. Awaiting Paystack confirmation." };

    } catch (err: any) {
        await ctx.runMutation(internal.admin.updateWithdrawalPaystackFailure, {
          withdrawalId: args.withdrawalId,
          reason: err?.message || "Unknown error",
        });
        await ctx.runMutation(internal.admin.logAudit, {
          adminUserId: (adminStatus.user)._id as Id<"users">,
          action: "approve_withdrawal_failed",
          message: `Withdrawal transfer failed: ${err?.message || "Unknown error"}`,
          targetType: "withdrawal",
          targetId: args.withdrawalId,
          metadata: { amount },
        });
        return { success: false, message: `Disbursement Failed: ${err.message}` };
    }
  },
});

export const rejectWithdrawal = mutation({
  args: {
    withdrawalId: v.id("withdrawals"),
    reason: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const admin = await checkAdmin(ctx);
    const withdrawal = await ctx.db.get("withdrawals", args.withdrawalId);
    if (!withdrawal) {
      return { success: false, message: "Withdrawal not found." };
    }
    if (withdrawal.status !== "pending") {
      return { success: false, message: "Only pending withdrawals can be rejected." };
    }

    const user = await ctx.db.get("users", withdrawal.userId);
    if (user) {
      await ctx.db.patch("users", user._id, {
        balance: (user.balance || 0) + withdrawal.amount,
      });
    }

    await ctx.db.patch("withdrawals", args.withdrawalId, {
      status: "rejected",
      processed_at: Date.now(),
      metadata: {
        ...(withdrawal.metadata ?? {}),
        rejectionReason: args.reason?.trim() || "Rejected by admin review.",
      },
    });

    const tx = await ctx.db
      .query("transactions")
      .withIndex("by_withdrawal", (q) => q.eq("withdrawalId", args.withdrawalId))
      .unique();
    if (tx) {
      await ctx.db.patch("transactions", tx._id, { status: "failed" });
    }

    await ctx.db.insert("notifications", {
      userId: withdrawal.userId,
      title: "Extraction Rejected",
      message: `Your extraction request for ₦${(withdrawal.amount / 100).toLocaleString()} was rejected and the capital has been returned to your wallet.`,
      type: "wallet_withdrawal",
      read: false,
    });

    await ctx.db.insert("admin_audit", {
      adminUserId: admin._id,
      action: "reject_withdrawal",
      message: `Withdrawal rejected. Amount: ₦${(withdrawal.amount / 100).toLocaleString()}.`,
      targetType: "withdrawal",
      targetId: args.withdrawalId,
      metadata: {
        reason: args.reason?.trim() || "Rejected by admin review.",
      },
    });

    return { success: true, message: "Withdrawal rejected and escrow released." };
  },
});

export const updateWithdrawalPaystackMeta = internalMutation({
  args: {
    withdrawalId: v.id("withdrawals"),
    reference: v.string(),
    transferCode: v.optional(v.string()),
    transferId: v.optional(v.number()),
    paystackStatus: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const withdrawal = await ctx.db.get("withdrawals", args.withdrawalId);
    if (!withdrawal) return null;

    await ctx.db.patch("withdrawals", args.withdrawalId, {
      status: "processing",
      paystack_reference: args.reference,
      paystack_transfer_code: args.transferCode,
      paystack_transfer_id: args.transferId,
      paystack_status: args.paystackStatus,
      metadata: args.metadata,
    });

    await ctx.db.insert("notifications", {
      userId: withdrawal.userId,
      title: "Extraction Processing",
      message: "Your extraction has been approved and is being processed by Paystack.",
      type: "wallet_withdrawal",
      read: false,
    });

    return null;
  },
});

export const updateWithdrawalPaystackFailure = internalMutation({
  args: {
    withdrawalId: v.id("withdrawals"),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const withdrawal = await ctx.db.get("withdrawals", args.withdrawalId);
    if (!withdrawal) return null;
    if (withdrawal.status === "completed") return null;

    const user = await ctx.db.get("users", withdrawal.userId);
    if (user) {
      await ctx.db.patch("users", user._id, { balance: (user.balance || 0) + withdrawal.amount });
    }

    await ctx.db.patch("withdrawals", args.withdrawalId, {
      status: "failed",
      processed_at: Date.now(),
      paystack_status: "failed",
      metadata: { reason: args.reason },
    });

    await ctx.db.insert("notifications", {
      userId: withdrawal.userId,
      title: "Extraction Failed",
      message: `Your extraction could not be completed. ₦${(withdrawal.amount / 100).toLocaleString()} has been returned to your wallet.`,
      type: "wallet_withdrawal",
      read: false,
    });

    const tx = await ctx.db
      .query("transactions")
      .withIndex("by_withdrawal", (q) => q.eq("withdrawalId", withdrawal._id))
      .unique();

    if (tx) {
      await ctx.db.patch("transactions", tx._id, { status: "failed" });
    }

    return null;
  },
});

export const finalizeWithdrawal = internalMutation({
    args: { 
        withdrawalId: v.id("withdrawals"), 
        status: v.string(),
        processedAt: v.number()
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const withdrawal = await ctx.db.get("withdrawals", args.withdrawalId);
        if (!withdrawal) return null;

        await ctx.db.patch("withdrawals", args.withdrawalId, {
            status: args.status as any,
            processed_at: args.processedAt,
        });

        if (args.status === "completed") {
            await ctx.db.insert("notifications", {
                userId: withdrawal.userId,
                title: "Extraction Protocol Complete",
                message: `Your capital of ₦${(withdrawal.amount / 100).toLocaleString()} has been dispersed to your bank account.`,
                  type: "wallet_withdrawal",
                read: false,
            });

            const tx = await ctx.db
              .query("transactions")
              .withIndex("by_withdrawal", (q) => q.eq("withdrawalId", withdrawal._id))
              .unique();
            
            if (tx) {
                await ctx.db.patch("transactions", tx._id, { status: "completed" });
            }
        }

        return null;
    }
});

export const getBreachCandidates = query({
    args: { limit: v.optional(v.number()) },
    returns: v.array(v.any()),
    handler: async (ctx, args) => {
        await checkAdmin(ctx);
        const limit = Math.max(1, Math.min(args.limit ?? 50, 100));
        // Vaults that are active and might need manual failure enforcement
        const activeVaults = await ctx.db
            .query("vaults")
            .withIndex("by_status", q => q.eq("status", "active"))
            .order("desc")
            .take(limit);
        
        const results = [];
        for (const vault of activeVaults) {
            const user = await ctx.db.get("users", vault.userId);
            const goal = await ctx.db
                .query("goals")
                .withIndex("by_vault", q => q.eq("vaultId", vault._id))
                .first();
            
            // Check if they missed a check-in recently
            // This is just a basic list for now
            results.push({ ...vault, user, goal });
        }
        return results;
    }
});

export const enforceProtocolBreach = mutation({
    args: { vaultId: v.id("vaults") },
    returns: v.null(),
    handler: async (ctx, args) => {
        const admin = await checkAdmin(ctx);
        const vault = await ctx.db.get("vaults", args.vaultId);
        if (!vault || vault.status !== "active") return null;

        const existingAccrued = vault.penaltyAccrued ?? 0;
        const remaining = Math.max(0, vault.amount - existingAccrued);

        await ctx.db.patch("vaults", args.vaultId, {
          status: "failed",
          penaltyAccrued: vault.amount,
        });

        await ctx.runMutation(internal.partners.endAllForVault, { vaultId: args.vaultId });

        // Logic for penalty distribution
        await ctx.db.insert("transactions", {
            userId: vault.userId,
            amount: -remaining,
            type: "penalty",
            vaultId: vault._id,
            status: "completed",
            description: "Protocol Breach: Remaining principal forfeiture enforced by Admin."
        });

        await ctx.db.insert("notifications", {
            userId: vault.userId,
            title: "PROTOCOL BREACH ENFORCED",
            message: "System has detected an unrecoverable goal failure. Vault has been ended and penalties settled.",
            type: "streak_alert",
            read: false,
        });

        await ctx.db.insert("admin_audit", {
            adminUserId: admin._id,
            action: "enforce_protocol_breach",
            message: `Forfeiture enforced. Vault: ${args.vaultId}`,
            targetType: "vault",
            targetId: args.vaultId,
            metadata: { amount: remaining }
        });

        return null;
    }
});

export const markUserEmailVerified = mutation({
  args: { email: v.string(), reason: v.optional(v.string()) },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const admin = await checkAdmin(ctx);
    const email = args.email.trim().toLowerCase();
    if (!email) return { success: false, message: "Email required." };
    const reason = args.reason?.trim() || undefined;

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();

    if (!user) return { success: false, message: "User not found." };

    if (user.emailVerificationTime) {
      return { success: true, message: "User already verified." };
    }

    await ctx.db.patch("users", user._id, { emailVerificationTime: Date.now() });

    await ctx.db.insert("admin_audit", {
      adminUserId: admin._id,
      action: "mark_user_email_verified",
      message: `Email verified by admin. User: ${email}${reason ? ` (Reason: ${reason})` : ""}`,
      targetType: "user",
      targetId: user._id,
      metadata: { email, reason },
    });

    return { success: true, message: "User email marked as verified." };
  },
});

export const updateUserVerifications = mutation({
  args: {
    userId: v.id("users"),
    emailVerified: v.optional(v.boolean()),
    bvn_verified: v.optional(v.boolean()),
    isAdmin: v.optional(v.boolean()),
    is_discoverable: v.optional(v.boolean()),
    witness_discoverable: v.optional(v.boolean()),
    reason: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    user: v.optional(v.any()),
  }),
  handler: async (ctx, args) => {
    const admin = await checkAdmin(ctx);
    const user = await ctx.db.get("users", args.userId);
    if (!user) return { success: false, message: "User not found." };
    const reason = args.reason?.trim() || undefined;

    const patch: any = {};
    if (args.emailVerified !== undefined) {
      patch.emailVerificationTime = args.emailVerified
        ? user.emailVerificationTime ?? Date.now()
        : undefined;
    }
    if (args.bvn_verified !== undefined) patch.bvn_verified = args.bvn_verified;
    if (args.isAdmin !== undefined) patch.isAdmin = args.isAdmin;
    if (args.is_discoverable !== undefined) patch.is_discoverable = args.is_discoverable;
    if (args.witness_discoverable !== undefined) patch.witness_discoverable = args.witness_discoverable;
    if (args.isAdmin === true) {
      if (args.is_discoverable === undefined) patch.is_discoverable = false;
      if (args.witness_discoverable === undefined) patch.witness_discoverable = false;
    }

    await ctx.db.patch("users", user._id, patch);

    const updated = await ctx.db.get("users", user._id);

    await ctx.db.insert("admin_audit", {
      adminUserId: admin._id,
      action: "update_user_verifications",
      message: `User verification/admin flags updated. User: ${(updated?.email ?? user.email ?? user._id) as any}${reason ? ` (Reason: ${reason})` : ""}`,
      targetType: "user",
      targetId: user._id,
      metadata: {
        emailVerified: args.emailVerified,
        bvn_verified: args.bvn_verified,
        isAdmin: args.isAdmin,
        is_discoverable: args.is_discoverable,
        witness_discoverable: args.witness_discoverable,
        reason,
      },
    });

    return { success: true, message: "User updated.", user: updated ?? undefined };
  },
});

export const searchUsersByEmailPrefix = query({
  args: {
    prefix: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      emailVerified: v.boolean(),
      bvn_verified: v.boolean(),
      isAdmin: v.optional(v.boolean()),
      is_discoverable: v.boolean(),
      witness_discoverable: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    const prefix = args.prefix.trim().toLowerCase();
    if (!prefix) return [];
    const limit = Math.max(1, Math.min(args.limit ?? 10, 25));

    const page = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.gte("email", prefix).lt("email", `${prefix}\uffff`))
      .take(limit);

    return page.map((u) => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      emailVerified: !!u.emailVerificationTime,
      bvn_verified: u.bvn_verified,
      isAdmin: u.isAdmin,
      is_discoverable: u.is_discoverable,
      witness_discoverable: u.witness_discoverable,
    }));
  },
});

export const getUserProtocols = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    const limit = Math.max(1, Math.min(args.limit ?? 50, 100));

    const vaults = await ctx.db
      .query("vaults")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    const results: Array<any> = [];
    for (const vault of vaults) {
      const goal = await ctx.db
        .query("goals")
        .withIndex("by_vault", (q) => q.eq("vaultId", vault._id))
        .first();
      results.push({ ...vault, goal: goal ?? null });
    }

    return results;
  },
});

export const makeUsersVisibleByEmailDomain = mutation({
  args: {
    domain: v.string(),
    limit: v.optional(v.number()),
    markVerified: v.optional(v.boolean()),
  },
  returns: v.object({ updated: v.number(), domain: v.string() }),
  handler: async (ctx, args) => {
    await checkAdmin(ctx);

    const raw = args.domain.trim().toLowerCase();
    const domain = raw.startsWith("@") ? raw.slice(1) : raw;
    const limit = Math.max(1, Math.min(args.limit ?? 50, 200));
    const markVerified = args.markVerified === true;

    const users = await ctx.db.query("users").take(2000);
    const matches = users
      .filter((u) => (u.email ?? "").toLowerCase().endsWith(`@${domain}`) || (u.email ?? "").toLowerCase().endsWith(domain))
      .slice(0, limit);

    for (const u of matches) {
      await ctx.db.patch("users", u._id, {
        is_discoverable: true,
        witness_discoverable: true,
        ...(markVerified && !u.emailVerificationTime ? { emailVerificationTime: Date.now() } : {}),
      });
    }

    return { updated: matches.length, domain };
  },
});

export const repairDuplicatePartnerships = mutation({
  args: { dryRun: v.optional(v.boolean()), limit: v.optional(v.number()) },
  returns: v.object({ scanned: v.number(), duplicateGroups: v.number(), fixed: v.number() }),
  handler: async (ctx, args) => {
    await checkAdmin(ctx);

    const dryRun = args.dryRun !== false;
    const limit = Math.max(1, Math.min(args.limit ?? 2000, 5000));
    const rows = await ctx.db.query("accountability_partners").take(limit);

    const groups = new Map<string, Array<any>>();
    for (const r of rows) {
      const key = `${r.vaultId}:${r.partnerId}`;
      const list = groups.get(key) ?? [];
      list.push(r);
      groups.set(key, list);
    }

    let duplicateGroups = 0;
    let fixed = 0;

    for (const [, list] of groups) {
      if (list.length <= 1) continue;
      duplicateGroups += 1;

      const sorted = [...list].sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));
      const keep =
        sorted.find((x) => x.status === "active") ??
        sorted.find((x) => x.status === "pending") ??
        sorted[0];

      for (const r of sorted) {
        if (r._id === keep._id) continue;
        if (dryRun) continue;
        if (r.status === "ended") continue;
        await ctx.db.patch("accountability_partners", r._id, { status: "ended" });
        fixed += 1;
      }
    }

    return { scanned: rows.length, duplicateGroups, fixed };
  },
});

export const recomputeUserTiers = mutation({
  args: { limit: v.optional(v.number()) },
  returns: v.object({ scanned: v.number(), updated: v.number() }),
  handler: async (ctx, args) => {
    await checkAdmin(ctx);

    const tierForIntegrity = (score: number) => {
      if (score >= 90) return "gold" as const;
      if (score >= 75) return "silver" as const;
      return "bronze" as const;
    };

    const limit = Math.max(1, Math.min(args.limit ?? 5000, 5000));
    const users = await ctx.db.query("users").take(limit);

    let updated = 0;
    for (const u of users) {
      const expected = tierForIntegrity(u.integrityScore ?? 0);
      if (u.tier !== expected) {
        await ctx.db.patch("users", u._id, { tier: expected });
        updated += 1;
      }
    }

    return { scanned: users.length, updated };
  },
});
