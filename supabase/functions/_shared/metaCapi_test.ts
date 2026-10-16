import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildUserData, cleanBrowserIds, cleanEventId, sendMetaEvent } from "./metaCapi.ts";

Deno.test("browser ids: keeps valid _fbp/_fbc, drops anything else", () => {
  assertEquals(cleanBrowserIds({ fbp: "fb.1.1596403881668.1116446470", fbc: "fb.1.1554763741205.AbCdEf-12_3" }),
    { fbp: "fb.1.1596403881668.1116446470", fbc: "fb.1.1554763741205.AbCdEf-12_3" });
  assertEquals(cleanBrowserIds({ fbp: "<script>", fbc: 5 }), { fbp: null, fbc: null });
  assertEquals(cleanBrowserIds(null), { fbp: null, fbc: null });
});

Deno.test("event ids need the expected prefix and safe characters", () => {
  assertEquals(cleanEventId("ic_abc-1_123", "ic_"), "ic_abc-1_123");
  assertEquals(cleanEventId("lead_x", "ic_"), null);
  assertEquals(cleanEventId("ic_a b", "ic_"), null);
});

Deno.test("user data hashes personal fields and keeps browser ids as is", async () => {
  const u = await buildUserData({ email: " Ana@Example.com ", fullName: "Ana Horvat", externalId: "u1", fbp: "fb.1.1596403881668.1", userAgent: "UA" });
  assertEquals((u.em as string[])[0].length, 64);
  assertEquals(u.em, (await buildUserData({ email: "ana@example.com" })).em);
  assertEquals(u.fbp, "fb.1.1596403881668.1");
  assertEquals(u.client_user_agent, "UA");
  assertEquals("ph" in u, false);
});

Deno.test("send: posts event with shared id, success needs events_received", async () => {
  Deno.env.set("META_CAPI_ACCESS_TOKEN", "t");
  let sent: Record<string, any> = {};
  const fake = (async (_url: string, init: RequestInit) => {
    sent = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ events_received: 1 }), { status: 200 });
  }) as typeof fetch;
  const r = await sendMetaEvent({ eventName: "Lead", eventId: "lead_m1", userData: {} }, fake);
  assertEquals(r.ok, true);
  assertEquals(sent.data[0].event_id, "lead_m1");
  assertEquals(sent.data[0].action_source, "website");
});

Deno.test("send: missing token is reported, not thrown", async () => {
  Deno.env.delete("META_CAPI_ACCESS_TOKEN");
  const r = await sendMetaEvent({ eventName: "Lead", eventId: "lead_m1", userData: {} });
  assertEquals(r.ok, false);
});
