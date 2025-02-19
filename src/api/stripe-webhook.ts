import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2025-01-27.acacia' });

const supabase = createClient(process.env.VITE_SUPABASE_URL as string, process.env.VITE_SUPABASE_ANON_KEY as string);

// Middleware to verify Stripe signature
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
        console.error('⚠️ Webhook signature verification failed.', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    // Handle different Stripe events
    switch (event.type) {
        case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        const customerEmail = session.customer_email;
        const subscriptionId = session.subscription as string;
        const priceId = session.metadata?.price_id;

        if (!customerEmail || !subscriptionId) {
            console.error('Missing customer email or subscription ID.');
            res.status(400).json({ error: 'Missing customer email or subscription ID.' });
            return;
        }

        let subscriptionPlan = 'Up Slow';
        if (priceId === 'price_12345') subscriptionPlan = 'Up Fast';
        else if (priceId === 'price_67890') subscriptionPlan = 'Business';

        // Update user subscription details in Supabase
        const { error } = await supabase
            .from('profiles')
            .update({
            stripe_subscription_id: subscriptionId,
            subscription_plan: subscriptionPlan,
            subscription_paid_date: new Date().toISOString(),
            subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            subscription_status: 'active',
            downloads_remaining: subscriptionPlan === 'Up Fast' ? 99999 : 5,
            updated_at: new Date().toISOString(),
            })
            .eq('email', customerEmail);

        if (error) {
            console.error('Error updating Supabase:', error);
            res.status(500).json({ error: 'Failed to update user subscription' });
            return;
        }

        console.log(`✅ Subscription updated for ${customerEmail}`);
        break;
        }

        case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerEmail = invoice.customer_email;
        const subscriptionId = invoice.subscription as string;

        if (!customerEmail || !subscriptionId) {
            res.status(400).json({ error: 'Missing customer email or subscription ID.' });
            return;
        }

        // Update subscription status
        const { error } = await supabase
            .from('profiles')
            .update({ subscription_status: 'active', updated_at: new Date().toISOString() })
            .eq('email', customerEmail);

        if (error) {
            console.error('Error updating subscription status:', error);
            res.status(500).json({ error: 'Failed to update subscription status' });
            return;
        }

        console.log(`✅ Payment succeeded, subscription active for ${customerEmail}`);
        break;
        }

        case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const customerEmail = (customer as Stripe.Customer).email;

        if (!customerEmail) {
            res.status(400).json({ error: 'Missing customer email.' });
            return;
        }

        // Cancel subscription
        const { error } = await supabase
            .from('profiles')
            .update({
            subscription_status: 'canceled',
            cancelled_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            })
            .eq('email', customerEmail);

        if (error) {
            console.error('Error canceling subscription:', error);
            res.status(500).json({ error: 'Failed to cancel subscription' });
            return;
        }

        console.log(`✅ Subscription canceled for ${customerEmail}`);
        break;
        }

        default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Webhook server running on port ${PORT}`));
