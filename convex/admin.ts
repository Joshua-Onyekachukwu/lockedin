import { mutation, query, action, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { internal, api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

const ADMIN_EMAILS = (() => {
  const env = process.env.ADMIN_EMAIL_ALLOWLIST || "";
  const parsed = env
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return parsed;
})();

async function verifyPaystackTransaction(reference: string) {
  if (!PAYSTACK_SECRET) {
    return { ok: false, message: "Payment backend not configured." };
  }
  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
  });
  const json = await response.json();
  if (!json?.status) {
    return { ok: false, message: json?.message || "Unable to verify transaction." };
  }
  return { ok: true, json };
}

async function checkAdmin(ctx: any) {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("UNAUTHORIZED: ACCESS DENIED");
    
    const user = await ctx.db.get(userId);
    if (!user) {
        throw new Error("SECURITY ALERT: Administrative privileges required.");
    }
    
    const isEmailAdmin = user.email && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase());
    const isDbAdmin = user.isAdmin === true;
    
    if (!isDbAdmin && !isEmailAdmin) {
        throw new Error("SECURITY ALERT: Administrative privileges required.");
    }
    return user;
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

export const getAuditLog = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    const limit = args.limit ?? 100;
    const rows = await ctx.db.query("admin_audit").order("desc").take(limit);
    const results = [];
    for (const row of rows) {
      const admin = await ctx.db.get(row.adminUserId);
      results.push({ ...row, admin });
    }
    return results;
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
    const q = args.q.trim().toLowerCase();
    const limit = args.limit ?? 20;
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => {
        if (!q) return true;
        const name = (u.name || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        return name.includes(q) || email.includes(q);
      })
      .slice(0, limit)
      .map((u) => ({
        _id: u._id,
        _creationTime: u._creationTime,
        name: u.name,
        email: u.email,
        tier: u.tier,
        integrityScore: u.integrityScore,
        streak_count: u.streak_count,
        goals_completed: u.goals_completed,
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
    return {
      page: result.page.map((u: any) => ({
        _id: u._id,
        _creationTime: u._creationTime,
        name: u.name,
        email: u.email,
        tier: u.tier,
        integrityScore: u.integrityScore,
        streak_count: u.streak_count,
        goals_completed: u.goals_completed,
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
    const row = await ctx.db.get(args.auditId);
    if (!row) return null;
    const admin = await ctx.db.get(row.adminUserId);
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
        ),
        status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
        vaultId: v.optional(v.id("vaults")),
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
    for (const tx of result.page as any[]) {
      const id = String(tx.userId);
      if (!usersById.has(id)) {
        usersById.set(id, await ctx.db.get(tx.userId));
      }
    }

    return {
      page: (result.page as any[]).map((t) => ({
        _id: t._id,
        _creationTime: t._creationTime,
        userId: t.userId,
        userEmail: usersById.get(String(t.userId))?.email,
        amount: t.amount,
        type: t.type,
        status: t.status,
        vaultId: t.vaultId,
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
      ),
      vaultId: v.optional(v.id("vaults")),
      status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
      description: v.optional(v.string()),
      metadata: v.optional(v.any()),
      user: v.optional(v.any()),
    }),
  ),
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    const row = await ctx.db.get(args.transactionId);
    if (!row) return null;
    const user = await ctx.db.get(row.userId);
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
      .collect();

    const recentTx = await ctx.db.query("transactions").order("desc").take(1500);
    const deposits24h = recentTx.filter(
      (t) => t.type === "deposit" && t.status === "completed" && t._creationTime >= dayAgo,
    );

    const recentVaults = await ctx.db.query("vaults").order("desc").take(1500);
    const protocols24h = recentVaults.filter((v) => v._creationTime >= dayAgo).length;

    const activeVaults = await ctx.db
      .query("vaults")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

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
    returns: v.object({ isAdmin: v.boolean(), user: v.optional(v.any()) }),
    handler: async (ctx) => {
        try {
            const user = await checkAdmin(ctx);
            return { isAdmin: true, user };
        } catch (e) {
            return { isAdmin: false };
        }
    }
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
      adminUserId: (adminStatus.user as any)._id as Id<"users">,
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

export const getSystemStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    await checkAdmin(ctx);

    const stats = await ctx.db.query("system_stats").unique();
    const totalUsers = (await ctx.db.query("users").collect()).length;
    const activeVaults = (await ctx.db.query("vaults").withIndex("by_status", q => q.eq("status", "active")).collect());
    const totalStaked = activeVaults.reduce((sum, v) => sum + v.amount, 0);

    return {
      revenue: stats?.total_revenue || 0,
      distributed: stats?.total_distributed || 0,
      totalUsers,
      activeVaults: activeVaults.length,
      totalStaked,
    };
  }
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
    const userIds = (await ctx.runQuery(internal.seed.listUsersByEmailDomain, {
      domain,
      limit: args.limit,
    })) as Array<Id<"users">>;

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
      adminUserId: (adminStatus.user as any)._id as Id<"users">,
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
    const userIds = (await ctx.runQuery(internal.seed.listUsersByEmailDomain, {
      domain,
      limit: args.limit,
    })) as Array<Id<"users">>;

    const logsPerGoal = args.logsPerGoal ?? 14;

    let totalGoals = 0;
    let totalInserted = 0;
    let totalSkipped = 0;

    for (const userId of userIds) {
      const res = (await ctx.runMutation(internal.seed.populateExistingLogsForUser, {
        userId,
        logsPerGoal,
      })) as { goalsProcessed: number; logsInserted: number; logsSkipped: number };
      totalGoals += res.goalsProcessed;
      totalInserted += res.logsInserted;
      totalSkipped += res.logsSkipped;
    }

    await ctx.runMutation(internal.admin.logAudit, {
      adminUserId: (adminStatus.user as any)._id as Id<"users">,
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
    const withdrawals = await ctx.db
      .query("withdrawals")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const results = [];
    for (const w of withdrawals) {
      const user = await ctx.db.get(w.userId);
      results.push({ ...w, user });
    }
    return results;
  },
});

export const getWithdrawalById = internalQuery({
    args: { withdrawalId: v.id("withdrawals") },
    returns: v.any(),
    handler: async (ctx, args) => {
        return await ctx.db.get(args.withdrawalId);
    }
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
                reference: `EXT-${args.withdrawalId.slice(0, 8)}-${Date.now()}`,
            }),
        });

        const transferData = await transferRes.json();
        if (!transferData.status) throw new Error(transferData.message);

        // 5. Update Record via Mutation
        await ctx.runMutation(internal.admin.finalizeWithdrawal, {
            withdrawalId: args.withdrawalId,
            status: "completed",
            processedAt: Date.now()
        });

        await ctx.runMutation(internal.admin.logAudit, {
          adminUserId: (adminStatus.user as any)._id as Id<"users">,
          action: "approve_withdrawal",
          message: `Withdrawal approved and transfer initiated. Amount: ₦${(amount / 100).toLocaleString()}.`,
          targetType: "withdrawal",
          targetId: args.withdrawalId,
          metadata: { amount },
        });

        return { success: true, message: "Capital extraction protocol executed successfully." };

    } catch (err: any) {
        await ctx.runMutation(internal.admin.logAudit, {
          adminUserId: (adminStatus.user as any)._id as Id<"users">,
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

export const finalizeWithdrawal = internalMutation({
    args: { 
        withdrawalId: v.id("withdrawals"), 
        status: v.string(),
        processedAt: v.number()
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const withdrawal = await ctx.db.get(args.withdrawalId);
        if (!withdrawal) return null;

        await ctx.db.patch(args.withdrawalId, {
            status: args.status as any,
            processed_at: args.processedAt,
        });

        await ctx.db.insert("notifications", {
            userId: withdrawal.userId,
            title: "Extraction Protocol Complete",
            message: `Your capital of ₦${(withdrawal.amount / 100).toLocaleString()} has been dispersed to your bank account.`,
            type: "verification_needed",
            read: false,
        });

        // Update transaction status
        const tx = await ctx.db
          .query("transactions")
          .withIndex("by_user", (q) => q.eq("userId", withdrawal.userId))
          .filter((q) => q.and(
              q.eq(q.field("amount"), -withdrawal.amount),
              q.eq(q.field("status"), "pending")
          ))
          .first();
        
        if (tx) {
            await ctx.db.patch(tx._id, { status: "completed" });
        }

        return null;
    }
});

export const getBreachCandidates = query({
    args: {},
    returns: v.array(v.any()),
    handler: async (ctx) => {
        await checkAdmin(ctx);
        // Vaults that are active and might need manual failure enforcement
        const activeVaults = await ctx.db
            .query("vaults")
            .withIndex("by_status", q => q.eq("status", "active"))
            .collect();
        
        const results = [];
        for (const vault of activeVaults) {
            const user = await ctx.db.get(vault.userId);
            const goal = await ctx.db
                .query("goals")
                .withIndex("by_vault", q => q.eq("vaultId", vault._id))
                .unique();
            
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
        const vault = await ctx.db.get(args.vaultId);
        if (!vault || vault.status !== "active") return null;

        await ctx.db.patch(args.vaultId, { status: "failed" });

        // Logic for penalty distribution
        await ctx.db.insert("transactions", {
            userId: vault.userId,
            amount: -vault.amount,
            type: "penalty",
            vaultId: vault._id,
            status: "completed",
            description: "Protocol Breach: Total principal forfeiture enforced by Admin."
        });

        await ctx.db.insert("notifications", {
            userId: vault.userId,
            title: "PROTOCOL BREACH ENFORCED",
            message: "System has detected an unrecoverable goal failure. Principal has been forfeited.",
            type: "streak_alert",
            read: false,
        });

        await ctx.db.insert("admin_audit", {
            adminUserId: admin._id,
            action: "enforce_protocol_breach",
            message: `Forfeiture enforced. Vault: ${args.vaultId}`,
            targetType: "vault",
            targetId: args.vaultId,
            metadata: { amount: vault.amount }
        });

        return null;
    }
});
