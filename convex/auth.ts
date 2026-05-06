import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: params.email as string,
          name: (params.name as string) ?? "",
          // Custom fields for Lockedin
          balance: 0,
          bvn_verified: false,
          integrityScore: 100,
          streak_count: 0,
          goals_completed: 0,
          witness_discoverable: true,
          tier: "bronze",
          is_discoverable: true,
          shields: 0,
          credits: 0,
        };
      },
    }),
    Google({
      profile(profile: any) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          // Custom fields for Lockedin
          balance: 0,
          bvn_verified: false,
          integrityScore: 100,
          streak_count: 0,
          goals_completed: 0,
          witness_discoverable: true,
          tier: "bronze",
          is_discoverable: true,
          shields: 0,
          credits: 0,
        };
      },
    }),
  ],
});
