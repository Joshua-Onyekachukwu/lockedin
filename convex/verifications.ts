import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const verifyLog = mutation({
  args: {
    logId: v.id("goal_logs"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    comment: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Unauthenticated");

    const log = await ctx.db.get(args.logId);
    if (!log) throw new Error("Evidence not found");

    const goal = await ctx.db.get(log.goalId);
    if (!goal) throw new Error("Protocol not found");

    // SECURITY: Ensure the verifier is actually an active partner for the vault
    const partner = await ctx.db
      .query("accountability_partners")
      .withIndex("by_vault", (q) => q.eq("vaultId", goal.vaultId))
      .filter(q => q.eq(q.field("partnerId"), userId))
      .unique();

    if (!partner || partner.status !== "active") {
      throw new Error("Authorization Breach: You are not an active verifier for this protocol.");
    }

    const now = Date.now();
    await ctx.db.patch(args.logId, {
      status: args.status === "approved" ? "completed" : "disputed",
      confirmed_by: userId,
      confirmed_at: now,
    });

    // Update User Metrics on Approval
    if (args.status === "approved") {
        const owner = await ctx.db.get(goal.userId);
        if (owner) {
            await ctx.db.patch(owner._id, {
                // Rise slowly: +1 point per successful verification
                integrityScore: Math.min(100, (owner.integrityScore ?? 100) + 1),
                // Increment streak
                streak_count: (owner.streak_count || 0) + 1,
                goals_completed: (owner.goals_completed || 0) + 1,
            });
        }
    }

    return null;
  },
});

export const getPendingVerifications = query({
    args: {},
    returns: v.array(v.any()),
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (userId === null) return [];

        // Find goals where user is a verifier
        const partnerships = await ctx.db
            .query("accountability_partners")
            .withIndex("by_partner", (q) => q.eq("partnerId", userId))
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
                    const owner = goal ? await ctx.db.get(goal.userId) : null;
                    pending.push({ 
                        ...log, 
                        goalTitle: goal?.title,
                        userName: owner?.name,
                        proofUrl: log.proofImageId ? await ctx.storage.getUrl(log.proofImageId) : null
                    });
                }
            }
        }
        return pending;
    }
});
