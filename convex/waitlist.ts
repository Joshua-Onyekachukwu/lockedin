import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const add = mutation({
  args: {
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format. Please provide a valid email address.");
    }

    // 2. Global rate-limiting: max 10 waitlist signups in the last 60 seconds
    const oneMinuteAgo = Date.now() - 60000;
    const recentSubmissions = await ctx.db
      .query("waitlist")
      .filter((q) => q.gt(q.field("_creationTime"), oneMinuteAgo))
      .collect();
    
    if (recentSubmissions.length >= 10) {
      throw new Error("Too many requests. Please try again in a minute.");
    }

    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!existing) {
      await ctx.db.insert("waitlist", {
        email: args.email,
      });
    }
    return null;
  },
});

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("waitlist"),
      _creationTime: v.number(),
      email: v.string(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("waitlist").order("desc").collect();
  },
});
