import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { captureToSentry } from "./sentry";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function toYmd(d: Date) {
  return d.toISOString().split("T")[0];
}

function endOfDayTs(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.getTime();
}

/**
 * GOAL EVALUATION ENGINE
 * Runs every midnight to enforce protocol discipline.
 */

export const midnightSweep = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    try {
      const nowTs = Date.now();
      const now = new Date(nowTs);
      const todayStr = toYmd(now);
      const todayDayName = now
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      const isSunday = todayDayName === "sunday";

      const activeVaults = await ctx.db
        .query("vaults")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect();

      for (const vault of activeVaults) {
        const goals = await ctx.db
          .query("goals")
          .withIndex("by_vault", (q) => q.eq("vaultId", vault._id))
          .collect();

        for (const goal of goals) {
          const frequency = goal.frequency_type ?? "daily";
          let shouldEvaluate = false;
          if (frequency === "daily") shouldEvaluate = true;
          if (frequency === "weekly" && isSunday) shouldEvaluate = true;
          if (frequency === "monthly" && now.getDate() === 1) shouldEvaluate = true;
          if (!shouldEvaluate) continue;

          let periodStartTs = 0;
          let periodEndTs = 0;
          let periodStartStr = "";
          let periodEndStr = "";
          let dueAt = 0;
          let targetCount = 1;
          let completedCount = 0;
          let missedDateStr = todayStr;

          if (frequency === "daily") {
            periodStartTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            periodEndTs = endOfDayTs(now);
            periodStartStr = todayStr;
            periodEndStr = todayStr;
            dueAt = periodEndTs;
            targetCount = 1;

            const logs = await ctx.db
              .query("goal_logs")
              .withIndex("by_goal_and_date", (q) =>
                q.eq("goalId", goal._id).eq("date", todayStr),
              )
              .collect();
            completedCount = logs.filter((l: any) => l.status !== "missed").length;
            missedDateStr = todayStr;
          } else if (frequency === "weekly") {
          const periodEnd = now;
          const periodStart = new Date(periodEnd);
          periodStart.setDate(periodEnd.getDate() - 7);

          periodStartTs = periodStart.getTime();
          periodEndTs = endOfDayTs(periodEnd);
          periodStartStr = toYmd(periodStart);
          periodEndStr = todayStr;
          dueAt = periodEndTs;
          targetCount = goal.target_count ?? 1;

          const weekLogs = await ctx.db
            .query("goal_logs")
            .withIndex("by_goal_and_date", (q) =>
              q
                .eq("goalId", goal._id)
                .gte("date", periodStartStr)
                .lte("date", periodEndStr),
            )
            .collect();
          completedCount = weekLogs.filter((l: any) => l.status !== "missed").length;
          missedDateStr = periodEndStr;
        } else {
          const end = new Date(now.getFullYear(), now.getMonth(), 0);
          const start = new Date(end.getFullYear(), end.getMonth(), 1);
          const startStr = toYmd(start);
          const endStr = toYmd(end);

          periodStartTs = start.getTime();
          periodEndTs = endOfDayTs(end);
          periodStartStr = startStr;
          periodEndStr = endStr;
          dueAt = periodEndTs;
          targetCount = goal.target_count ?? 1;

          const monthLogs = await ctx.db
            .query("goal_logs")
            .withIndex("by_goal_and_date", (q) =>
              q.eq("goalId", goal._id).gte("date", startStr).lte("date", endStr),
            )
            .collect();
          completedCount = monthLogs.filter((l: any) => l.status !== "missed").length;
          missedDateStr = endStr;
        }

        if (completedCount >= targetCount) continue;

        const periodKey =
          frequency === "daily"
            ? `daily:${periodStartStr}`
            : frequency === "weekly"
              ? `weekly:${periodStartStr}`
              : `monthly:${periodStartStr.slice(0, 7)}`;

        const already = await ctx.db
          .query("penalty_events")
          .withIndex("by_goal_and_period", (q) =>
            q.eq("goalId", goal._id).eq("period_key", periodKey),
          )
          .order("desc")
          .first();
        if (already) continue;

        const user = await ctx.db.get("users", vault.userId);
        const weekNumber = Math.floor(nowTs / WEEK_MS);

        const ensureMissedLog = async (note: string) => {
          const existing = await ctx.db
            .query("goal_logs")
            .withIndex("by_goal_and_date", (q) =>
              q.eq("goalId", goal._id).eq("date", missedDateStr),
            )
            .order("desc")
            .first();
          if (existing) return;
          const startTs = vault.startDate ?? vault.fundedAt ?? vault._creationTime;
          const diffMs = nowTs - startTs;
          const week_number = Math.max(1, Math.ceil(diffMs / WEEK_MS));
          await ctx.db.insert("goal_logs", {
            goalId: goal._id,
            week_number,
            date: missedDateStr,
            status: "missed",
            note,
          });
        };

        if (user && user.shields > 0) {
          await ctx.db.patch("users", user._id, { shields: user.shields - 1 });
          await ensureMissedLog(
            `Missed ${frequency} requirement (${completedCount}/${targetCount}). Shield deployed.`,
          );
          await ctx.db.insert("penalty_events", {
            userId: vault.userId,
            vaultId: vault._id,
            goalId: goal._id,
            week_number: weekNumber,
            frequency_type: frequency,
            period_key: periodKey,
            period_start: periodStartTs,
            period_end: periodEndTs,
            due_at: dueAt,
            target_count: targetCount,
            completed_count: completedCount,
            shield_used: true,
            penalty_percent: 0,
            penalty_amount: 0,
            createdAt: nowTs,
          });
          await ctx.db.insert("notifications", {
            userId: user._id,
            title: "Protocol Shield Deployed",
            message: `A shield protected your stake for ${goal.title} after a breach. Integrity preserved.`,
            type: "streak_alert",
            read: false,
          });
        } else {
          const result = await applyPain(ctx, vault, goal, {
            weekNumber,
            frequency,
            periodKey,
            periodStartTs,
            periodEndTs,
            dueAt,
            targetCount,
            completedCount,
            missedDateStr,
          });
          if (result?.updatedVaultAmount != null) {
            vault.amount = result.updatedVaultAmount;
          }
          if (result?.updatedPenaltyAccrued != null) {
            vault.penaltyAccrued = result.updatedPenaltyAccrued;
          }
        }
      }
    }
    return null;
    } catch (err) {
      await captureToSentry({
        message: "cron midnightSweep failed",
        tags: { area: "cron", job: "midnightSweep" },
        extra: { error: String(err) },
      });
      throw err;
    }
  },
});

