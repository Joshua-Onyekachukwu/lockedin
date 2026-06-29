import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { api, internal } from "./_generated/api";
import { captureToSentry } from "./sentry";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_MODE = process.env.PAYSTACK_MODE;
const PAYSTACK_PUBLIC = process.env.PAYSTACK_PUBLIC_KEY;

function maskAccountNumber(accountNumber: string) {
  const digits = accountNumber.replace(/\D/g, "");
  if (!digits) return "****";
  if (digits.length <= 4) return digits;
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function formatMaskedWithdrawalDestination(bankName: string, accountNumber: string) {
  const masked = maskAccountNumber(accountNumber);
  return bankName ? `${bankName} (${masked})` : masked;
}

function derivePaystackDomainFromSecret(secret: string) {
  if (secret.startsWith("sk_test_")) return "test" as const;
  if (secret.startsWith("sk_live_")) return "live" as const;
  return null;
}

function assertPaystackConfig() {
  if (!PAYSTACK_SECRET) throw new Error("Payment backend not configured.");
  const derived = derivePaystackDomainFromSecret(PAYSTACK_SECRET);
  const declared =
    PAYSTACK_MODE === "test" || PAYSTACK_MODE === "live" ? PAYSTACK_MODE : null;
  const expected = declared ?? derived;
  if (!expected) {
    throw new Error("Payment backend misconfigured: invalid PAYSTACK_SECRET_KEY.");
  }
  if (declared && derived && declared !== derived) {
    throw new Error("Payment backend misconfigured: PAYSTACK_MODE mismatch.");
  }
  if (PAYSTACK_PUBLIC) {
    const pk = PAYSTACK_PUBLIC;
    if (expected === "test" && !pk.startsWith("pk_test_")) {
      throw new Error("Payment backend misconfigured: expected pk_test_ public key.");
    }
    if (expected === "live" && !pk.startsWith("pk_live_")) {
      throw new Error("Payment backend misconfigured: expected pk_live_ public key.");
    }
  }
  return expected;
}

const PaystackSource = v.union(
  v.literal("verify"),
  v.literal("webhook"),
  v.literal("admin"),
  v.literal("cron"),
);

const VerifyPaymentStatus = v.union(
  v.literal("completed"),
  v.literal("pending"),
  v.literal("failed"),
);

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

    const user = await ctx.db.get("users", userId);
    if (!user || !user.email) throw new Error("User email required for payment");
    if (!user.emailVerificationTime) throw new Error("Email verification required.");
    assertPaystackConfig();

    const rate = await ctx.runMutation((internal as any).rateLimit.consume, {
      key: `user:${userId}:initialize_deposit`,
      limit: 5,
      windowMs: 5 * 60_000,
    });
    if (!rate.allowed) {
      throw new Error("Too many payment attempts. Please wait and try again.");
    }

    const reference = `LKD-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    await ctx.db.insert("deposits", {
      userId,
      amount: args.amount * 100, // Store in Kobo
      status: "pending",
      reference,
      provider: "paystack",
      kind: "wallet_topup",
    });

    return {
      reference,
      userId,
      email: user.email,
    };
  },
});

export const initializeVaultFunding = mutation({
  args: {
    vaultId: v.id("vaults"),
  },
  returns: v.object({
    reference: v.string(),
    vaultId: v.id("vaults"),
    email: v.string(),
    amountKobo: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get("users", userId);
    if (!user || !user.email) throw new Error("User email required for payment");
    if (!user.emailVerificationTime) throw new Error("Email verification required.");
    assertPaystackConfig();

    const vault = await ctx.db.get("vaults", args.vaultId);
    if (!vault) throw new Error("Protocol not found");
    if (vault.userId !== userId) throw new Error("Unauthorized");

    if (vault.status !== "awaiting_funding") {
      throw new Error("Protocol is not awaiting funding");
    }

    const rate = await ctx.runMutation((internal as any).rateLimit.consume, {
      key: `user:${userId}:initialize_vault_funding`,
      limit: 5,
      windowMs: 5 * 60_000,
    });
    if (!rate.allowed) {
      throw new Error("Too many payment attempts. Please wait and try again.");
    }

    const reference = `LKD-VLT-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    await ctx.db.insert("deposits", {
      userId,
      amount: vault.amount,
      status: "pending",
      reference,
      provider: "paystack",
      vaultId: vault._id,
      kind: "vault_funding",
    });

    await ctx.db.patch("vaults", vault._id, { paystack_reference: reference });

    return {
      reference,
      vaultId: vault._id,
      email: user.email,
      amountKobo: vault.amount,
    };
  },
});

export const fundVaultFromWalletBalance = internalMutation({
  args: {
    userId: v.id("users"),
    vaultId: v.id("vaults"),
  },
  returns: v.object({
    success: v.boolean(),
    status: v.union(
      v.literal("activated"),
      v.literal("already_active"),
      v.literal("insufficient_balance"),
      v.literal("vault_not_found"),
      v.literal("unauthorized"),
    ),
    message: v.string(),
    balanceRemaining: v.number(),
  }),
  handler: async (ctx, args) => {
    const [user, vault] = await Promise.all([
      ctx.db.get("users", args.userId),
      ctx.db.get("vaults", args.vaultId),
    ]);

    if (!user) {
      return {
        success: false,
        status: "unauthorized" as const,
        message: "Unauthorized",
        balanceRemaining: 0,
      };
    }

    if (!vault) {
      return {
        success: false,
        status: "vault_not_found" as const,
        message: "Protocol not found.",
        balanceRemaining: user.balance || 0,
      };
    }

    if (vault.userId !== user._id) {
      return {
        success: false,
        status: "unauthorized" as const,
        message: "Unauthorized",
        balanceRemaining: user.balance || 0,
      };
    }

    if (vault.status !== "awaiting_funding") {
      return {
        success: true,
        status: "already_active" as const,
        message: "Protocol is already active.",
        balanceRemaining: user.balance || 0,
      };
    }

    if ((user.balance || 0) < vault.amount) {
      return {
        success: false,
        status: "insufficient_balance" as const,
        message: "Insufficient wallet balance to activate this protocol.",
        balanceRemaining: user.balance || 0,
      };
    }

    const activatedAt = Date.now();
    const balanceRemaining = (user.balance || 0) - vault.amount;

    await ctx.db.patch("users", user._id, {
      balance: balanceRemaining,
    });

    await ctx.db.patch("vaults", vault._id, {
      status: "active",
      startDate: activatedAt,
      endDate: activatedAt + vault.duration_weeks * 7 * 24 * 60 * 60 * 1000,
      fundedAt: activatedAt,
    });

    await ctx.db.insert("transactions", {
      userId: user._id,
      amount: -vault.amount,
      type: "stake",
      vaultId: vault._id,
      status: "completed",
      description: "Protocol funded from wallet balance",
    });

    await ctx.db.insert("notifications", {
      userId: user._id,
      title: "Protocol Activated",
      message: `₦${(vault.amount / 100).toLocaleString()} moved from wallet balance into your protocol.`,
      type: "protocol_created",
      link: "/dashboard",
      read: false,
    });

    return {
      success: true,
      status: "activated" as const,
      message: "Protocol activated using wallet balance.",
      balanceRemaining,
    };
  },
});

