import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

function hexToBytes(hex: string) {
  if (hex.length % 2 !== 0) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) return null;
    out[i] = byte;
  }
  return out;
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array) {
  let diff = a.length ^ b.length;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function computePaystackSignature(payload: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return new Uint8Array(mac);
}

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/paystack-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("x-paystack-signature");
    if (!signature) {
      return new Response("Unauthorized: Missing Signature", { status: 401 });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return new Response("Server Misconfigured", { status: 500 });
    }

    const payload = await request.text();

    const signatureBytes = hexToBytes(signature);
    if (!signatureBytes) {
      return new Response("Unauthorized: Invalid Signature", { status: 401 });
    }

    const expectedBytes = await computePaystackSignature(payload, secret);
    if (!timingSafeEqualBytes(signatureBytes, expectedBytes)) {
      return new Response("Unauthorized: Invalid Signature", { status: 401 });
    }

    try {
        const event = JSON.parse(payload);

        if (event.event === "charge.success") {
          const { reference, amount } = event.data;
          const customerEmail = event?.data?.customer?.email as string | undefined;
          
          await ctx.runMutation(internal.payments.reconcilePaystackPayment, {
            reference,
            amountKobo: amount,
            customerEmail,
            source: "webhook",
            metadata: event.data,
          });
        }

        if (event.event === "refund.processed") {
          const reference =
            (event?.data?.transaction?.reference as string | undefined) ||
            (event?.data?.reference as string | undefined);
          const amountKobo =
            (event?.data?.amount as number | undefined) ||
            (event?.data?.transaction?.amount as number | undefined);
          const refundId = event?.data?.id as string | number | undefined;
          const customerEmail =
            (event?.data?.customer?.email as string | undefined) ||
            (event?.data?.transaction?.customer?.email as string | undefined);

          if (reference && typeof amountKobo === "number") {
            await ctx.runMutation(internal.payments.handlePaystackRefundProcessed, {
              refundId,
              reference,
              amountKobo,
              customerEmail,
              metadata: event.data,
            });
          }
        }

        if (event.event === "charge.dispute.create") {
          const reference =
            (event?.data?.transaction?.reference as string | undefined) ||
            (event?.data?.reference as string | undefined);
          const amountKobo =
            (event?.data?.transaction?.amount as number | undefined) ||
            (event?.data?.amount as number | undefined);
          const disputeId = event?.data?.id as string | number | undefined;
          const customerEmail =
            (event?.data?.transaction?.customer?.email as string | undefined) ||
            (event?.data?.customer?.email as string | undefined);

          if (reference && typeof amountKobo === "number") {
            await ctx.runMutation(internal.payments.handlePaystackDisputeCreate, {
              disputeId,
              reference,
              amountKobo,
              customerEmail,
              metadata: event.data,
            });
          }
        }

        if (event.event === "charge.dispute.resolve") {
          const reference =
            (event?.data?.transaction?.reference as string | undefined) ||
            (event?.data?.reference as string | undefined);
          const disputeId = event?.data?.id as string | number | undefined;
          const resolution =
            (event?.data?.resolution as string | undefined) ||
            (event?.data?.status as string | undefined);

          if (reference) {
            await ctx.runMutation(internal.payments.handlePaystackDisputeResolve, {
              disputeId,
              reference,
              resolution,
              metadata: event.data,
            });
          }
        }

        if (event.event === "refund.failed") {
          const reference =
            (event?.data?.transaction?.reference as string | undefined) ||
            (event?.data?.reference as string | undefined);
          const refundId = event?.data?.id as string | number | undefined;
          const amountKobo =
            (event?.data?.amount as number | undefined) ||
            (event?.data?.transaction?.amount as number | undefined);
          const customerEmail =
            (event?.data?.customer?.email as string | undefined) ||
            (event?.data?.transaction?.customer?.email as string | undefined);

          if (reference) {
            await ctx.runMutation(internal.payments.recordPaystackRefundFailed, {
              refundId,
              reference,
              amountKobo,
              customerEmail,
              metadata: event.data,
            });
          }
        }

        if (event.event === "transfer.success") {
          const reference = event?.data?.reference as string | undefined;
          const transferCode = event?.data?.transfer_code as string | undefined;
          const transferId = event?.data?.id as number | undefined;
          if (reference) {
            await ctx.runMutation(internal.admin.handlePaystackTransferSuccess, {
              reference,
              transferCode,
              transferId,
              metadata: event.data,
            });
          }
        }

        if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
          const reference = event?.data?.reference as string | undefined;
          const reason =
            (event?.data?.reason as string | undefined) ||
            (event?.data?.failures as string | undefined) ||
            (event?.data?.message as string | undefined);
          if (reference) {
            await ctx.runMutation(internal.admin.handlePaystackTransferFailed, {
              reference,
              reason,
              metadata: event.data,
            });
          }
        }

        return new Response("OK", { status: 200 });
    } catch (err) {
        return new Response("Internal Server Error", { status: 500 });
    }
  }),
});

export default http;
