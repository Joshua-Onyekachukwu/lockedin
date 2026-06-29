import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";

/**
 * PROTOCOL EXECUTION ENGINE
 */

const goalCategoryValidator = v.union(
  v.literal("fitness"),
  v.literal("learning"),
  v.literal("financial"),
  v.literal("habit"),
  v.literal("professional"),
);

const frequencyTypeValidator = v.union(
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("monthly"),
);

const painTierValidator = v.union(
  v.literal("deterrence"),
  v.literal("enforcement"),
  v.literal("liquidation"),
);

export const calculateIntegrityScore = query({
  args: { userId: v.id("users") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const vaults = await ctx.db
      .query("vaults")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    if (vaults.length === 0) return 100;

    const failed = vaults.filter(v => v.status === "failed").length;
    return Math.max(0, 100 - (failed * 15));
  }
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: goalCategoryValidator,
    frequency_type: frequencyTypeValidator,
    target_count: v.number(),
    duration_weeks: v.number(), 
    stakedAmount: v.number(),
    painTier: painTierValidator,
  },
  returns: v.object({
    vaultId: v.id("vaults"),
    status: v.union(v.literal("active"), v.literal("awaiting_funding")),
  }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Unauthenticated");

    const user = await ctx.db.get("users", userId);
    if (!user) throw new Error("Identity verification failed");
    if (!user.emailVerificationTime) throw new Error("Email verification required.");

    const vaultId = await ctx.db.insert("vaults", {
      userId,
      amount: args.stakedAmount,
      currency: "NGN",
      duration_weeks: args.duration_weeks,
      startDate: undefined,
      endDate: undefined,
      penaltyAccrued: 0,
      painTier: args.painTier,
      status: "awaiting_funding",
      interest_earned: 0,
    });

    await ctx.db.insert("goals", {
      vaultId,
      userId,
      category: args.category,
      title: args.title,
      description: args.description,
      frequency_type: args.frequency_type,
      target_count: args.target_count,
    });

    if ((user.balance || 0) >= args.stakedAmount) {
      await ctx.runMutation(internal.payments.fundVaultFromWalletBalance, {
        userId,
        vaultId,
      });
      return {
        vaultId,
        status: "active" as const,
      };
    } else {
      await ctx.db.insert("notifications", {
        userId,
        title: "Protocol Created",
        message: `${args.title} created. Complete funding to activate the protocol.`,
        type: "protocol_created",
        link: "/dashboard",
        read: false,
      });
      return {
        vaultId,
        status: "awaiting_funding" as const,
      };
    }
  },
});

export const updatePendingStakeAmount = mutation({
  args: {
    vaultId: v.id("vaults"),
    amount: v.number(),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Unauthenticated");

    const user = await ctx.db.get("users", userId);
    if (!user) throw new Error("Identity verification failed");
    if (!user.emailVerificationTime) throw new Error("Email verification required.");

    const vault = await ctx.db.get("vaults", args.vaultId);
    if (!vault || vault.userId !== userId) {
      throw new Error("Protocol not found");
    }

    if (vault.status !== "awaiting_funding") {
      return {
        success: false,
        message: "Only protocols awaiting funding can have their stake adjusted.",
      };
    }

    const normalizedAmount = Math.round(args.amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 100) {
      return {
        success: false,
        message: "Enter a valid stake amount before saving.",
      };
    }

    const deposits = await ctx.db
      .query("deposits")
      .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
      .collect();

    if (deposits.some((deposit) => deposit.status === "pending" || deposit.status === "completed")) {
      return {
        success: false,
        message: "This protocol already has a funding attempt attached. Create a new protocol if you need a different amount.",
      };
    }

    await ctx.db.patch("vaults", args.vaultId, {
      amount: normalizedAmount,
      paystack_reference: undefined,
    });

    return {
      success: true,
      message: "Stake amount updated.",
    };
  },
});

