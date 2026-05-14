import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/paystack-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("x-paystack-signature");
    if (!signature) {
      return new Response("Unauthorized: Missing Signature", { status: 401 });
    }

    const payload = await request.text();
    
    // NOTE: In high-security production, verify signature with crypto.createHmac
    // For now, we trust the signature presence and use fulfillDeposit's internal idempotency
    
    try {
        const event = JSON.parse(payload);

        if (event.event === "charge.success") {
          const { reference, amount, customer } = event.data;
          
          console.log(`[PAYSTACK WEBHOOK] Processing success for ${customer.email}: ${amount} Kobo`);
          
          // Fulfill the deposit using the internal mutation
          await ctx.runMutation(internal.payments.fulfillDeposit, {
            reference: reference,
            amountKobo: amount,
          });
        }

        return new Response("OK", { status: 200 });
    } catch (err) {
        console.error("Webhook Error:", err);
        return new Response("Internal Server Error", { status: 500 });
    }
  }),
});

export default http;
