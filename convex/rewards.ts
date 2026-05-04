import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Distributes 80% of the weekly penalty pool to high-integrity users.
 */
export const distributeWeeklyRewards = internalMutation({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
        const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
        
        // 1. Calculate Pool using index
        const poolEntries = await ctx.db
            .query("reward_pool")
            .withIndex("by_week_and_type", (q) => q.eq("week_number", weekNumber).eq("type", "penalty"))
            .collect();
        
        const totalPool = poolEntries.reduce((sum, entry) => sum + entry.amount, 0);
        if (totalPool <= 0) return null;

        // 2. Identify High-Integrity Recipients (Score > 80)
        // Note: Using a lower bound query on the index
        const eligibleUsers = await ctx.db
            .query("users")
            .withIndex("by_integrity", (q) => q.gt("integrityScore", 80))
            .collect();

        // Further filtering for verified and active streaks (in-memory since we can't multiple index filter easily)
        const finalWinners = eligibleUsers.filter(u => u.bvn_verified && u.streak_count > 0);

        if (finalWinners.length === 0) return null;

        // 3. Distribute Dividends
        const dividendPerUser = Math.floor(totalPool / finalWinners.length);

        for (const user of finalWinners) {
            await ctx.db.patch(user._id, {
                balance: (user.balance || 0) + dividendPerUser
            });

            await ctx.db.insert("transactions", {
                userId: user._id,
                amount: dividendPerUser,
                type: "dividend",
                status: "completed",
                description: `Weekly High-Integrity Dividend (Week ${weekNumber})`
            });

            await ctx.db.insert("reward_pool", {
                week_number: weekNumber,
                amount: -dividendPerUser,
                type: "distribution"
            });

            await ctx.db.insert("notifications", {
                userId: user._id,
                title: "Dividend Received",
                message: `You've earned ₦${(dividendPerUser/100).toLocaleString()} for maintaining protocol adherence.`,
                type: "streak_alert",
                read: false
            });
        }

        return null;
    }
});
