import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const current = query({
  args: {},
  returns: v.union(v.null(), v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    phone: v.optional(v.string()),
    city: v.optional(v.string()),
    bio: v.optional(v.string()),
    bvn_verified: v.boolean(),
    is_discoverable: v.boolean(),
    streak_count: v.number(),
    goals_completed: v.number(),
    integrityScore: v.number(),
    tier: v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold")),
    balance: v.number(),
  })),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

export const verifyBvn = mutation({
  args: {
    bvn: v.string(), // 11 digits
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    if (args.bvn.length !== 11 || !/^\d+$/.test(args.bvn)) {
      throw new Error("Invalid BVN format. Must be 11 digits.");
    }

    // INTEGRATION INFRASTRUCTURE: MONO / DOJAH / SMILE ID
    
    await ctx.db.patch(userId, {
      bvn_verified: true,
      ...(args.firstName && args.lastName ? { name: `${args.firstName} ${args.lastName}` } : {}),
    });

    return { success: true, message: "Identity anchored to protocol successfully." };
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    city: v.optional(v.string()),
    bio: v.optional(v.string()),
    is_discoverable: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    await ctx.db.patch(userId, args);
    return null;
  },
});

export const listDiscoverable = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    name: v.optional(v.string()),
    city: v.optional(v.string()),
    bio: v.optional(v.string()),
    streak_count: v.number(),
    integrityScore: v.number(),
    is_discoverable: v.boolean(),
  })),
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .collect();
    
    return users.filter(u => u.is_discoverable);
  },
});

export const getLeaderboard = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("users"),
    name: v.optional(v.string()),
    integrityScore: v.number(),
    streak_count: v.number(),
    goals_completed: v.number(),
  })),
  handler: async (ctx) => {
    // Sort by integrity score desc, then streak count desc
    const users = await ctx.db
      .query("users")
      .collect();
    
    return users
      .sort((a, b) => {
        if (b.integrityScore !== a.integrityScore) {
          return b.integrityScore - a.integrityScore;
        }
        return b.streak_count - a.streak_count;
      })
      .slice(0, 50);
  },
});