export const activateVaultFromWallet = mutation({
  args: {
    vaultId: v.id("vaults"),
  },
  returns: v.object({
    success: v.boolean(),
    status: v.union(
      v.literal("activated"),
      v.literal("already_active"),
      v.literal("insufficient_balance"),
      v.literal("vault_not_found"),
      v.literal("unauthorized"),
    ),
    message: v.string(),
    balanceRemaining: v.number(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    status:
      | "activated"
      | "already_active"
      | "insufficient_balance"
      | "vault_not_found"
      | "unauthorized";
    message: string;
    balanceRemaining: number;
  }> => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return {
        success: false,
        status: "unauthorized" as const,
        message: "Unauthorized",
        balanceRemaining: 0,
      };
    }

    const user = await ctx.db.get("users", userId);
    if (!user || !user.emailVerificationTime) {
      throw new Error("Email verification required.");
    }

    const result: {
      success: boolean;
      status:
        | "activated"
        | "already_active"
        | "insufficient_balance"
        | "vault_not_found"
        | "unauthorized";
      message: string;
      balanceRemaining: number;
    } = await ctx.runMutation(internal.payments.fundVaultFromWalletBalance, {
      userId,
      vaultId: args.vaultId,
    });

    return result;
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
    status: VerifyPaymentStatus,
    retryable: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.current, {});
    if (!user || !user.emailVerificationTime) throw new Error("Email verification required.");

    // #region debug-point verify-payment-start
    await captureToSentry({
      message: "verify-payment-start",
      level: "info",
      tags: { area: "payments", step: "verify-start" },
      extra: { reference: args.reference, userId: String(user._id) },
    });
    // #endregion debug-point verify-payment-start

    try {
      assertPaystackConfig();
    } catch (e: any) {
      // #region debug-point verify-payment-config-error
      await captureToSentry({
        message: "verify-payment-config-error",
        level: "error",
        tags: { area: "payments", step: "verify-config-error" },
        extra: { reference: args.reference, error: String(e?.message ?? e) },
      });
      // #endregion debug-point verify-payment-config-error
      return {
        success: false,
        message: e?.message || "Payment backend misconfigured.",
        status: "failed" as const,
        retryable: false,
      };
    }

    const rate = await ctx.runMutation((internal as any).rateLimit.consume, {
      key: `user:${user._id}:verify_payment`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return {
        success: false,
        message: "Verification is taking longer than expected. Please wait a few seconds and try again.",
        status: "pending" as const,
        retryable: true,
      };
    }

    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${args.reference}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      // #region debug-point verify-payment-paystack-response
      await captureToSentry({
        message: "verify-payment-paystack-response",
        level: "info",
        tags: { area: "payments", step: "verify-paystack-response" },
        extra: {
          reference: args.reference,
          httpStatus: response.status,
          paystackOk: data?.status,
          paystackStatus: data?.data?.status,
          domain: data?.data?.domain,
        },
      });
      // #endregion debug-point verify-payment-paystack-response

      if (data.status && data.data.status === "success") {
        const expectedDomain = derivePaystackDomainFromSecret(PAYSTACK_SECRET!);
        const domain = data?.data?.domain as string | undefined;
        if (expectedDomain && domain && domain !== expectedDomain) {
          return {
            success: false,
            message: "Payment backend mode mismatch. Contact support.",
            status: "failed" as const,
            retryable: false,
          };
        }
        // Amount check (Paystack returns amount in Kobo)
        const amountKobo = data.data.amount;
        const customerEmail = data?.data?.customer?.email as string | undefined;
        const result = await ctx.runMutation(internal.payments.reconcilePaystackPayment, {
          reference: args.reference,
          amountKobo,
          customerEmail,
          source: "verify",
          metadata: data.data,
        });

        // #region debug-point verify-payment-reconcile-result
        await captureToSentry({
          message: "verify-payment-reconcile-result",
          level: "info",
          tags: { area: "payments", step: "verify-reconcile-result" },
          extra: { reference: args.reference, result },
        });
        // #endregion debug-point verify-payment-reconcile-result

        if (result.status === "credited") {
          return {
            success: true,
            message: "Payment verified.",
            status: "completed" as const,
            retryable: false,
          };
        }
        if (result.status === "vault_funded") {
          return {
            success: true,
            message: "Protocol funded and activated.",
            status: "completed" as const,
            retryable: false,
          };
        }
        if (result.status === "already_credited") {
          return {
            success: true,
            message: "Payment already credited.",
            status: "completed" as const,
            retryable: false,
          };
        }
        if (result.status === "unmatched") {
          return {
            success: false,
            message: "Payment was received but could not be matched to this protocol. Contact support with the payment reference.",
            status: "failed" as const,
            retryable: false,
          };
        }
        return {
          success: false,
          message: "Payment could not be credited because the confirmed amount was below the expected stake.",
          status: "failed" as const,
          retryable: false,
        };
      }

      const paystackStatus = String(data?.data?.status ?? "").toLowerCase();
      if (
        paystackStatus === "pending" ||
        paystackStatus === "processing" ||
        paystackStatus === "queued" ||
        paystackStatus === "ongoing"
      ) {
        return {
          success: false,
          message: "Payment authorization succeeded. Waiting for Paystack to finish confirmation.",
          status: "pending" as const,
          retryable: true,
        };
      }

      return {
        success: false,
        message: data.message || "Payment verification failed.",
        status: "failed" as const,
        retryable: false,
      };
    } catch (error) {
      // #region debug-point verify-payment-catch
      await captureToSentry({
        message: "verify-payment-catch",
        level: "error",
        tags: { area: "payments", step: "verify-catch" },
        extra: { reference: args.reference, error: String(error) },
      });
      // #endregion debug-point verify-payment-catch
      return {
        success: false,
        message: "We could not confirm the payment immediately. Lockedin will keep checking for final confirmation.",
        status: "pending" as const,
        retryable: true,
      };
    }
  },
});

