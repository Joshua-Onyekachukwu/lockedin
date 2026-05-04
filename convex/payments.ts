import { mutation, query, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { internal } from "./_generated/api";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

/**
 * Initialize a deposit session
 */
export const initializeDeposit = mutation({
  args: {
    amount: v.number(), // In NGN (we will convert to Kobo for Paystack)
  },
  returns: v.object({
    reference: v.string(),
    userId: v.id("users"),
    email: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user || !user.email) throw new Error("User email required for payment");

    const reference = `LKD-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    await ctx.db.insert("deposits", {
      userId,
      amount: args.amount * 100, // Store in Kobo
      status: "pending",
      reference,
      provider: "paystack",
    });

    return {
      reference,
      userId,
      email: user.email,
    };
  },
});

/**
 * Verify a Paystack payment (Action because it calls an external API)
 */
export const verifyPayment = action({
  args: {
    reference: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${args.reference}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.status && data.data.status === "success") {
        // Amount check (Paystack returns amount in Kobo)
        const amountKobo = data.data.amount;
        
        await ctx.runMutation(internal.payments.fulfillDeposit, {
          reference: args.reference,
          amountKobo,
        });

        return { success: true, message: "Payment verified and wallet funded." };
      }

      return { success: false, message: data.message || "Payment verification failed." };
    } catch (error) {
      console.error("Payment verification error:", error);
      return { success: false, message: "Internal server error during verification." };
    }
  },
});

/**
 * Internal mutation to update user balance and deposit status
 */
export const fulfillDeposit = internalMutation({
  args: {
    reference: v.string(),
    amountKobo: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const deposit = await ctx.db
      .query("deposits")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();

    if (!deposit || deposit.status === "completed") return null;

    // Update deposit status
    await ctx.db.patch(deposit._id, { status: "completed" });

    // Update user balance
    const user = await ctx.db.get(deposit.userId);
    if (user) {
      await ctx.db.patch(user._id, {
        balance: (user.balance || 0) + args.amountKobo,
      });

      // Log transaction
      await ctx.db.insert("transactions", {
        userId: user._id,
        amount: args.amountKobo,
        type: "deposit",
        status: "completed",
        description: `Paystack Deposit Ref: ${args.reference}`,
      });
    }

    return null;
  },
});

export const getBalance = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return 0;
    const user = await ctx.db.get(userId);
    return user?.balance || 0;
  },
});
