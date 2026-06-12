import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

const tierForIntegrity = (score: number) => {
  if (score >= 90) return "gold" as const;
  if (score >= 75) return "silver" as const;
  return "bronze" as const;
};

const appendVerificationReport = (
  log: any,
  reviewerId: any,
  verdict: "approved" | "rejected",
  comment: string,
  actorRole: "witness" | "owner",
) => {
  const reports = Array.isArray(log.verificationReports) ? [...log.verificationReports] : [];
  reports.push({
    reviewerId,
    verdict,
    comment,
    createdAt: Date.now(),
    actorRole,
  });
  return reports;
};

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
    const comment = args.comment?.trim();
    if (!comment) throw new Error("A witness report is required.");

    const log = await ctx.db.get("goal_logs", args.logId);
    if (!log) throw new Error("Evidence not found");
    if (log.confirmed_by) return null;
    if (log.status === "disputed") return null;

    const goal = await ctx.db.get("goals", log.goalId);
    if (!goal) throw new Error("Protocol not found");

    // SECURITY: Ensure the verifier is actually an active partner for the vault
    const partner = await ctx.db
      .query("accountability_partners")
      .withIndex("by_vault_and_partner", (q) => q.eq("vaultId", goal.vaultId).eq("partnerId", userId))
      .order("desc")
      .first();

    if (!partner || partner.status !== "active") {
      throw new Error("Authorization Breach: You are not an active verifier for this protocol.");
    }

    const now = Date.now();
    const approvals = Array.isArray((log as any).approvals) ? ((log as any).approvals as Array<any>) : [];
    const rejections = Array.isArray((log as any).rejections) ? ((log as any).rejections as Array<any>) : [];
    const alreadyVoted = approvals.includes(userId) || rejections.includes(userId);
    if (alreadyVoted) throw new Error("You have already voted on this evidence.");

    // Update User Metrics on Approval
    if (args.status === "approved") {
        const nextApprovals = approvals.includes(userId) ? approvals : [...approvals, userId];
        await ctx.db.patch("goal_logs", args.logId, {
          approvals: nextApprovals,
          verificationReports: appendVerificationReport(log, userId, "approved", comment, "witness"),
          status: "completed",
          confirmed_by: userId,
          confirmed_at: now,
        });

        const owner = await ctx.db.get("users", goal.userId);
        if (owner) {
            const nextIntegrity = Math.min(100, (owner.integrityScore ?? 100) + 1);
            await ctx.db.patch("users", owner._id, {
                // Rise slowly: +1 point per successful verification
                integrityScore: nextIntegrity,
                tier: tierForIntegrity(nextIntegrity),
                // Increment streak
                streak_count: (owner.streak_count || 0) + 1,
                goals_completed: (owner.goals_completed || 0) + 1,
            });
        }
        return null;
    }

    const nextRejections = rejections.includes(userId) ? rejections : [...rejections, userId];
    if (nextRejections.length >= 2) {
      await ctx.db.patch("goal_logs", args.logId, {
        rejections: nextRejections,
        verificationReports: appendVerificationReport(log, userId, "rejected", comment, "witness"),
        status: "disputed",
        confirmed_by: userId,
        confirmed_at: now,
      });
      return null;
    }

    await ctx.db.patch("goal_logs", args.logId, {
      rejections: nextRejections,
      verificationReports: appendVerificationReport(log, userId, "rejected", comment, "witness"),
    });

    return null;
  },
});

export const ownerRejectLog = mutation({
  args: {
    logId: v.id("goal_logs"),
    comment: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Unauthenticated");
    const comment = args.comment?.trim();

    const log = await ctx.db.get("goal_logs", args.logId);
    if (!log) throw new Error("Evidence not found");
    if (log.status === "disputed") return null;
    if (log.confirmed_by) return null;

    const goal = await ctx.db.get("goals", log.goalId);
    if (!goal) throw new Error("Protocol not found");
    if (goal.userId !== userId) throw new Error("Authorization Breach: Only the protocol owner can reject.");

    const rejections = Array.isArray((log as any).rejections) ? ((log as any).rejections as Array<any>) : [];
    const nextRejections = rejections.includes(userId) ? rejections : [...rejections, userId];
    const now = Date.now();
    await ctx.db.patch("goal_logs", args.logId, {
      rejections: nextRejections,
      verificationReports: comment
        ? appendVerificationReport(log, userId, "rejected", comment, "owner")
        : log.verificationReports,
      status: "disputed",
      confirmed_by: userId,
      confirmed_at: now,
    });
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

        const pending: Array<any> = [];
        const seen = new Set<string>();
        for (const p of partnerships) {
            const logs = await ctx.db
                .query("goal_logs")
                .withIndex("by_goal", (q) => q.eq("goalId", p.goalId))
                .filter(q => q.eq(q.field("status"), "pending"))
                .order("desc")
                .collect();

            for (const log of logs) {
                const id = String((log as any)._id);
                if (seen.has(id)) continue;
                const approvals = Array.isArray((log as any).approvals) ? ((log as any).approvals as Array<any>) : [];
                const rejections = Array.isArray((log as any).rejections) ? ((log as any).rejections as Array<any>) : [];
                const hasVoted = approvals.includes(userId) || rejections.includes(userId);
                if (!log.confirmed_by && !hasVoted) {
                    const goal = await ctx.db.get("goals", log.goalId);
                    const owner = goal ? await ctx.db.get("users", goal.userId) : null;
                    pending.push({ 
                        ...log, 
                        goalTitle: goal?.title,
                        userName: owner?.name,
                        proofUrl: log.proofImageId ? await ctx.storage.getUrl(log.proofImageId) : null
                    });
                    seen.add(id);
                }
            }
        }
        return pending;
    }
});
