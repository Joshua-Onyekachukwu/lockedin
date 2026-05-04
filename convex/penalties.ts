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
            // APPLY PAIN
            await applyPain(ctx, vault, goal);
          }
        }
      }
    }
    return null;
  },
});

async function applyPain(ctx: any, vault: any, goal: any) {
    const user = await ctx.db.get(vault.userId);
    
    if (vault.painTier === "serious") {
        // 2% Principal Loss
        const penaltyAmount = Math.floor(vault.amount * 0.02);
        
        await ctx.db.insert("transactions", {
            userId: vault.userId,
            vaultId: vault._id,
            amount: penaltyAmount,
            type: "penalty",
            status: "completed",
            description: `Protocol Breach: ${goal.title}`
        });

        // REVISED BUSINESS MODEL:
        // 60% Platform Revenue (Operations & Growth)
        // 30% Reward Pool (Dividends for High-Integrity Users)
        // 10% Liquidity Reserve (System Security)
        const platformFee = Math.floor(penaltyAmount * 0.60);
        const rewardPoolContribution = Math.floor(penaltyAmount * 0.30);
        const reserveContribution = penaltyAmount - platformFee - rewardPoolContribution;

        await (ctx.db as any).insert("reward_pool", {
            week_number: Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)),
            amount: rewardPoolContribution,
            source_vault_id: vault._id,
            type: "penalty"
        });

        // Track platform revenue
        const stats = await ctx.db.query("system_stats").unique();
        if (stats) {
            await ctx.db.patch(stats._id, {
                total_revenue: (stats.total_revenue || 0) + platformFee + reserveContribution
            });
        }

        await ctx.db.patch(vault._id, {
            amount: vault.amount - penaltyAmount
        });

        await ctx.db.insert("notifications", {
            userId: vault.userId,
            title: "Protocol Breach Detected",
            message: `Execution missed for ${goal.title}. ₦${(penaltyAmount/100).toLocaleString()} forfeited.`,
            type: "streak_alert",
            read: false
        });
    }

    // Always reset streak count
    await ctx.db.patch(vault.userId, { 
        streak_count: 0,
        // Integrity penalty: -10 points for a violation
        integrityScore: Math.max(0, (user?.integrityScore ?? 100) - 10)
    });
}