export const listPaystackBanks = action({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    banks: v.array(v.object({ name: v.string(), code: v.string() })),
  }),
  handler: async (ctx) => {
    const user = await ctx.runQuery(api.users.current, {});
    if (!user || !user.emailVerificationTime) throw new Error("Email verification required.");
    try {
      assertPaystackConfig();
    } catch (e: any) {
      return { success: false, message: e?.message || "Payment backend misconfigured.", banks: [] };
    }

    try {
      const res = await fetch("https://api.paystack.co/bank?currency=NGN&country=nigeria", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
      });
      const json = await res.json();
      if (!res.ok || !json?.status) {
        return { success: false, message: json?.message || "Unable to load banks.", banks: [] };
      }
      const banks = (Array.isArray(json?.data) ? json.data : [])
        .map((b: any) => ({ name: String(b?.name ?? ""), code: String(b?.code ?? "") }))
        .filter((b: any) => b.name && b.code);
      return { success: true, message: "Banks loaded.", banks };
    } catch {
      return { success: false, message: "Unable to load banks.", banks: [] };
    }
  },
});

export const resolvePaystackAccount = action({
  args: { accountNumber: v.string(), bankCode: v.string() },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    accountName: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.current, {});
    if (!user || !user.emailVerificationTime) throw new Error("Email verification required.");
    try {
      assertPaystackConfig();
    } catch (e: any) {
      return { success: false, message: e?.message || "Payment backend misconfigured." };
    }

    const accountNumber = args.accountNumber.trim();
    const bankCode = args.bankCode.trim();
    if (!accountNumber || !bankCode) return { success: false, message: "Account number and bank required." };

    try {
      const url = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
      });
      const json = await res.json();
      if (!res.ok || !json?.status) {
        return { success: false, message: json?.message || "Unable to resolve account." };
      }
      return { success: true, message: "Account resolved.", accountName: json?.data?.account_name as string | undefined };
    } catch {
      return { success: false, message: "Unable to resolve account." };
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
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const deposit = await ctx.db
      .query("deposits")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();

    if (!deposit) {
      throw new Error("Deposit reference not found.");
    }
    if (deposit.status === "completed") return null;
    if (args.amountKobo < deposit.amount) {
      throw new Error("Deposit amount is below the expected amount.");
    }

    const expectedAmountKobo = deposit.amount;
    const reconciliationMetadata = {
      ...(args.metadata ?? {}),
      expectedAmountKobo,
      chargedAmountKobo: args.amountKobo,
      processorSurchargeKobo: Math.max(0, args.amountKobo - expectedAmountKobo),
    };

    // Update deposit status
    await ctx.db.patch("deposits", deposit._id, { status: "completed", metadata: reconciliationMetadata });

    // Update user balance
    const user = await ctx.db.get("users", deposit.userId);
    if (user) {
      await ctx.db.patch("users", user._id, {
        balance: (user.balance || 0) + expectedAmountKobo,
      });

      // Log transaction
      await ctx.db.insert("transactions", {
        userId: user._id,
        amount: expectedAmountKobo,
        type: "deposit",
        status: "completed",
        description: `Paystack deposit: ${args.reference}`,
      });

      await ctx.db.insert("notifications", {
        userId: user._id,
        title: "Wallet Funded",
        message: `Deposit confirmed. ₦${(expectedAmountKobo / 100).toLocaleString()} added to wallet.`,
        type: "wallet_funded",
        link: "/dashboard",
        read: false,
      });
    }

    return null;
  },
});

