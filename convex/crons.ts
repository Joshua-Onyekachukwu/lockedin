import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// LOCK-IN SWEEP: Runs every day at 00:00 UTC (Midnight)
crons.interval(
  "midnight protocol sweep",
  { hours: 24 },
  internal.penalties.midnightSweep,
  {}
);

// WEEKLY REWARD DISTRIBUTION: Runs every Sunday at 01:00 UTC
crons.cron(
  "weekly dividend distribution",
  "0 1 * * 0", // Every Sunday at 1 AM
  internal.rewards.distributeWeeklyRewards,
  {}
);

export default crons;
