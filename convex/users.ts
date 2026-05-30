import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const updateBvnStatus = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    bvn: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      bvn_verified: true,
      bvn_last4: args.bvn.slice(-4),
      ...(args.name ? { name: args.name } : {}),
    });
  },
});

export const current = query({
  args: {},
  returns: v.union(v.null(), v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    phone: v.optional(v.string()),
    city: v.optional(v.string()),
    bio: v.optional(v.string()),
    bvn_verified: v.boolean(),
    bvn_last4: v.optional(v.string()),
    is_discoverable: v.boolean(),
    streak_count: v.number(),
    goals_completed: v.number(),
    integrityScore: v.number(),
    tier: v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold")),
    balance: v.number(),
    shields: v.number(),
    credits: v.number(),
    witness_discoverable: v.optional(v.boolean()),
    isAdmin: v.optional(v.boolean()),
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
      bvn_last4: args.bvn.slice(-4),
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
    witness_discoverable: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    await ctx.db.patch(userId, args);

    await ctx.db.insert("notifications", {
      userId,
      title: "Identity Updated",
      message: "Your profile configuration has been synchronized.",
      type: "profile_updated",
      link: "/profile",
      read: false,
    });
    return null;
  },
});

export const exchangeCreditsForShield = mutation({
  args: { amount: v.number() },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Cost: 5,000 credits per Shield (configurable)
    const cost = 5000 * args.amount;

    if ((user.credits || 0) < cost) {
      return { success: false, message: "Insufficient Protocol Credits." };
    }

    await ctx.db.patch(userId, {
      credits: user.credits - cost,
      shields: (user.shields || 0) + args.amount
    });

    return { success: true, message: `Identity protection increased. ${args.amount} Shield(s) acquired.` };
  }
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
    goals_completed: v.number(),
    integrityScore: v.number(),
    is_discoverable: v.boolean(),
    tier: v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold")),
  })),
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .collect();
    
    return users
      .filter((u) => u.is_discoverable)
      .map((u) => ({
        _id: u._id,
        _creationTime: u._creationTime,
        name: u.name,
        city: u.city,
        bio: u.bio,
        streak_count: u.streak_count,
        goals_completed: u.goals_completed,
        integrityScore: u.integrityScore,
        is_discoverable: u.is_discoverable,
        tier: u.tier,
      }));
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
    tier: v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold")),
  })),
  handler: async (ctx) => {
    const tierWeight = (tier: "bronze" | "silver" | "gold") => {
      if (tier === "gold") return 3;
      if (tier === "silver") return 2;
      return 1;
    };

    const users = await ctx.db
      .query("users")
      .collect();
    
    return users
      .sort((a, b) => {
        const tierDiff = tierWeight(b.tier) - tierWeight(a.tier);
        if (tierDiff !== 0) return tierDiff;
        if (b.integrityScore !== a.integrityScore) {
          return b.integrityScore - a.integrityScore;
        }
        return b.streak_count - a.streak_count;
      })
      .slice(0, 50)
      .map((u) => ({
        _id: u._id,
        name: u.name,
        integrityScore: u.integrityScore,
        streak_count: u.streak_count,
        goals_completed: u.goals_completed,
        tier: u.tier,
      }));
  },
});
