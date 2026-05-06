import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const midnightSweep = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    // Find all active vaults
    const activeVaults = await ctx.db
      .query("vaults")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    for (const vault of activeVaults) {
      // Find goals for this vault that match today's check-in day
      const goals = await ctx.db
        .query("goals")
        .withIndex("by_vault", (q) => q.eq("vaultId", vault._id))
        .collect();

      for (const goal of goals) {
        if (goal.checkin_day === 'daily' || goal.checkin_day === todayDayName) {
          // Check if there's a log for today
          const startOfToday = new Date().setHours(0,0,0,0);
          const logs = await ctx.db
            .query("goal_logs")
            .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
            .filter(q => q.gte(q.field("_creationTime"), startOfToday))
            .collect();

          if (logs.length === 0) {
            // Check if user has a shield to deploy
            const user = await ctx.db.get(vault.userId);
            if (user && user.shields > 0) {
                // AUTO-DEPLOY SHIELD
                await ctx.db.patch(user._id, { shields: user.shields - 1 });
                await ctx.db.insert("notifications", {
                    userId: user._id,
                    title: "Protocol Shield Deployed",
                    message: `A shield was used to protect your stake for ${goal.title} after a missed log. Integrity preserved.`,
                    type: "streak_alert",
                    read: false
                });
            } else {
                // APPLY PAIN
                await applyPain(ctx, vault, goal);
            }
          }
        }
      }
    }
    return null;
  },
});

async function applyPain(ctx: any, vault: any, goal: any) {
    const user = await ctx.db.get(vault.userId);
    
    // Exact Tier Mapping
    const tierMap = {
        "deterrence": 0.02,
        "enforcement": 0.05,
        "liquidation": 0.10
    };
    
    const penaltyPercent = tierMap[vault.painTier as keyof typeof tierMap] || 0.02;
    const penaltyAmount = Math.floor(vault.amount * penaltyPercent);
    
    if (penaltyAmount > 0) {
        await ctx.db.insert("transactions", {
            userId: vault.userId,
            vaultId: vault._id,
            amount: -penaltyAmount,
            type: "penalty",
            status: "completed",
            description: `Protocol Breach Forfeiture: ${goal.title}`
        });

        // BUSINESS MODEL: 
        // All money goes to Admin (Platform Revenue) 
        // No distribution to other users to avoid CBN issues.
        const platformRevenue = penaltyAmount;

        // Track platform revenue & stats
        const stats = await ctx.db.query("system_stats").unique();
        if (stats) {
            await ctx.db.patch(stats._id, {
                total_revenue: (stats.total_revenue || 0) + platformRevenue
            });
        }

        // Deduct from vault principal
        await ctx.db.patch(vault._id, {
            amount: vault.amount - penaltyAmount
        });

        await ctx.db.insert("notifications", {
            userId: vault.userId,
            title: "Stake Forfeited",
            message: `Breach detected for ${goal.title}. ₦${(penaltyAmount/100).toLocaleString()} removed from vault.`,
            type: "streak_alert",
            read: false
        });
    }

    // Integrity penalty
    await ctx.db.patch(vault.userId, { 
        streak_count: 0,
        integrityScore: Math.max(0, (user?.integrityScore ?? 100) - 10)
    });
}