export const reconcilePaystackPayment = internalMutation({
  args: {
    reference: v.string(),
    amountKobo: v.number(),
    customerEmail: v.optional(v.string()),
    source: PaystackSource,
    metadata: v.optional(v.any()),
  },
  returns: v.object({
    status: v.union(
      v.literal("credited"),
      v.literal("vault_funded"),
      v.literal("already_credited"),
      v.literal("unmatched"),
      v.literal("mismatch"),
    ),
    creditedUserId: v.optional(v.id("users")),
    depositId: v.optional(v.id("deposits")),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("paystack_reconciliations")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();

    if (existing) {
      return {
        status: "already_credited" as const,
        creditedUserId: existing.creditedUserId,
        depositId: existing.depositId,
      };
    }

    const deposit = await ctx.db
      .query("deposits")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();

    const now = Date.now();

    const expectedDomain = PAYSTACK_SECRET
      ? derivePaystackDomainFromSecret(PAYSTACK_SECRET)
      : null;
    const actualDomain =
      typeof args.metadata?.domain === "string" ? args.metadata.domain : undefined;
    if (expectedDomain && actualDomain && actualDomain !== expectedDomain) {
      await ctx.db.insert("paystack_unmatched", {
        reference: args.reference,
        amount: args.amountKobo,
        customerEmail: args.customerEmail,
        source: args.source,
        reason: "paystack_domain_mismatch",
        metadata: args.metadata,
        resolved: false,
        createdAt: now,
      });
      return { status: "unmatched" as const };
    }

    if (deposit) {
      const expectedAmountKobo = deposit.amount;
      const chargedAmountKobo = args.amountKobo;
      const reconciliationMetadata = {
        ...(args.metadata ?? {}),
        expectedAmountKobo,
        chargedAmountKobo,
        processorSurchargeKobo: Math.max(0, chargedAmountKobo - expectedAmountKobo),
      };

      if (chargedAmountKobo < expectedAmountKobo) {
        await ctx.db.insert("paystack_unmatched", {
          reference: args.reference,
          amount: chargedAmountKobo,
          customerEmail: args.customerEmail,
          source: args.source,
          reason: "amount_underpaid",
          metadata: reconciliationMetadata,
          resolved: false,
          createdAt: now,
        });
        return { status: "mismatch" as const };
      }

      const user = await ctx.db.get("users", deposit.userId);
      if (!user) {
        await ctx.db.insert("paystack_unmatched", {
          reference: args.reference,
          amount: args.amountKobo,
          customerEmail: args.customerEmail,
          source: args.source,
          reason: "deposit_user_missing",
          metadata: args.metadata,
          resolved: false,
          createdAt: now,
        });
        return { status: "unmatched" as const };
      }

      if (deposit.vaultId || deposit.kind === "vault_funding") {
        const vaultId = deposit.vaultId;
        if (!vaultId) {
          await ctx.db.insert("paystack_unmatched", {
            reference: args.reference,
            amount: args.amountKobo,
            customerEmail: args.customerEmail,
            source: args.source,
            reason: "vault_funding_missing_vaultId",
            metadata: args.metadata,
            resolved: false,
            createdAt: now,
          });
          return { status: "unmatched" as const };
        }

        const vault = await ctx.db.get("vaults", vaultId);
        if (!vault) {
          await ctx.db.insert("paystack_unmatched", {
            reference: args.reference,
            amount: args.amountKobo,
            customerEmail: args.customerEmail,
            source: args.source,
            reason: "vault_not_found",
            metadata: args.metadata,
            resolved: false,
            createdAt: now,
          });
          return { status: "unmatched" as const };
        }

        if (vault.userId !== deposit.userId) {
          await ctx.db.insert("paystack_unmatched", {
            reference: args.reference,
            amount: args.amountKobo,
            customerEmail: args.customerEmail,
            source: args.source,
            reason: "vault_owner_mismatch",
            metadata: args.metadata,
            resolved: false,
            createdAt: now,
          });
          return { status: "unmatched" as const };
        }

        if (deposit.status !== "completed") {
          await ctx.db.patch("deposits", deposit._id, {
            status: "completed",
            metadata: reconciliationMetadata,
            kind: "vault_funding",
            vaultId,
          });
        }

        if (vault.status === "awaiting_funding") {
          const startDate = Date.now();
          await ctx.db.patch("vaults", vault._id, {
            status: "active",
            startDate,
            endDate: startDate + vault.duration_weeks * 7 * 24 * 60 * 60 * 1000,
            fundedAt: startDate,
            paystack_reference: args.reference,
          });

          await ctx.db.insert("transactions", {
            userId: user._id,
            amount: -vault.amount,
            type: "stake",
            vaultId: vault._id,
            status: "completed",
            description: `Protocol funding: ${args.reference}`,
          });

          await ctx.db.insert("notifications", {
            userId: user._id,
            title: "Protocol Activated",
            message: `Funding confirmed. ₦${(vault.amount / 100).toLocaleString()} locked into protocol.`,
            type: "protocol_created",
            link: "/dashboard",
            read: false,
          });
        }

        await ctx.db.insert("paystack_reconciliations", {
          reference: args.reference,
          amount: chargedAmountKobo,
          customerEmail: args.customerEmail,
          creditedUserId: user._id,
          depositId: deposit._id,
          source: args.source,
          metadata: reconciliationMetadata,
          createdAt: now,
        });

        return { status: "vault_funded" as const, creditedUserId: user._id, depositId: deposit._id };
      }

      if (deposit.status !== "completed") {
        await ctx.db.patch("deposits", deposit._id, { status: "completed", metadata: reconciliationMetadata });
        await ctx.db.patch("users", user._id, {
          balance: (user.balance || 0) + expectedAmountKobo,
        });

        await ctx.db.insert("transactions", {
          userId: user._id,
          amount: expectedAmountKobo,
          type: "deposit",
          status: "completed",
          description: `Paystack deposit: ${args.reference}`,
        });

        await ctx.db.insert("notifications", {
          userId: user._id,
          title: "Wallet Funded",
          message: `Deposit confirmed. ₦${(expectedAmountKobo / 100).toLocaleString()} added to wallet.`,
          type: "wallet_funded",
          link: "/dashboard",
          read: false,
        });
      }

      const reconciliationId = await ctx.db.insert("paystack_reconciliations", {
        reference: args.reference,
        amount: chargedAmountKobo,
        customerEmail: args.customerEmail,
        creditedUserId: user._id,
        depositId: deposit._id,
        source: args.source,
        metadata: reconciliationMetadata,
        createdAt: now,
      });
      void reconciliationId;

      return { status: "credited" as const, creditedUserId: user._id, depositId: deposit._id };
    }

    if (!args.customerEmail) {
      await ctx.db.insert("paystack_unmatched", {
        reference: args.reference,
        amount: args.amountKobo,
        customerEmail: args.customerEmail,
        source: args.source,
        reason: "missing_customer_email",
        metadata: args.metadata,
        resolved: false,
        createdAt: now,
      });
      return { status: "unmatched" as const };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.customerEmail))
      .unique();

    if (!user) {
      await ctx.db.insert("paystack_unmatched", {
        reference: args.reference,
        amount: args.amountKobo,
        customerEmail: args.customerEmail,
        source: args.source,
        reason: "user_not_found_by_email",
        metadata: args.metadata,
        resolved: false,
        createdAt: now,
      });
      return { status: "unmatched" as const };
    }

    const depositId = await ctx.db.insert("deposits", {
      userId: user._id,
      amount: args.amountKobo,
      status: "completed",
      reference: args.reference,
      provider: "paystack",
      kind: "wallet_topup",
      metadata: args.metadata,
    });

    await ctx.db.patch("users", user._id, {
      balance: (user.balance || 0) + args.amountKobo,
    });

    await ctx.db.insert("transactions", {
      userId: user._id,
      amount: args.amountKobo,
      type: "deposit",
      status: "completed",
      description: `Paystack deposit: ${args.reference}`,
    });

    await ctx.db.insert("notifications", {
      userId: user._id,
      title: "Wallet Funded",
      message: `Deposit confirmed. ₦${(args.amountKobo / 100).toLocaleString()} added to wallet.`,
      type: "wallet_funded",
      link: "/dashboard",
      read: false,
    });

    await ctx.db.insert("paystack_reconciliations", {
      reference: args.reference,
      amount: args.amountKobo,
      customerEmail: args.customerEmail,
      creditedUserId: user._id,
      depositId,
      source: args.source,
      metadata: args.metadata,
      createdAt: now,
    });

    return { status: "credited" as const, creditedUserId: user._id, depositId };
  },
});

function normalizeResolution(raw: unknown) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;
  return s;
}

