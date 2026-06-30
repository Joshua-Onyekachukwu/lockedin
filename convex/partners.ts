import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";

export async function endOpenPartnerRelationshipsForVault(ctx: any, vaultId: any) {
  const rows = await ctx.db
    .query("accountability_partners")
    .withIndex("by_vault", (q: any) => q.eq("vaultId", vaultId))
    .collect();

  let endedCount = 0;
  for (const row of rows) {
    if (row.status !== "active" && row.status !== "pending") continue;
    await ctx.db.patch("accountability_partners", row._id, { status: "ended" });
    endedCount += 1;
  }

  return endedCount;
}

async function countActiveWitnesses(ctx: any, vaultId: any) {
  const active = await ctx.db
    .query("accountability_partners")
    .withIndex("by_vault_and_status", (q: any) =>
      q.eq("vaultId", vaultId).eq("status", "active"),
    )
    .collect();
  return new Set(active.map((row: any) => String(row.partnerId))).size;
}

async function listRelationshipsForVaultPartner(ctx: any, vaultId: any, partnerId: any) {
  return await ctx.db
    .query("accountability_partners")
    .withIndex("by_vault_and_partner", (q: any) => q.eq("vaultId", vaultId).eq("partnerId", partnerId))
    .order("desc")
    .collect();
}

async function findOpenRelationship(ctx: any, vaultId: any, partnerId: any) {
  const rows = await listRelationshipsForVaultPartner(ctx, vaultId, partnerId);
  return rows.find((row: any) => row.status === "active" || row.status === "pending") ?? null;
}

async function closeDuplicateRelationships(ctx: any, keepId: any, vaultId: any, partnerId: any) {
  const rows = await listRelationshipsForVaultPartner(ctx, vaultId, partnerId);
  for (const row of rows) {
    if (String(row._id) === String(keepId)) continue;
    if (row.status === "ended") continue;
    await ctx.db.patch("accountability_partners", row._id, { status: "ended" });
  }
}

async function enforceMaxWitnesses(ctx: any, vaultId: any) {
  const activeCount = await countActiveWitnesses(ctx, vaultId);
  if (activeCount >= 3) {
    throw new Error("Request Blocked: Max 3 witnesses per goal.");
  }
}

