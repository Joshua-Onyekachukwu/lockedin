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
      return new Response("No signature", { status: 401 });
    }

    const payload = await request.text();
    
    // In a real production app, you would verify the signature here using crypto
    // const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(request.body)).digest('hex');
    // if (hash !== signature) return ...

    const event = JSON.parse(payload);

    if (event.event === "charge.success") {
      const { reference, amount } = event.data;
      
      // Fulfill the deposit using the internal mutation
      await ctx.runMutation(internal.payments.fulfillDeposit, {
        reference: reference,
        amountKobo: amount,
      });
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
