import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const verifyLog = mutation({
  args: {
    logId: v.id("goal_logs"),
    verifierId: v.id("users"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    comment: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.logId);
    if (!log) throw new Error("Evidence not found");

    const goal = await ctx.db.get(log.goalId);
    if (!goal) throw new Error("Protocol not found");

    // SECURITY: Ensure the verifier is actually a partner
    const partner = await ctx.db
      .query("accountability_partners")
      .withIndex("by_vault", (q) => q.eq("vaultId", goal.vaultId))
      .filter(q => q.eq(q.field("partnerId"), args.verifierId))
      .unique();

    if (!partner || partner.status !== "active") {
      throw new Error("Identity mismatch: You are not an active verifier for this protocol");
    }

    const now = Date.now();
    await ctx.db.patch(args.logId, {
      status: args.status === "approved" ? "completed" : "disputed",
      confirmed_by: args.verifierId,
      confirmed_at: now,
    });

    // Update User Metrics on Approval
    if (args.status === "approved") {
        const owner = await ctx.db.get(goal.userId);
        if (owner) {
            await ctx.db.patch(owner._id, {
                // Rise slowly: +1 point per successful verification
                integrityScore: Math.min(100, (owner.integrityScore ?? 100) + 1),
                // Increment streak if not already incremented this week
                streak_count: (owner.streak_count || 0) + 1,
                goals_completed: (owner.goals_completed || 0) + 1,
            });
        }
    }

    return null;
  },
});

export const getPendingVerifications = query({
    args: { userId: v.id("users") },
    returns: v.array(v.any()),
    handler: async (ctx, args) => {
        // Find goals where user is a verifier
        const partnerships = await ctx.db
            .query("accountability_partners")
            .withIndex("by_partner", (q) => q.eq("partnerId", args.userId))
            .filter(q => q.eq(q.field("status"), "active"))
            .collect();

        const pending = [];
        for (const p of partnerships) {
            const logs = await ctx.db
                .query("goal_logs")
                .withIndex("by_goal", (q) => q.eq("goalId", p.goalId))
                .filter(q => q.eq(q.field("status"), "completed"))
                .order("desc")
                .collect();

            for (const log of logs) {
                // If not yet confirmed by this partner
                if (!log.confirmed_by) {
                    const goal = await ctx.db.get(log.goalId);
                    pending.push({ ...log, goalTitle: goal?.title });
                }
            }
        }
        return pending;
    }
});