async function applyPain(
  ctx: any,
  vault: any,
  goal: any,
  meta: {
    weekNumber: number;
    frequency: "daily" | "weekly" | "monthly";
    periodKey: string;
    periodStartTs: number;
    periodEndTs: number;
    dueAt: number;
    targetCount: number;
    completedCount: number;
    missedDateStr: string;
  },
) {
    const user = await ctx.db.get("users", vault.userId);
    
    // Tier Mapping
    const tierMap = {
        "deterrence": 0.02,
        "enforcement": 0.05,
        "liquidation": 0.10
    };
    
    const penaltyPercent = tierMap[vault.painTier as keyof typeof tierMap] || 0.02;
    const penaltyBase = Math.max(0, vault.amount - (vault.penaltyAccrued ?? 0));
    const penaltyAmount = Math.floor(penaltyBase * penaltyPercent);
    
    if (penaltyAmount > 0) {
        // Record penalty transaction
        await ctx.db.insert("transactions", {
            userId: vault.userId,
            vaultId: vault._id,
            amount: -penaltyAmount,
            type: "penalty",
            status: "completed",
            description: `Protocol Breach Forfeiture: ${goal.title}`
        });

        // 70% goes to Platform Revenue (Admin)
        // 30% goes to Reward Pool (Sunday Liquidation)
        const platformShare = Math.floor(penaltyAmount * 0.7);
        const rewardShare = penaltyAmount - platformShare;

        const stats = await ctx.db.query("system_stats").unique();
        const statsId =
          stats?._id ??
          (await ctx.db.insert("system_stats", {
            total_revenue: 0,
            total_distributed: 0,
            active_users: 0,
            total_penalties_collected: 0,
            total_reward_pool_contributed: 0,
          }));
        const current = stats ?? {
          total_revenue: 0,
          total_distributed: 0,
          active_users: 0,
          total_penalties_collected: 0,
          total_reward_pool_contributed: 0,
        };
        await ctx.db.patch("system_stats", statsId, {
          total_revenue: (current.total_revenue || 0) + platformShare,
          total_penalties_collected: (current.total_penalties_collected || 0) + penaltyAmount,
          total_reward_pool_contributed: (current.total_reward_pool_contributed || 0) + rewardShare,
        });

        // Fund the Sunday Liquidation pool
        await ctx.db.insert("reward_pool", {
            week_number: meta.weekNumber,
            amount: rewardShare,
            source_vault_id: vault._id,
            type: "penalty"
        });

        const existingPenaltyAccrued = vault.penaltyAccrued ?? 0;
        const updatedPenaltyAccrued = existingPenaltyAccrued + penaltyAmount;
        await ctx.db.patch("vaults", vault._id, { penaltyAccrued: updatedPenaltyAccrued });

        const existingMissed = await ctx.db
          .query("goal_logs")
          .withIndex("by_goal_and_date", (q: any) =>
            q.eq("goalId", goal._id).eq("date", meta.missedDateStr),
          )
          .order("desc")
          .first();
        if (!existingMissed) {
          const startTs = vault.startDate ?? vault.fundedAt ?? vault._creationTime;
          const diffMs = Date.now() - startTs;
          const week_number = Math.max(1, Math.ceil(diffMs / WEEK_MS));
          await ctx.db.insert("goal_logs", {
            goalId: goal._id,
            week_number,
            date: meta.missedDateStr,
            status: "missed",
            note: `Missed ${meta.frequency} requirement (${meta.completedCount}/${meta.targetCount}). Penalty accrued.`,
          });
        }

        await ctx.db.insert("penalty_events", {
          userId: vault.userId,
          vaultId: vault._id,
          goalId: goal._id,
          week_number: meta.weekNumber,
          frequency_type: meta.frequency,
          period_key: meta.periodKey,
          period_start: meta.periodStartTs,
          period_end: meta.periodEndTs,
          due_at: meta.dueAt,
          target_count: meta.targetCount,
          completed_count: meta.completedCount,
          shield_used: false,
          penalty_percent: penaltyPercent,
          penalty_amount: penaltyAmount,
          createdAt: Date.now(),
        });

        await ctx.db.insert("notifications", {
            userId: vault.userId,
            title: "Stake Forfeited",
            message: `Breach detected for ${goal.title}. ₦${(penaltyAmount/100).toLocaleString()} accrued as a penalty.`,
            type: "streak_alert",
            read: false
        });

        return {
          updatedVaultAmount: vault.amount,
          updatedPenaltyAccrued,
        };
    }

    await ctx.db.patch("users", vault.userId, { 
        streak_count: 0,
        integrityScore: Math.max(0, (user?.integrityScore ?? 100) - 10),
        tier:
          Math.max(0, (user?.integrityScore ?? 100) - 10) >= 90
            ? "gold"
            : Math.max(0, (user?.integrityScore ?? 100) - 10) >= 75
              ? "silver"
              : "bronze",
    });

    return {
      updatedVaultAmount: vault.amount,
      updatedPenaltyAccrued: vault.penaltyAccrued ?? 0,
    };
}
