import Stripe from 'stripe';
import { normalizeEmail } from './db.js';
import { setBurnAndBuild } from './contacts.js';

const secretKey = process.env.STRIPE_SECRET_KEY;
const priceId = process.env.STRIPE_PRICE_ID;

let stripeClient = null;

export function stripeConfigured() {
  return !!(secretKey && priceId);
}

function getStripe() {
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

function checkoutEmail(session) {
  const raw = session.client_reference_id
    || session.customer_email
    || session.metadata?.email
    || '';
  return normalizeEmail(raw);
}

export function grantAccessFromCheckoutSession(session) {
  const email = checkoutEmail(session);
  if (!email) {
    return { ok: false, message: 'Checkout session is missing customer email.' };
  }
  if (session.payment_status !== 'paid') {
    return { ok: false, message: 'Payment not completed.' };
  }
  const contact = setBurnAndBuild(email, true);
  return { ok: true, email, contact };
}

export async function createCheckoutSession({ email, programId, baseUrl }) {
  if (!priceId) {
    throw new Error('STRIPE_PRICE_ID is not configured.');
  }
  const stripe = getStripe();
  const normalizedEmail = normalizeEmail(email);
  const origin = String(baseUrl || '').replace(/\/$/, '');

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: normalizedEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: normalizedEmail,
    metadata: {
      email: normalizedEmail,
      ...(programId ? { programId: String(programId) } : {}),
    },
    success_url: `${origin}/start/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/start/?checkout=cancel`,
  });

  return { sessionId: session.id, url: session.url };
}

export async function verifyCheckoutSession(sessionId) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(String(sessionId || ''));
  return grantAccessFromCheckoutSession(session);
}

export function constructStripeWebhookEvent(rawBody, signature) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
  }
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

export function handleStripeWebhookEvent(event) {
  if (event.type === 'checkout.session.completed') {
    return grantAccessFromCheckoutSession(event.data.object);
  }
  return { ok: true, ignored: true, type: event.type };
}