export const handlePaystackRefundProcessed = internalMutation({
  args: {
    refundId: v.optional(v.union(v.string(), v.number())),
    reference: v.string(),
    amountKobo: v.number(),
    customerEmail: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({ ok: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const key = `refund:${String(args.refundId ?? "") || args.reference}`;
    const existing = await ctx.db
      .query("paystack_reversals")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) return { ok: true, message: "Refund already processed." };

    const now = Date.now();
    const reconciliation = await ctx.db
      .query("paystack_reconciliations")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();

    const creditedUserId = reconciliation?.creditedUserId;
    const depositId = reconciliation?.depositId;
    if (!creditedUserId) {
      await ctx.db.insert("paystack_reversals", {
        key,
        reference: args.reference,
        amount: args.amountKobo,
        status: "processed",
        kind: "refund",
        customerEmail: args.customerEmail,
        creditedUserId: undefined,
        metadata: args.metadata,
        createdAt: now,
      });
      await ctx.db.insert("paystack_unmatched", {
        reference: args.reference,
        amount: args.amountKobo,
        customerEmail: args.customerEmail,
        source: "webhook",
        reason: "refund_processed_no_reconciliation",
        metadata: args.metadata,
        resolved: false,
        createdAt: now,
      });
      return { ok: true, message: "Refund recorded (no credited user found)." };
    }

    const holdKey = `dispute_hold:${args.reference}`;
    const hold = await ctx.db
      .query("paystack_reversals")
      .withIndex("by_key", (q) => q.eq("key", holdKey))
      .unique();

    const holdAmount = hold?.amount ?? 0;
    const delta = args.amountKobo - holdAmount;

    const user = await ctx.db.get("users", creditedUserId);
    if (user) {
      await ctx.db.patch("users", user._id, { balance: (user.balance || 0) - (hold ? delta : args.amountKobo) });
    }

    if (depositId) {
      const deposit = await ctx.db.get("deposits", depositId);
      if (deposit && deposit.status !== "failed") {
        await ctx.db.patch("deposits", depositId, {
          status: "failed",
          metadata: { ...(deposit.metadata ?? {}), refundedAt: now, refund: args.metadata },
        });
      }
    }

    if (user) {
      if (hold) {
        const recent = await ctx.db
          .query("transactions")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .order("desc")
          .take(100);
        const pendingHold = recent.find(
          (t: any) =>
            t.type === "refund" &&
            t.status === "pending" &&
            typeof t.description === "string" &&
            t.description.includes(args.reference),
        );
        if (pendingHold) {
          await ctx.db.patch("transactions", pendingHold._id, {
            status: "completed",
            description: `Paystack refund processed: ${args.reference}`,
          });
        }

        if (delta !== 0) {
          await ctx.db.insert("transactions", {
            userId: user._id,
            amount: -delta,
            type: "refund",
            status: "completed",
            description: `Paystack refund adjustment: ${args.reference}`,
          });
        }
      } else {
        await ctx.db.insert("transactions", {
          userId: user._id,
          amount: -args.amountKobo,
          type: "refund",
          status: "completed",
          description: `Paystack refund processed: ${args.reference}`,
        });
      }

      await ctx.db.insert("notifications", {
        userId: user._id,
        title: "Payment Reversed",
        message: `A Paystack refund was processed for ₦${(args.amountKobo / 100).toLocaleString()}. Your wallet has been updated accordingly.`,
        type: "wallet_withdrawal",
        link: "/dashboard",
        read: false,
      });
    }

    if (hold && hold.status !== "processed") {
      await ctx.db.patch("paystack_reversals", hold._id, { status: "processed", metadata: args.metadata });
    }

    await ctx.db.insert("paystack_reversals", {
      key,
      reference: args.reference,
      amount: args.amountKobo,
      status: "processed",
      kind: "refund",
      customerEmail: args.customerEmail,
      creditedUserId,
      metadata: args.metadata,
      createdAt: now,
    });

    return { ok: true, message: "Refund applied." };
  },
});

export const recordPaystackRefundFailed = internalMutation({
  args: {
    refundId: v.optional(v.union(v.string(), v.number())),
    reference: v.string(),
    amountKobo: v.optional(v.number()),
    customerEmail: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({ ok: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const key = `refund_failed:${String(args.refundId ?? "") || args.reference}`;
    const existing = await ctx.db
      .query("paystack_reversals")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) return { ok: true, message: "Refund failure already recorded." };

    const now = Date.now();
    await ctx.db.insert("paystack_reversals", {
      key,
      reference: args.reference,
      amount: args.amountKobo ?? 0,
      status: "processed",
      kind: "refund",
      customerEmail: args.customerEmail,
      creditedUserId: undefined,
      metadata: { failed: true, ...(args.metadata ?? {}) },
      createdAt: now,
    });

    await ctx.db.insert("paystack_unmatched", {
      reference: args.reference,
      amount: args.amountKobo ?? 0,
      customerEmail: args.customerEmail,
      source: "webhook",
      reason: "refund_failed",
      metadata: args.metadata,
      resolved: false,
      createdAt: now,
    });

    return { ok: true, message: "Refund failure recorded." };
  },
});

export const handlePaystackDisputeCreate = internalMutation({
  args: {
    disputeId: v.optional(v.union(v.string(), v.number())),
    reference: v.string(),
    amountKobo: v.number(),
    customerEmail: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({ ok: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const key = `dispute_hold:${args.reference}`;
    const existing = await ctx.db
      .query("paystack_reversals")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) return { ok: true, message: "Dispute hold already exists." };

    const reconciliation = await ctx.db
      .query("paystack_reconciliations")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();

    const creditedUserId = reconciliation?.creditedUserId;
    const now = Date.now();

    await ctx.db.insert("paystack_reversals", {
      key,
      reference: args.reference,
      amount: args.amountKobo,
      status: "pending",
      kind: "dispute_hold",
      customerEmail: args.customerEmail,
      creditedUserId,
      metadata: { disputeId: args.disputeId, ...(args.metadata ?? {}) },
      createdAt: now,
    });

    if (!creditedUserId) {
      await ctx.db.insert("paystack_unmatched", {
        reference: args.reference,
        amount: args.amountKobo,
        customerEmail: args.customerEmail,
        source: "webhook",
        reason: "dispute_create_no_reconciliation",
        metadata: args.metadata,
        resolved: false,
        createdAt: now,
      });
      return { ok: true, message: "Dispute recorded (no credited user found)." };
    }

    const user = await ctx.db.get("users", creditedUserId);
    if (!user) return { ok: true, message: "Dispute recorded (user missing)." };

    await ctx.db.patch("users", user._id, { balance: (user.balance || 0) - args.amountKobo });
    await ctx.db.insert("transactions", {
      userId: user._id,
      amount: -args.amountKobo,
      type: "refund",
      status: "pending",
      description: `Paystack dispute opened (funds held): ${args.reference}`,
    });
    await ctx.db.insert("notifications", {
      userId: user._id,
      title: "Dispute Opened",
      message: `A Paystack dispute was opened. ₦${(args.amountKobo / 100).toLocaleString()} has been held from your wallet pending resolution.`,
      type: "wallet_withdrawal",
      link: "/dashboard",
      read: false,
    });

    return { ok: true, message: "Dispute hold applied." };
  },
});

export const handlePaystackDisputeResolve = internalMutation({
  args: {
    disputeId: v.optional(v.union(v.string(), v.number())),
    reference: v.string(),
    resolution: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({ ok: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const key = `dispute_resolve:${String(args.disputeId ?? "") || args.reference}`;
    const existing = await ctx.db
      .query("paystack_reversals")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) return { ok: true, message: "Dispute resolution already recorded." };

    const holdKey = `dispute_hold:${args.reference}`;
    const hold = await ctx.db
      .query("paystack_reversals")
      .withIndex("by_key", (q) => q.eq("key", holdKey))
      .unique();

    const now = Date.now();
    const normalized = normalizeResolution(args.resolution);
    const merchantWon =
      normalized === "merchant" ||
      normalized === "won" ||
      normalized === "win" ||
      normalized === "resolved_merchant" ||
      normalized === "merchant_won";

    if (hold && hold.creditedUserId && merchantWon) {
      const user = await ctx.db.get("users", hold.creditedUserId);
      if (user) {
        await ctx.db.patch("users", user._id, { balance: (user.balance || 0) + hold.amount });
        await ctx.db.insert("transactions", {
          userId: user._id,
          amount: hold.amount,
          type: "refund",
          status: "completed",
          description: `Paystack dispute resolved (hold released): ${args.reference}`,
        });
        await ctx.db.insert("notifications", {
          userId: user._id,
          title: "Dispute Resolved",
          message: `A Paystack dispute was resolved in your favor. ₦${(hold.amount / 100).toLocaleString()} has been released back to your wallet.`,
          type: "wallet_funded",
          link: "/dashboard",
          read: false,
        });
      }
    }
    if (hold && hold.status !== "processed") {
      await ctx.db.patch("paystack_reversals", hold._id, {
        status: "processed",
        metadata: { resolution: args.resolution, ...(args.metadata ?? {}) },
      });
    }

    await ctx.db.insert("paystack_reversals", {
      key,
      reference: args.reference,
      amount: hold?.amount ?? 0,
      status: "processed",
      kind: "dispute_resolve",
      customerEmail: hold?.customerEmail,
      creditedUserId: hold?.creditedUserId,
      metadata: { resolution: args.resolution, ...(args.metadata ?? {}) },
      createdAt: now,
    });

    return { ok: true, message: "Dispute resolution recorded." };
  },
});

export const getPaystackReconciliationByReference = internalQuery({
  args: { reference: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      reference: v.string(),
      amount: v.number(),
      customerEmail: v.optional(v.string()),
      creditedUserId: v.optional(v.id("users")),
      depositId: v.optional(v.id("deposits")),
      source: PaystackSource,
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("paystack_reconciliations")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();
    if (!row) return null;
    return {
      reference: row.reference,
      amount: row.amount,
      customerEmail: row.customerEmail,
      creditedUserId: row.creditedUserId,
      depositId: row.depositId,
      source: row.source,
      createdAt: row.createdAt,
    };
  },
});

export const getPaystackUnmatchedByReference = internalQuery({
  args: { reference: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("paystack_unmatched"),
      reference: v.string(),
      amount: v.number(),
      customerEmail: v.optional(v.string()),
      reason: v.string(),
      resolved: v.boolean(),
      createdAt: v.number(),
      source: PaystackSource,
      metadata: v.optional(v.any()),
    }),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("paystack_unmatched")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();
    if (!row) return null;
    return {
      _id: row._id,
      reference: row.reference,
      amount: row.amount,
      customerEmail: row.customerEmail,
      reason: row.reason,
      resolved: row.resolved,
      createdAt: row.createdAt,
      source: row.source,
      metadata: row.metadata,
    };
  },
});

export const listPaystackReconciliationsByCustomerEmail = internalQuery({
  args: { customerEmail: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      reference: v.string(),
      amount: v.number(),
      customerEmail: v.optional(v.string()),
      creditedUserId: v.optional(v.id("users")),
      depositId: v.optional(v.id("deposits")),
      source: PaystackSource,
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const rows = await ctx.db
      .query("paystack_reconciliations")
      .withIndex("by_customer_email", (q) => q.eq("customerEmail", args.customerEmail))
      .order("desc")
      .take(limit);
    return rows.map((r) => ({
      reference: r.reference,
      amount: r.amount,
      customerEmail: r.customerEmail,
      creditedUserId: r.creditedUserId,
      depositId: r.depositId,
      source: r.source,
      createdAt: r.createdAt,
    }));
  },
});

export const listPaystackUnmatchedByCustomerEmail = internalQuery({
  args: { customerEmail: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("paystack_unmatched"),
      reference: v.string(),
      amount: v.number(),
      customerEmail: v.optional(v.string()),
      reason: v.string(),
      resolved: v.boolean(),
      createdAt: v.number(),
      source: PaystackSource,
    }),
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const rows = await ctx.db
      .query("paystack_unmatched")
      .withIndex("by_customer_email", (q) => q.eq("customerEmail", args.customerEmail))
      .order("desc")
      .take(limit);
    return rows.map((r) => ({
      _id: r._id,
      reference: r.reference,
      amount: r.amount,
      customerEmail: r.customerEmail,
      reason: r.reason,
      resolved: r.resolved,
      createdAt: r.createdAt,
      source: r.source,
    }));
  },
});

