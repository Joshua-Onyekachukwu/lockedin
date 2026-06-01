import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * GOAL EVALUATION ENGINE
 * Runs every midnight to enforce protocol discipline.
 */

export const midnightSweep = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const isSunday = todayDayName === 'sunday';
    
    // Find all active vaults
    const activeVaults = await ctx.db
      .query("vaults")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    for (const vault of activeVaults) {
      const goals = await ctx.db
        .query("goals")
        .withIndex("by_vault", (q) => q.eq("vaultId", vault._id))
        .collect();

      for (const goal of goals) {
        let breached = false;

        if (goal.frequency_type === 'daily') {
          const today = new Date().toISOString().split('T')[0];
          const logs = await ctx.db
            .query("goal_logs")
            .withIndex("by_goal_and_date", (q) => q.eq("goalId", goal._id).eq("date", today))
            .collect();
          
          if (logs.length === 0) breached = true;
        } else if (goal.frequency_type === 'weekly' && isSunday) {
          const today = new Date();
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - 7);
          const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
          const weekLogs = await ctx.db
            .query("goal_logs")
            .withIndex("by_goal_and_date", (q) => q.eq("goalId", goal._id))
            .filter(q => q.gte(q.field("date"), startOfWeekStr))
            .collect();
          
          if (weekLogs.length < (goal.target_count || 1)) breached = true;
        } else if (goal.frequency_type === 'monthly' && new Date().getDate() === 1) {
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
            const monthLogs = await ctx.db
              .query("goal_logs")
              .withIndex("by_goal_and_date", (q) => q.eq("goalId", goal._id))
              .filter(q => q.gte(q.field("date"), startOfMonthStr))
              .collect();
            
            if (monthLogs.length < (goal.target_count || 1)) breached = true;
        }

        if (breached) {
          const user = await ctx.db.get(vault.userId);
          if (user && user.shields > 0) {
              // AUTO-DEPLOY SHIELD
              await ctx.db.patch(user._id, { shields: user.shields - 1 });
              await ctx.db.insert("notifications", {
                  userId: user._id,
                  title: "Protocol Shield Deployed",
                  message: `A shield protected your stake for ${goal.title} after a breach. Integrity preserved.`,
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
    return null;
  },
});

async function applyPain(ctx: any, vault: any, goal: any) {
    const user = await ctx.db.get(vault.userId);
    
    // Tier Mapping
    const tierMap = {
        "deterrence": 0.02,
        "enforcement": 0.05,
        "liquidation": 0.10
    };
    
    const penaltyPercent = tierMap[vault.painTier as keyof typeof tierMap] || 0.02;
    const penaltyAmount = Math.floor(vault.amount * penaltyPercent);
    
    if (penaltyAmount > 0) {
        // Record penalty transaction
        await ctx.db.insert("transactions", {
            userId: vault.userId,
            vaultId: vault._id,
            amount: -penaltyAmount,
            type: "penalty",
            status: "completed",
            description: `Protocol Breach Forfeiture: ${goal.title}`
        });

        // 70% goes to Platform Revenue (Admin)
        // 30% goes to Reward Pool (Sunday Liquidation)
        const platformShare = Math.floor(penaltyAmount * 0.7);
        const rewardShare = penaltyAmount - platformShare;

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
        const current = stats ?? {
          total_revenue: 0,
          total_distributed: 0,
          active_users: 0,
          total_penalties_collected: 0,
          total_reward_pool_contributed: 0,
        };
        await ctx.db.patch(statsId, {
          total_revenue: (current.total_revenue || 0) + platformShare,
          total_penalties_collected: (current.total_penalties_collected || 0) + penaltyAmount,
          total_reward_pool_contributed: (current.total_reward_pool_contributed || 0) + rewardShare,
        });

        // Fund the Sunday Liquidation pool
        const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
        await ctx.db.insert("reward_pool", {
            week_number: weekNumber,
            amount: rewardShare,
            source_vault_id: vault._id,
            type: "penalty"
        });

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

    await ctx.db.patch(vault.userId, { 
        streak_count: 0,
        integrityScore: Math.max(0, (user?.integrityScore ?? 100) - 10),
        tier:
          Math.max(0, (user?.integrityScore ?? 100) - 10) >= 90
            ? "gold"
            : Math.max(0, (user?.integrityScore ?? 100) - 10) >= 75
              ? "silver"
              : "bronze",
    });
}
