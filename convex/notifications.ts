import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const list = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) return [];

    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Unauthenticated");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== userId) {
        throw new Error("Authorization Breach: You cannot modify this log.");
    }

    await ctx.db.patch(args.notificationId, { read: true });
    return null;
  },
});

export const create = mutation({
    args: {
        userId: v.id("users"),
        title: v.string(),
        message: v.string(),
        type: v.union(v.literal("partner_request"), v.literal("checkin_due"), v.literal("verification_needed"), v.literal("streak_alert")),
        link: v.optional(v.string()),
    },
    returns: v.id("notifications"),
    handler: async (ctx, args) => {
        return await ctx.db.insert("notifications", {
            ...args,
            read: false,
        });
    }
});
