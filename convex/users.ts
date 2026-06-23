import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { auth } from "./auth";

const tierForIntegrity = (score: number) => {
  if (score >= 90) return "gold" as const;
  if (score >= 75) return "silver" as const;
  return "bronze" as const;
};

const MISSION_VAULT_STATUSES = ["active", "completed", "failed"] as const;

const buildMissionCountMap = async (ctx: any, userIds?: Set<any>) => {
  const counts = new Map<any, number>();
  for (const status of MISSION_VAULT_STATUSES) {
    const vaults = await ctx.db
      .query("vaults")
      .withIndex("by_status", (q: any) => q.eq("status", status))
      .collect();
    for (const vault of vaults) {
      if (userIds && !userIds.has(vault.userId)) continue;
      counts.set(vault.userId, (counts.get(vault.userId) ?? 0) + 1);
    }
  }
  return counts;
};

const getMissionCountForUser = async (ctx: any, userId: any) => {
  const vaults = await ctx.db
    .query("vaults")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
  let count = 0;
  for (const vault of vaults) {
    if (MISSION_VAULT_STATUSES.includes(vault.status as (typeof MISSION_VAULT_STATUSES)[number])) {
      count += 1;
    }
  }
  return count;
};

export const updateBvnStatus = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    bvn: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("users", args.userId, {
      bvn_verified: true,
      bvn_last4: args.bvn.slice(-4),
      ...(args.name ? { name: args.name } : {}),
    });
    return null;
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
    const user = await ctx.db.get("users", userId);
    if (!user) return null;

    const profileUrl = user.profileImageId ? await ctx.storage.getUrl(user.profileImageId) : null;
    const missionCount = await getMissionCountForUser(ctx, userId);

    return {
      ...user,
      image: profileUrl ?? user.image,
      goals_completed: missionCount,
      tier: tierForIntegrity(user.integrityScore ?? 0),
    };
  },
});

export const generateProfileImageUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const user = await ctx.db.get("users", userId);
    if (!user) throw new Error("Identity verification failed");
    if (!user.emailVerificationTime) throw new Error("Email verification required.");
    return await ctx.storage.generateUploadUrl();
  },
});

export const setProfileImage = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const user = await ctx.db.get("users", userId);
    if (!user) throw new Error("Identity verification failed");
    if (!user.emailVerificationTime) throw new Error("Email verification required.");

    const previous = user.profileImageId;
    await ctx.db.patch("users", userId, { profileImageId: args.storageId });

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

    return {
      success: false,
      message: "BVN verification must be completed via the Mono identity flow.",
    };
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

    const user = await ctx.db.get("users", userId);
    if (!user) throw new Error("Identity verification failed");
    if (!user.emailVerificationTime) throw new Error("Email verification required.");

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
      await ctx.db.patch("users", userId, patch);
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

    const user = await ctx.db.get("users", userId);
    if (!user) throw new Error("User not found");

    // Cost: 5,000 credits per Shield (configurable)
    const cost = 5000 * args.amount;

    if ((user.credits || 0) < cost) {
      return { success: false, message: "Insufficient Protocol Credits." };
    }

    await ctx.db.patch("users", userId, {
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
    const userId = await auth.getUserId(ctx);
    if (userId === null) return [];
    const user = await ctx.db.get("users", userId);
    if (!user || !user.emailVerificationTime) return [];

    const limit = Math.max(1, Math.min(args.limit ?? 200, 500));

    const discoverable = await ctx.db
      .query("users")
      .withIndex("by_is_discoverable", (q) => q.eq("is_discoverable", true))
      .filter((q) => q.neq(q.field("witness_discoverable"), false))
      .take(limit);

    const visibleUsers = discoverable.filter((u) => u.isAdmin !== true);
    const missionCounts = await buildMissionCountMap(
      ctx,
      new Set(visibleUsers.map((u) => u._id)),
    );

    return await Promise.all(
      visibleUsers.map(async (u) => {
        const profileUrl = u.profileImageId ? await ctx.storage.getUrl(u.profileImageId) : null;
        return {
          _id: u._id,
          _creationTime: u._creationTime,
          name: u.name,
          image: profileUrl ?? u.image,
          city: u.city,
          bio: u.bio,
          streak_count: u.streak_count,
          goals_completed: missionCounts.get(u._id) ?? 0,
          integrityScore: u.integrityScore,
          is_discoverable: u.is_discoverable,
          tier: tierForIntegrity(u.integrityScore ?? 0),
        };
      }),
    );
  },
});

