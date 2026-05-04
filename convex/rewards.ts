import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Distributes 80% of the weekly penalty pool to high-integrity users.
 * 20% remains as platform protocol revenue.
 */
export const distributeWeeklyRewards = internalMutation({
    args: { weekNumber: v.number() },
    returns: v.null(),
    handler: async (ctx, args) => {
        // 1. Calculate Pool
        const poolEntries = await (ctx.db as any)
            .query("reward_pool")
            .withIndex("by_week_and_type", (q: any) => q.eq("week_number", args.weekNumber).eq("type", "penalty"))
            .collect();
        
        const totalPool = poolEntries.reduce((sum: number, entry: any) => sum + entry.amount, 0);
        if (totalPool <= 0) return null;

        // 2. Identify High-Integrity Recipients
        // Criteria: Verified BVN, Active Streak > 0, Integrity Score > 80
        const eligibleUsers = await ctx.db
            .query("users")
            .filter(q => 
                q.and(
                    q.eq(q.field("bvn_verified"), true),
                    q.gt(q.field("streak_count"), 0),
                    q.gt(q.field("integrityScore"), 80)
                )
            )
            .collect();

        if (eligibleUsers.length === 0) return null;

        // 3. Distribute Dividends
        const dividendPerUser = Math.floor(totalPool / eligibleUsers.length);

        for (const user of eligibleUsers) {
            await ctx.db.patch(user._id, {
                balance: (user.balance || 0) + dividendPerUser
            });

            await (ctx.db as any).insert("transactions", {
                userId: user._id,
                amount: dividendPerUser,
                type: "dividend",
                status: "completed",
                description: `Weekly High-Integrity Dividend (Week ${args.weekNumber})`
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
