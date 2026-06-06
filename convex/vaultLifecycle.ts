import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const completeMaturedVaults = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const active = await ctx.db
      .query("vaults")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    for (const vault of active) {
      const endDate = vault.endDate;
      if (typeof endDate !== "number") continue;
      if (endDate > now) continue;

      await ctx.db.patch("vaults", vault._id, { status: "completed" });
      await ctx.runMutation(internal.partners.endAllForVault, { vaultId: vault._id });

      await ctx.db.insert("notifications", {
        userId: vault.userId,
        title: "Protocol Completed",
        message: "Your protocol window has ended. Final settlement has been recorded.",
        type: "protocol_created",
        link: "/dashboard",
        read: false,
      });
    }

    return null;
  },
});

