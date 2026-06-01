import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const FIRST_NAMES = ["Chidi", "Amina", "Oluwaseun", "Blessing", "Emeka", "Fatima", "Tunde", "Chioma", "Damilola", "Zainab", "Ifeanyi", "Nkechi", "Abubakar", "Yetunde", "Obinna", "Funke", "Kelechi", "Rukayat", "Segun", "Ekaette"];
const LAST_NAMES = ["Okafor", "Bello", "Adewale", "Okon", "Nwosu", "Yusuf", "Bakare", "Azikiwe", "Adeyemi", "Ibrahim", "Eze", "Balogun", "Umar", "Sanni", "Okoro", "Danjuma", "Igwe", "Effiong", "Abebe", "Olayemi"];
const GOALS = [
    { title: "Deep Work Protocol", cat: "professional" },
    { title: "5AM Club Wakeup", cat: "habit" },
    { title: "Python Mastery", cat: "learning" },
    { title: "Weight Loss Goal", cat: "fitness" },
    { title: "No Sugar Streak", cat: "fitness" },
    { title: "Daily Writing Log", cat: "habit" },
    { title: "Stock Market Study", cat: "financial" },
    { title: "Coding 4 Hours", cat: "professional" }
];

export const runMassSeed = internalAction({
    args: { count: v.number() },
    returns: v.string(),
    handler: async (ctx, args) => {
        for (let i = 0; i < args.count; i++) {
            const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
            const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
            const goal = GOALS[Math.floor(Math.random() * GOALS.length)];
            const stake = Math.floor(Math.random() * (500000 - 10000 + 1) + 10000); // 10k to 500k
            
            await ctx.runMutation(internal.seed.createSeedUser, {
                name: `${firstName} ${lastName}`,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@protocol.io`,
                stake,
                goalTitle: goal.title
            });
            
            // Log progress every 100 users
            if (i % 100 === 0) console.log(`Injected ${i} citizens...`);
        }
        return `${args.count} Citizens Initialized into the Protocol.`;
    }
});

export const createSeedUser = internalMutation({
    args: { name: v.string(), email: v.string(), stake: v.number(), goalTitle: v.string() },
    returns: v.null(),
    handler: async (ctx, args) => {
        const userId = await ctx.db.insert("users", {
            name: args.name,
            email: args.email,
            balance: 0,
            bvn_verified: true,
            integrityScore: Math.floor(Math.random() * (100 - 70 + 1) + 70), // Random integrity 70-100
            streak_count: Math.floor(Math.random() * 45),
            goals_completed: Math.floor(Math.random() * 10),
            tier: args.stake > 200000 ? "gold" : args.stake > 50000 ? "silver" : "bronze",
            shields: Math.floor(Math.random() * 5),
            credits: Math.floor(Math.random() * 5000),
            witness_discoverable: Math.random() > 0.3,
            is_discoverable: true,
        });

        const vaultId = await ctx.db.insert("vaults", {
            userId,
            amount: args.stake * 100,
            currency: "NGN",
            duration_weeks: 4,
            startDate: Date.now() - (Math.random() * 14 * 24 * 60 * 60 * 1000),
            endDate: Date.now() + (14 * 24 * 60 * 60 * 1000),
            painTier: Math.random() > 0.7 ? "liquidation" : Math.random() > 0.4 ? "enforcement" : "deterrence",
            status: "active",
            paystack_reference: "SEED_" + Math.random().toString(36).substring(7),
            interest_earned: 0
        });

        await ctx.db.insert("goals", {
            vaultId,
            userId,
            category: "habit",
            title: args.goalTitle,
            description: `Mandatory adherence for ${args.name}. Failure results in economic liquidation.`,
            frequency_type: "daily",
            target_count: 1
        });

        await ctx.db.insert("transactions", {
            userId,
            vaultId,
            amount: args.stake * 100,
            type: "deposit",
            status: "completed",
            description: "Initial Protocol Escrow"
        });

        // Add some random penalties to some users to make ledger look real
        if (Math.random() > 0.8) {
            const penalty = Math.floor(args.stake * 100 * 0.05);
            await ctx.db.insert("transactions", {
                userId,
                vaultId,
                amount: -penalty,
                type: "penalty",
                status: "completed",
                description: "Protocol Breach: Missed Log"
            });
        }

        return null;
    }
});

export const listUsersByEmailDomain = internalQuery({
    args: { domain: v.string(), limit: v.optional(v.number()) },
    returns: v.array(v.id("users")),
    handler: async (ctx, args) => {
        const users = await ctx.db.query("users").collect();
        const filtered = users
            .filter((u) => (u.email || "").toLowerCase().endsWith(`@${args.domain.toLowerCase()}`))
            .slice(0, args.limit ?? users.length)
            .map((u) => u._id);
        return filtered;
    },
});

export const purgeSeedDomain = internalMutation({
    args: { domain: v.string(), limit: v.optional(v.number()), dryRun: v.optional(v.boolean()) },
    returns: v.object({
        domain: v.string(),
        dryRun: v.boolean(),
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
    }),
    handler: async (ctx, args) => {
        const domain = args.domain.toLowerCase();
        const dryRun = !!args.dryRun;

        const users = await ctx.db.query("users").collect();
        const userIds = users
            .filter((u) => (u.email || "").toLowerCase().endsWith(`@${domain}`))
            .slice(0, args.limit ?? users.length)
            .map((u) => u._id);

        const userIdSet = new Set(userIds.map((id) => id));

        let usersDeleted = 0;
        let vaultsDeleted = 0;
        let goalsDeleted = 0;
        let goalLogsDeleted = 0;
        let partnersDeleted = 0;
        let transactionsDeleted = 0;
        let notificationsDeleted = 0;
        let depositsDeleted = 0;
        let withdrawalsDeleted = 0;
        let verificationTokensDeleted = 0;

        if (userIds.length === 0) {
            return {
                domain: args.domain,
                dryRun,
                usersDeleted,
                vaultsDeleted,
                goalsDeleted,
                goalLogsDeleted,
                partnersDeleted,
                transactionsDeleted,
                notificationsDeleted,
                depositsDeleted,
                withdrawalsDeleted,
                verificationTokensDeleted,
            };
        }

        const allPartners = await ctx.db.query("accountability_partners").collect();
        for (const p of allPartners) {
            if (userIdSet.has(p.partnerId) || userIdSet.has(p.requesterId)) {
                partnersDeleted += 1;
                if (!dryRun) await ctx.db.delete(p._id);
            }
        }

        const allLogs = await ctx.db.query("goal_logs").collect();
        for (const l of allLogs) {
            if (l.confirmed_by && userIdSet.has(l.confirmed_by)) {
                if (!dryRun) await ctx.db.patch(l._id, { confirmed_by: undefined, confirmed_at: undefined });
            }
        }

        for (const userId of userIds) {
            const vaults = await ctx.db
                .query("vaults")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .collect();

            for (const vlt of vaults) {
                const vaultPartners = await ctx.db
                    .query("accountability_partners")
                    .withIndex("by_vault", (q) => q.eq("vaultId", vlt._id))
                    .collect();
                for (const p of vaultPartners) {
                    partnersDeleted += 1;
                    if (!dryRun) await ctx.db.delete(p._id);
                }

                const goals = await ctx.db
                    .query("goals")
                    .withIndex("by_vault", (q) => q.eq("vaultId", vlt._id))
                    .collect();

                for (const g of goals) {
                    const logs = await ctx.db
                        .query("goal_logs")
                        .withIndex("by_goal", (q) => q.eq("goalId", g._id))
                        .collect();
                    for (const lg of logs) {
                        goalLogsDeleted += 1;
                        if (!dryRun) await ctx.db.delete(lg._id);
                    }

                    goalsDeleted += 1;
                    if (!dryRun) await ctx.db.delete(g._id);
                }

                vaultsDeleted += 1;
                if (!dryRun) await ctx.db.delete(vlt._id);
            }

            const transactions = await ctx.db
                .query("transactions")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .collect();
            for (const t of transactions) {
                transactionsDeleted += 1;
                if (!dryRun) await ctx.db.delete(t._id);
            }

            const notifications = await ctx.db
                .query("notifications")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .collect();
            for (const n of notifications) {
                notificationsDeleted += 1;
                if (!dryRun) await ctx.db.delete(n._id);
            }

            const deposits = await ctx.db
                .query("deposits")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .collect();
            for (const d of deposits) {
                depositsDeleted += 1;
                if (!dryRun) await ctx.db.delete(d._id);
            }

            const withdrawals = await ctx.db
                .query("withdrawals")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .collect();
            for (const w of withdrawals) {
                withdrawalsDeleted += 1;
                if (!dryRun) await ctx.db.delete(w._id);
            }

            const tokens = await ctx.db
                .query("email_verification_tokens")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .collect();
            for (const tok of tokens) {
                verificationTokensDeleted += 1;
                if (!dryRun) await ctx.db.delete(tok._id);
            }

            usersDeleted += 1;
            if (!dryRun) await ctx.db.delete(userId);
        }

        return {
            domain: args.domain,
            dryRun,
            usersDeleted,
            vaultsDeleted,
            goalsDeleted,
            goalLogsDeleted,
            partnersDeleted,
            transactionsDeleted,
            notificationsDeleted,
            depositsDeleted,
            withdrawalsDeleted,
            verificationTokensDeleted,
        };
    },
});

export const seedHistoryForUser = internalMutation({
    args: {
        userId: v.id("users"),
        goalsPerUser: v.number(),
        logsPerGoal: v.number(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return null;

        const now = Date.now();

        for (let i = 0; i < args.goalsPerUser; i++) {
            const goal = GOALS[Math.floor(Math.random() * GOALS.length)];
            const stake = Math.floor(Math.random() * (250000 - 10000 + 1) + 10000) * 100;
            const startDate = now - (Math.floor(Math.random() * 21) + 7) * 24 * 60 * 60 * 1000;

            const vaultId = await ctx.db.insert("vaults", {
                userId: args.userId,
                amount: stake,
                currency: "NGN",
                duration_weeks: 4,
                startDate,
                endDate: startDate + (4 * 7 * 24 * 60 * 60 * 1000),
                painTier: Math.random() > 0.7 ? "liquidation" : Math.random() > 0.4 ? "enforcement" : "deterrence",
                status: "active",
                paystack_reference: "SEED_" + Math.random().toString(36).substring(7),
                interest_earned: 0
            });

            const goalId = await ctx.db.insert("goals", {
                vaultId,
                userId: args.userId,
                category: goal.cat as any,
                title: goal.title,
                description: `Mandatory adherence for ${user.name || "Citizen"}. Failure results in economic liquidation.`,
                frequency_type: "daily",
                target_count: 1
            });

            for (let j = 0; j < args.logsPerGoal; j++) {
                const dayOffset = Math.floor(Math.random() * 24);
                const date = new Date(startDate + dayOffset * 24 * 60 * 60 * 1000);
                const dateStr = date.toISOString().split("T")[0];
                const weekNumber = Math.max(1, Math.ceil(((date.getTime() - startDate) / (7 * 24 * 60 * 60 * 1000))));
                const statusPick = Math.random();
                const status = statusPick > 0.88 ? "missed" : statusPick > 0.78 ? "disputed" : "completed";

                await ctx.db.insert("goal_logs", {
                    goalId,
                    week_number: weekNumber,
                    date: dateStr,
                    status: status as any,
                    note: status === "missed"
                      ? "Log missed. System recorded a protocol breach."
                      : status === "disputed"
                      ? "Evidence submitted. Awaiting arbitration."
                      : "Execution confirmed. Evidence submitted for verification.",
                    confirmed_by: status === "completed" && Math.random() > 0.45 ? args.userId : undefined,
                    confirmed_at: status === "completed" && Math.random() > 0.45 ? now - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000 : undefined,
                });
            }

            await ctx.db.insert("transactions", {
                userId: args.userId,
                vaultId,
                amount: -Math.floor(stake * 0.05),
                type: "platform_fee",
                status: "completed",
                description: "Seeded protocol initialization fee"
            });
        }

        return null;
    },
});

function toYmd(ts: number) {
  return new Date(ts).toISOString().split("T")[0];
}

export const populateExistingLogsForUser = internalMutation({
  args: {
    userId: v.id("users"),
    logsPerGoal: v.optional(v.number()),
  },
  returns: v.object({
    goalsProcessed: v.number(),
    logsInserted: v.number(),
    logsSkipped: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const logsPerGoal = args.logsPerGoal ?? 14;

    const vaults = await ctx.db
      .query("vaults")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    let goalsProcessed = 0;
    let logsInserted = 0;
    let logsSkipped = 0;

    for (const vault of vaults) {
      const goal = await ctx.db
        .query("goals")
        .withIndex("by_vault", (q) => q.eq("vaultId", vault._id))
        .unique();
      if (!goal) continue;

      goalsProcessed += 1;

      const windowStart = vault.startDate;
      const windowEnd = Math.min(vault.endDate, now);
      const rangeDays = Math.max(1, Math.floor((windowEnd - windowStart) / (24 * 60 * 60 * 1000)) + 1);
      const daysToGenerate = Math.min(logsPerGoal, rangeDays);

      const baseDay = windowEnd - (daysToGenerate - 1) * 24 * 60 * 60 * 1000;

      for (let i = 0; i < daysToGenerate; i++) {
        const dateTs = baseDay + i * 24 * 60 * 60 * 1000;
        const dateStr = toYmd(dateTs);
        const weekNumber = Math.max(
          1,
          Math.ceil((dateTs - windowStart) / (7 * 24 * 60 * 60 * 1000)),
        );

        const existing = await ctx.db
          .query("goal_logs")
          .withIndex("by_goal_and_date", (q) => q.eq("goalId", goal._id).eq("date", dateStr))
          .unique();
        if (existing) {
          logsSkipped += 1;
          continue;
        }

        const pick = Math.random();
        const status = pick > 0.9 ? "missed" : pick > 0.82 ? "disputed" : "completed";

        await ctx.db.insert("goal_logs", {
          goalId: goal._id,
          week_number: weekNumber,
          date: dateStr,
          status: status as any,
          note:
            status === "missed"
              ? `Missed check-in for "${goal.title}".`
              : status === "disputed"
                ? `Disputed check-in for "${goal.title}". Evidence under review.`
                : `Completed check-in for "${goal.title}".`,
          confirmed_by: status === "completed" && Math.random() > 0.55 ? args.userId : undefined,
          confirmed_at:
            status === "completed" && Math.random() > 0.55
              ? now - Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000
              : undefined,
        });

        logsInserted += 1;
      }
    }

    return { goalsProcessed, logsInserted, logsSkipped };
  },
});
