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
    if (!user || !user.email || !ADMIN_EMAILS.includes(user.email)) {
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
