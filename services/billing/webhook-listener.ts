/**
 * Razorpay webhook listener for subscription lifecycle events.
 * NestJS-style controller shown as a plain Express-ish handler for clarity.
 *
 * Lifecycle events handled:
 *   subscription.authenticated  -> mandate created, first charge pending
 *   subscription.activated      -> first charge succeeded, plan is live
 *   subscription.charged        -> a renewal charge succeeded
 *   subscription.pending        -> a charge attempt is retrying
 *   subscription.halted         -> too many failed retries, PSP stopped trying
 *   payment.failed              -> a specific charge attempt failed
 *   subscription.cancelled      -> merchant or PSP cancelled the mandate
 *
 * Design notes:
 *  - Signature verified BEFORE touching the DB.
 *  - Raw event persisted to `webhook_events` with a UNIQUE(psp, psp_event_id)
 *    constraint -> Postgres unique-violation IS the idempotency check; no
 *    separate "have I seen this before" query needed.
 *  - Side effects (invoice generation, notifications) are published to the
 *    event bus, not executed inline, so this handler returns fast.
 */

import crypto from "crypto";
import type { Request, Response } from "express";
import { db } from "../shared/db";
import { publishEvent } from "../shared/event-bus";

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

export async function razorpayWebhookHandler(req: Request, res: Response) {
  const signature = req.headers["x-razorpay-signature"] as string | undefined;
  const rawBody = req.rawBody as Buffer; // must be captured via raw body middleware, not JSON-parsed body

  if (!signature || !verifySignature(rawBody, signature)) {
    return res.status(400).json({ error: "invalid_signature" });
  }

  const event = JSON.parse(rawBody.toString("utf8"));
  const pspEventId = event.id ?? event.event_id;

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const inserted = await client.query(
      `INSERT INTO webhook_events (psp, psp_event_id, event_type, payload)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (psp, psp_event_id) DO NOTHING
       RETURNING id`,
      ["razorpay", pspEventId, event.event, event]
    );

    if (inserted.rowCount === 0) {
      // Already processed - PSP retried a webhook we already handled. No-op.
      await client.query("COMMIT");
      return res.status(200).json({ status: "duplicate_ignored" });
    }

    await handleEvent(client, event);

    await client.query(
      `UPDATE webhook_events SET processed_at = now() WHERE psp = $1 AND psp_event_id = $2`,
      ["razorpay", pspEventId]
    );

    await client.query("COMMIT");
    return res.status(200).json({ status: "processed" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("razorpay webhook processing failed", err);
    // Return 500 so Razorpay retries with backoff - the ON CONFLICT DO NOTHING
    // guard above makes retries safe.
    return res.status(500).json({ error: "processing_failed" });
  } finally {
    client.release();
  }
}

function verifySignature(rawBody: Buffer, signature: string): boolean {
  const expected = crypto.createHmac("sha256", RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function handleEvent(client: any, event: any) {
  const pspSubscriptionId: string | undefined =
    event.payload?.subscription?.entity?.id ?? event.payload?.payment?.entity?.subscription_id;

  switch (event.event) {
    case "subscription.activated": {
      await client.query(
        `UPDATE subscriptions SET status = 'active',
                current_period_start = to_timestamp($2),
                current_period_end   = to_timestamp($3),
                updated_at = now()
         WHERE psp = 'razorpay' AND psp_subscription_id = $1`,
        [pspSubscriptionId, event.payload.subscription.entity.current_start, event.payload.subscription.entity.current_end]
      );
      break;
    }

    case "subscription.charged": {
      const sub = await client.query(
        `UPDATE subscriptions SET status = 'active',
                current_period_start = to_timestamp($2),
                current_period_end   = to_timestamp($3),
                grace_period_ends_at = NULL,
                updated_at = now()
         WHERE psp = 'razorpay' AND psp_subscription_id = $1
         RETURNING id, store_id`,
        [pspSubscriptionId, event.payload.subscription.entity.current_start, event.payload.subscription.entity.current_end]
      );
      if (sub.rows[0]) {
        await publishEvent("invoice.generate_requested", {
          subscriptionId: sub.rows[0].id,
          storeId: sub.rows[0].store_id,
          paymentEntity: event.payload.payment.entity,
        });
      }
      break;
    }

    case "subscription.pending": {
      await client.query(
        `UPDATE subscriptions
         SET status = 'past_due',
             grace_period_ends_at = COALESCE(grace_period_ends_at, now() + interval '7 days'),
             updated_at = now()
         WHERE psp = 'razorpay' AND psp_subscription_id = $1`,
        [pspSubscriptionId]
      );
      break;
    }

    case "subscription.halted": {
      const sub = await client.query(
        `UPDATE subscriptions SET status = 'suspended', updated_at = now()
         WHERE psp = 'razorpay' AND psp_subscription_id = $1
         RETURNING store_id`,
        [pspSubscriptionId]
      );
      if (sub.rows[0]) {
        await publishEvent("subscription.suspended", { storeId: sub.rows[0].store_id });
      }
      break;
    }

    case "subscription.cancelled": {
      await client.query(
        `UPDATE subscriptions SET status = 'cancelled', updated_at = now()
         WHERE psp = 'razorpay' AND psp_subscription_id = $1`,
        [pspSubscriptionId]
      );
      break;
    }

    case "payment.failed": {
      await publishEvent("subscription.charge_failed", {
        pspSubscriptionId,
        reason: event.payload.payment.entity.error_description,
      });
      break;
    }

    default:
      // Unhandled event types are logged but not treated as errors -
      // Razorpay adds new event types over time.
      console.log(`Unhandled razorpay event: ${event.event}`);
  }
}
