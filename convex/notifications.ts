import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
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
