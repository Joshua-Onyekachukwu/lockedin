import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const join = mutation({
  args: {
    vaultId: v.id("vaults"),
    userId: v.id("users"),
    role: v.union(v.literal("viewer"), v.literal("verifier")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const vault = await ctx.db.get(args.vaultId);
    if (!vault) throw new Error("Vault not found");

    const goal = await ctx.db
        .query("goals")
        .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
        .unique();
    if (!goal) throw new Error("Goal not found");

    await ctx.db.insert("accountability_partners", {
      vaultId: args.vaultId,
      goalId: goal._id,
      requesterId: vault.userId,
      partnerId: args.userId,
      status: "active",
      requester_accepted: true,
      partner_accepted: true,
    });

    return null;
  },
});

export const request = mutation({
  args: {
    partnerId: v.id("users"),
    requesterId: v.id("users"),
    vaultId: v.id("vaults"),
  },
  returns: v.id("accountability_partners"),
  handler: async (ctx, args) => {
    const goal = await ctx.db
        .query("goals")
        .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
        .unique();
    if (!goal) throw new Error("Goal not found");

    // Check if already exists
    const existing = await ctx.db
        .query("accountability_partners")
        .withIndex("by_vault", q => q.eq("vaultId", args.vaultId))
        .unique();
    
    // Note: We should ideally have an index by vault and partner, but for now we filter in JS if multiple partners per vault are allowed.
    // The schema only has index("by_vault", ["vaultId"])
    
    if (existing && existing.partnerId === args.partnerId) return existing._id;

    const partnerShipId = await ctx.db.insert("accountability_partners", {
      vaultId: args.vaultId,
      goalId: goal._id,
      requesterId: args.requesterId,
      partnerId: args.partnerId,
      status: "pending",
      requester_accepted: true,
      partner_accepted: false,
    });

    const requester = await ctx.db.get(args.requesterId);

    await ctx.db.insert("notifications", {
        userId: args.partnerId,
        title: "Accountability Request",
        message: `${requester?.name || 'Someone'} requested your oversight on a commitment.`,
        type: "partner_request",
        link: `/invite/${args.vaultId}`,
        read: false
    });

    return partnerShipId;
  }
});

export const acceptRequest = mutation({
    args: { partnerShipId: v.id("accountability_partners") },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.partnerShipId, {
            status: "active",
            partner_accepted: true
        });
        return null;
    }
});

export const listIncomingRequests = query({
    args: { userId: v.id("users") },
    returns: v.array(v.any()),
    handler: async (ctx, args) => {
        const requests = await ctx.db
            .query("accountability_partners")
            .withIndex("by_partner_and_status", q => q.eq("partnerId", args.userId).eq("status", "pending"))
            .collect();
        
        const results = [];
        for (const req of requests) {
            const requester = await ctx.db.get(req.requesterId);
            const goal = await ctx.db.get(req.goalId);
            results.push({ ...req, requester, goal });
        }
        return results;
    }
});
