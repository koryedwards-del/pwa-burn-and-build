import Stripe from 'stripe';
import { markProgramPaid, normalizeEmail } from './db.js';

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
    || session.metadata?.email
    || session.customer_email
    || '';
  return normalizeEmail(raw);
}

export function grantAccessFromCheckoutSession(session) {
  const email = checkoutEmail(session);
  if (!email) {
    return { ok: false, message: 'Checkout session is missing customer email.' };
  }
  if (session.status !== 'complete') {
    return { ok: false, message: 'Checkout session not complete.' };
  }
  const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
  if (!paid) {
    return { ok: false, message: 'Payment not completed.' };
  }
  const programId = session.metadata?.programId || null;
  if (!programId) {
    return { ok: false, message: 'Checkout session is missing program id.' };
  }
  const marked = markProgramPaid(email, programId);
  if (!marked) {
    return { ok: false, message: 'Could not unlock this program after payment.' };
  }
  return { ok: true, email, programId, paid: true };
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
    payment_method_types: ['card'],
    wallet_options: {
      link: {
        display: 'never',
      },
    },
    customer_email: normalizedEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: normalizedEmail,
    metadata: {
      email: normalizedEmail,
      ...(programId ? { programId: String(programId) } : {}),
    },
    success_url: `${origin}/createyourfoodplan/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/createyourfoodplan/?checkout=cancel`,
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
  if (
    event.type === 'checkout.session.completed'
    || event.type === 'checkout.session.async_payment_succeeded'
  ) {
    return grantAccessFromCheckoutSession(event.data.object);
  }
  return { ok: true, ignored: true, type: event.type };
}
