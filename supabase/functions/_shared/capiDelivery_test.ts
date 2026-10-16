import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isMetaSuccess, nextRetryDelayMinutes, purchaseEventId } from "./capiDelivery.ts";

Deno.test("event id is purchase_<session>", () => assertEquals(purchaseEventId("cs_live_abc"), "purchase_cs_live_abc"));
Deno.test("retry schedule 1,5,30,120,720 then stop", () => {
  assertEquals([1, 2, 3, 4, 5].map(nextRetryDelayMinutes), [1, 5, 30, 120, 720]);
  assertEquals(nextRetryDelayMinutes(6), null);
});
Deno.test("success needs 200 and events_received", () => {
  assertEquals(isMetaSuccess(200, { events_received: 1 }), true);
  assertEquals(isMetaSuccess(200, {}), false);
  assertEquals(isMetaSuccess(400, { error: {} }), false);
});
