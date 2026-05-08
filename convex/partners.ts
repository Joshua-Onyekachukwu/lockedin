import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const join = mutation({
  args: {
    vaultId: v.id("vaults"),
    role: v.union(v.literal("viewer"), v.literal("verifier")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Unauthenticated");

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
      partnerId: userId,
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
    vaultId: v.id("vaults"),
  },
  returns: v.id("accountability_partners"),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Unauthenticated");

    const goal = await ctx.db
        .query("goals")
        .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
        .unique();
    if (!goal) throw new Error("Goal not found");

    // SECURITY: Ensure the requester owns the vault
    const vault = await ctx.db.get(args.vaultId);
    if (!vault || vault.userId !== userId) {
        throw new Error("Authorization Breach: You can only request witnesses for your own protocols.");
    }

    // Check if already exists
    const existing = await ctx.db
        .query("accountability_partners")
        .withIndex("by_vault", q => q.eq("vaultId", args.vaultId))
        .filter(q => q.eq(q.field("partnerId"), args.partnerId))
        .unique();
    
    if (existing) return existing._id;

    const partnerShipId = await ctx.db.insert("accountability_partners", {
      vaultId: args.vaultId,
      goalId: goal._id,
      requesterId: userId,
      partnerId: args.partnerId,
      status: "pending",
      requester_accepted: true,
      partner_accepted: false,
    });

    const requester = await ctx.db.get(userId);

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
        const userId = await auth.getUserId(ctx);
        if (userId === null) throw new Error("Unauthenticated");

        const partnership = await ctx.db.get(args.partnerShipId);
        if (!partnership || partnership.partnerId !== userId) {
            throw new Error("Authorization Breach: You cannot accept this request.");
        }

        await ctx.db.patch(args.partnerShipId, {
            status: "active",
            partner_accepted: true
        });
        return null;
    }
});

export const listIncomingRequests = query({
    args: {},
    returns: v.array(v.any()),
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (userId === null) return [];

        const requests = await ctx.db
            .query("accountability_partners")
            .withIndex("by_partner_and_status", q => q.eq("partnerId", userId).eq("status", "pending"))
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

export const joinByInvite = mutation({
  args: {
    vaultId: v.id("vaults"),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Unauthenticated");

    const vault = await ctx.db.get(args.vaultId);
    if (!vault) throw new Error("Vault not found");

    if (vault.userId === userId) {
        return { success: false, message: "Self-witnessing is not permitted in the protocol." };
    }

    const goal = await ctx.db
        .query("goals")
        .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
        .unique();
    if (!goal) throw new Error("Goal not found");

    // Check if already a partner
    const existing = await ctx.db
        .query("accountability_partners")
        .withIndex("by_vault", q => q.eq("vaultId", args.vaultId))
        .filter(q => q.eq(q.field("partnerId"), userId))
        .unique();
    
    if (existing) {
        return { success: true, message: "You are already a witness for this goal." };
    }

    await ctx.db.insert("accountability_partners", {
      vaultId: args.vaultId,
      goalId: goal._id,
      requesterId: vault.userId,
      partnerId: userId,
      status: "active",
      requester_accepted: true,
      partner_accepted: true,
    });

    const partner = await ctx.db.get(userId);

    await ctx.db.insert("notifications", {
        userId: vault.userId,
        title: "Witness Anchored",
        message: `${partner?.name || 'A partner'} has accepted your goal oversight.`,
        type: "partner_request",
        read: false
    });

    return { success: true, message: "Witness protocol successfully anchored." };
  },
});

export const getPartners = query({
    args: { vaultId: v.id("vaults") },
    returns: v.array(v.any()),
    handler: async (ctx, args) => {
        const partners = await ctx.db
            .query("accountability_partners")
            .withIndex("by_vault", q => q.eq("vaultId", args.vaultId))
            .collect();
        
        const results = [];
        for (const p of partners) {
            const user = await ctx.db.get(p.partnerId);
            results.push({ ...p, user });
        }
        return results;
    }
});