export const deleteOwnedVault = mutation({
  args: {
    vaultId: v.id("vaults"),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Unauthenticated");

    const user = await ctx.db.get("users", userId);
    if (!user) throw new Error("Identity verification failed");
    if (!user.emailVerificationTime) throw new Error("Email verification required.");

    const vault = await ctx.db.get("vaults", args.vaultId);
    if (!vault || vault.userId !== userId) {
      throw new Error("Protocol not found");
    }

    if (vault.status === "active") {
      return {
        success: false,
        message: "Active protocols cannot be deleted.",
      };
    }

    if (vault.status !== "awaiting_funding" && vault.status !== "completed") {
      return {
        success: false,
        message: "Only awaiting-funding or completed protocols can be deleted.",
      };
    }

    const goal = await ctx.db
      .query("goals")
      .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
      .unique();
    if (!goal) {
      return {
        success: false,
        message: "Protocol goal record not found.",
      };
    }

    const deposits = await ctx.db
      .query("deposits")
      .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
      .collect();

    if (
      vault.status === "awaiting_funding" &&
      deposits.some((deposit) => deposit.status === "pending" || deposit.status === "completed")
    ) {
      return {
        success: false,
        message: "This protocol already has a payment attempt attached and cannot be deleted safely.",
      };
    }

    const logs = await ctx.db
      .query("goal_logs")
      .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
      .collect();
    const partners = await ctx.db
      .query("accountability_partners")
      .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
      .collect();
    const penaltyEvents = await ctx.db
      .query("penalty_events")
      .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
      .collect();

    for (const log of logs) {
      const proofIds = Array.isArray(log.proofImageIds)
        ? log.proofImageIds
        : log.proofImageId
          ? [log.proofImageId]
          : [];
      for (const proofId of proofIds) {
        await ctx.storage.delete(proofId);
      }
      await ctx.db.delete("goal_logs", log._id);
    }

    for (const partner of partners) {
      await ctx.db.delete("accountability_partners", partner._id);
    }

    for (const penaltyEvent of penaltyEvents) {
      await ctx.db.delete("penalty_events", penaltyEvent._id);
    }

    for (const deposit of deposits) {
      if (deposit.status === "failed") {
        await ctx.db.delete("deposits", deposit._id);
      }
    }

    await ctx.db.delete("goals", goal._id);
    await ctx.db.delete("vaults", args.vaultId);

    return {
      success: true,
      message:
        vault.status === "completed"
          ? "Completed protocol removed from your dashboard."
          : "Unfunded protocol deleted.",
    };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Unauthenticated");
    const user = await ctx.db.get("users", userId);
    if (!user) throw new Error("Identity verification failed");
    if (!user.emailVerificationTime) throw new Error("Email verification required.");
    return await ctx.storage.generateUploadUrl();
  },
});

export const checkIn = mutation({
  args: {
    goalId: v.id("goals"),
    proofImageId: v.optional(v.id("_storage")),
    proofImageIds: v.optional(v.array(v.id("_storage"))),
    note: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Unauthenticated");

    const user = await ctx.db.get("users", userId);
    if (!user) throw new Error("Identity verification failed");
    if (!user.emailVerificationTime) throw new Error("Email verification required.");

    const goal = await ctx.db.get("goals", args.goalId);
    if (!goal) throw new Error("Goal not found");
    
    // SECURITY: Ensure the user owns this goal
    if (goal.userId !== userId) {
        throw new Error("Authorization Breach: You cannot check-in for a protocol you do not own.");
    }

    const vault = await ctx.db.get("vaults", goal.vaultId);
    if (!vault || vault.status !== "active") return { success: false, message: "Vault is not active" };

    // Calculate current week
    const now = Date.now();
    const startTs = vault.startDate ?? vault.fundedAt ?? vault._creationTime;
    const diffMs = now - startTs;
    const week_number = Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));

    const today = new Date().toISOString().split('T')[0];

    const proofImageIdsRaw = args.proofImageIds ?? (args.proofImageId ? [args.proofImageId] : null);
    if (proofImageIdsRaw && proofImageIdsRaw.length > 3) {
      throw new Error("Maximum 3 images per log.");
    }

    const payload: any = {
      goalId: args.goalId,
      week_number,
      date: today,
      status: "pending",
      note: args.note,
    };

    if (proofImageIdsRaw && proofImageIdsRaw.length > 0) {
      payload.proofImageId = proofImageIdsRaw[0];
      payload.proofImageIds = proofImageIdsRaw;
    } else if (args.proofImageId) {
      payload.proofImageId = args.proofImageId;
    }

    await ctx.db.insert("goal_logs", payload);

    return { success: true, message: "Evidence logged. Pending witness approval." };
  },
});

