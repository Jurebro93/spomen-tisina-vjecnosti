// Memorial order tracking for the admin "Statistika i prodaja" report.
// Status never moves "backwards" so out-of-order Stripe events can't undo a payment.
// deno-lint-ignore-file no-explicit-any

export const STATUS_RANK: Record<string, number> = {
  checkout_open: 1,
  returned_unpaid: 2,
  expired: 2,
  failed: 2,
  processing: 3,
  requires_action: 3,
  paid: 5,
  free: 5,
  partially_refunded: 6,
  refunded: 7,
  disputed: 8,
};

export function canMoveTo(current: string | null | undefined, next: string): boolean {
  if (!current) return true;
  // A failed attempt may be followed by a new attempt (processing/requires_action) or by success.
  return (STATUS_RANK[next] ?? 0) >= (STATUS_RANK[current] ?? 0);
}

export type Attribution = {
  first_source?: string | null; first_medium?: string | null; first_campaign?: string | null;
  source?: string | null; medium?: string | null; campaign?: string | null;
  device?: string | null;
  blog_slug?: string | null; blog_cta?: string | null; blog_touched_at?: string | null;
};

const clip = (v: unknown, n = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

export function cleanAttribution(a: any): Attribution {
  if (!a || typeof a !== "object") return {};
  const device = clip(a.device, 20);
  return {
    first_source: clip(a.first_source), first_medium: clip(a.first_medium), first_campaign: clip(a.first_campaign),
    source: clip(a.source), medium: clip(a.medium), campaign: clip(a.campaign),
    device: device && ["mobile", "tablet", "desktop"].includes(device) ? device : null,
    blog_slug: clip(a.blog_slug, 200), blog_cta: clip(a.blog_cta, 80),
    blog_touched_at: typeof a.blog_touched_at === "string" && !Number.isNaN(Date.parse(a.blog_touched_at)) ? new Date(a.blog_touched_at).toISOString() : null,
  };
}

/** Record a Stripe event once. Returns false if it was already recorded (duplicate delivery). */
export async function recordPaymentEvent(admin: any, row: {
  order_id: string | null; stripe_event_id?: string | null; event_type: string; status?: string | null;
  amount?: number | null; failure_code?: string | null; failure_message?: string | null;
  livemode?: boolean | null; occurred_at?: string;
}): Promise<boolean> {
  const { error } = await admin.from("payment_events").insert(row);
  if (error) {
    if (String(error.code) === "23505") return false;
    throw error;
  }
  return true;
}

export async function findOrder(admin: any, opts: { sessionId?: string | null; paymentIntentId?: string | null }) {
  if (opts.sessionId) {
    const { data } = await admin.from("memorial_orders").select("*").eq("stripe_checkout_session_id", opts.sessionId).maybeSingle();
    if (data) return data;
  }
  if (opts.paymentIntentId) {
    const { data } = await admin.from("memorial_orders").select("*").eq("stripe_payment_intent_id", opts.paymentIntentId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (data) return data;
  }
  return null;
}

export async function setOrderStatus(admin: any, order: any, next: string, patch: Record<string, unknown> = {}) {
  const update: Record<string, unknown> = { ...patch };
  if (canMoveTo(order.status, next)) update.status = next;
  if (Object.keys(update).length === 0) return;
  await admin.from("memorial_orders").update(update).eq("id", order.id);
}

const FAILURE_HR: Record<string, string> = {
  card_declined: "Kartica je odbijena",
  insufficient_funds: "Nedovoljno sredstava na kartici",
  expired_card: "Kartica je istekla",
  incorrect_cvc: "Pogrešan CVC kod",
  incorrect_number: "Pogrešan broj kartice",
  invalid_cvc: "Neispravan CVC kod",
  invalid_expiry_month: "Neispravan mjesec isteka",
  invalid_expiry_year: "Neispravna godina isteka",
  processing_error: "Greška pri obradi kartice",
  authentication_required: "Potrebna je dodatna potvrda (3D Secure)",
  payment_intent_authentication_failure: "Dodatna potvrda (3D Secure) nije uspjela",
  do_not_honor: "Banka je odbila transakciju",
  generic_decline: "Banka je odbila transakciju bez navedenog razloga",
  lost_card: "Kartica je prijavljena kao izgubljena",
  stolen_card: "Kartica je prijavljena kao ukradena",
  fraudulent: "Banka je transakciju označila kao sumnjivu",
  card_not_supported: "Kartica ne podržava ovu vrstu plaćanja",
  currency_not_supported: "Kartica ne podržava valutu",
  transaction_not_allowed: "Transakcija nije dopuštena za ovu karticu",
  try_again_later: "Privremena greška banke",
  card_velocity_exceeded: "Prekoračen limit kartice",
  withdrawal_count_limit_exceeded: "Prekoračen broj transakcija",
};

export const failureLabelHr = (code?: string | null) => (code && FAILURE_HR[code]) || "Razlog nije dostupan";
