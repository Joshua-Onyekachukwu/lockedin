import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    phone: v.optional(v.string()),
    city: v.optional(v.string()),
    bio: v.optional(v.string()),
    bvn_verified: v.boolean(),
    is_discoverable: v.boolean(),
    streak_count: v.number(),
    goals_completed: v.number(),
    integrityScore: v.number(),
    tier: v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold")),
    balance: v.number(), // In Kobo/smallest unit
    witness_discoverable: v.optional(v.boolean()),
  }).index("by_email", ["email"])
    .index("by_integrity", ["integrityScore"]),

  vaults: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    currency: v.string(), // e.g. "NGN"
    duration_weeks: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    painTier: v.union(
      v.literal("chill"),   // Tier 1
      v.literal("serious"), // Tier 2
      v.literal("lockedin") // Tier 3
    ),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("failed")),
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
    checkin_day: v.string(), // "monday", "tuesday", etc. or "daily"
  }).index("by_vault", ["vaultId"]).index("by_user", ["userId"]),

  goal_logs: defineTable({
    goalId: v.id("goals"),
    week_number: v.number(),
    date: v.string(), // YYYY-MM-DD
    status: v.union(v.literal("completed"), v.literal("missed"), v.literal("disputed")),
    proofImageId: v.optional(v.id("_storage")),
    note: v.optional(v.string()),
    confirmed_by: v.optional(v.id("users")), // accountability partner ID
    confirmed_at: v.optional(v.number()),
  }).index("by_goal", ["goalId"])
    .index("by_goal_and_date", ["goalId", "date"]),

  accountability_partners: defineTable({
    goalId: v.id("goals"),
    vaultId: v.id("vaults"),
    requesterId: v.id("users"),
    partnerId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("rejected"), v.literal("ended")),
    requester_accepted: v.boolean(),
    partner_accepted: v.boolean(),
  }).index("by_vault", ["vaultId"])
    .index("by_partner", ["partnerId"])
    .index("by_partner_and_status", ["partnerId", "status"]),

  reward_pool: defineTable({
    week_number: v.number(),
    amount: v.number(),
    source_vault_id: v.optional(v.id("vaults")),
    type: v.union(v.literal("penalty"), v.literal("distribution")),
  }).index("by_week_and_type", ["week_number", "type"]),

  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.union(v.literal("partner_request"), v.literal("checkin_due"), v.literal("verification_needed"), v.literal("streak_alert")),
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
      v.literal("platform_fee")
    ),
    vaultId: v.optional(v.id("vaults")),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    description: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  system_stats: defineTable({
    total_revenue: v.number(), // Total fees collected (Kobo)
    total_distributed: v.number(), // Total rewards shared (Kobo)
    active_users: v.number(),
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
    metadata: v.optional(v.any()),
  }).index("by_reference", ["reference"])
    .index("by_user", ["userId"]),

  withdrawals: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("completed")),
    requested_at: v.number(),
    processed_at: v.optional(v.number()),
    bank_details: v.optional(v.object({
        account_number: v.string(),
        bank_code: v.string(),
        bank_name: v.string(),
        account_name: v.string(),
    })),
  }).index("by_user", ["userId"]).index("by_status", ["status"]),
});