export const listByUser = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) return [];

    const user = await ctx.db.get("users", userId);
    if (!user || !user.emailVerificationTime) return [];

    const vaults = await ctx.db
      .query("vaults")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const results = [];
    for (const vault of vaults) {
        const goal = await ctx.db
            .query("goals")
            .withIndex("by_vault", (q) => q.eq("vaultId", vault._id))
            .first();
        if (goal) {
            results.push({ ...vault, goal });
        }
    }
    return results;
  },
});

export const getFullContext = query({
  args: { vaultId: v.id("vaults") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) return null;

    const user = await ctx.db.get("users", userId);
    if (!user || !user.emailVerificationTime) return null;

    const vault = await ctx.db.get("vaults", args.vaultId);
    if (!vault) return null;
    
    const goal = await ctx.db
        .query("goals")
        .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
        .first();
    if (!goal) return null;

    const isAdmin = user.isAdmin === true;

    const partner = await ctx.db
      .query("accountability_partners")
      .withIndex("by_vault_and_partner", (q) => q.eq("vaultId", args.vaultId).eq("partnerId", userId))
      .order("desc")
      .first();

    const isActivePartner = !!partner && partner.status === "active";
    if (vault.userId !== userId && !isActivePartner && !isAdmin) {
      const owner = await ctx.db.get("users", vault.userId);
      const profileUrl = owner?.profileImageId ? await ctx.storage.getUrl(owner.profileImageId) : null;
      return {
        access: "preview",
        _id: vault._id,
        userId: vault.userId,
        status: vault.status,
        startDate: vault.startDate,
        endDate: vault.endDate,
        goal: {
          title: goal.title,
          description: goal.description,
          category: goal.category,
          frequency_type: goal.frequency_type,
          target_count: goal.target_count,
        },
        user: owner
          ? {
              _id: owner._id,
              name: owner.name,
              image: profileUrl ?? owner.image,
              integrityScore: owner.integrityScore,
              tier: owner.tier,
              city: owner.city,
            }
          : null,
      };
    }

    const logs = await ctx.db
      .query("goal_logs")
      .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
      .order("desc")
      .collect();

    const logsWithUrls = await Promise.all(
      logs.map(async (log) => {
        const ids: Array<any> = Array.isArray((log as any).proofImageIds)
          ? ((log as any).proofImageIds as Array<any>)
          : log.proofImageId
            ? [log.proofImageId]
            : [];

        const urls = (
          await Promise.all(ids.map(async (id) => (id ? await ctx.storage.getUrl(id) : null)))
        ).filter(Boolean) as Array<string>;

        const verificationReportsRaw: Array<any> = Array.isArray((log as any).verificationReports)
          ? ((log as any).verificationReports as Array<any>)
          : [];
        const verificationReports = await Promise.all(
          verificationReportsRaw.map(async (report) => {
            const reviewer = await ctx.db.get("users", report.reviewerId);
            return {
              ...report,
              reviewerName: reviewer?.name ?? reviewer?.email ?? "Unknown reviewer",
            };
          }),
        );

        return {
          ...log,
          proofUrls: urls,
          proofUrl: urls[0] ?? null,
          verificationReports,
        };
      }),
    );

    const penaltyEvents = await ctx.db
      .query("penalty_events")
      .withIndex("by_vault", (q) => q.eq("vaultId", vault._id))
      .order("desc")
      .collect();

    const penaltyAccrued = vault.penaltyAccrued ?? 0;
    const principalRemaining = Math.max(0, vault.amount - penaltyAccrued);

    return {
      ...vault,
      goal,
      logs: logsWithUrls,
      penaltyEvents,
      penaltyAccrued,
      principalRemaining,
      isPartner: isActivePartner,
      isAdmin,
      access: "full",
    };
  }
});