export const getDepositByReference = internalQuery({
  args: { reference: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("deposits"),
      userId: v.id("users"),
      amount: v.number(),
      status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
      reference: v.string(),
      provider: v.union(v.literal("paystack"), v.literal("flutterwave")),
      _creationTime: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("deposits")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .order("desc")
      .take(1);
    const row = rows[0];
    if (!row) return null;
    return {
      _id: row._id,
      userId: row.userId,
      amount: row.amount,
      status: row.status,
      reference: row.reference,
      provider: row.provider,
      _creationTime: row._creationTime,
    };
  },
});

export const listUnresolvedPaystackUnmatched = internalQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("paystack_unmatched"),
      reference: v.string(),
      amount: v.number(),
      customerEmail: v.optional(v.string()),
      metadata: v.optional(v.any()),
    }),
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 25;
    const rows = await ctx.db
      .query("paystack_unmatched")
      .withIndex("by_resolved", (q) => q.eq("resolved", false))
      .order("desc")
      .take(limit);
    return rows.map((r) => ({
      _id: r._id,
      reference: r.reference,
      amount: r.amount,
      customerEmail: r.customerEmail,
      metadata: r.metadata,
    }));
  },
});

export const markPaystackUnmatchedResolved = internalMutation({
  args: { unmatchedId: v.id("paystack_unmatched") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("paystack_unmatched", args.unmatchedId, { resolved: true });
    return null;
  },
});

