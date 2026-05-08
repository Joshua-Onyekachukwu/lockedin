import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * MIGRATION PROTOCOL v1.1
 * Updates legacy goal documents to the current schema.
 */
export const migrateLegacyGoals = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const goals = await ctx.db.query("goals").collect();
    let count = 0;

    for (const goal of goals) {
      const updates: any = {};
      
      // Migrate checkin_day to frequency_type
      if ((goal as any).checkin_day && !goal.frequency_type) {
        updates.frequency_type = (goal as any).checkin_day === "daily" ? "daily" : "weekly";
      }

      // Ensure target_count exists
      if (goal.target_count === undefined) {
        updates.target_count = 1;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(goal._id, updates);
        count++;
      }
    }

    console.log(`Migration Complete: ${count} goals synchronized.`);
    return null;
  },
});
