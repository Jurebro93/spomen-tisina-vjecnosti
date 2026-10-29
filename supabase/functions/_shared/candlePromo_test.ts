import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { promoAppliesTo, validatePromoCode } from "./promo.ts";

const row = (code: string, product_type: string, discount_type: string, discount_value: number) => ({
  id: `id-${code}`, code, discount_type, discount_value, product_type, active: true, expires_at: null,
  max_uses: null, max_uses_per_user: 1, current_uses: 0, created_by_admin_id: null,
});

const CODES = [
  row("SVIJECA50", "candle", "percentage", 50),
  row("SVIJECA2", "candle", "fixed", 2),
  row("SVIJECAFREE", "candle", "free", 0),
  row("SVE20", "all", "percentage", 20),
  row("SVISVETI50", "memorial", "percentage", 50),
  row("OBOJE10", "both", "percentage", 10),
];

const fakeAdmin = () => {
  const from = () => {
    let code = "";
    const q = {
      select: () => q,
      ilike: (_: string, v: string) => { code = v.toLowerCase(); return q; },
      eq: () => q,
      maybeSingle: () => Promise.resolve({ data: CODES.find((c) => c.code.toLowerCase() === code) ?? null }),
      then: (resolve: (v: unknown) => void) => resolve({ count: 0, data: null }),
    };
    return q;
  };
  return { from } as unknown as SupabaseClient;
};

const price = async (code: string, base: number) => {
  const r = await validatePromoCode(fakeAdmin(), code, "candle", null, Date.now(), base);
  return r.ok ? r.finalPrice : r.message;
};

Deno.test("which codes work for which product", () => {
  assertEquals(promoAppliesTo("candle", "candle"), true);
  assertEquals(promoAppliesTo("all", "candle"), true);
  assertEquals(promoAppliesTo("all", "memorial"), true);
  assertEquals(promoAppliesTo("both", "candle"), false);
  assertEquals(promoAppliesTo("both", "obituary"), true);
  assertEquals(promoAppliesTo("candle", "memorial"), false);
});

Deno.test("candle codes use the chosen plan price", async () => {
  assertEquals(await price("SVIJECA50", 3.99), 1.99);
  assertEquals(await price("svijeca50", 9.99), 4.99);
  assertEquals(await price("SVIJECA2", 5.99), 3.99);
  assertEquals(await price("SVIJECAFREE", 9.99), 0);
  assertEquals(await price("SVE20", 3.99), 3.19);
});

Deno.test("memorial-only and obituary+memorial codes are refused for candles", async () => {
  assertEquals(await price("SVISVETI50", 3.99), "Promo kod nije moguće koristiti za ovaj proizvod.");
  assertEquals(await price("OBOJE10", 3.99), "Promo kod nije moguće koristiti za ovaj proizvod.");
});

Deno.test("candle codes don't work on a memorial", async () => {
  const r = await validatePromoCode(fakeAdmin(), "SVIJECA50", "memorial", null);
  assertEquals(r.ok, false);
});