export const retryUnmatchedPaystackPayments = internalAction({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    processed: v.number(),
    credited: v.number(),
    alreadyCredited: v.number(),
    stillUnmatched: v.number(),
    mismatched: v.number(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    processed: number;
    credited: number;
    alreadyCredited: number;
    stillUnmatched: number;
    mismatched: number;
  }> => {
    try {
      const limit = args.limit ?? 25;
      const rows = (await ctx.runQuery(internal.payments.listUnresolvedPaystackUnmatched, { limit })) as Array<{
      _id: any;
      reference: string;
      amount: number;
      customerEmail?: string;
      metadata?: any;
      }>;

      let credited = 0;
      let alreadyCredited = 0;
      let stillUnmatched = 0;
      let mismatched = 0;

      for (const row of rows) {
        const result = (await ctx.runMutation(internal.payments.reconcilePaystackPayment, {
          reference: row.reference,
          amountKobo: row.amount,
          customerEmail: row.customerEmail,
          source: "cron",
          metadata: row.metadata,
        })) as { status: "credited" | "already_credited" | "unmatched" | "mismatch" };

        if (result.status === "credited") {
          credited += 1;
          await ctx.runMutation(internal.payments.markPaystackUnmatchedResolved, { unmatchedId: row._id });
        } else if (result.status === "already_credited") {
          alreadyCredited += 1;
          await ctx.runMutation(internal.payments.markPaystackUnmatchedResolved, { unmatchedId: row._id });
        } else if (result.status === "mismatch") {
          mismatched += 1;
        } else {
          stillUnmatched += 1;
        }
      }

      return {
        processed: rows.length,
        credited,
        alreadyCredited,
        stillUnmatched,
        mismatched,
      };
    } catch (err) {
      await captureToSentry({
        message: "cron retryUnmatchedPaystackPayments failed",
        tags: { area: "cron", job: "retryUnmatchedPaystackPayments" },
        extra: { error: String(err) },
      });
      throw err;
    }
  },
});

export const getDepositStatus = query({
  args: { reference: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      reference: v.string(),
      status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
      amount: v.number(),
      _creationTime: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const deposit = await ctx.db
      .query("deposits")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();

    if (!deposit) return null;
    if (deposit.userId !== userId) return null;

    // #region debug-point get-deposit-status
    await captureToSentry({
      message: "get-deposit-status",
      level: "info",
      tags: { area: "payments", step: "get-deposit-status" },
      extra: {
        reference: args.reference,
        userId: String(userId),
        status: deposit.status,
        amount: deposit.amount,
        kind: deposit.kind,
        vaultId: deposit.vaultId ? String(deposit.vaultId) : null,
      },
    });
    // #endregion debug-point get-deposit-status

    return {
      reference: deposit.reference,
      status: deposit.status,
      amount: deposit.amount,
      _creationTime: deposit._creationTime,
    };
  },
});

export const requestWithdrawal = mutation({
  args: {
    amount: v.number(),
    accountNumber: v.string(),
    bankCode: v.string(),
    bankName: v.string(),
    accountName: v.string(),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get("users", userId);
    if (!user) throw new Error("User not found");
    if (!user.emailVerificationTime) throw new Error("Email verification required.");

    const amount = Math.floor(args.amount);
    const accountNumber = args.accountNumber.trim();
    const bankCode = args.bankCode.trim();
    const bankName = args.bankName.trim();
    const accountName = args.accountName.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, message: "Enter a valid withdrawal amount." };
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      return { success: false, message: "Enter a valid 10-digit account number." };
    }
    if (!bankCode || !bankName || !accountName) {
      return { success: false, message: "Resolve your bank account details before requesting a withdrawal." };
    }

    const rate = await ctx.runMutation((internal as any).rateLimit.consume, {
      key: `user:${userId}:request_withdrawal`,
      limit: 3,
      windowMs: 6 * 60 * 60_000,
    });
    if (!rate.allowed) {
      return {
        success: false,
        message: "Too many withdrawal requests were submitted recently. Please wait before trying again.",
      };
    }

    const existingWithdrawal = await ctx.db
      .query("withdrawals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (existingWithdrawal.some((row) => row.status === "pending" || row.status === "processing" || row.status === "approved")) {
      return {
        success: false,
        message: "You already have a withdrawal in progress. Wait for it to complete before requesting another one.",
      };
    }

    if (user.balance < amount) {
      return { success: false, message: "Insufficient capital for withdrawal." };
    }

    // Deduct balance immediately (Escrow)
    await ctx.db.patch("users", userId, { balance: user.balance - amount });

    const withdrawalId = await ctx.db.insert("withdrawals", {
      userId,
      amount,
      status: "pending",
      requested_at: Date.now(),
      bank_details: {
        account_number: accountNumber,
        bank_code: bankCode,
        bank_name: bankName,
        account_name: accountName,
      },
    });

    await ctx.db.insert("transactions", {
      userId,
      amount: -amount,
      type: "wallet_withdrawal",
      withdrawalId,
      status: "pending",
      description: `Withdrawal request to ${formatMaskedWithdrawalDestination(bankName, accountNumber)}`,
    });

    await ctx.db.insert("notifications", {
      userId,
      title: "Withdrawal Requested",
      message: `Extraction queued. ₦${(amount / 100).toLocaleString()} moved to escrow.`,
      type: "wallet_withdrawal",
      link: "/dashboard",
      read: false,
    });

    return { 
        success: true, 
        message: "Request logged. Capital held in escrow. Disbursement expected in 24-48 hours." 
    };
  },
});

export const getWithdrawalRequests = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("withdrawals"),
      _creationTime: v.number(),
      amount: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("completed"),
        v.literal("failed"),
      ),
      requested_at: v.number(),
      processed_at: v.optional(v.number()),
      bank_details: v.optional(
        v.object({
          account_number: v.string(),
          bank_code: v.string(),
          bank_name: v.string(),
          account_name: v.string(),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const limit = Math.max(1, Math.min(args.limit ?? 10, 20));
    const rows = await ctx.db
      .query("withdrawals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
    return rows.map((row) => ({
      ...row,
      bank_details: row.bank_details
        ? {
            ...row.bank_details,
            account_number: maskAccountNumber(row.bank_details.account_number),
          }
        : row.bank_details,
    }));
  },
});

export const getTransactions = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const getTransactionsPage = query({
  args: { cursor: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.object({
    page: v.array(v.any()),
    isDone: v.boolean(),
    continueCursor: v.union(v.null(), v.string()),
  }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return { page: [], isDone: true, continueCursor: null };

    const limit = Math.max(5, Math.min(args.limit ?? 20, 50));
    const res = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate({ cursor: args.cursor ?? null, numItems: limit });

    return {
      page: res.page,
      isDone: res.isDone,
      continueCursor: res.continueCursor,
    };
  },
});

export const getBalance = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return 0;
    const user = await ctx.db.get("users", userId);
    return user?.balance || 0;
  },
});

const walletOverviewValidator = v.object({
  availableBalance: v.number(),
  lockedFunds: v.number(),
  awaitingFunding: v.number(),
  pendingDeposits: v.number(),
  pendingWithdrawals: v.number(),
  pendingMovementTotal: v.number(),
  totalDeposited: v.number(),
  totalWithdrawn: v.number(),
  totalRefunded: v.number(),
  totalStaked: v.number(),
  creditsBalance: v.number(),
  shieldsBalance: v.number(),
  activeProtocols: v.number(),
  pendingDepositCount: v.number(),
  pendingWithdrawalCount: v.number(),
});