export const join = mutation({
  args: {
    vaultId: v.id("vaults"),
    role: v.union(v.literal("viewer"), v.literal("verifier")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Unauthenticated");

    const user = await ctx.db.get("users", userId);
    if (!user) throw new Error("Identity verification failed");
    if (!user.emailVerificationTime) throw new Error("Email verification required.");

    const vault = await ctx.db.get("vaults", args.vaultId);
    if (!vault) throw new Error("Vault not found");

    const goal = await ctx.db
        .query("goals")
        .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
        .unique();
    if (!goal) throw new Error("Goal not found");

    await enforceMaxWitnesses(ctx, args.vaultId);

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

    const user = await ctx.db.get("users", userId);
    if (!user) throw new Error("Identity verification failed");
    if (!user.emailVerificationTime) throw new Error("Email verification required.");

    const rate = await ctx.runMutation((internal as any).rateLimit.consume, {
      key: `user:${userId}:partners_request`,
      limit: 10,
      windowMs: 60 * 60_000,
    });
    if (!rate.allowed) {
      throw new Error("Too many witness requests. Please wait and try again.");
    }

    const goal = await ctx.db
        .query("goals")
        .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
        .unique();
    if (!goal) throw new Error("Goal not found");

    // SECURITY: Ensure the requester owns the vault
    const vault = await ctx.db.get("vaults", args.vaultId);
    if (!vault || vault.userId !== userId) {
        throw new Error("Authorization Breach: You can only request witnesses for your own protocols.");
    }

    // Check if already exists
    const existing = await findOpenRelationship(ctx, args.vaultId, args.partnerId);
    if (existing) {
      return existing._id;
    }

    await enforceMaxWitnesses(ctx, args.vaultId);

    const partnerShipId = await ctx.db.insert("accountability_partners", {
      vaultId: args.vaultId,
      goalId: goal._id,
      requesterId: userId,
      partnerId: args.partnerId,
      status: "pending",
      requester_accepted: true,
      partner_accepted: false,
    });

    const requester = await ctx.db.get("users", userId);

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

export const applyToWitness = mutation({
  args: {
    vaultId: v.id("vaults"),
  },
  returns: v.id("accountability_partners"),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Unauthenticated");

    const user = await ctx.db.get("users", userId);
    if (!user) throw new Error("Identity verification failed");
    if (!user.emailVerificationTime) throw new Error("Email verification required.");

    const rate = await ctx.runMutation((internal as any).rateLimit.consume, {
      key: `user:${userId}:partners_apply`,
      limit: 10,
      windowMs: 60 * 60_000,
    });
    if (!rate.allowed) {
      throw new Error("Too many witness applications. Please wait and try again.");
    }

    const vault = await ctx.db.get("vaults", args.vaultId);
    if (!vault) throw new Error("Vault not found");
    if (vault.userId === userId) {
      throw new Error("Request Blocked: Self-witnessing is not permitted.");
    }

    const goal = await ctx.db
      .query("goals")
      .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
      .unique();
    if (!goal) throw new Error("Goal not found");

    const existing = await findOpenRelationship(ctx, args.vaultId, userId);
    if (existing) {
      return existing._id;
    }

    await enforceMaxWitnesses(ctx, args.vaultId);

    const partnerShipId = await ctx.db.insert("accountability_partners", {
      vaultId: args.vaultId,
      goalId: goal._id,
      requesterId: vault.userId,
      partnerId: userId,
      status: "pending",
      requester_accepted: false,
      partner_accepted: true,
    });

    await ctx.db.insert("notifications", {
      userId: vault.userId,
      title: "Witness Application",
      message: `${user?.name || "Someone"} applied to witness your goal.`,
      type: "partner_request",
      link: `/invite/${args.vaultId}`,
      read: false,
    });

    return partnerShipId;
  },
});

export const acceptRequest = mutation({
    args: { partnerShipId: v.id("accountability_partners") },
    returns: v.null(),
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (userId === null) throw new Error("Unauthenticated");

        const user = await ctx.db.get("users", userId);
        if (!user) throw new Error("Identity verification failed");
        if (!user.emailVerificationTime) throw new Error("Email verification required.");

        const partnership = await ctx.db.get("accountability_partners", args.partnerShipId);
        if (!partnership || partnership.partnerId !== userId) {
            throw new Error("Authorization Breach: You cannot accept this request.");
        }

        if (partnership.status !== "active") {
          await enforceMaxWitnesses(ctx, partnership.vaultId);
        }

        await ctx.db.patch("accountability_partners", args.partnerShipId, {
            status: "active",
            partner_accepted: true
        });
        await closeDuplicateRelationships(ctx, args.partnerShipId, partnership.vaultId, partnership.partnerId);
        return null;
    }
});

export const acceptApplication = mutation({
  args: { partnerShipId: v.id("accountability_partners") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Unauthenticated");

    const user = await ctx.db.get("users", userId);
    if (!user) throw new Error("Identity verification failed");
    if (!user.emailVerificationTime) throw new Error("Email verification required.");

    const partnership = await ctx.db.get("accountability_partners", args.partnerShipId);
    if (!partnership || partnership.requesterId !== userId) {
      throw new Error("Authorization Breach: You cannot accept this application.");
    }

    if (partnership.status !== "pending") return null;

    await enforceMaxWitnesses(ctx, partnership.vaultId);

    await ctx.db.patch("accountability_partners", args.partnerShipId, {
      status: "active",
      requester_accepted: true,
    });
    await closeDuplicateRelationships(ctx, args.partnerShipId, partnership.vaultId, partnership.partnerId);

    await ctx.db.insert("notifications", {
      userId: partnership.partnerId,
      title: "Witness Role Activated",
      message: "Your witness application was accepted. You can now authorize evidence logs.",
      type: "partner_request",
      link: `/vault/${partnership.vaultId}`,
      read: false,
    });

    return null;
  },
});

export const removeWitness = mutation({
  args: { partnerShipId: v.id("accountability_partners") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Unauthenticated");

    const user = await ctx.db.get("users", userId);
    if (!user) throw new Error("Identity verification failed");
    if (!user.emailVerificationTime) throw new Error("Email verification required.");

    const partnership = await ctx.db.get("accountability_partners", args.partnerShipId);
    if (!partnership || partnership.requesterId !== userId) {
      throw new Error("Authorization Breach: You cannot remove this witness.");
    }

    if (partnership.status === "ended") return null;

    await ctx.db.patch("accountability_partners", args.partnerShipId, {
      status: "ended",
    });

    await ctx.db.insert("notifications", {
      userId: partnership.partnerId,
      title: "Witness Role Ended",
      message: "Your witness role on a protocol was ended by the protocol owner.",
      type: "partner_request",
      link: `/vault/${partnership.vaultId}`,
      read: false,
    });

    return null;
  },
});

export const listIncomingRequests = query({
    args: {},
    returns: v.array(v.any()),
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (userId === null) return [];

        const user = await ctx.db.get("users", userId);
        if (!user || !user.emailVerificationTime) return [];

        const requests = await ctx.db
            .query("accountability_partners")
            .withIndex("by_partner_and_status", q => q.eq("partnerId", userId).eq("status", "pending"))
            .collect();
        
        const latestByPair = new Map<string, any>();
        for (const req of requests) {
            const key = `${String(req.vaultId)}:${String(req.partnerId)}`;
            const existing = latestByPair.get(key);
            if (!existing || req._creationTime > existing._creationTime) {
                latestByPair.set(key, req);
            }
        }

        const results = [];
        for (const req of latestByPair.values()) {
            const requester = await ctx.db.get("users", req.requesterId);
            const goal = await ctx.db.get("goals", req.goalId);
            results.push({ ...req, requester, goal });
        }
        return results;
    }
});

export const listIncomingApplications = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) return [];

    const user = await ctx.db.get("users", userId);
    if (!user || !user.emailVerificationTime) return [];

    const requests = await ctx.db
      .query("accountability_partners")
      .withIndex("by_requester_and_status", (q) => q.eq("requesterId", userId).eq("status", "pending"))
      .collect();

    const latestByPair = new Map<string, any>();
    for (const req of requests) {
      const key = `${String(req.vaultId)}:${String(req.partnerId)}`;
      const existing = latestByPair.get(key);
      if (!existing || req._creationTime > existing._creationTime) {
        latestByPair.set(key, req);
      }
    }

    const results = [];
    for (const req of latestByPair.values()) {
      if (!req.partner_accepted || req.requester_accepted) continue;
      const partner = await ctx.db.get("users", req.partnerId);
      const goal = await ctx.db.get("goals", req.goalId);
      results.push({ ...req, partner, goal });
    }
    return results;
  },
});

