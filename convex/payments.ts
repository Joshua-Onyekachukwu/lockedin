import { mutation, query, action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { api, internal } from "./_generated/api";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

const PaystackSource = v.union(
  v.literal("verify"),
  v.literal("webhook"),
  v.literal("admin"),
  v.literal("cron"),
);

/**
 * Initialize a deposit session
 */
export const initializeDeposit = mutation({
  args: {
    amount: v.number(), // In NGN (we will convert to Kobo for Paystack)
  },
  returns: v.object({
    reference: v.string(),
    userId: v.id("users"),
    email: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user || !user.email) throw new Error("User email required for payment");
    if (!user.emailVerificationTime) throw new Error("Email verification required.");

    const reference = `LKD-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    await ctx.db.insert("deposits", {
      userId,
      amount: args.amount * 100, // Store in Kobo
      status: "pending",
      reference,
      provider: "paystack",
    });

    return {
      reference,
      userId,
      email: user.email,
    };
  },
});

/**
 * Verify a Paystack payment (Action because it calls an external API)
 */
export const verifyPayment = action({
  args: {
    reference: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.current, {});
    if (!user || !user.emailVerificationTime) throw new Error("Email verification required.");

    if (!PAYSTACK_SECRET) {
      return { success: false, message: "Payment backend not configured." };
    }
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${args.reference}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.status && data.data.status === "success") {
        // Amount check (Paystack returns amount in Kobo)
        const amountKobo = data.data.amount;
        const customerEmail = data?.data?.customer?.email as string | undefined;
        const result = await ctx.runMutation(internal.payments.reconcilePaystackPayment, {
          reference: args.reference,
          amountKobo,
          customerEmail,
          source: "verify",
          metadata: data.data,
        });

        if (result.status === "credited") {
          return { success: true, message: "Payment verified and wallet funded." };
        }
        if (result.status === "already_credited") {
          return { success: true, message: "Payment already credited." };
        }
        if (result.status === "unmatched") {
          return { success: false, message: "Payment received but could not be matched to a wallet yet." };
        }
        return { success: false, message: "Payment could not be credited. Please contact support." };
      }

      return { success: false, message: data.message || "Payment verification failed." };
    } catch (error) {
      console.error("Payment verification error:", error);
      return { success: false, message: "Internal server error during verification." };
    }
  },
});

/**
 * Internal mutation to update user balance and deposit status
 */
export const fulfillDeposit = internalMutation({
  args: {
    reference: v.string(),
    amountKobo: v.number(),
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const deposit = await ctx.db
      .query("deposits")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();

    if (!deposit) {
      throw new Error("Deposit reference not found.");
    }
    if (deposit.status === "completed") return null;
    if (deposit.amount !== args.amountKobo) {
      throw new Error("Deposit amount mismatch.");
    }

    // Update deposit status
    await ctx.db.patch(deposit._id, { status: "completed", metadata: args.metadata });

    // Update user balance
    const user = await ctx.db.get(deposit.userId);
    if (user) {
      await ctx.db.patch(user._id, {
        balance: (user.balance || 0) + args.amountKobo,
      });

      // Log transaction
      await ctx.db.insert("transactions", {
        userId: user._id,
        amount: args.amountKobo,
        type: "deposit",
        status: "completed",
        description: `Paystack deposit: ${args.reference}`,
      });

      await ctx.db.insert("notifications", {
        userId: user._id,
        title: "Wallet Funded",
        message: `Deposit confirmed. ₦${(args.amountKobo / 100).toLocaleString()} added to wallet.`,
        type: "wallet_funded",
        link: "/dashboard",
        read: false,
      });
    }

    return null;
  },
});

export const reconcilePaystackPayment = internalMutation({
  args: {
    reference: v.string(),
    amountKobo: v.number(),
    customerEmail: v.optional(v.string()),
    source: PaystackSource,
    metadata: v.optional(v.any()),
  },
  returns: v.object({
    status: v.union(
      v.literal("credited"),
      v.literal("already_credited"),
      v.literal("unmatched"),
      v.literal("mismatch"),
    ),
    creditedUserId: v.optional(v.id("users")),
    depositId: v.optional(v.id("deposits")),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("paystack_reconciliations")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();

    if (existing) {
      return {
        status: "already_credited" as const,
        creditedUserId: existing.creditedUserId,
        depositId: existing.depositId,
      };
    }

    const deposit = await ctx.db
      .query("deposits")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();

    const now = Date.now();

    if (deposit) {
      if (deposit.amount !== args.amountKobo) {
        await ctx.db.insert("paystack_unmatched", {
          reference: args.reference,
          amount: args.amountKobo,
          customerEmail: args.customerEmail,
          source: args.source,
          reason: "amount_mismatch",
          metadata: args.metadata,
          resolved: false,
          createdAt: now,
        });
        return { status: "mismatch" as const };
      }

      const user = await ctx.db.get(deposit.userId);
      if (!user) {
        await ctx.db.insert("paystack_unmatched", {
          reference: args.reference,
          amount: args.amountKobo,
          customerEmail: args.customerEmail,
          source: args.source,
          reason: "deposit_user_missing",
          metadata: args.metadata,
          resolved: false,
          createdAt: now,
        });
        return { status: "unmatched" as const };
      }

      if (deposit.status !== "completed") {
        await ctx.db.patch(deposit._id, { status: "completed", metadata: args.metadata });
        await ctx.db.patch(user._id, {
          balance: (user.balance || 0) + args.amountKobo,
        });

        await ctx.db.insert("transactions", {
          userId: user._id,
          amount: args.amountKobo,
          type: "deposit",
          status: "completed",
          description: `Paystack deposit: ${args.reference}`,
        });

        await ctx.db.insert("notifications", {
          userId: user._id,
          title: "Wallet Funded",
          message: `Deposit confirmed. ₦${(args.amountKobo / 100).toLocaleString()} added to wallet.`,
          type: "wallet_funded",
          link: "/dashboard",
          read: false,
        });
      }

      const reconciliationId = await ctx.db.insert("paystack_reconciliations", {
        reference: args.reference,
        amount: args.amountKobo,
        customerEmail: args.customerEmail,
        creditedUserId: user._id,
        depositId: deposit._id,
        source: args.source,
        metadata: args.metadata,
        createdAt: now,
      });
      void reconciliationId;

      return { status: "credited" as const, creditedUserId: user._id, depositId: deposit._id };
    }

    if (!args.customerEmail) {
      await ctx.db.insert("paystack_unmatched", {
        reference: args.reference,
        amount: args.amountKobo,
        customerEmail: args.customerEmail,
        source: args.source,
        reason: "missing_customer_email",
        metadata: args.metadata,
        resolved: false,
        createdAt: now,
      });
      return { status: "unmatched" as const };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.customerEmail))
      .unique();

    if (!user) {
      await ctx.db.insert("paystack_unmatched", {
        reference: args.reference,
        amount: args.amountKobo,
        customerEmail: args.customerEmail,
        source: args.source,
        reason: "user_not_found_by_email",
        metadata: args.metadata,
        resolved: false,
        createdAt: now,
      });
      return { status: "unmatched" as const };
    }

    const depositId = await ctx.db.insert("deposits", {
      userId: user._id,
      amount: args.amountKobo,
      status: "completed",
      reference: args.reference,
      provider: "paystack",
      metadata: args.metadata,
    });

    await ctx.db.patch(user._id, {
      balance: (user.balance || 0) + args.amountKobo,
    });

    await ctx.db.insert("transactions", {
      userId: user._id,
      amount: args.amountKobo,
      type: "deposit",
      status: "completed",
      description: `Paystack deposit: ${args.reference}`,
    });

    await ctx.db.insert("notifications", {
      userId: user._id,
      title: "Wallet Funded",
      message: `Deposit confirmed. ₦${(args.amountKobo / 100).toLocaleString()} added to wallet.`,
      type: "wallet_funded",
      link: "/dashboard",
      read: false,
    });

    await ctx.db.insert("paystack_reconciliations", {
      reference: args.reference,
      amount: args.amountKobo,
      customerEmail: args.customerEmail,
      creditedUserId: user._id,
      depositId,
      source: args.source,
      metadata: args.metadata,
      createdAt: now,
    });

    return { status: "credited" as const, creditedUserId: user._id, depositId };
  },
});

function normalizeResolution(raw: unknown) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;
  return s;
}

export const handlePaystackRefundProcessed = internalMutation({
  args: {
    refundId: v.optional(v.union(v.string(), v.number())),
    reference: v.string(),
    amountKobo: v.number(),
    customerEmail: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({ ok: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const key = `refund:${String(args.refundId ?? "") || args.reference}`;
    const existing = await ctx.db
      .query("paystack_reversals")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) return { ok: true, message: "Refund already processed." };

    const now = Date.now();
    const reconciliation = await ctx.db
      .query("paystack_reconciliations")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();

    const creditedUserId = reconciliation?.creditedUserId;
    if (!creditedUserId) {
      await ctx.db.insert("paystack_reversals", {
        key,
        reference: args.reference,
        amount: args.amountKobo,
        status: "processed",
        kind: "refund",
        customerEmail: args.customerEmail,
        creditedUserId: undefined,
        metadata: args.metadata,
        createdAt: now,
      });
      await ctx.db.insert("paystack_unmatched", {
        reference: args.reference,
        amount: args.amountKobo,
        customerEmail: args.customerEmail,
        source: "webhook",
        reason: "refund_processed_no_reconciliation",
        metadata: args.metadata,
        resolved: false,
        createdAt: now,
      });
      return { ok: true, message: "Refund recorded (no credited user found)." };
    }

    const holdKey = `dispute_hold:${args.reference}`;
    const hold = await ctx.db
      .query("paystack_reversals")
      .withIndex("by_key", (q) => q.eq("key", holdKey))
      .unique();

    const holdAmount = hold?.amount ?? 0;
    const delta = args.amountKobo - holdAmount;

    const user = await ctx.db.get(creditedUserId);
    if (user) {
      await ctx.db.patch(user._id, { balance: (user.balance || 0) - (hold ? delta : args.amountKobo) });
    }

    if (user) {
      if (hold) {
        const recent = await ctx.db
          .query("transactions")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .order("desc")
          .take(100);
        const pendingHold = recent.find(
          (t: any) =>
            t.type === "refund" &&
            t.status === "pending" &&
            typeof t.description === "string" &&
            t.description.includes(args.reference),
        );
        if (pendingHold) {
          await ctx.db.patch(pendingHold._id, {
            status: "completed",
            description: `Paystack refund processed: ${args.reference}`,
          });
        }

        if (delta !== 0) {
          await ctx.db.insert("transactions", {
            userId: user._id,
            amount: -delta,
            type: "refund",
            status: "completed",
            description: `Paystack refund adjustment: ${args.reference}`,
          });
        }
      } else {
        await ctx.db.insert("transactions", {
          userId: user._id,
          amount: -args.amountKobo,
          type: "refund",
          status: "completed",
          description: `Paystack refund processed: ${args.reference}`,
        });
      }

      await ctx.db.insert("notifications", {
        userId: user._id,
        title: "Payment Reversed",
        message: `A Paystack refund was processed for ₦${(args.amountKobo / 100).toLocaleString()}. Your wallet has been updated accordingly.`,
        type: "wallet_withdrawal",
        link: "/dashboard",
        read: false,
      });
    }

    if (hold && hold.status !== "processed") {
      await ctx.db.patch(hold._id, { status: "processed", metadata: args.metadata });
    }

    await ctx.db.insert("paystack_reversals", {
      key,
      reference: args.reference,
      amount: args.amountKobo,
      status: "processed",
      kind: "refund",
      customerEmail: args.customerEmail,
      creditedUserId,
      metadata: args.metadata,
      createdAt: now,
    });

    return { ok: true, message: "Refund applied." };
  },
});

export const handlePaystackDisputeCreate = internalMutation({
  args: {
    disputeId: v.optional(v.union(v.string(), v.number())),
    reference: v.string(),
    amountKobo: v.number(),
    customerEmail: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({ ok: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const key = `dispute_hold:${args.reference}`;
    const existing = await ctx.db
      .query("paystack_reversals")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) return { ok: true, message: "Dispute hold already exists." };

    const reconciliation = await ctx.db
      .query("paystack_reconciliations")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();

    const creditedUserId = reconciliation?.creditedUserId;
    const now = Date.now();

    await ctx.db.insert("paystack_reversals", {
      key,
      reference: args.reference,
      amount: args.amountKobo,
      status: "pending",
      kind: "dispute_hold",
      customerEmail: args.customerEmail,
      creditedUserId,
      metadata: { disputeId: args.disputeId, ...(args.metadata ?? {}) },
      createdAt: now,
    });

    if (!creditedUserId) {
      await ctx.db.insert("paystack_unmatched", {
        reference: args.reference,
        amount: args.amountKobo,
        customerEmail: args.customerEmail,
        source: "webhook",
        reason: "dispute_create_no_reconciliation",
        metadata: args.metadata,
        resolved: false,
        createdAt: now,
      });
      return { ok: true, message: "Dispute recorded (no credited user found)." };
    }

    const user = await ctx.db.get(creditedUserId);
    if (!user) return { ok: true, message: "Dispute recorded (user missing)." };

    await ctx.db.patch(user._id, { balance: (user.balance || 0) - args.amountKobo });
    await ctx.db.insert("transactions", {
      userId: user._id,
      amount: -args.amountKobo,
      type: "refund",
      status: "pending",
      description: `Paystack dispute opened (funds held): ${args.reference}`,
    });
    await ctx.db.insert("notifications", {
      userId: user._id,
      title: "Dispute Opened",
      message: `A Paystack dispute was opened. ₦${(args.amountKobo / 100).toLocaleString()} has been held from your wallet pending resolution.`,
      type: "wallet_withdrawal",
      link: "/dashboard",
      read: false,
    });

    return { ok: true, message: "Dispute hold applied." };
  },
});

export const handlePaystackDisputeResolve = internalMutation({
  args: {
    disputeId: v.optional(v.union(v.string(), v.number())),
    reference: v.string(),
    resolution: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({ ok: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const key = `dispute_resolve:${String(args.disputeId ?? "") || args.reference}`;
    const existing = await ctx.db
      .query("paystack_reversals")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) return { ok: true, message: "Dispute resolution already recorded." };

    const holdKey = `dispute_hold:${args.reference}`;
    const hold = await ctx.db
      .query("paystack_reversals")
      .withIndex("by_key", (q) => q.eq("key", holdKey))
      .unique();

    const now = Date.now();
    const normalized = normalizeResolution(args.resolution);
    const merchantWon =
      normalized === "merchant" ||
      normalized === "won" ||
      normalized === "win" ||
      normalized === "resolved_merchant" ||
      normalized === "merchant_won";

    if (hold && hold.creditedUserId && merchantWon && hold.status !== "processed") {
      const user = await ctx.db.get(hold.creditedUserId);
      if (user) {
        await ctx.db.patch(user._id, { balance: (user.balance || 0) + hold.amount });
        await ctx.db.insert("transactions", {
          userId: user._id,
          amount: hold.amount,
          type: "refund",
          status: "completed",
          description: `Paystack dispute resolved (hold released): ${args.reference}`,
        });
        await ctx.db.insert("notifications", {
          userId: user._id,
          title: "Dispute Resolved",
          message: `A Paystack dispute was resolved in your favor. ₦${(hold.amount / 100).toLocaleString()} has been released back to your wallet.`,
          type: "wallet_funded",
          link: "/dashboard",
          read: false,
        });
      }
      await ctx.db.patch(hold._id, { status: "processed", metadata: args.metadata });
    }

    await ctx.db.insert("paystack_reversals", {
      key,
      reference: args.reference,
      amount: hold?.amount ?? 0,
      status: "processed",
      kind: "dispute_resolve",
      customerEmail: hold?.customerEmail,
      creditedUserId: hold?.creditedUserId,
      metadata: { resolution: args.resolution, ...(args.metadata ?? {}) },
      createdAt: now,
    });

    return { ok: true, message: "Dispute resolution recorded." };
  },
});

export const getPaystackReconciliationByReference = internalQuery({
  args: { reference: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      reference: v.string(),
      amount: v.number(),
      customerEmail: v.optional(v.string()),
      creditedUserId: v.optional(v.id("users")),
      depositId: v.optional(v.id("deposits")),
      source: PaystackSource,
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("paystack_reconciliations")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();
    if (!row) return null;
    return {
      reference: row.reference,
      amount: row.amount,
      customerEmail: row.customerEmail,
      creditedUserId: row.creditedUserId,
      depositId: row.depositId,
      source: row.source,
      createdAt: row.createdAt,
    };
  },
});

export const getPaystackUnmatchedByReference = internalQuery({
  args: { reference: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("paystack_unmatched"),
      reference: v.string(),
      amount: v.number(),
      customerEmail: v.optional(v.string()),
      reason: v.string(),
      resolved: v.boolean(),
      createdAt: v.number(),
      source: PaystackSource,
      metadata: v.optional(v.any()),
    }),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("paystack_unmatched")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();
    if (!row) return null;
    return {
      _id: row._id,
      reference: row.reference,
      amount: row.amount,
      customerEmail: row.customerEmail,
      reason: row.reason,
      resolved: row.resolved,
      createdAt: row.createdAt,
      source: row.source,
      metadata: row.metadata,
    };
  },
});

export const listPaystackReconciliationsByCustomerEmail = internalQuery({
  args: { customerEmail: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      reference: v.string(),
      amount: v.number(),
      customerEmail: v.optional(v.string()),
      creditedUserId: v.optional(v.id("users")),
      depositId: v.optional(v.id("deposits")),
      source: PaystackSource,
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const rows = await ctx.db
      .query("paystack_reconciliations")
      .withIndex("by_customer_email", (q) => q.eq("customerEmail", args.customerEmail))
      .order("desc")
      .take(limit);
    return rows.map((r) => ({
      reference: r.reference,
      amount: r.amount,
      customerEmail: r.customerEmail,
      creditedUserId: r.creditedUserId,
      depositId: r.depositId,
      source: r.source,
      createdAt: r.createdAt,
    }));
  },
});

export const listPaystackUnmatchedByCustomerEmail = internalQuery({
  args: { customerEmail: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("paystack_unmatched"),
      reference: v.string(),
      amount: v.number(),
      customerEmail: v.optional(v.string()),
      reason: v.string(),
      resolved: v.boolean(),
      createdAt: v.number(),
      source: PaystackSource,
    }),
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const rows = await ctx.db
      .query("paystack_unmatched")
      .withIndex("by_customer_email", (q) => q.eq("customerEmail", args.customerEmail))
      .order("desc")
      .take(limit);
    return rows.map((r) => ({
      _id: r._id,
      reference: r.reference,
      amount: r.amount,
      customerEmail: r.customerEmail,
      reason: r.reason,
      resolved: r.resolved,
      createdAt: r.createdAt,
      source: r.source,
    }));
  },
});

export const getDepositByReference = internalQuery({
  args: { reference: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("deposits"),
      userId: v.id("users"),
      amount: v.number(),
      status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
      reference: v.string(),
      provider: v.union(v.literal("paystack"), v.literal("flutterwave")),
      _creationTime: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("deposits")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .order("desc")
      .take(1);
    const row = rows[0];
    if (!row) return null;
    return {
      _id: row._id,
      userId: row.userId,
      amount: row.amount,
      status: row.status,
      reference: row.reference,
      provider: row.provider,
      _creationTime: row._creationTime,
    };
  },
});

export const listUnresolvedPaystackUnmatched = internalQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("paystack_unmatched"),
      reference: v.string(),
      amount: v.number(),
      customerEmail: v.optional(v.string()),
      metadata: v.optional(v.any()),
    }),
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 25;
    const rows = await ctx.db
      .query("paystack_unmatched")
      .withIndex("by_resolved", (q) => q.eq("resolved", false))
      .order("desc")
      .take(limit);
    return rows.map((r) => ({
      _id: r._id,
      reference: r.reference,
      amount: r.amount,
      customerEmail: r.customerEmail,
      metadata: r.metadata,
    }));
  },
});

export const markPaystackUnmatchedResolved = internalMutation({
  args: { unmatchedId: v.id("paystack_unmatched") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.unmatchedId, { resolved: true });
    return null;
  },
});

export const retryUnmatchedPaystackPayments = internalAction({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    processed: v.number(),
    credited: v.number(),
    alreadyCredited: v.number(),
    stillUnmatched: v.number(),
    mismatched: v.number(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    processed: number;
    credited: number;
    alreadyCredited: number;
    stillUnmatched: number;
    mismatched: number;
  }> => {
    const limit = args.limit ?? 25;
    const rows = (await ctx.runQuery(internal.payments.listUnresolvedPaystackUnmatched, { limit })) as Array<{
      _id: any;
      reference: string;
      amount: number;
      customerEmail?: string;
      metadata?: any;
    }>;

    let credited = 0;
    let alreadyCredited = 0;
    let stillUnmatched = 0;
    let mismatched = 0;

    for (const row of rows) {
      const result = (await ctx.runMutation(internal.payments.reconcilePaystackPayment, {
        reference: row.reference,
        amountKobo: row.amount,
        customerEmail: row.customerEmail,
        source: "cron",
        metadata: row.metadata,
      })) as { status: "credited" | "already_credited" | "unmatched" | "mismatch" };

      if (result.status === "credited") {
        credited += 1;
        await ctx.runMutation(internal.payments.markPaystackUnmatchedResolved, { unmatchedId: row._id });
      } else if (result.status === "already_credited") {
        alreadyCredited += 1;
        await ctx.runMutation(internal.payments.markPaystackUnmatchedResolved, { unmatchedId: row._id });
      } else if (result.status === "mismatch") {
        mismatched += 1;
      } else {
        stillUnmatched += 1;
      }
    }

    return {
      processed: rows.length,
      credited,
      alreadyCredited,
      stillUnmatched,
      mismatched,
    };
  },
});

export const getDepositStatus = query({
  args: { reference: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      reference: v.string(),
      status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
      amount: v.number(),
      _creationTime: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const deposit = await ctx.db
      .query("deposits")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();

    if (!deposit) return null;
    if (deposit.userId !== userId) return null;

    return {
      reference: deposit.reference,
      status: deposit.status,
      amount: deposit.amount,
      _creationTime: deposit._creationTime,
    };
  },
});

export const requestWithdrawal = mutation({
  args: {
    amount: v.number(),
    accountNumber: v.string(),
    bankCode: v.string(),
    bankName: v.string(),
    accountName: v.string(),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    if (!user.emailVerificationTime) throw new Error("Email verification required.");

    if (user.balance < args.amount) {
      return { success: false, message: "Insufficient capital for withdrawal." };
    }

    // Deduct balance immediately (Escrow)
    await ctx.db.patch(userId, { balance: user.balance - args.amount });

    await ctx.db.insert("withdrawals", {
      userId,
      amount: args.amount,
      status: "pending",
      requested_at: Date.now(),
      bank_details: {
        account_number: args.accountNumber,
        bank_code: args.bankCode,
        bank_name: args.bankName,
        account_name: args.accountName,
      },
    });

    await ctx.db.insert("transactions", {
      userId,
      amount: -args.amount,
      type: "platform_fee", // Using platform_fee for deduction log
      status: "pending",
      description: `Withdrawal request to ${args.bankName} (${args.accountNumber})`,
    });

    await ctx.db.insert("notifications", {
      userId,
      title: "Withdrawal Requested",
      message: `Extraction queued. ₦${(args.amount / 100).toLocaleString()} moved to escrow.`,
      type: "wallet_withdrawal",
      link: "/dashboard",
      read: false,
    });

    return { 
        success: true, 
        message: "Request logged. Capital held in escrow. Disbursement expected in 24-48 hours." 
    };
  },
});

export const getTransactions = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const getBalance = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return 0;
    const user = await ctx.db.get(userId);
    return user?.balance || 0;
  },
});