const walletActivityEntryValidator = v.object({
  entryId: v.string(),
  source: v.string(),
  category: v.string(),
  valueKind: v.union(v.literal("money"), v.literal("credits")),
  amount: v.number(),
  status: v.string(),
  title: v.string(),
  subtitle: v.optional(v.string()),
  reference: v.optional(v.string()),
  createdAt: v.number(),
  vaultId: v.optional(v.id("vaults")),
});

export const getWalletOverview = query({
  args: {},
  returns: walletOverviewValidator,
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return {
        availableBalance: 0,
        lockedFunds: 0,
        awaitingFunding: 0,
        pendingDeposits: 0,
        pendingWithdrawals: 0,
        pendingMovementTotal: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
        totalRefunded: 0,
        totalStaked: 0,
        creditsBalance: 0,
        shieldsBalance: 0,
        activeProtocols: 0,
        pendingDepositCount: 0,
        pendingWithdrawalCount: 0,
      };
    }

    const [user, vaults, deposits, withdrawals, transactions] = await Promise.all([
      ctx.db.get("users", userId),
      ctx.db.query("vaults").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("deposits").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("withdrawals").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("transactions").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    ]);

    const activeVaults = vaults.filter((vault) => vault.status === "active");
    const lockedFunds = activeVaults.reduce(
      (sum, vault) => sum + Math.max(0, vault.amount - (vault.penaltyAccrued ?? 0)),
      0,
    );
    const awaitingFunding = vaults
      .filter((vault) => vault.status === "awaiting_funding")
      .reduce((sum, vault) => sum + vault.amount, 0);

    const walletDeposits = deposits.filter((deposit) => deposit.kind !== "vault_funding");
    const pendingDeposits = walletDeposits
      .filter((deposit) => deposit.status === "pending")
      .reduce((sum, deposit) => sum + deposit.amount, 0);
    const pendingWithdrawals = withdrawals
      .filter((withdrawal) =>
        withdrawal.status === "pending" ||
        withdrawal.status === "processing" ||
        withdrawal.status === "approved",
      )
      .reduce((sum, withdrawal) => sum + withdrawal.amount, 0);

    return {
      availableBalance: user?.balance ?? 0,
      lockedFunds,
      awaitingFunding,
      pendingDeposits,
      pendingWithdrawals,
      pendingMovementTotal: pendingDeposits + pendingWithdrawals,
      totalDeposited: walletDeposits
        .filter((deposit) => deposit.status === "completed")
        .reduce((sum, deposit) => sum + deposit.amount, 0),
      totalWithdrawn: withdrawals
        .filter((withdrawal) => withdrawal.status === "completed")
        .reduce((sum, withdrawal) => sum + withdrawal.amount, 0),
      totalRefunded: transactions
        .filter((tx) => tx.type === "refund" && tx.status === "completed" && tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0),
      totalStaked: transactions
        .filter((tx) => tx.type === "stake")
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
      creditsBalance: user?.credits ?? 0,
      shieldsBalance: user?.shields ?? 0,
      activeProtocols: activeVaults.length,
      pendingDepositCount: walletDeposits.filter((deposit) => deposit.status === "pending").length,
      pendingWithdrawalCount: withdrawals.filter((withdrawal) =>
        withdrawal.status === "pending" ||
        withdrawal.status === "processing" ||
        withdrawal.status === "approved",
      ).length,
    };
  },
});

export const getWalletActivity = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(walletActivityEntryValidator),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const limit = Math.max(20, Math.min(args.limit ?? 40, 100));
    const [deposits, withdrawals, transactions, rewardDistributions] = await Promise.all([
      ctx.db
        .query("deposits")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(limit),
      ctx.db
        .query("withdrawals")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(limit),
      ctx.db
        .query("transactions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(limit * 2),
      ctx.db
        .query("weekly_reward_distributions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(limit),
    ]);

    const activity = [
      ...deposits
        .filter((deposit) => deposit.kind !== "vault_funding")
        .map((deposit) => ({
          entryId: `deposit:${deposit._id}`,
          source: "deposit",
          category: deposit.status === "pending" ? "pending_deposit" : "deposit",
          valueKind: "money" as const,
          amount: deposit.amount,
          status: deposit.status,
          title: deposit.status === "completed" ? "Wallet funded" : "Wallet funding pending",
          subtitle: `Paystack receipt ${deposit.reference}`,
          reference: deposit.reference,
          createdAt: deposit._creationTime,
        })),
      ...withdrawals.map((withdrawal) => ({
        entryId: `withdrawal:${withdrawal._id}`,
        source: "withdrawal",
        category: "withdrawal",
        valueKind: "money" as const,
        amount: -withdrawal.amount,
        status: withdrawal.status,
        title:
          withdrawal.status === "completed"
            ? "Withdrawal completed"
            : withdrawal.status === "failed" || withdrawal.status === "rejected"
              ? "Withdrawal failed"
              : "Withdrawal in progress",
        subtitle:
          withdrawal.bank_details?.account_number && withdrawal.bank_details?.bank_name
            ? formatMaskedWithdrawalDestination(
                withdrawal.bank_details.bank_name,
                withdrawal.bank_details.account_number,
              )
            : undefined,
        reference: withdrawal.paystack_reference,
        createdAt: withdrawal.processed_at ?? withdrawal.requested_at,
      })),
      ...transactions
        .filter((tx) => tx.type !== "deposit" && tx.type !== "platform_fee")
        .map((tx) => ({
          entryId: `transaction:${tx._id}`,
          source: "transaction",
          category: tx.type,
          valueKind: "money" as const,
          amount: tx.amount,
          status: tx.status,
          title:
            tx.type === "stake"
              ? "Stake locked"
              : tx.type === "penalty"
                ? "Penalty applied"
                : tx.type === "refund"
                  ? tx.amount >= 0
                    ? "Refund credited"
                    : "Refund hold"
                  : tx.type === "dividend"
                    ? "Reward distributed"
                    : "Wallet activity",
          subtitle: tx.description,
          reference: tx.description?.includes(": ")
            ? tx.description.split(": ")[tx.description.split(": ").length - 1]
            : undefined,
          createdAt: tx._creationTime,
          vaultId: tx.vaultId,
        })),
      ...rewardDistributions.map((reward) => ({
        entryId: `reward:${reward._id}`,
        source: "reward",
        category: "reward_distribution",
        valueKind: "credits" as const,
        amount: reward.credits,
        status: "completed",
        title: "Protocol credits distributed",
        subtitle: `Week ${reward.week_number} • Pool ${reward.pool_credits.toLocaleString()} credits`,
        reference: `WK-${reward.week_number}`,
        createdAt: reward.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    return activity;
  },
});