export const listMyWitnessProtocols = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) return [];

    const user = await ctx.db.get("users", userId);
    if (!user || !user.emailVerificationTime) return [];

    const partnerships = await ctx.db
      .query("accountability_partners")
      .withIndex("by_partner_and_status", (q) => q.eq("partnerId", userId).eq("status", "active"))
      .collect();

    const latestByVault = new Map<string, any>();
    for (const p of partnerships) {
      const key = String(p.vaultId);
      const existing = latestByVault.get(key);
      if (!existing || p._creationTime > existing._creationTime) {
        latestByVault.set(key, p);
      }
    }

    const results: Array<any> = [];
    for (const p of latestByVault.values()) {
      const vault = await ctx.db.get("vaults", p.vaultId);
      const goal = await ctx.db.get("goals", p.goalId);
      const owner = await ctx.db.get("users", p.requesterId);
      const ownerImageUrl = owner?.profileImageId ? await ctx.storage.getUrl(owner.profileImageId) : null;

      results.push({
        partnership: p,
        vault,
        goal,
        owner: owner
          ? {
              _id: owner._id,
              name: owner.name,
              image: ownerImageUrl ?? owner.image,
              integrityScore: owner.integrityScore,
              tier: owner.tier,
              city: owner.city,
            }
          : null,
      });
    }

    return results;
  },
});

export const joinByInvite = mutation({
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
    if (!vault) throw new Error("Vault not found");

    if (vault.userId === userId) {
        return { success: false, message: "Self-witnessing is not permitted in the protocol." };
    }

    const goal = await ctx.db
        .query("goals")
        .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
        .unique();
    if (!goal) throw new Error("Goal not found");

    const existing = await findOpenRelationship(ctx, args.vaultId, userId);
    if (existing) {
      return { success: true, message: "You are already a witness for this goal." };
    }

    await enforceMaxWitnesses(ctx, args.vaultId);

    await ctx.db.insert("accountability_partners", {
      vaultId: args.vaultId,
      goalId: goal._id,
      requesterId: vault.userId,
      partnerId: userId,
      status: "active",
      requester_accepted: true,
      partner_accepted: true,
    });

    const partner = await ctx.db.get("users", userId);

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
        const userId = await auth.getUserId(ctx);
        if (userId === null) return [];

        const user = await ctx.db.get("users", userId);
        if (!user || !user.emailVerificationTime) return [];

        const vault = await ctx.db.get("vaults", args.vaultId);
        if (!vault) return [];

        const partner = await ctx.db
          .query("accountability_partners")
          .withIndex("by_vault_and_partner", (q) =>
            q.eq("vaultId", args.vaultId).eq("partnerId", userId),
          )
          .order("desc")
          .first();

        if (vault.userId !== userId && (!partner || partner.status !== "active")) return [];

        const partners = await ctx.db
            .query("accountability_partners")
            .withIndex("by_vault", q => q.eq("vaultId", args.vaultId))
            .collect();

        const latestByPartner = new Map<string, any>();
        for (const p of partners) {
            const key = String(p.partnerId);
            const existing = latestByPartner.get(key);
            if (!existing || p._creationTime > existing._creationTime) {
                latestByPartner.set(key, p);
            }
        }

        const results = [];
        for (const p of latestByPartner.values()) {
            const user = await ctx.db.get("users", p.partnerId);
            const profileUrl = user?.profileImageId ? await ctx.storage.getUrl(user.profileImageId) : null;
            results.push({ ...p, user: user ? { ...user, image: profileUrl ?? user.image } : null });
        }
        return results;
    }
});

export const endAllForVault = internalMutation({
  args: { vaultId: v.id("vaults") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await endOpenPartnerRelationshipsForVault(ctx, args.vaultId);
    return null;
  },
});
