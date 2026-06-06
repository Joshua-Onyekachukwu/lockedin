import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const KOBO_PER_CREDIT = 100;

/**
 * Distributes 30% of the weekly penalty pool to high-integrity users as Protocol Credits.
 */
export const distributeWeeklyRewards = internalMutation({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
        const nowTs = Date.now();
        const weekNumber = Math.floor(nowTs / WEEK_MS);

        const existingDistribution = await ctx.db
          .query("weekly_reward_distributions")
          .withIndex("by_week", (q) => q.eq("week_number", weekNumber))
          .order("desc")
          .first();
        if (existingDistribution) return null;
        
        const penaltyEntries = await ctx.db
          .query("reward_pool")
          .withIndex("by_week_and_type", (q) =>
            q.eq("week_number", weekNumber).eq("type", "penalty"),
          )
          .collect();
        
        const distributionEntries = await ctx.db
          .query("reward_pool")
          .withIndex("by_week_and_type", (q) =>
            q.eq("week_number", weekNumber).eq("type", "distribution"),
          )
          .collect();

        const totalPenaltyKobo = penaltyEntries.reduce((sum, entry) => sum + entry.amount, 0);
        const totalDistributedKobo = distributionEntries.reduce(
          (sum, entry) => sum + entry.amount,
          0,
        );
        const netPoolKobo = totalPenaltyKobo + totalDistributedKobo;
        if (netPoolKobo <= 0) return null;

        const poolCredits = Math.floor(netPoolKobo / KOBO_PER_CREDIT);
        if (poolCredits <= 0) return null;

        const eligibleUsers = await ctx.db
          .query("users")
          .withIndex("by_integrity", (q) => q.gt("integrityScore", 90))
          .collect();

        const candidateUsers = eligibleUsers.filter(
          (u) => u.streak_count > 0 && !!u.emailVerificationTime,
        );
        if (candidateUsers.length === 0) return null;

        const candidateSet = new Set(candidateUsers.map((u) => u._id));
        const activeVaults = await ctx.db
          .query("vaults")
          .withIndex("by_status", (q) => q.eq("status", "active"))
          .collect();

        const pointsByUser: Map<string, number> = new Map();
        for (const vault of activeVaults) {
          if (!candidateSet.has(vault.userId)) continue;
          const stake = Math.max(0, vault.amount - (vault.penaltyAccrued ?? 0));
          const points = Math.sqrt(stake);
          pointsByUser.set(vault.userId, (pointsByUser.get(vault.userId) ?? 0) + points);
        }

        const entries = candidateUsers
          .map((u) => ({
            user: u,
            points: pointsByUser.get(u._id) ?? 0,
          }))
          .filter((x) => x.points > 0);

        if (entries.length === 0) return null;

        const totalPoints = entries.reduce((sum, e) => sum + e.points, 0);
        if (totalPoints <= 0) return null;

        const allocations = entries.map((e) => {
          const exact = (poolCredits * e.points) / totalPoints;
          const base = Math.floor(exact);
          const remainder = exact - base;
          return { ...e, base, remainder };
        });

        const allocated = allocations.reduce((sum, a) => sum + a.base, 0);
        let remaining = poolCredits - allocated;
        allocations.sort((a, b) => {
          if (b.remainder !== a.remainder) return b.remainder - a.remainder;
          return String(a.user._id).localeCompare(String(b.user._id));
        });
        for (let i = 0; i < allocations.length && remaining > 0; i++) {
          allocations[i].base += 1;
          remaining -= 1;
        }

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
        let creditsDistributed = 0;
        for (const a of allocations) {
          if (a.base <= 0) continue;
          creditsDistributed += a.base;
          await ctx.db.patch("users", a.user._id, {
            credits: (a.user.credits || 0) + a.base,
          });

          await ctx.db.insert("weekly_reward_distributions", {
            week_number: weekNumber,
            userId: a.user._id,
            credits: a.base,
            points: a.points,
            pool_credits: poolCredits,
            createdAt: nowTs,
          });

          await ctx.db.insert("notifications", {
            userId: a.user._id,
            title: "Protocol Credits Received",
            message: `You've earned ${a.base.toLocaleString()} credits for maintaining 90%+ integrity.`,
            type: "streak_alert",
            read: false,
          });
        }

        const usedKobo = creditsDistributed * KOBO_PER_CREDIT;
        if (usedKobo > 0) {
          await ctx.db.insert("reward_pool", {
            week_number: weekNumber,
            amount: -usedKobo,
            type: "distribution",
          });
          await ctx.db.patch("system_stats", statsId, {
            total_distributed: (stats?.total_distributed || 0) + usedKobo,
          });
        }

        return null;
    }
});
