import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const FIRST_NAMES = ["Chidi", "Amina", "Oluwaseun", "Blessing", "Emeka", "Fatima", "Tunde", "Chioma", "Damilola", "Zainab", "Ifeanyi", "Nkechi", "Abubakar", "Yetunde", "Obinna", "Funke", "Kelechi", "Rukayat", "Segun", "Ekaette"];
const LAST_NAMES = ["Okafor", "Bello", "Adewale", "Okon", "Nwosu", "Yusuf", "Bakare", "Azikiwe", "Adeyemi", "Ibrahim", "Eze", "Balogun", "Umar", "Sanni", "Okoro", "Danjuma", "Igwe", "Effiong", "Abebe", "Olayemi"];
const GOALS = [
    { title: "Deep Work Protocol", cat: "professional" },
    { title: "5AM Club Wakeup", cat: "habit" },
    { title: "Python Mastery", cat: "learning" },
    { title: "Weight Loss Mandate", cat: "fitness" },
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
            checkin_day: "daily"
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
