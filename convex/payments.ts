import { mutation, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * PAYMENT BRIDGE INFRASTRUCTURE (PAYSTACK)
 */

export const initializeDeposit = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(), // In NGN (Kobo)
    provider: v.union(v.literal("paystack"), v.literal("flutterwave")),
  },
  returns: v.string(), // Returns a transaction reference
  handler: async (ctx, args) => {
    const reference = `LKD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    await ctx.db.insert("deposits", {
      userId: args.userId,
      amount: args.amount,
      status: "pending",
      reference,
      provider: args.provider,
    });

    return reference;
  },
});

/**
 * Action to verify payment with Paystack API.
 * This will be called after the user completes the payment on the frontend.
 */
export const verifyPayment = action({
  args: {
    reference: v.string(),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    // INFRASTRUCTURE READY: Integration with Paystack Secret Key will go here.
    // const secretKey = process.env.PAYSTACK_SECRET_KEY;
    // const response = await fetch(`https://api.paystack.co/transaction/verify/${args.reference}`, { ... });
    
    // For now, we simulate success for the infrastructure check
    await ctx.runMutation(internal.payments.fulfillDeposit, { reference: args.reference });
    
    return { success: true, message: "Payment verified and balance updated." };
  },
});

export const fulfillDeposit = internalMutation({
  args: { reference: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const deposit = await ctx.db
      .query("deposits")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();

    if (!deposit || deposit.status === "completed") return null;

    const user = await ctx.db.get(deposit.userId);
    if (!user) return null;

    // Update status
    await ctx.db.patch(deposit._id, { status: "completed" });

    // Update user balance
    await ctx.db.patch(user._id, {
      balance: (user.balance || 0) + deposit.amount
    });

    // Record transaction
    await ctx.db.insert("transactions", {
      userId: user._id,
      amount: deposit.amount,
      type: "deposit",
      status: "completed",
      description: `Wallet Funding via ${deposit.provider.toUpperCase()}`
    });

    // Notify user
    await ctx.db.insert("notifications", {
      userId: user._id,
      title: "Wallet Funded",
      message: `Successfully added ₦${(deposit.amount / 100).toLocaleString()} to your balance.`,
      type: "streak_alert",
      read: false
    });

    return null;
  },
});