export const listWitnessPool = query({
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
    const userId = await auth.getUserId(ctx);
    if (userId === null) return [];
    const user = await ctx.db.get("users", userId);
    if (!user || !user.emailVerificationTime) return [];

    const limit = Math.max(1, Math.min(args.limit ?? 200, 500));

    const candidates = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("witness_discoverable"), false))
      .take(2000);

    const visible = candidates
      .filter((u) => u.isAdmin !== true)
      .filter((u) => !!u.emailVerificationTime)
      .slice(0, limit);

    const missionCounts = await buildMissionCountMap(
      ctx,
      new Set(visible.map((u) => u._id)),
    );

    return await Promise.all(
      visible.map(async (u) => {
        const profileUrl = u.profileImageId ? await ctx.storage.getUrl(u.profileImageId) : null;
        return {
          _id: u._id,
          _creationTime: u._creationTime,
          name: u.name,
          image: profileUrl ?? u.image,
          city: u.city,
          bio: u.bio,
          streak_count: u.streak_count,
          goals_completed: missionCounts.get(u._id) ?? 0,
          integrityScore: u.integrityScore,
          is_discoverable: u.is_discoverable,
          tier: tierForIntegrity(u.integrityScore ?? 0),
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
    const userId = await auth.getUserId(ctx);
    if (userId === null) return [];
    const user = await ctx.db.get("users", userId);
    if (!user || !user.emailVerificationTime) return [];

    const tierWeight = (tier?: "bronze" | "silver" | "gold") => {
      if (tier === "gold") return 3;
      if (tier === "silver") return 2;
      return 1;
    };

    const rankScore = (u: any) => {
      const tier = tierWeight(u.tier);
      const missions = Number(missionCounts.get(u._id) ?? 0);
      const streak = Number(u.streak_count ?? 0);
      const integrity = Number(u.integrityScore ?? 0);
      return tier * 100_000 + missions * 1_000 + streak * 100 + integrity * 10;
    };

    const users = await ctx.db
      .query("users")
      .withIndex("by_is_discoverable", (q) => q.eq("is_discoverable", true))
      .take(5000);
    
    const eligible = users.filter((u) => !!u.emailVerificationTime && u.isAdmin !== true);
    const missionCounts = await buildMissionCountMap(
      ctx,
      new Set(eligible.map((u) => u._id)),
    );

    const sorted = eligible
      .sort((a, b) => {
        const scoreDiff = rankScore(b) - rankScore(a);
        if (scoreDiff !== 0) return scoreDiff;

        const integrityDiff = (b.integrityScore ?? 0) - (a.integrityScore ?? 0);
        if (integrityDiff !== 0) return integrityDiff;

        const goalsDiff = (missionCounts.get(b._id) ?? 0) - (missionCounts.get(a._id) ?? 0);
        if (goalsDiff !== 0) return goalsDiff;

        const streakDiff = (b.streak_count ?? 0) - (a.streak_count ?? 0);
        if (streakDiff !== 0) return streakDiff;

        return (b._creationTime ?? 0) - (a._creationTime ?? 0);
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
          goals_completed: missionCounts.get(u._id) ?? 0,
          tier: tierForIntegrity(u.integrityScore ?? 0),
        };
      }),
    );
  },
});
