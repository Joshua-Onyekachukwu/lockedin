import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

/**
 * SECURITY PROTOCOL: AUTHENTICATED SESSION CHECK
 * This ensures that a user can only perform actions within their own session.
 */

export const validateSession = mutation({
  args: {
    expectedUserId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sessionUserId = await auth.getUserId(ctx);
    
    if (sessionUserId === null) {
      throw new Error("UNAUTHENTICATED: ACTIVE SESSION REQUIRED");
    }

    if (sessionUserId !== args.expectedUserId) {
      console.error(`SECURITY ALERT: Session hijacking attempt. Session ${sessionUserId} tried to act as ${args.expectedUserId}`);
      throw new Error("AUTHORIZATION BREACH: SESSION ID MISMATCH");
    }

    return null;
  },
});
