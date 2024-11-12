import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { BackendClient } from "@/sanity/lib/backendClient";
import { Metadata } from "@/actions/createCheckoutSession";
import stripe from "@/lib/stripe";



export async function POST(req: NextRequest) {
    const body = await req.text();
    const headersList = await headers();
    const sig = headersList.get("stripe-signature");

    if (!sig) {
        console.error("No Stripe signature found in headers");
        return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    // const webhookSecret = "whsec_6d98dfe5c64824965ffdc15d58d27ffbae58ef5cdd699b8bde1ec39bb65ac6e9"

    if (!webhookSecret) {
        console.log("Stripe webhook secret is not set");
        return NextResponse.json(
             { error: "Stripe webhook secret is not set"},
             { status: 400 }
        )
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (error) {
        console.error("Webhook signature verification failed:", error);
        return NextResponse.json(
            { error: `Webhook Error: ${error}` },
            { status: 400 }
        )
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        try {
            const order = await CreateOrderInSanity(session);
            console.log("Order created in Sanity:", order);
        } catch (error) {
            console.error("Error creating order in Sanity:", error);
            return NextResponse.json(
                { error: "Error creating order" },
                { status: 500 }
            )
        }
    }

    return NextResponse.json({ received: true });
    
}

async function CreateOrderInSanity(session: Stripe.Checkout.Session) {
    const {
        id,
        amount_total,
        currency,
        metadata,
        payment_intent,
        customer,
        total_details
    } = session;

    const { orderNumber, customerName, customerEmail, clerkUserId } = metadata as Metadata;

    // Access metadata from price_data object in CreateCheckoutSession.ts
    const lineItemsWithProduct = await stripe.checkout.sessions.listLineItems(
        id,
        {
            expand: ["data.price.product"]
        }
    )

    // Format data that is compatible with Sanity can display 
    const sanityProducts = lineItemsWithProduct.data.map((item) => ({
        _key: crypto.randomUUID(),
        product: {
            _type: "reference",
            _ref: (item.price?.product as Stripe.Product)?.metadata?.id
        },
        quantity: item.quantity || 0
    }))


    // Create order in Sanity
    const order = await BackendClient.create({
        _type: "order",
        orderNumber,
        stripeCheckoutSessionId: id,
        stripePaymentIntentId: payment_intent,
        customerName,
        stripeCustomerId: customer,
        clerkUserId: clerkUserId,
        email: customerEmail,
        currency,
        amountDiscount: total_details?.amount_discount
            ? total_details.amount_discount / 100
            : 0,
        products: sanityProducts,
        totalPrice: amount_total ? amount_total / 100 : 0,
        status: "paid",
        orderDate: new Date().toISOString()
    })

    return order;
}