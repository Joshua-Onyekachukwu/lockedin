import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { createHmac, timingSafeEqual } from "node:crypto";

const http = httpRouter();

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

    try {
      const expected = createHmac("sha512", secret).update(payload).digest("hex");

      const signatureBuf = Buffer.from(signature, "hex");
      const expectedBuf = Buffer.from(expected, "hex");

      if (
        signatureBuf.length !== expectedBuf.length ||
        !timingSafeEqual(signatureBuf, expectedBuf)
      ) {
        return new Response("Unauthorized: Invalid Signature", { status: 401 });
      }
    } catch {
      return new Response("Unauthorized: Invalid Signature", { status: 401 });
    }

    try {
        const event = JSON.parse(payload);

        if (event.event === "charge.success") {
          const { reference, amount, customer } = event.data;
          
          // Fulfill the deposit using the internal mutation
          await ctx.runMutation(internal.payments.fulfillDeposit, {
            reference: reference,
            amountKobo: amount,
          });
        }

        return new Response("OK", { status: 200 });
    } catch (err) {
        return new Response("Internal Server Error", { status: 500 });
    }
  }),
});

export default http;
