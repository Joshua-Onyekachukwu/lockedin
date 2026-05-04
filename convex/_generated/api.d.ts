/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as goals from "../goals.js";
import type * as http from "../http.js";
import type * as mono from "../mono.js";
import type * as notifications from "../notifications.js";
import type * as partners from "../partners.js";
import type * as payments from "../payments.js";
import type * as penalties from "../penalties.js";
import type * as rewards from "../rewards.js";
import type * as security from "../security.js";
import type * as users from "../users.js";
import type * as verifications from "../verifications.js";
import type * as waitlist from "../waitlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  crons: typeof crons;
  goals: typeof goals;
  http: typeof http;
  mono: typeof mono;
  notifications: typeof notifications;
  partners: typeof partners;
  payments: typeof payments;
  penalties: typeof penalties;
  rewards: typeof rewards;
  security: typeof security;
  users: typeof users;
  verifications: typeof verifications;
  waitlist: typeof waitlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
