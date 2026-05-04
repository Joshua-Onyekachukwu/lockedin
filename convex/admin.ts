import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { internal } from "./_generated/api";

// SECURITY: Only allow the first user or a specific email to be admin
const ADMIN_EMAIL = "onyekachukwujoshua1@gmail.com"; // User's email from the prompt context if available, or just use this as placeholder

export const getSystemStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Unauthenticated");
    
    const user = await ctx.db.get(userId);
    if (!user || user.email !== ADMIN_EMAIL) {
        throw new Error("Access Denied: Administrative privileges required.");
    }

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
        const userId = await auth.getUserId(ctx);
        if (userId === null) throw new Error("Unauthenticated");
        
        const user = await ctx.db.get(userId);
        if (!user || user.email !== ADMIN_EMAIL) {
            throw new Error("Access Denied");
        }

        await ctx.scheduler.runAfter(0, internal.penalties.midnightSweep, {});
        return null;
    }
});

export const triggerWeeklyDistribution = mutation({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (userId === null) throw new Error("Unauthenticated");
        
        const user = await ctx.db.get(userId);
        if (!user || user.email !== ADMIN_EMAIL) {
            throw new Error("Access Denied");
        }

        await ctx.scheduler.runAfter(0, internal.rewards.distributeWeeklyRewards, {});
        return null;
    }
});
