import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isMetaSuccess, nextRetryDelayMinutes, purchaseEventId, usesReliableCapi } from "./capiDelivery.ts";

Deno.test("event id is purchase_<session>", () => assertEquals(purchaseEventId("cs_live_abc"), "purchase_cs_live_abc"));
Deno.test("rollout only for admin 7130af4e", () => {
  assertEquals(usesReliableCapi("7130af4e-7633-4381-8503-429850f6d1cc"), true);
  assertEquals(usesReliableCapi("00000000-0000-0000-0000-000000000000"), false);
  assertEquals(usesReliableCapi(null), false);
});
Deno.test("retry schedule 1,5,30,120,720 then stop", () => {
  assertEquals([1, 2, 3, 4, 5].map(nextRetryDelayMinutes), [1, 5, 30, 120, 720]);
  assertEquals(nextRetryDelayMinutes(6), null);
});
Deno.test("success needs 200 and events_received", () => {
  assertEquals(isMetaSuccess(200, { events_received: 1 }), true);
  assertEquals(isMetaSuccess(200, {}), false);
  assertEquals(isMetaSuccess(400, { error: {} }), false);
});
