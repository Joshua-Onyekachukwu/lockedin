import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

/**
 * PROTOCOL EXECUTION ENGINE
 */

export const calculateIntegrityScore = query({
  args: { userId: v.id("users") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const vaults = await ctx.db
      .query("vaults")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    if (vaults.length === 0) return 100;

    const failed = vaults.filter(v => v.status === "failed").length;
    return Math.max(0, 100 - (failed * 15));
  }
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("fitness"),
      v.literal("learning"),
      v.literal("financial"),
      v.literal("habit"),
      v.literal("professional")
    ),
    checkin_day: v.string(),
    duration_weeks: v.number(), 
    stakedAmount: v.number(),
    painTier: v.union(
      v.literal("deterrence"),
      v.literal("enforcement"),
      v.literal("liquidation")
    ),
  },
  returns: v.id("vaults"),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Unauthenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Identity verification failed");
    if (user.balance < args.stakedAmount) throw new Error("Insufficient capital in wallet");

    // Deduct balance (Logical escrow)
    await ctx.db.patch(userId, { balance: user.balance - args.stakedAmount });

    const now = Date.now();
    const vaultId = await ctx.db.insert("vaults", {
      userId,
      amount: args.stakedAmount,
      currency: "NGN",
      duration_weeks: args.duration_weeks,
      startDate: now,
      endDate: now + args.duration_weeks * 7 * 24 * 60 * 60 * 1000,
      painTier: args.painTier,
      status: "active",
      interest_earned: 0,
    });

    await ctx.db.insert("goals", {
      vaultId,
      userId,
      category: args.category,
      title: args.title,
      description: args.description,
      checkin_day: args.checkin_day,
    });

    await ctx.db.insert("transactions", {
      userId,
      amount: -args.stakedAmount,
      type: "stake",
      vaultId,
      status: "completed",
    });

    return vaultId;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const checkIn = mutation({
  args: {
    goalId: v.id("goals"),
    week_number: v.number(),
    proofImageId: v.optional(v.id("_storage")),
    note: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Unauthenticated");

    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new Error("Goal not found");
    
    // SECURITY: Ensure the user owns this goal
    if (goal.userId !== userId) {
        throw new Error("Authorization Breach: You cannot check-in for a protocol you do not own.");
    }

    const vault = await ctx.db.get(goal.vaultId);
    if (!vault || vault.status !== "active") return { success: false, message: "Vault is not active" };

    const today = new Date().toISOString().split('T')[0];
    
    await ctx.db.insert("goal_logs", {
      goalId: args.goalId,
      week_number: args.week_number,
      date: today,
      status: "completed",
      proofImageId: args.proofImageId,
      note: args.note,
    });

    return { success: true, message: "Evidence logged. Pending partner verification." };
  },
});

export const listByUser = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) return [];

    const vaults = await ctx.db
      .query("vaults")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const results = [];
    for (const vault of vaults) {
        const goal = await ctx.db
            .query("goals")
            .withIndex("by_vault", (q) => q.eq("vaultId", vault._id))
            .unique();
        if (goal) {
            results.push({ ...vault, goal });
        }
    }
    return results;
  },
});

export const getFullContext = query({
  args: { vaultId: v.id("vaults") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) return null;

    const vault = await ctx.db.get(args.vaultId);
    if (!vault) return null;
    
    const goal = await ctx.db
        .query("goals")
        .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
        .unique();
    if (!goal) return null;

    // Security check: only owner or partner can view
    const partner = await ctx.db
      .query("accountability_partners")
      .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
      .filter(q => q.eq(q.field("partnerId"), userId))
      .unique();

    if (vault.userId !== userId && !partner) {
       // Return limited data for invite preview if not authorized
       return { 
           amount: vault.amount, 
           status: vault.status, 
           goal: { title: goal.title } 
       };
    }

    const logs = await ctx.db
      .query("goal_logs")
      .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
      .order("desc")
      .collect();

    const logsWithUrls = await Promise.all(logs.map(async (log) => {
        return {
            ...log,
            proofUrl: log.proofImageId ? await ctx.storage.getUrl(log.proofImageId) : null
        };
    }));

    return { ...vault, goal, logs: logsWithUrls, isPartner: !!partner };
  }
});

export const listDiscoverable = query({
    args: {},
    returns: v.array(v.any()),
    handler: async (ctx) => {
        // Find discoverable users
        const users = await ctx.db
            .query("users")
            .filter(q => q.eq(q.field("is_discoverable"), true))
            .collect();
        
        const userIds = new Set(users.map(u => u._id));
        const results = [];

        // Get active vaults from these users
        const activeVaults = await ctx.db
            .query("vaults")
            .withIndex("by_status", q => q.eq("status", "active"))
            .collect();
        
        for (const vault of activeVaults) {
            if (userIds.has(vault.userId)) {
                const user = users.find(u => u._id === vault.userId);
                const goal = await ctx.db
                    .query("goals")
                    .withIndex("by_vault", q => q.eq("vaultId", vault._id))
                    .unique();
                if (goal && user) {
                    results.push({ ...vault, goal, user });
                }
            }
        }
        return results;
    }
});
