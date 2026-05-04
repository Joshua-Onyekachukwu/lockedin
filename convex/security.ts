import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

/**
 * SECURITY PROTOCOL: OWNERSHIP VERIFICATION
 * All sensitive operations must verify that the requester is the legitimate owner.
 */

export const secureAction = mutation({
  args: {
    vaultId: v.id("vaults"),
    actionType: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("CRITICAL SECURITY BREACH: UNAUTHORIZED ACCESS ATTEMPTED");

    const vault = await ctx.db.get(args.vaultId);
    if (!vault) throw new Error("PROTOCOL ERROR: VAULT NOT FOUND");

    // ENFORCE OWNERSHIP
    if (vault.userId !== userId) {
      console.error(`SECURITY ALERT: User ${userId} attempted unauthorized action '${args.actionType}' on Vault ${args.vaultId}`);
      throw new Error("AUTHORIZATION FAILURE: YOU DO NOT OWN THIS PROTOCOL");
    }

    // LOG SECURE ACCESS
    console.log(`SECURE ACCESS: User ${userId} authorized for ${args.actionType} on Vault ${args.vaultId}`);
    return null;
  },
});
