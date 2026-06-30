import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { captureToSentry } from "./sentry";
import { endOpenPartnerRelationshipsForVault } from "./partners";

export const completeMaturedVaults = internalMutation({
  args: {
    limit: v.optional(v.number()),
    cutoffTs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const batchLimit = Math.max(1, Math.min(args.limit ?? 20, 100));
      const cutoffTs = args.cutoffTs ?? Date.now();
      const maturedVaults = await ctx.db
        .query("vaults")
        .withIndex("by_status_and_endDate", (q) =>
          q.eq("status", "active").lte("endDate", cutoffTs),
        )
        .take(batchLimit);

      for (const vault of maturedVaults) {
        if (vault.status !== "active") continue;

        await ctx.db.patch("vaults", vault._id, { status: "completed" });
        await endOpenPartnerRelationshipsForVault(ctx, vault._id);

        await ctx.db.insert("notifications", {
          userId: vault.userId,
          title: "Protocol Completed",
          message: "Your protocol window has ended. Final settlement has been recorded.",
          type: "protocol_created",
          link: "/dashboard",
          read: false,
        });
      }

      if (maturedVaults.length === batchLimit) {
        await ctx.scheduler.runAfter(0, internal.vaultLifecycle.completeMaturedVaults, {
          limit: batchLimit,
          cutoffTs,
        });
      }

      return null;
    } catch (err) {
      await captureToSentry({
        message: "cron completeMaturedVaults failed",
        tags: { area: "cron", job: "completeMaturedVaults" },
        extra: { error: String(err) },
      });
      throw err;
    }
  },
});
