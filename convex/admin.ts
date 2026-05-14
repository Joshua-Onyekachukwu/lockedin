import { mutation, query, action, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { internal, api } from "./_generated/api";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// SECURITY: Admin privileges are strictly limited to these authorized emails.
const ADMIN_EMAILS = [
  "onyekachukwujoshua1@gmail.com",
  "admin@lockedin.io" // Backup admin
];

async function checkAdmin(ctx: any) {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("UNAUTHORIZED: ACCESS DENIED");
    
    const user = await ctx.db.get(userId);
    if (!user || !user.email || !ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase())) {
        throw new Error("SECURITY ALERT: Administrative privileges required.");
    }
    return user;
}

export const getSystemStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    await checkAdmin(ctx);

    const stats = await ctx.db.query("system_stats").unique();
    const totalUsers = (await ctx.db.query("users").collect()).length;
    const activeVaults = (await ctx.db.query("vaults").withIndex("by_status", q => q.eq("status", "active")).collect());
    const totalStaked = activeVaults.reduce((sum, v) => sum + v.amount, 0);

    return {
      revenue: stats?.total_revenue || 0,
      distributed: stats?.total_distributed || 0,
      totalUsers,
      activeVaults: activeVaults.length,
      totalStaked,
    };
  }
});

export const triggerMidnightSweep = mutation({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
        await checkAdmin(ctx);
        await ctx.scheduler.runAfter(0, internal.penalties.midnightSweep, {});
        return null;
    }
});

export const triggerWeeklyDistribution = mutation({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
        await checkAdmin(ctx);
        await ctx.scheduler.runAfter(0, internal.rewards.distributeWeeklyRewards, {});
        return null;
    }
});

export const getPendingWithdrawals = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    await checkAdmin(ctx);
    const withdrawals = await ctx.db
      .query("withdrawals")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const results = [];
    for (const w of withdrawals) {
      const user = await ctx.db.get(w.userId);
      results.push({ ...w, user });
    }
    return results;
  },
});

export const getWithdrawalById = internalQuery({
    args: { withdrawalId: v.id("withdrawals") },
    returns: v.any(),
    handler: async (ctx, args) => {
        return await ctx.db.get(args.withdrawalId);
    }
});

/**
 * PRODUCTION EXTRACTION PROTOCOL (Paystack Transfer)
 * This is an action because it communicates with the external Paystack API.
 */
export const approveWithdrawal = action({
  args: { withdrawalId: v.id("withdrawals") },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    // 1. Authenticate Admin
    await ctx.runQuery(api.admin.getSystemStats, {}); // Reusing stats check for auth

    // 2. Fetch withdrawal details
    const withdrawal = await ctx.runQuery(internal.admin.getWithdrawalById, { 
        withdrawalId: args.withdrawalId 
    });

    if (!withdrawal || withdrawal.status !== "pending") {
        return { success: false, message: "Request already processed or not found." };
    }

    const { bank_details, amount } = withdrawal;

    if (!bank_details) {
        return { success: false, message: "Invalid extraction details: Missing bank data." };
    }

    try {
        // 3. Create Transfer Recipient
        const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                type: "nuban",
                name: bank_details.account_name,
                account_number: bank_details.account_number,
                bank_code: bank_details.bank_code,
                currency: "NGN",
            }),
        });

        const recipientData = await recipientRes.json();
        if (!recipientData.status) throw new Error(recipientData.message);

        const recipientCode = recipientData.data.recipient_code;

        // 4. Initiate Transfer
        const transferRes = await fetch("https://api.paystack.co/transfer", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                source: "balance",
                amount: amount, // amount is already in kobo
                recipient: recipientCode,
                reason: "Lockedin Extraction",
                reference: `EXT-${args.withdrawalId.slice(0, 8)}-${Date.now()}`,
            }),
        });

        const transferData = await transferRes.json();
        if (!transferData.status) throw new Error(transferData.message);

        // 5. Update Record via Mutation
        await ctx.runMutation(internal.admin.finalizeWithdrawal, {
            withdrawalId: args.withdrawalId,
            status: "completed",
            processedAt: Date.now()
        });

        return { success: true, message: "Capital extraction protocol executed successfully." };

    } catch (err: any) {
        console.error("PAYSTACK TRANSFER ERROR:", err);
        return { success: false, message: `Disbursement Failed: ${err.message}` };
    }
  },
});

export const finalizeWithdrawal = internalMutation({
    args: { 
        withdrawalId: v.id("withdrawals"), 
        status: v.string(),
        processedAt: v.number()
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const withdrawal = await ctx.db.get(args.withdrawalId);
        if (!withdrawal) return null;

        await ctx.db.patch(args.withdrawalId, {
            status: args.status as any,
            processed_at: args.processedAt,
        });

        await ctx.db.insert("notifications", {
            userId: withdrawal.userId,
            title: "Extraction Protocol Complete",
            message: `Your capital of ₦${(withdrawal.amount / 100).toLocaleString()} has been dispersed to your bank account.`,
            type: "verification_needed",
            read: false,
        });

        // Update transaction status
        const tx = await ctx.db
          .query("transactions")
          .withIndex("by_user", (q) => q.eq("userId", withdrawal.userId))
          .filter((q) => q.and(
              q.eq(q.field("amount"), -withdrawal.amount),
              q.eq(q.field("status"), "pending")
          ))
          .first();
        
        if (tx) {
            await ctx.db.patch(tx._id, { status: "completed" });
        }

        return null;
    }
});

export const getBreachCandidates = query({
    args: {},
    returns: v.array(v.any()),
    handler: async (ctx) => {
        await checkAdmin(ctx);
        // Vaults that are active and might need manual failure enforcement
        const activeVaults = await ctx.db
            .query("vaults")
            .withIndex("by_status", q => q.eq("status", "active"))
            .collect();
        
        const results = [];
        for (const vault of activeVaults) {
            const user = await ctx.db.get(vault.userId);
            const goal = await ctx.db
                .query("goals")
                .withIndex("by_vault", q => q.eq("vaultId", vault._id))
                .unique();
            
            // Check if they missed a check-in recently
            // This is just a basic list for now
            results.push({ ...vault, user, goal });
        }
        return results;
    }
});

export const enforceProtocolBreach = mutation({
    args: { vaultId: v.id("vaults") },
    returns: v.null(),
    handler: async (ctx, args) => {
        await checkAdmin(ctx);
        const vault = await ctx.db.get(args.vaultId);
        if (!vault || vault.status !== "active") return null;

        await ctx.db.patch(args.vaultId, { status: "failed" });

        // Logic for penalty distribution
        await ctx.db.insert("transactions", {
            userId: vault.userId,
            amount: -vault.amount,
            type: "penalty",
            vaultId: vault._id,
            status: "completed",
            description: "Protocol Breach: Total principal forfeiture enforced by Admin."
        });

        await ctx.db.insert("notifications", {
            userId: vault.userId,
            title: "PROTOCOL BREACH ENFORCED",
            message: "System has detected an unrecoverable goal failure. Principal has been forfeited.",
            type: "streak_alert",
            read: false,
        });

        return null;
    }
});