export const getInvitePreview = query({
  args: { vaultId: v.id("vaults") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) return null;

    const user = await ctx.db.get("users", userId);
    if (!user || !user.emailVerificationTime) return null;

    const vault = await ctx.db.get("vaults", args.vaultId);
    if (!vault) return null;

    const goal = await ctx.db
      .query("goals")
      .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
      .first();
    if (!goal) return null;

    const pending = await ctx.db
      .query("accountability_partners")
      .withIndex("by_vault_and_partner", (q) => q.eq("vaultId", args.vaultId).eq("partnerId", userId))
      .order("desc")
      .first();

    if (!pending || pending.status !== "pending") {
      return { access: "none", _id: vault._id, status: vault.status, goal: { title: goal.title } };
    }

    return {
      access: "invite",
      _id: vault._id,
      status: vault.status,
      amount: vault.amount,
      painTier: vault.painTier,
      goal: {
        title: goal.title,
        description: goal.description,
        category: goal.category,
        frequency_type: goal.frequency_type,
        target_count: goal.target_count,
      },
    };
  },
});

export const getPublicSharePreview = query({
  args: { vaultId: v.id("vaults") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const vault = await ctx.db.get("vaults", args.vaultId);
    if (!vault) return null;

    const goal = await ctx.db
      .query("goals")
      .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
      .first();
    if (!goal) return null;

    const owner = await ctx.db.get("users", vault.userId);
    if (!owner || owner.isAdmin === true) return null;
    const profileUrl = owner?.profileImageId ? await ctx.storage.getUrl(owner.profileImageId) : null;

    return {
      _id: vault._id,
      status: vault.status,
      amount: vault.amount,
      painTier: vault.painTier,
      duration_weeks: vault.duration_weeks,
      goal: {
        title: goal.title,
        description: goal.description,
        category: goal.category,
        frequency_type: goal.frequency_type,
        target_count: goal.target_count,
      },
      owner: owner
        ? {
            name: owner.name,
            city: owner.city,
            image: profileUrl ?? owner.image,
            integrityScore: owner.integrityScore,
            tier: owner.tier,
          }
        : null,
    };
  },
});

export const listDiscoverable = query({
    args: { limit: v.optional(v.number()) },
    returns: v.array(v.any()),
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (userId === null) return [];
        const user = await ctx.db.get("users", userId);
        if (!user || !user.emailVerificationTime) return [];

        const limit = Math.max(1, Math.min(args.limit ?? 120, 200));

        const discoverableUsers = await ctx.db
          .query("users")
          .withIndex("by_is_discoverable", (q) => q.eq("is_discoverable", true))
          .take(2000);

        const eligibleUsers = discoverableUsers.filter((u) => u.isAdmin !== true);
        const userById = new Map(eligibleUsers.map((u) => [u._id, u]));
        const discoverableIds = new Set(eligibleUsers.map((u) => u._id));

        const activeVaults = await ctx.db
          .query("vaults")
          .withIndex("by_status", (q) => q.eq("status", "active"))
          .order("desc")
          .take(1500);

        const results: Array<any> = [];

        for (const vault of activeVaults) {
          if (results.length >= limit) break;
          if (!discoverableIds.has(vault.userId)) continue;

          const goal = await ctx.db
            .query("goals")
            .withIndex("by_vault", (q) => q.eq("vaultId", vault._id))
            .first();
          if (!goal) continue;

          const rawUser = userById.get(vault.userId);
          if (!rawUser) continue;

          const profileUrl = rawUser.profileImageId ? await ctx.storage.getUrl(rawUser.profileImageId) : null;
          const user = { ...rawUser, image: profileUrl ?? rawUser.image };

          results.push({
            _id: vault._id,
            userId: vault.userId,
            status: vault.status,
            startDate: vault.startDate,
            endDate: vault.endDate,
            goal: {
              title: goal.title,
              description: goal.description,
              category: goal.category,
              frequency_type: goal.frequency_type,
              target_count: goal.target_count,
            },
            user: {
              _id: user._id,
              name: user.name,
              image: user.image,
              city: user.city,
              integrityScore: user.integrityScore,
              tier: user.tier,
            },
          });
        }

        return results;
    }
});
