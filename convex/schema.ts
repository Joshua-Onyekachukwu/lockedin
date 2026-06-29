import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    profileImageId: v.optional(v.id("_storage")),
    phone: v.optional(v.string()),
    city: v.optional(v.string()),
    bio: v.optional(v.string()),
    bvn_verified: v.boolean(),
    bvn_last4: v.optional(v.string()),
    is_discoverable: v.boolean(),
    streak_count: v.number(),
    goals_completed: v.number(),
    integrityScore: v.number(),
    tier: v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold")),
    balance: v.number(), // In Kobo/smallest unit
    witness_discoverable: v.optional(v.boolean()),
    shields: v.number(), // Protection against breaches
    credits: v.number(), // Non-monetary protocol currency
    isAdmin: v.optional(v.boolean()),
  }).index("email", ["email"])
    .index("by_integrity", ["integrityScore"])
    .index("by_is_discoverable", ["is_discoverable"])
    .index("by_discoverable_integrity", ["is_discoverable", "integrityScore"]),

  vaults: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    currency: v.string(), // e.g. "NGN"
    duration_weeks: v.number(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    fundedAt: v.optional(v.number()),
    penaltyAccrued: v.optional(v.number()),
    painTier: v.union(
      v.literal("deterrence"),   // Tier 1: 2%
      v.literal("enforcement"), // Tier 2: 5%
      v.literal("liquidation")  // Tier 3: 10%
    ),
    status: v.union(
      v.literal("awaiting_funding"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    paystack_reference: v.optional(v.string()),
    interest_earned: v.number(),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"]),

  goals: defineTable({
    vaultId: v.id("vaults"),
    userId: v.id("users"),
    category: v.union(
      v.literal("fitness"),
      v.literal("learning"),
      v.literal("financial"),
      v.literal("habit"),
      v.literal("professional")
    ),
    title: v.string(),
    description: v.string(),
    frequency_type: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))),
    target_count: v.optional(v.number()), // e.g., 3 (times per week)
    checkin_day: v.optional(v.string()), // Legacy field
  }).index("by_vault", ["vaultId"]).index("by_user", ["userId"]),

  goal_logs: defineTable({
    goalId: v.id("goals"),
    week_number: v.number(),
    date: v.string(), // YYYY-MM-DD
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("missed"), v.literal("disputed")),
    proofImageId: v.optional(v.id("_storage")),
    proofImageIds: v.optional(v.array(v.id("_storage"))),
    note: v.optional(v.string()),
    approvals: v.optional(v.array(v.id("users"))),
    rejections: v.optional(v.array(v.id("users"))),
    verificationReports: v.optional(
      v.array(
        v.object({
          reviewerId: v.id("users"),
          verdict: v.union(v.literal("approved"), v.literal("rejected")),
          comment: v.string(),
          createdAt: v.number(),
          actorRole: v.union(v.literal("witness"), v.literal("owner")),
        }),
      ),
    ),
    confirmed_by: v.optional(v.id("users")), // accountability partner ID
    confirmed_at: v.optional(v.number()),
  }).index("by_goal", ["goalId"])
    .index("by_goal_and_date", ["goalId", "date"])
    .index("by_confirmed_by", ["confirmed_by"]),

  accountability_partners: defineTable({
    goalId: v.id("goals"),
    vaultId: v.id("vaults"),
    requesterId: v.id("users"),
    partnerId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("rejected"), v.literal("ended")),
    requester_accepted: v.boolean(),
    partner_accepted: v.boolean(),
  }).index("by_vault", ["vaultId"])
    .index("by_vault_and_status", ["vaultId", "status"])
    .index("by_vault_and_partner", ["vaultId", "partnerId"])
    .index("by_partner", ["partnerId"])
    .index("by_partner_and_status", ["partnerId", "status"])
    .index("by_requester", ["requesterId"])
    .index("by_requester_and_status", ["requesterId", "status"]),

  reward_pool: defineTable({
    week_number: v.number(),
    amount: v.number(),
    source_vault_id: v.optional(v.id("vaults")),
    type: v.union(v.literal("penalty"), v.literal("distribution")),
  }).index("by_week_and_type", ["week_number", "type"]),

  weekly_reward_distributions: defineTable({
    week_number: v.number(),
    userId: v.id("users"),
    credits: v.number(),
    points: v.number(),
    pool_credits: v.number(),
    createdAt: v.number(),
  })
    .index("by_week", ["week_number"])
    .index("by_user", ["userId"])
    .index("by_week_and_user", ["week_number", "userId"]),

  penalty_events: defineTable({
    userId: v.id("users"),
    vaultId: v.id("vaults"),
    goalId: v.id("goals"),
    week_number: v.number(),
    frequency_type: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    period_key: v.string(),
    period_start: v.number(),
    period_end: v.number(),
    due_at: v.number(),
    target_count: v.number(),
    completed_count: v.number(),
    shield_used: v.boolean(),
    penalty_percent: v.number(),
    penalty_amount: v.number(),
    createdAt: v.number(),
  })
    .index("by_vault", ["vaultId"])
    .index("by_user", ["userId"])
    .index("by_week", ["week_number"])
    .index("by_goal_and_period", ["goalId", "period_key"]),

  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("partner_request"),
      v.literal("checkin_due"),
      v.literal("verification_needed"),
      v.literal("streak_alert"),
      v.literal("wallet_funded"),
      v.literal("wallet_withdrawal"),
      v.literal("protocol_created"),
      v.literal("profile_updated")
    ),
    link: v.optional(v.string()),
    read: v.boolean(),
  }).index("by_user", ["userId"]),

  transactions: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    type: v.union(
      v.literal("deposit"), 
      v.literal("stake"), 
      v.literal("penalty"), 
      v.literal("refund"), 
      v.literal("dividend"), 
      v.literal("platform_fee"),
      v.literal("wallet_withdrawal")
    ),
    vaultId: v.optional(v.id("vaults")),
    withdrawalId: v.optional(v.id("withdrawals")),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    description: v.optional(v.string()),
    metadata: v.optional(v.object({
      pool_size: v.optional(v.number()),
      eligible_citizens: v.optional(v.number()),
      multiplier: v.optional(v.number()),
      reward_type: v.optional(v.string()),
    })),
  }).index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_type_and_status", ["type", "status"])
    .index("by_withdrawal", ["withdrawalId"]),

  system_stats: defineTable({
    total_revenue: v.number(), // Total fees collected (Kobo)
    total_distributed: v.number(), // Total rewards shared (Kobo)
    active_users: v.number(),
    total_penalties_collected: v.optional(v.number()),
    total_reward_pool_contributed: v.optional(v.number()),
  }),

  waitlist: defineTable({
    email: v.string(),
  }).index("by_email", ["email"]),

  deposits: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    reference: v.string(), // Paystack/Flutterwave reference
    provider: v.union(v.literal("paystack"), v.literal("flutterwave")),
    vaultId: v.optional(v.id("vaults")),
    kind: v.optional(v.union(v.literal("wallet_topup"), v.literal("vault_funding"))),
    metadata: v.optional(v.any()),
  }).index("by_reference", ["reference"])
    .index("by_user", ["userId"])
    .index("by_vault", ["vaultId"]),

  paystack_reconciliations: defineTable({
    reference: v.string(),
    amount: v.number(),
    customerEmail: v.optional(v.string()),
    creditedUserId: v.optional(v.id("users")),
    depositId: v.optional(v.id("deposits")),
    source: v.union(
      v.literal("verify"),
      v.literal("webhook"),
      v.literal("admin"),
      v.literal("cron"),
    ),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_reference", ["reference"])
    .index("by_customer_email", ["customerEmail"])
    .index("by_credited_user", ["creditedUserId"]),

  paystack_unmatched: defineTable({
    reference: v.string(),
    amount: v.number(),
    customerEmail: v.optional(v.string()),
    source: v.union(
      v.literal("verify"),
      v.literal("webhook"),
      v.literal("admin"),
      v.literal("cron"),
    ),
    reason: v.string(),
    metadata: v.optional(v.any()),
    resolved: v.boolean(),
    createdAt: v.number(),
  }).index("by_reference", ["reference"])
    .index("by_customer_email", ["customerEmail"])
    .index("by_resolved", ["resolved"]),

  paystack_reversals: defineTable({
    key: v.string(),
    reference: v.string(),
    amount: v.number(),
    status: v.union(v.literal("pending"), v.literal("processed")),
    kind: v.union(v.literal("refund"), v.literal("dispute_hold"), v.literal("dispute_resolve")),
    customerEmail: v.optional(v.string()),
    creditedUserId: v.optional(v.id("users")),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_key", ["key"])
    .index("by_reference", ["reference"])
    .index("by_credited_user", ["creditedUserId"]),

  email_verification_tokens: defineTable({
    userId: v.id("users"),
    tokenHash: v.string(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_token_hash", ["tokenHash"])
    .index("by_expires", ["expiresAt"]),

  withdrawals: defineTable({
    userId: v.id("users"),
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
    bank_details: v.optional(v.object({
        account_number: v.string(),
        bank_code: v.string(),
        bank_name: v.string(),
        account_name: v.string(),
    })),
    paystack_reference: v.optional(v.string()),
    paystack_transfer_code: v.optional(v.string()),
    paystack_transfer_id: v.optional(v.number()),
    paystack_status: v.optional(v.string()),
    metadata: v.optional(v.any()),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_paystack_reference", ["paystack_reference"]),

  admin_audit: defineTable({
    adminUserId: v.id("users"),
    action: v.string(),
    message: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  }).index("by_admin", ["adminUserId"]),

  rate_limit_buckets: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
    updatedAt: v.number(),
  })
    .index("by_key_and_window_start", ["key", "windowStart"])
    .index("by_updated_at", ["updatedAt"]),

  seed_runs: defineTable({
    domain: v.string(),
    startedAt: v.number(),
    dryRun: v.boolean(),
    requestedLimit: v.optional(v.number()),
    usersDeleted: v.number(),
    vaultsDeleted: v.number(),
    goalsDeleted: v.number(),
    goalLogsDeleted: v.number(),
    partnersDeleted: v.number(),
    transactionsDeleted: v.number(),
    notificationsDeleted: v.number(),
    depositsDeleted: v.number(),
    withdrawalsDeleted: v.number(),
    verificationTokensDeleted: v.number(),
  }).index("by_domain", ["domain"])
    .index("by_started_at", ["startedAt"]),

  system_audit: defineTable({
    action: v.string(),
    message: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_created_at", ["createdAt"]),
});
