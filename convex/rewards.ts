import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Distributes 30% of the weekly penalty pool to high-integrity users as Protocol Credits.
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

        // 2. Identify High-Integrity Recipients (Score > 90 for credits)
        const eligibleUsers = await ctx.db
            .query("users")
            .withIndex("by_integrity", (q) => q.gt("integrityScore", 90))
            .collect();

        const finalWinners = eligibleUsers.filter(u => u.streak_count > 0);

        if (finalWinners.length === 0) return null;

        // 3. Distribute Credits (The user specified 30% share for users)
        // Since the poolEntries are already the 30% contribution (based on penalties.ts logic),
        // we distribute the entire amount as credits.
        const creditsPerUser = Math.floor(totalPool / finalWinners.length);

        for (const user of finalWinners) {
            await ctx.db.patch(user._id, {
                credits: (user.credits || 0) + creditsPerUser
            });

            await ctx.db.insert("notifications", {
                userId: user._id,
                title: "Protocol Credits Received",
                message: `You've earned ${creditsPerUser.toLocaleString()} credits for maintaining 90%+ integrity. Use them to acquire Protocol Shields.`,
                type: "streak_alert",
                read: false
            });
        }

        // Mark this week's pool as distributed
        await ctx.db.insert("reward_pool", {
            week_number: weekNumber,
            amount: -totalPool,
            type: "distribution"
        });

        return null;
    }
});
