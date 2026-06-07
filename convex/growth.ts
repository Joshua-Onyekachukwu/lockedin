import { v } from "convex/values";
import { query } from "./_generated/server";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";

export const getActivationStatus = query({
  args: {},
  returns: v.object({
    hasVault: v.boolean(),
    hasFundedVault: v.boolean(),
    hasCheckIn: v.boolean(),
    hasWitness: v.boolean(),
    firstVaultId: v.union(v.null(), v.id("vaults")),
    firstAwaitingFundingVaultId: v.union(v.null(), v.id("vaults")),
    firstActiveVaultId: v.union(v.null(), v.id("vaults")),
  }),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      return {
        hasVault: false,
        hasFundedVault: false,
        hasCheckIn: false,
        hasWitness: false,
        firstVaultId: null,
        firstAwaitingFundingVaultId: null,
        firstActiveVaultId: null,
      };
    }

    const user = await ctx.db.get("users", userId);
    if (!user || !user.emailVerificationTime) {
      return {
        hasVault: false,
        hasFundedVault: false,
        hasCheckIn: false,
        hasWitness: false,
        firstVaultId: null,
        firstAwaitingFundingVaultId: null,
        firstActiveVaultId: null,
      };
    }

    const vaults = await ctx.db
      .query("vaults")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    const firstVaultId: Id<"vaults"> | null = vaults[0]?._id ?? null;
    const firstAwaitingFundingVaultId: Id<"vaults"> | null =
      vaults.find((v) => v.status === "awaiting_funding")?._id ?? null;
    const firstActiveVaultId: Id<"vaults"> | null =
      vaults.find((v) => v.status === "active")?._id ?? null;

    const hasVault = vaults.length > 0;
    const hasFundedVault = vaults.some((v) => v.status !== "awaiting_funding");

    let hasCheckIn = false;
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(25);

    for (const goal of goals) {
      const log = await ctx.db
        .query("goal_logs")
        .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
        .order("desc")
        .first();
      if (log) {
        hasCheckIn = true;
        break;
      }
    }

    const hasWitnessActive =
      (await ctx.db
        .query("accountability_partners")
        .withIndex("by_requester_and_status", (q) =>
          q.eq("requesterId", userId).eq("status", "active"),
        )
        .first()) != null;

    const hasWitnessPending =
      (await ctx.db
        .query("accountability_partners")
        .withIndex("by_requester_and_status", (q) =>
          q.eq("requesterId", userId).eq("status", "pending"),
        )
        .first()) != null;

    const hasWitness = hasWitnessActive || hasWitnessPending;

    return {
      hasVault,
      hasFundedVault,
      hasCheckIn,
      hasWitness,
      firstVaultId,
      firstAwaitingFundingVaultId,
      firstActiveVaultId,
    };
  },
});
