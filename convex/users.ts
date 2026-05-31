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
    profileImageId: v.optional(v.id("_storage")),
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
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const profileUrl = user.profileImageId ? await ctx.storage.getUrl(user.profileImageId) : null;

    return {
      ...user,
      image: profileUrl ?? user.image,
    };
  },
});

export const generateProfileImageUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const setProfileImage = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Identity verification failed");

    const previous = user.profileImageId;
    await ctx.db.patch(userId, { profileImageId: args.storageId });

    if (previous) {
      await ctx.storage.delete(previous);
    }

    await ctx.db.insert("notifications", {
      userId,
      title: "Profile Image Updated",
      message: "Your identity image has been synchronized.",
      type: "profile_updated",
      link: "/profile",
      read: false,
    });

    return null;
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

    const patch: Record<string, any> = {};

    if ("name" in args) {
      const value = args.name?.trim();
      if (value) patch.name = value;
    }
    if ("city" in args) {
      const value = args.city?.trim();
      if (value) patch.city = value;
    }
    if ("bio" in args) {
      const value = args.bio?.trim();
      if (value) patch.bio = value;
    }
    if ("is_discoverable" in args && typeof args.is_discoverable === "boolean") {
      patch.is_discoverable = args.is_discoverable;
    }
    if ("witness_discoverable" in args && typeof args.witness_discoverable === "boolean") {
      patch.witness_discoverable = args.witness_discoverable;
    }

    if (Object.keys(patch).length) {
      await ctx.db.patch(userId, patch);
    }

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
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    city: v.optional(v.string()),
    bio: v.optional(v.string()),
    streak_count: v.number(),
    goals_completed: v.number(),
    integrityScore: v.number(),
    is_discoverable: v.boolean(),
    tier: v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold")),
  })),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 200, 500));

    const discoverable = await ctx.db
      .query("users")
      .withIndex("by_is_discoverable", (q) => q.eq("is_discoverable", true))
      .take(limit);

    return await Promise.all(
      discoverable.map(async (u) => {
        const profileUrl = u.profileImageId ? await ctx.storage.getUrl(u.profileImageId) : null;
        return {
          _id: u._id,
          _creationTime: u._creationTime,
          name: u.name,
          image: profileUrl ?? u.image,
          city: u.city,
          bio: u.bio,
          streak_count: u.streak_count,
          goals_completed: u.goals_completed,
          integrityScore: u.integrityScore,
          is_discoverable: u.is_discoverable,
          tier: u.tier,
        };
      }),
    );
  },
});

export const getLeaderboard = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("users"),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    integrityScore: v.number(),
    streak_count: v.number(),
    goals_completed: v.number(),
    tier: v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold")),
  })),
  handler: async (ctx) => {
    const tierWeight = (tier?: "bronze" | "silver" | "gold") => {
      if (tier === "gold") return 3;
      if (tier === "silver") return 2;
      return 1;
    };

    const users = await ctx.db
      .query("users")
      .order("desc")
      .take(5000);
    
    const sorted = users
      .sort((a, b) => {
        const tierDiff = tierWeight(b.tier) - tierWeight(a.tier);
        if (tierDiff !== 0) return tierDiff;
        const integrityDiff = (b.integrityScore ?? 0) - (a.integrityScore ?? 0);
        if (integrityDiff !== 0) return integrityDiff;

        const goalsDiff = (b.goals_completed ?? 0) - (a.goals_completed ?? 0);
        if (goalsDiff !== 0) return goalsDiff;

        return (b.streak_count ?? 0) - (a.streak_count ?? 0);
      })
      .slice(0, 50);

    return await Promise.all(
      sorted.map(async (u) => {
        const profileUrl = u.profileImageId ? await ctx.storage.getUrl(u.profileImageId) : null;
        return {
          _id: u._id,
          name: u.name,
          image: profileUrl ?? u.image,
          integrityScore: u.integrityScore,
          streak_count: u.streak_count,
          goals_completed: u.goals_completed,
          tier: u.tier,
        };
      }),
    );
  },
});
