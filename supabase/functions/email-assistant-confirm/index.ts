// "Potvrdi izmjenu" from the e-mail assistant: the page /potvrda-izmjene calls this with the token from the mail.
// {token, action: "preview"} shows what will change; {token, action: "confirm"} makes the change once, then the
// site owner gets a copy (subject "OSMRTNICA.COM.HR"). The token only reached the address that created the item.
import { createClient } from "npm:@supabase/supabase-js@2";
import { isMailConfigured, sendMail } from "../_shared/mail.ts";
import { escapeHtml } from "../_shared/emailLayout.ts";
import { ITEM_SPECS, type ItemType, showValue } from "../email-assistant/items.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, code: "method" }, 405);
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "");
  if (!/^[0-9a-f]{48}$/.test(token)) return json({ ok: false, code: "invalid" }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: row } = await db.from("email_assistant_pending_changes").select("*").eq("token", token).maybeSingle();
  if (!row) return json({ ok: false, code: "not_found" }, 404);

  const spec = ITEM_SPECS[row.item_type as ItemType];
  const changes = Object.entries(row.changes as Record<string, unknown>)
    // Only fields that are still allowed, in case the rules changed after the mail was sent.
    .filter(([f]) => spec && f in spec.fields)
    .map(([field, after]) => ({ field, before: showValue((row.before as Record<string, unknown>)[field]), after: showValue(after) }));
  const view = { summary: row.item_summary, changes, status: row.status };

  if (row.status === "confirmed") return json({ ok: true, done: true, ...view });
  if (row.status !== "pending" || new Date(row.expires_at).getTime() < Date.now()) {
    return json({ ok: false, code: "expired", ...view });
  }
  if (body.action !== "confirm") return json({ ok: true, ...view });

  const { data: settings } = await db.from("email_assistant_settings").select("apply_changes, notify_email").eq("id", 1).maybeSingle();
  if (!settings?.apply_changes) return json({ ok: false, code: "paused", ...view });

  // Claim the row first, so a double click cannot apply it twice.
  const { data: claimed } = await db.from("email_assistant_pending_changes")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", row.id).eq("status", "pending").select("id").maybeSingle();
  if (!claimed) return json({ ok: true, done: true, ...view });

  const update = Object.fromEntries(changes.map((c) => [c.field, (row.changes as Record<string, unknown>)[c.field]]));
  const { error } = await db.from(spec.table).update(update).eq("id", row.item_id);
  if (error) {
    await db.from("email_assistant_pending_changes").update({ status: "failed", error: error.message }).eq("id", row.id);
    console.error("[EMAIL-ASSISTANT-CONFIRM]", error.message);
  }

  if (isMailConfigured() && settings.notify_email) {
    const rows = changes.map((c) =>
      `<tr><td style="padding:4px 8px;border-top:1px solid #ddd">${escapeHtml(c.field)}</td><td style="padding:4px 8px;border-top:1px solid #ddd">${escapeHtml(c.before)}</td><td style="padding:4px 8px;border-top:1px solid #ddd">${escapeHtml(c.after)}</td></tr>`).join("");
    await sendMail({
      to: settings.notify_email,
      subject: "OSMRTNICA.COM.HR",
      replyTo: row.owner_email,
      html: `<div style="font-family:Arial,sans-serif;max-width:720px"><div style="background:${error ? "#fde2e2" : "#e9f7ec"};border-radius:6px;padding:14px 16px">
<p style="margin:0 0 8px;font-weight:bold">${error ? "IZMJENA NIJE USPJELA, provjeri ručno" : "PROMIJENIO SAM NA WEBU"}</p>
<p style="margin:0 0 8px">${escapeHtml(row.item_summary ?? "")}<br>Potvrdio: ${escapeHtml(row.owner_email)} (klikom na gumb u mailu poslanom na tu adresu)</p>
<table style="font-size:13px;border-collapse:collapse;width:100%"><tr><th align="left" style="padding:4px 8px">Polje</th><th align="left" style="padding:4px 8px">Prije</th><th align="left" style="padding:4px 8px">Poslije</th></tr>${rows}</table>
${error ? `<p>Greška: ${escapeHtml(error.message)}</p>` : ""}</div></div>`,
    }).catch((e) => console.error("[EMAIL-ASSISTANT-CONFIRM] notify failed", e instanceof Error ? e.message : String(e)));
  }
  return error ? json({ ok: false, code: "error", ...view }, 500) : json({ ok: true, done: true, ...view });
});
