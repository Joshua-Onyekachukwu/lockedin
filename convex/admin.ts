import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { internal } from "./_generated/api";

// SECURITY: Admin privileges are strictly limited to these authorized emails.
const ADMIN_EMAILS = [
  "onyekachukwujoshua1@gmail.com",
  "admin@lockedin.io" // Backup admin
];

async function checkAdmin(ctx: any) {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("UNAUTHORIZED: ACCESS DENIED");
    
    const user = await ctx.db.get(userId);
    if (!user || !user.email || !ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase())) {
        throw new Error("SECURITY ALERT: Administrative privileges required.");
    }
    return user;
}

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

export const triggerMidnightSweep = mutation({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
        await checkAdmin(ctx);
        await ctx.scheduler.runAfter(0, internal.penalties.midnightSweep, {});
        return null;
    }
});

export const triggerWeeklyDistribution = mutation({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
        await checkAdmin(ctx);
        await ctx.scheduler.runAfter(0, internal.rewards.distributeWeeklyRewards, {});
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

export const approveWithdrawal = mutation({
  args: { withdrawalId: v.id("withdrawals") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    const withdrawal = await ctx.db.get(args.withdrawalId);
    if (!withdrawal || withdrawal.status !== "pending") return null;

    await ctx.db.patch(args.withdrawalId, {
      status: "completed",
      processed_at: Date.now(),
    });

    await ctx.db.insert("notifications", {
      userId: withdrawal.userId,
      title: "Extraction Complete",
      message: `Your withdrawal of ₦${(withdrawal.amount / 100).toLocaleString()} has been processed.`,
      type: "verification_needed", // Reusing type or add more
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
  },
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
        await checkAdmin(ctx);
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

        return null;
    }
});
