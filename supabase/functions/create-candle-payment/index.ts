// Starts a Stripe Checkout for a paid candle (7 / 14 / 30 days).
// kind "obituary": new candle for a deceased person, or relighting an extinguished one (relightCandleId).
// kind "memorial": candle on a digital memorial.
// The candle stays hidden until verify-candle-payment or stripe-webhook confirms the payment.
// An optional promo code (made for "Svijeće" or "Sve" in the admin) lowers the price; a 100 % code lights it without Stripe.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { CANDLE_PLANS, activateCandleFromSession, candleProductName, isCandlePlan } from "../_shared/candles.ts";
import { validatePromoCode } from "../_shared/promo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://osmrtnica.com.hr";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const log = (step: string, details?: unknown) =>
  console.log(`[CREATE-CANDLE-PAYMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

// Only our own site (and local development) may receive the visitor back after payment.
const siteOrigin = (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (/^https:\/\/(www\.)?osmrtnica\.com\.hr$/.test(origin)) return origin;
  if (/^https:\/\/[a-z0-9-]+--zesty-gaufre-5d2a88\.netlify\.app$/.test(origin)) return origin;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return origin;
  return SITE;
};

const cleanPath = (path: unknown, fallback: string) => {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") || path.length > 500) return fallback;
  const url = new URL(path, SITE);
  for (const key of ["svijeca", "session_id", "dana", "ime"]) url.searchParams.delete(key);
  return url.pathname + url.search;
};

const withParams = (base: string, path: string, params: string) =>
  `${base}${path}${path.includes("?") ? "&" : "?"}${params}`;

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Stripe does not accept card payments under 0,50 €.
const STRIPE_MIN_EUR = 0.5;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });

  try {
    const body = await req.json();
    const days = Number(body.days);
    if (!isCandlePlan(days)) return json({ error: "Odaberite koliko dugo svijeća gori." }, 400);
    const planPrice = CANDLE_PLANS[days];

    const stripeKey = Deno.env.get("STRIPE_LIVE_API_KEY") || Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeKey) throw new Error("STRIPE_LIVE_API_KEY or STRIPE_SECRET_KEY is not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false },
    });

    // Logged-in visitors count towards the per-user limit of a promo code.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const { data } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = data.user?.id ?? null;
    }

    // Price is always computed here; the browser only sends the code.
    let price = planPrice;
    let promo: { id: string; code: string } | null = null;
    const promoCode = text(body.promoCode, 64);
    if (promoCode) {
      const result = await validatePromoCode(admin, promoCode, "candle", userId, Date.now(), planPrice);
      if (!result.ok) return json({ error: result.message }, 400);
      price = result.finalPrice > 0 ? Math.max(result.finalPrice, STRIPE_MIN_EUR) : 0;
      promo = { id: result.promo.id, code: result.promo.code };
    }

    const origin = siteOrigin(req);
    const kind = body.kind === "memorial" ? "memorial" : "obituary";
    let candleId: string;
    let forName: string;
    let email: string | undefined;
    let relight = false;
    let returnPath: string;
    let table: "virtual_candles" | "memorial_candles";

    if (kind === "memorial") {
      const memorialId = text(body.memorialId, 64);
      email = text(body.email, 200).toLowerCase();
      if (!memorialId) return json({ error: "Memorijal nije pronađen." }, 400);
      if (!EMAIL_RE.test(email)) return json({ error: "Unesite ispravnu e-mail adresu." }, 400);

      const { data: allowed } = await admin.rpc("memorial_allows", { _memorial_id: memorialId, _what: "candles" });
      if (allowed !== true) return json({ error: "Na ovom memorijalu nije moguće zapaliti svijeću." }, 400);
      const { data: m } = await admin.from("memorials")
        .select("slug, obituaries:deceased_id(ime, prezime)").eq("id", memorialId).maybeSingle();
      const o = m?.obituaries as { ime?: string; prezime?: string } | null;
      forName = [o?.ime, o?.prezime].filter(Boolean).join(" ") || "voljenu osobu";
      returnPath = cleanPath(body.returnPath, `/memorijal/${m?.slug ?? ""}`);

      const { data: row, error } = await admin.from("memorial_candles").insert({
        memorial_id: memorialId,
        visitor_name: text(body.visitorName, 100) || null,
        visitor_email: email,
        message: text(body.message, 500) || null,
        status: "pending",
        payment_status: "unpaid",
        duration_days: days,
      }).select("id").single();
      if (error) throw new Error(`Database error: ${error.message}`);
      candleId = row.id;
      table = "memorial_candles";
    } else if (body.relightCandleId) {
      const { data: candle } = await admin.from("virtual_candles")
        .select("id, pokojnik_ime, pokojnik_prezime").eq("id", text(body.relightCandleId, 64))
        .eq("paid", true).eq("active", true).maybeSingle();
      if (!candle) return json({ error: "Svijeća nije pronađena." }, 404);
      candleId = candle.id;
      forName = `${candle.pokojnik_ime} ${candle.pokojnik_prezime}`.trim();
      relight = true;
      returnPath = cleanPath(body.returnPath, "/virtualne-svijece");
      table = "virtual_candles";
    } else {
      const pokojnikIme = text(body.pokojnikIme, 100);
      const pokojnikPrezime = text(body.pokojnikPrezime, 100);
      const zapalioIme = text(body.zapalioIme, 100);
      email = text(body.zapalioEmail, 200).toLowerCase();
      if (!pokojnikIme || !pokojnikPrezime || !zapalioIme) return json({ error: "Molimo unesite sve obavezne podatke." }, 400);
      if (!EMAIL_RE.test(email)) return json({ error: "Unesite ispravnu e-mail adresu." }, 400);

      const { data: row, error } = await admin.from("virtual_candles").insert({
        pokojnik_ime: pokojnikIme,
        pokojnik_prezime: pokojnikPrezime,
        zapalio_ime: zapalioIme,
        zapalio_email: email,
        poruka: text(body.poruka, 1000) || null,
        paid: false,
        active: false,
        duration_days: days,
      }).select("id").single();
      if (error) throw new Error(`Database error: ${error.message}`);
      candleId = row.id;
      forName = `${pokojnikIme} ${pokojnikPrezime}`;
      returnPath = cleanPath(body.returnPath, "/zapali-svijecu");
      table = "virtual_candles";
    }

    const productName = candleProductName(days);
    const productDescription = `Svijeća za ${forName}`;
    const metadata: Record<string, string> = {
      type: "candle",
      candle_kind: kind,
      candle_id: candleId,
      relight: relight ? "1" : "0",
      days: String(days),
      product_name: productName,
      product_description: productDescription,
      original_price: String(planPrice),
      ...(promo ? { promo_code_id: promo.id, promo_code: promo.code } : {}),
      ...(userId ? { user_id: userId } : {}),
    };
    const sessionColumn = table === "memorial_candles" ? "stripe_session_id" : "stripe_payment_intent_id";

    // 100 % promo code: nothing to pay, light the candle right away the same way a paid one is lit.
    if (price <= 0) {
      const freeId = `free_${crypto.randomUUID()}`;
      if (!relight) await admin.from(table).update({ [sessionColumn]: freeId }).eq("id", candleId);
      const lit = await activateCandleFromSession(admin, {
        id: freeId, metadata, payment_status: "paid", amount_total: 0, customer_email: email ?? null, customer_details: null,
      } as unknown as Stripe.Checkout.Session);
      if (!lit.ok) throw new Error("Free candle could not be lit");
      log("Free candle lit", { kind, relight, days, candleId, promo: promo?.code });
      return json({ free: true, url: withParams(origin, returnPath, `svijeca=besplatno&dana=${days}&ime=${encodeURIComponent(lit.name ?? forName)}`) });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: "hr",
      customer_email: email || undefined,
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: productName, description: productDescription },
          unit_amount: Math.round(price * 100),
        },
        quantity: 1,
      }],
      success_url: withParams(origin, returnPath, "svijeca=placeno&session_id={CHECKOUT_SESSION_ID}"),
      cancel_url: withParams(origin, returnPath, "svijeca=otkazano"),
      metadata,
    });

    if (!relight) await admin.from(table).update({ [sessionColumn]: session.id }).eq("id", candleId);

    log("Session created", { sessionId: session.id, kind, relight, days, candleId, promo: promo?.code, price });
    return json({ url: session.url });
  } catch (error) {
    log("ERROR", { message: String(error) });
    return json({ error: "Plaćanje trenutno nije moguće pokrenuti. Pokušajte ponovno za nekoliko minuta." }, 500);
  }
});
