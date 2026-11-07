import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parse, senderVerified, skipReason } from "./parse.ts";
import { validateChange } from "./items.ts";

const mail = (headers: string, body = "Poštovani, zanima me izrada sjećanja.") =>
  new TextEncoder().encode(
    `${headers}\r\nFrom: Ana Anić <Ana.Anic@gmail.com>\r\nTo: info@osmrtnica.com.hr\r\nSubject: Upit\r\nMessage-ID: <abc@mail.gmail.com>\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}\r\n`,
  );

Deno.test("parses sender, subject and text", async () => {
  const p = await parse(mail("Date: Sat, 07 Nov 2026 09:00:00 +0000"));
  assertEquals(p.fromEmail, "ana.anic@gmail.com");
  assertEquals(p.subject, "Upit");
  assert(p.text.includes("izrada sjećanja"));
  assertEquals(skipReason(p), null);
});

Deno.test("DKIM pass for the sender's domain verifies the sender", async () => {
  const p = await parse(mail("Authentication-Results: dubrovnik10.totohost.hr; dkim=pass header.d=gmail.com header.s=20230601; spf=pass smtp.mailfrom=ana.anic@gmail.com; dmarc=pass"));
  assert(senderVerified(p));
});

Deno.test("no Authentication-Results means not verified", async () => {
  assert(!senderVerified(await parse(mail("Date: Sat, 07 Nov 2026 09:00:00 +0000"))));
});

Deno.test("DKIM pass for another domain does not verify", async () => {
  const p = await parse(mail("Authentication-Results: dubrovnik10.totohost.hr; dkim=pass header.d=evil.example; spf=fail smtp.mailfrom=x@evil.example"));
  assert(!senderVerified(p));
});

Deno.test("a forged Authentication-Results from the sender does not count", async () => {
  // Our server adds its header on top; the sender's fake one sits below it.
  const p = await parse(mail("Authentication-Results: dubrovnik10.totohost.hr; dkim=none; spf=softfail smtp.mailfrom=ana.anic@gmail.com\r\nAuthentication-Results: mx.google.com; dkim=pass header.d=gmail.com; spf=pass smtp.mailfrom=ana.anic@gmail.com"));
  assert(!senderVerified(p));
  assert(!senderVerified(await parse(mail("Authentication-Results: mx.google.com; dkim=pass header.d=gmail.com"))));
});

Deno.test("DMARC fail cancels DKIM pass", async () => {
  const p = await parse(mail("Authentication-Results: dubrovnik10.totohost.hr; dkim=pass header.d=gmail.com; dmarc=fail"));
  assert(!senderVerified(p));
});

Deno.test("auto-replies and newsletters are skipped", async () => {
  assert(skipReason(await parse(mail("Auto-Submitted: auto-replied"))));
  assert(skipReason(await parse(mail("List-Unsubscribe: <mailto:x@y.z>"))));
  assert(skipReason(await parse(mail("Precedence: bulk"))));
});

Deno.test("only allowed fields with valid values pass", () => {
  assert(validateChange("obituary", { field: "ime", value: "Ivan" }).ok);
  assert(!validateChange("obituary", { field: "paid", value: "true" }).ok);
  assert(!validateChange("obituary", { field: "kontakt_osoba_email", value: "x@y.z" }).ok);
  assert(!validateChange("obituary", { field: "ime", value: "" }).ok);
  assert(!validateChange("obituary", { field: "datum_smrti", value: "3.11.2026" }).ok);
  assertEquals(validateChange("obituary", { field: "ozalosceni", value: "Ana; Marko" }), { ok: true, value: ["Ana", "Marko"] });
  assert(!validateChange("memorial", { field: "status", value: "archived" }).ok);
  assert(!validateChange("memorial", { field: "visibility", value: "secret" }).ok);
});
