import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isSeasonalPromoRunning, SEASONAL_PROMO, seasonalPriceFor } from "./seasonalPromo.ts";
import { priceMemorial } from "./promo.ts";

const zagreb = (local: string) => Date.parse(`${local}+01:00`);
const DURING = zagreb("2026-10-29T10:00:00");
const AFTER = zagreb("2026-11-03T00:00:00");

const row = (code: string, discount_type: string, discount_value: number, extra: Record<string, unknown> = {}) => ({
  id: `id-${code}`, code, discount_type, discount_value, product_type: "memorial", active: true, expires_at: null,
  max_uses: null, max_uses_per_user: 1, current_uses: 0, created_by_admin_id: null, ...extra,
});

const CODES = [
  row("SVISVETI50", "percentage", 50, { expires_at: "2026-11-02T22:59:59Z" }),
  row("POPUST30-TEST", "percentage", 30),
  row("BESPLATNO-TEST", "free", 0),
  row("NEAKTIVAN", "percentage", 30, { active: false }),
];

/** Just enough of the Supabase query builder for promo.ts: promo_codes lookups and usage counts (always 0). */
const fakeAdmin = () => {
  const from = (table: string) => {
    let code = "";
    const q = {
      select: () => q,
      ilike: (_: string, v: string) => { code = v.toLowerCase(); return q; },
      eq: () => q,
      maybeSingle: () => Promise.resolve({ data: CODES.find((c) => c.code.toLowerCase() === code) ?? null }),
      then: (resolve: (v: unknown) => void) => resolve({ count: 0, data: null }),
    };
    if (table !== "promo_codes" && table !== "promo_code_usage") throw new Error(table);
    return q;
  };
  return { from } as unknown as SupabaseClient;
};

Deno.test("dates: from 27.10. 00:00 to 2.11. 16:59:59 Zagreb (ended early)", () => {
  assertEquals(isSeasonalPromoRunning(zagreb("2026-10-26T23:59:59")), false);
  assertEquals(isSeasonalPromoRunning(zagreb("2026-10-27T00:00:00")), true);
  assertEquals(isSeasonalPromoRunning(zagreb("2026-11-02T16:59:59")), true);
  assertEquals(isSeasonalPromoRunning(zagreb("2026-11-02T17:00:00")), false);
  assertEquals(isSeasonalPromoRunning(AFTER), false);
  assertEquals(SEASONAL_PROMO.percent, 50);
  assertEquals(seasonalPriceFor(39), 19.5);
});

Deno.test("during the promo: 19.50 without any code", async () => {
  const p = await priceMemorial(fakeAdmin(), null, "u1", DURING);
  assertEquals(p.ok && [p.finalPrice, p.seasonal, p.code, p.promoId], [19.5, true, "SVISVETI50", "id-SVISVETI50"]);
});

Deno.test("during the promo: the auto-filled SVISVETI50 also gives 19.50 (even if used before)", async () => {
  const p = await priceMemorial(fakeAdmin(), "svisveti50", "u1", DURING);
  assertEquals(p.ok && p.finalPrice, 19.5);
});

Deno.test("during the promo: a 30 % code does not add up and does not raise the price (19.50, not 27.30 or 13.65)", async () => {
  const p = await priceMemorial(fakeAdmin(), "POPUST30-TEST", "u1", DURING);
  assertEquals(p.ok && [p.finalPrice, p.code, p.codeOutdone], [19.5, "SVISVETI50", true]);
});

Deno.test("during the promo: an invalid code still pays 19.50", async () => {
  const p = await priceMemorial(fakeAdmin(), "NEAKTIVAN", "u1", DURING);
  assertEquals(p.ok && [p.finalPrice, p.codeError !== null], [19.5, true]);
  const q = await priceMemorial(fakeAdmin(), "NE-POSTOJI", "u1", DURING);
  assertEquals(q.ok && q.finalPrice, 19.5);
});

Deno.test("during the promo: a 100 % code is still free", async () => {
  const p = await priceMemorial(fakeAdmin(), "BESPLATNO-TEST", "u1", DURING);
  assertEquals(p.ok && [p.finalPrice, p.free, p.code], [0, true, "BESPLATNO-TEST"]);
});

Deno.test("from 3.11.: 39 € without a code", async () => {
  const p = await priceMemorial(fakeAdmin(), null, "u1", AFTER);
  assertEquals(p.ok && [p.finalPrice, p.code, p.seasonal], [39, null, false]);
});

Deno.test("from 3.11.: a 30 % code gives 27.30 again", async () => {
  const p = await priceMemorial(fakeAdmin(), "POPUST30-TEST", "u1", AFTER);
  assertEquals(p.ok && p.finalPrice, 27.3);
});

Deno.test("from 3.11.: SVISVETI50 is rejected", async () => {
  const p = await priceMemorial(fakeAdmin(), "SVISVETI50", "u1", Date.parse("2026-11-03T08:00:00Z"));
  assertEquals(p.ok, false);
});
