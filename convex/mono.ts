"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const MONO_SECRET = process.env.MONO_SECRET_KEY;
const MONO_BASE_URL = "https://api.withmono.com";

export const verifyIdentity = action({
  args: {
    bvn: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    if (!MONO_SECRET) {
      return { success: false, message: "MONO_SECRET_KEY not configured." };
    }

    try {
      // In Sandbox, any 11-digit BVN starting with '2' usually works or follows Mono docs.
      const response = await fetch(`${MONO_BASE_URL}/lookup/bvn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "mono-sec-key": MONO_SECRET,
        },
        body: JSON.stringify({ bvn: args.bvn }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        const fullName = `${data.data.first_name} ${data.data.last_name}`;
        
        // Save to DB
        await ctx.runMutation(internal.users.updateBvnStatus, {
          userId,
          bvn: args.bvn,
          name: fullName,
        });

        return { success: true, message: "Identity anchored successfully." };
      }

      return { success: false, message: data.message || "BVN verification failed." };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Internal server error." };
    }
  },
});

export const lookupBVN = action({
  args: {
    bvn: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    data: v.optional(v.any()),
    message: v.string(),
  }),
  handler: async (_ctx, args) => {
    if (!MONO_SECRET) {
      return { success: false, message: "MONO_SECRET_KEY not configured in environment." };
    }

    try {
      // BVN Verification API (Standard Mono Flow)
      // Note: In Sandbox, Mono provides specific test BVNs.
      const response = await fetch(`${MONO_BASE_URL}/lookup/bvn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "mono-sec-key": MONO_SECRET,
        },
        body: JSON.stringify({
          bvn: args.bvn,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        return { 
          success: true, 
          data: data.data, 
          message: "BVN Verification Successful." 
        };
      }

      return { 
        success: false, 
        message: data.message || "BVN verification failed via Mono." 
      };
    } catch (error) {
      console.error("Mono API Error:", error);
      return { success: false, message: "Internal protocol error during identity lookup." };
    }
  },
});
