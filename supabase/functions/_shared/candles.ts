// Paid candles: plans, and activation once Stripe confirms a payment.
// Used by create-candle-payment, verify-candle-payment and stripe-webhook (whichever runs first wins).
import type Stripe from "https://esm.sh/stripe@14.21.0";
import { isMailConfigured, sendMail } from "./mail.ts";
import { SITE, emailButton, emailLayout, emailParagraph, escapeHtml } from "./emailLayout.ts";
import { recordPromoUsage } from "./promo.ts";

// Keep in sync with src/lib/candlePlans.ts
export const CANDLE_PLANS: Record<number, number> = { 7: 3.99, 14: 5.99, 30: 9.99 };

export const isCandlePlan = (days: unknown): days is number =>
  typeof days === "number" && Object.prototype.hasOwnProperty.call(CANDLE_PLANS, days);

export const candleProductName = (days: number) => `Virtualna svijeća – ${days} dana`;

const DAY_MS = 86_400_000;
const log = (step: string, details?: unknown) =>
  console.log(`[CANDLES] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

export type CandleActivation = {
  ok: boolean;
  /** True only for the call that actually lit the candle (so the e-mail goes out once). */
  activated: boolean;
  kind?: "obituary" | "memorial";
  name?: string;
  days?: number;
  expiresAt?: string;
  memorialSlug?: string | null;
};

// Counts a promo code use once, only by the call that actually lit the candle.
// Relights reuse the candle id, so they are recorded without an order id.
// deno-lint-ignore no-explicit-any
const recordCandlePromo = async (admin: any, session: Stripe.Checkout.Session) => {
  const meta = session.metadata ?? {};
  if (!meta.promo_code_id) return;
  const originalPrice = Number(meta.original_price) || CANDLE_PLANS[Number(meta.days)] || 0;
  const finalPrice = (session.amount_total ?? 0) / 100;
  try {
    await recordPromoUsage(admin, {
      promoCodeId: meta.promo_code_id,
      userId: meta.user_id || null,
      orderId: meta.relight === "1" ? null : meta.candle_id,
      productType: "candle",
      originalPrice,
      discountAmount: Math.max(Math.round((originalPrice - finalPrice) * 100) / 100, 0),
      finalPrice,
    });
  } catch (e) {
    log("Promo usage failed", { message: String(e) });
  }
};

// deno-lint-ignore no-explicit-any
export const activateCandleFromSession = async (admin: any, session: Stripe.Checkout.Session): Promise<CandleActivation> => {
  const meta = session.metadata ?? {};
  if (meta.type !== "candle" || session.payment_status !== "paid") return { ok: false, activated: false };

  const days = Number(meta.days);
  const candleId = meta.candle_id;
  if (!candleId || !isCandlePlan(days)) return { ok: false, activated: false };

  const now = new Date();
  const nowIso = now.toISOString();
  const amount = (session.amount_total ?? 0) / 100;
  const email = session.customer_details?.email ?? session.customer_email ?? null;

  if (meta.candle_kind === "memorial") {
    const expiresAt = new Date(now.getTime() + days * DAY_MS).toISOString();
    const { data: lit } = await admin.from("memorial_candles")
      .update({
        status: "approved", approved_at: nowIso, payment_status: "paid", paid_at: nowIso,
        created_at: nowIso, expires_at: expiresAt, amount_paid: amount,
      })
      .eq("id", candleId).eq("stripe_session_id", session.id).eq("payment_status", "unpaid")
      .select("id, visitor_name, visitor_email, memorial_id").maybeSingle();

    const { data: row } = await admin.from("memorial_candles")
      .select("expires_at, memorials:memorial_id(slug, obituaries:deceased_id(ime, prezime))")
      .eq("id", candleId).maybeSingle();
    const m = row?.memorials as { slug?: string; obituaries?: { ime?: string; prezime?: string } } | null;
    const name = [m?.obituaries?.ime, m?.obituaries?.prezime].filter(Boolean).join(" ") || "voljenu osobu";
    const result: CandleActivation = {
      ok: true, activated: Boolean(lit), kind: "memorial", name, days,
      expiresAt: row?.expires_at ?? expiresAt, memorialSlug: m?.slug ?? null,
    };
    if (lit) await recordCandlePromo(admin, session);
    if (lit) await sendCandleConfirmation(lit.visitor_email ?? email, result);
    return result;
  }

  const { data: candle } = await admin.from("virtual_candles")
    .select("id, pokojnik_ime, pokojnik_prezime, zapalio_email, paid, expires_at, stripe_payment_intent_id, last_relight_session_id")
    .eq("id", candleId).maybeSingle();
  if (!candle) return { ok: false, activated: false };
  const name = `${candle.pokojnik_ime} ${candle.pokojnik_prezime}`.trim();

  if (meta.relight === "1") {
    if (candle.last_relight_session_id === session.id) {
      return { ok: true, activated: false, kind: "obituary", name, days, expiresAt: candle.expires_at };
    }
    // A relit candle burns for the bought days from now, or on top of the time it still had left.
    const from = Math.max(now.getTime(), new Date(candle.expires_at).getTime() || 0);
    const expiresAt = new Date(from + days * DAY_MS).toISOString();
    const { data: lit } = await admin.from("virtual_candles")
      .update({ expires_at: expiresAt, created_at: nowIso, last_relight_session_id: session.id, active: true })
      .eq("id", candleId)
      .or(`last_relight_session_id.is.null,last_relight_session_id.neq.${session.id}`)
      .select("id").maybeSingle();
    const result: CandleActivation = { ok: true, activated: Boolean(lit), kind: "obituary", name, days, expiresAt };
    if (lit) await recordCandlePromo(admin, session);
    if (lit) await sendCandleConfirmation(email, result);
    return result;
  }

  if (candle.stripe_payment_intent_id !== session.id) return { ok: false, activated: false };
  const expiresAt = new Date(now.getTime() + days * DAY_MS).toISOString();
  const { data: lit } = await admin.from("virtual_candles")
    .update({ paid: true, active: true, paid_at: nowIso, created_at: nowIso, expires_at: expiresAt, amount_paid: amount })
    .eq("id", candleId).eq("paid", false)
    .select("id").maybeSingle();
  const result: CandleActivation = {
    ok: true, activated: Boolean(lit), kind: "obituary", name, days, expiresAt: lit ? expiresAt : candle.expires_at,
  };
  if (lit) await recordCandlePromo(admin, session);
  if (lit) await sendCandleConfirmation(candle.zapalio_email ?? email, result);
  return result;
};

const sendCandleConfirmation = async (to: string | null, c: CandleActivation) => {
  if (!to || !isMailConfigured()) return;
  const until = new Date(c.expiresAt ?? Date.now()).toLocaleDateString("hr-HR", { timeZone: "Europe/Zagreb" });
  const href = c.kind === "memorial" && c.memorialSlug
    ? `${SITE}/memorijal/${c.memorialSlug}`
    : `${SITE}/virtualne-svijece`;
  try {
    await sendMail({
      to,
      subject: `Svijeća za ${c.name} je zapaljena`,
      html: emailLayout({
        preheader: `Vaša svijeća gori ${c.days} dana, do ${until}.`,
        title: "Vaša svijeća je zapaljena",
        body: [
          emailParagraph(`Hvala vam. Svijeća za <strong>${escapeHtml(c.name ?? "")}</strong> gori ${c.days} dana, do <strong>${until}</strong>.`),
          emailButton(href, "Pogledajte svijeću"),
        ].join(""),
        reason: "Ovaj e-mail ste dobili jer ste zapalili virtualnu svijeću na Osmrtnica.com.hr.",
      }),
    });
  } catch (e) {
    log("Confirmation email failed", { message: String(e) });
  }
};
