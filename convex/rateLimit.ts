import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const consume = internalMutation({
  args: {
    key: v.string(),
    limit: v.number(),
    windowMs: v.number(),
  },
  returns: v.object({
    allowed: v.boolean(),
    remaining: v.number(),
    resetAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const windowMs = Math.max(1, args.windowMs);
    const limit = Math.max(1, args.limit);
    const windowStart = Math.floor(now / windowMs) * windowMs;

    const existing = await ctx.db
      .query("rate_limit_buckets")
      .withIndex("by_key_and_window_start", (q) =>
        q.eq("key", args.key).eq("windowStart", windowStart),
      )
      .first();

    const used = existing?.count ?? 0;
    const resetAt = windowStart + windowMs;

    if (used >= limit) {
      await ctx.db.insert("system_audit", {
        action: "rate_limit_blocked",
        message: `Rate limit blocked: ${args.key}`,
        createdAt: now,
        metadata: {
          key: args.key,
          limit,
          windowMs,
          windowStart,
          count: used,
        },
      });

      return { allowed: false, remaining: 0, resetAt };
    }

    if (existing) {
      await ctx.db.patch("rate_limit_buckets", existing._id, {
        count: used + 1,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("rate_limit_buckets", {
        key: args.key,
        windowStart,
        count: 1,
        updatedAt: now,
      });
    }

    return { allowed: true, remaining: limit - (used + 1), resetAt };
  },
});
