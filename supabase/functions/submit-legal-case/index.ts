import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { sendMail, isMailConfigured } from "../_shared/mail.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const Attachment = z.object({ name: z.string().max(200), type: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]), base64: z.string().max(7_000_000) });
const Body = z.discriminatedUnion("case_type", [
  z.object({ case_type: z.literal("withdrawal"), full_name: z.string().trim().min(2).max(200), email: z.string().trim().email().max(255), order_reference: z.string().trim().max(200).optional().default(""), order_id: z.string().uuid().optional(), contract_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")), description: z.string().max(5000).optional().default("") }),
  z.object({ case_type: z.literal("complaint"), full_name: z.string().trim().min(2).max(200), email: z.string().trim().email().max(255), order_reference: z.string().trim().max(200).optional().default(""), description: z.string().trim().min(10).max(10000) }),
  z.object({ case_type: z.literal("content_report"), full_name: z.string().trim().max(200).optional().default(""), email: z.string().trim().email().max(255).optional().or(z.literal("")), content_url: z.string().trim().url().max(1000), problem_type: z.string().trim().min(2).max(100), description: z.string().trim().min(10).max(10000), good_faith: z.literal(true), attachments: z.array(Attachment).max(3).optional().default([]) }),
]);

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const fmt = (d: Date) => d.toLocaleString("hr-HR", { timeZone: "Europe/Zagreb", dateStyle: "long", timeStyle: "medium" });
const TITLES = { withdrawal: "Izjava o jednostranom raskidu ugovora", complaint: "Pisani prigovor", content_report: "Prijava sadržaja" } as const;
const PREFIX = { withdrawal: "R", complaint: "P", content_report: "S" } as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Provjerite unesene podatke.", details: parsed.error.flatten().fieldErrors }, 400);
    const b = parsed.data;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Optional signed-in user (never required).
    let userId: string | null = null;
    const auth = req.headers.get("Authorization");
    if (auth) {
      const { data } = await admin.auth.getUser(auth.replace("Bearer ", ""));
      userId = data.user?.id ?? null;
    }

    const receivedAt = new Date();
    const caseNumber = `${PREFIX[b.case_type]}-${receivedAt.toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const row: Record<string, unknown> = { case_number: caseNumber, case_type: b.case_type, user_id: userId, received_at: receivedAt.toISOString(), full_name: b.full_name || null, email: b.email || null, description: b.description || null };

    if (b.case_type === "withdrawal") {
      row.order_reference = b.order_reference || null;
      row.contract_date = b.contract_date || null;
      // Link an order only when it belongs to the signed-in user — never reveal or attach someone else's order.
      if (b.order_id && userId) {
        const { data: o } = await admin.from("memorial_orders").select("id, memorial_id, paid_at, created_at").eq("id", b.order_id).eq("user_id", userId).maybeSingle();
        if (o) {
          row.order_id = o.id; row.memorial_id = o.memorial_id;
          const start = new Date(o.paid_at ?? o.created_at);
          row.within_14_days = receivedAt.getTime() - start.getTime() <= 14 * 86400_000;
          row.contract_date = row.contract_date ?? start.toISOString().slice(0, 10);
        }
      }
      row.response_due_at = new Date(receivedAt.getTime() + 14 * 86400_000).toISOString();
    } else if (b.case_type === "complaint") {
      row.order_reference = b.order_reference || null;
      row.response_due_at = new Date(receivedAt.getTime() + 15 * 86400_000).toISOString();
    } else {
      row.content_url = b.content_url; row.problem_type = b.problem_type; row.good_faith = true;
      const paths: string[] = [];
      for (const a of b.attachments) {
        const bytes = Uint8Array.from(atob(a.base64), (c) => c.charCodeAt(0));
        if (bytes.length > 5 * 1024 * 1024) return json({ error: "Prilog smije imati najviše 5 MB." }, 400);
        const ext = a.type === "application/pdf" ? "pdf" : a.type.split("/")[1];
        const path = `${caseNumber}/${crypto.randomUUID()}.${ext}`;
        const { error } = await admin.storage.from("legal-attachments").upload(path, bytes, { contentType: a.type });
        if (error) throw error;
        paths.push(path);
      }
      row.attachment_paths = paths;
    }

    const { error } = await admin.from("legal_cases").insert(row);
    if (error) throw error;

    const { data: biz } = await admin.from("business_settings").select("*").eq("id", 1).maybeSingle();
    const lines: [string, string][] = [
      ["Broj predmeta", caseNumber], ["Vrsta", TITLES[b.case_type]], ["Zaprimljeno", fmt(receivedAt)],
      ...(b.full_name ? [["Ime i prezime", b.full_name] as [string, string]] : []),
      ...(b.email ? [["E-mail", b.email] as [string, string]] : []),
      ...("order_reference" in b && b.order_reference ? [["Narudžba / memorijal", b.order_reference] as [string, string]] : []),
      ...("contract_date" in b && b.contract_date ? [["Datum sklapanja ugovora", b.contract_date] as [string, string]] : []),
      ...("content_url" in b ? [["Sadržaj", b.content_url] as [string, string], ["Vrsta problema", b.problem_type] as [string, string]] : []),
      ...(b.description ? [["Sadržaj podneska", b.description] as [string, string]] : []),
    ];
    const statement = b.case_type === "withdrawal" ? "<p><strong>Ovim izjavljujem da jednostrano raskidam ugovor o kupnji digitalnog memorijala na osmrtnica.com.hr.</strong></p>" : "";
    const next = b.case_type === "withdrawal"
      ? "<p>Povrat cjelokupnog stvarno plaćenog iznosa provodimo bez nepotrebnog odgađanja, najkasnije u roku od 14 dana od primitka izjave, istim sredstvom plaćanja. Memorijal ćemo ukloniti iz prikaza, a prije trajnog brisanja omogućit ćemo vam preuzimanje sadržaja. Slanjem izjave sadržaj nije obrisan.</p>"
      : b.case_type === "complaint" ? "<p>Na prigovor ćemo odgovoriti pisanim putem u roku od 15 dana od primitka.</p>"
      : "<p>Prijavu ćemo razmotriti i prema potrebi zatražiti dodatne informacije. Prijava ne znači automatsko uklanjanje sadržaja.</p>";
    const table = lines.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${esc(k)}</td><td style="padding:4px 0;white-space:pre-wrap">${esc(v)}</td></tr>`).join("");
    const footer = biz ? `<p style="color:#666;font-size:13px">${esc(biz.legal_name)}, ${esc(biz.address)}, ${esc([biz.postal_code, biz.city].filter(Boolean).join(" "))}, ${esc(biz.country)} · OIB ${esc(biz.oib)} · ${esc(biz.email)}</p>` : "";
    const html = `<div style="font-family:Arial,sans-serif;max-width:640px"><h2>Potvrda primitka: ${TITLES[b.case_type]}</h2>${statement}<table>${table}</table>${next}${footer}</div>`;

    let mailed = false;
    if (isMailConfigured()) {
      try {
        if (b.email) { await sendMail({ to: b.email, subject: `Potvrda primitka ${caseNumber} — ${TITLES[b.case_type]}`, html }); mailed = true; }
        await sendMail({ to: biz?.email ?? "info@osmrtnica.com.hr", subject: `[Novi predmet] ${caseNumber} — ${TITLES[b.case_type]}`, html });
      } catch (e) { console.error("mail failed", e instanceof Error ? e.message : e); }
    }
    return json({ ok: true, case_number: caseNumber, received_at: receivedAt.toISOString(), mailed });
  } catch (e) {
    console.error("submit-legal-case", e instanceof Error ? e.message : e);
    return json({ error: "Zahtjev nije spremljen. Pokušajte ponovno ili pišite na info@osmrtnica.com.hr." }, 500);
  }
});
