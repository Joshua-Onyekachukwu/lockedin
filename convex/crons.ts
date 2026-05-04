import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// LOCK-IN SWEEP: Runs every day at 00:00 UTC (Midnight)
// This checks for missed check-ins and applies penalties.
crons.interval(
  "midnight protocol sweep",
  { hours: 24 }, // Set to run every 24 hours
  internal.penalties.midnightSweep,
  {}
);

// WEEKLY REWARD DISTRIBUTION: Runs every Sunday at 01:00 UTC
// This distributes the high-integrity dividends.
crons.cron(
  "weekly dividend distribution",
  "0 1 * * 0", // Every Sunday at 1 AM
  internal.rewards.distributeWeeklyRewards,
  { weekNumber: Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) }
);

export default crons;
