import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1";
import { sendMail } from "../_shared/mail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[SEND-MEMORIAL-INVOICE] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const FONT_URL = "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf";
const FONT_BOLD_URL = "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf";

const stripDiacritics = (s: string) =>
  s
    .replace(/č|ć/g, "c").replace(/Č|Ć/g, "C")
    .replace(/ž/g, "z").replace(/Ž/g, "Z")
    .replace(/š/g, "s").replace(/Š/g, "S")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .replace(/€/g, "EUR");

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}.`;
};

const formatMoney = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",")} €`;

interface InvoiceData {
  invoiceNumber: string;
  issuedAt: string;
  buyerName: string;
  buyerEmail: string;
  itemDescription: string;
  amountCents: number;
  paymentRef: string;
}

const buildInvoicePdf = async (data: InvoiceData) => {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  let regular, bold, unicode = false;
  try {
    const [r, b] = await Promise.all([
      fetch(FONT_URL).then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error("font")))),
      fetch(FONT_BOLD_URL).then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error("font")))),
    ]);
    regular = await pdf.embedFont(r, { subset: true });
    bold = await pdf.embedFont(b, { subset: true });
    unicode = true;
  } catch (_e) {
    log("Font fallback to Helvetica");
    regular = await pdf.embedFont(StandardFonts.Helvetica);
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  }

  const t = (s: string) => (unicode ? s : stripDiacritics(s));
  const page = pdf.addPage([595, 842]);
  const gold = rgb(0.72, 0.58, 0.29);
  const dark = rgb(0.13, 0.13, 0.14);
  const grey = rgb(0.42, 0.42, 0.45);
  const left = 56;
  let y = 782;

  const draw = (
    text: string,
    opts: { x?: number; size?: number; font?: typeof regular; color?: ReturnType<typeof rgb> } = {}
  ) => {
    page.drawText(t(text), {
      x: opts.x ?? left,
      y,
      size: opts.size ?? 10,
      font: opts.font ?? regular,
      color: opts.color ?? dark,
    });
  };

  draw("osmrtnica.com.hr", { size: 20, font: bold, color: gold });
  y -= 18;
  draw("Digitalni memorijali i osmrtnice", { size: 9, color: grey });

  y = 782;
  draw("RAČUN", { x: 430, size: 20, font: bold });
  y -= 18;
  draw(`Broj: ${data.invoiceNumber}`, { x: 430, size: 9, color: grey });
  y -= 13;
  draw(`Datum: ${formatDate(data.issuedAt)}`, { x: 430, size: 9, color: grey });

  y = 712;
  page.drawLine({ start: { x: left, y }, end: { x: 539, y }, thickness: 1, color: gold });

  y -= 30;
  draw("KUPAC", { size: 9, font: bold, color: grey });
  y -= 16;
  draw(data.buyerName || data.buyerEmail, { size: 11 });
  y -= 14;
  draw(data.buyerEmail, { size: 10, color: grey });

  y -= 44;
  page.drawRectangle({ x: left, y: y - 6, width: 483, height: 24, color: rgb(0.96, 0.95, 0.92) });
  draw("OPIS", { x: left + 10, size: 9, font: bold, color: grey });
  draw("IZNOS", { x: 470, size: 9, font: bold, color: grey });

  y -= 34;
  draw(data.itemDescription, { x: left + 10, size: 10 });
  draw(formatMoney(data.amountCents), { x: 470, size: 10 });

  y -= 16;
  page.drawLine({ start: { x: left, y }, end: { x: 539, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });

  y -= 26;
  draw("UKUPNO ZA PLAĆANJE", { x: left + 10, size: 11, font: bold });
  draw(formatMoney(data.amountCents), { x: 445, size: 13, font: bold, color: gold });

  y -= 24;
  draw("Status: PLAĆENO", { x: left + 10, size: 10, font: bold, color: rgb(0.14, 0.5, 0.28) });

  y -= 60;
  draw("Način plaćanja: kartično plaćanje (Stripe)", { size: 9, color: grey });
  y -= 13;
  draw(`Referenca transakcije: ${data.paymentRef}`, { size: 9, color: grey });
  y -= 13;
  draw("Cijena je izražena u eurima (EUR).", { size: 9, color: grey });

  y = 90;
  page.drawLine({ start: { x: left, y: y + 20 }, end: { x: 539, y: y + 20 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  draw("Hvala vam na kupnji i povjerenju.", { size: 9, font: bold, color: grey });
  y -= 13;
  draw("osmrtnica.com.hr · info@osmrtnica.com.hr · www.osmrtnica.com.hr", { size: 8, color: grey });

  const bytes = await pdf.save();
  return bytes;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memorial_id } = await req.json();
    if (!memorial_id || typeof memorial_id !== "string") throw new Error("Missing memorial_id");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: memorial, error: memorialError } = await admin
      .from("memorials")
      .select(
        "id, slug, owner_id, paid, paid_at, invoice_number, invoice_sent_at, stripe_payment_intent_id, stripe_session_id, deceased_id"
      )
      .eq("id", memorial_id)
      .maybeSingle();

    if (memorialError) throw new Error(memorialError.message);
    if (!memorial) throw new Error("Memorijal nije nađen");
    if (!memorial.paid) throw new Error("Memorijal nije plaćen");

    if (memorial.invoice_sent_at) {
      log("Invoice already sent", { memorialId: memorial.id });
      return new Response(JSON.stringify({ already_sent: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", memorial.owner_id)
      .maybeSingle();

    let email = profile?.email ?? null;
    if (!email) {
      const { data: userData } = await admin.auth.admin.getUserById(memorial.owner_id);
      email = userData?.user?.email ?? null;
    }
    if (!email) throw new Error("Nema e-mail adrese vlasnika memorijala");

    const buyerName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();

    const { data: deceased } = await admin
      .from("obituaries")
      .select("ime, prezime")
      .eq("id", memorial.deceased_id)
      .maybeSingle();
    const fullName = deceased ? `${deceased.ime} ${deceased.prezime}` : "voljenu osobu";

    let invoiceNumber = (memorial.invoice_number as string | null) ?? null;
    if (!invoiceNumber) {
      const now = new Date();
      const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      invoiceNumber = `DM-${stamp}-${memorial.id.slice(0, 6).toUpperCase()}`;
    }

    const issuedAt = (memorial.paid_at as string | null) ?? new Date().toISOString();
    const pdfBytes = await buildInvoicePdf({
      invoiceNumber,
      issuedAt,
      buyerName,
      buyerEmail: email,
      itemDescription: `Digitalni memorijal za ${fullName}`,
      amountCents: 3900,
      paymentRef: (memorial.stripe_payment_intent_id ?? memorial.stripe_session_id ?? "-") as string,
    });

    const memorialUrl = `https://osmrtnica.com.hr/memorijal/${memorial.slug}`;
    const html = `
      <div style="font-family:Georgia,'Times New Roman',serif;background:#faf9f7;padding:32px;color:#222">
        <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #ece7dd;border-radius:12px;padding:32px">
            <p style="margin:0 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#b8944a">osmrtnica.com.hr</p>
          <h1 style="margin:0 0 16px;font-size:22px;color:#1f1f22">Hvala vam na kupnji</h1>
          <p style="font-size:15px;line-height:1.7;margin:0 0 16px">
            ${buyerName ? `Poštovani/a ${buyerName},` : "Poštovani,"}
          </p>
          <p style="font-size:15px;line-height:1.7;margin:0 0 16px">
            Vaše plaćanje je uspješno primljeno i digitalni memorijal za <strong>${fullName}</strong> je objavljen.
            Zahvaljujemo vam na povjerenju — čast nam je čuvati uspomenu na vašu voljenu osobu.
          </p>
          <p style="font-size:15px;line-height:1.7;margin:0 0 24px">
            Račun se nalazi u prilogu ovog e-maila u PDF obliku.
          </p>
          <p style="margin:0 0 28px">
            <a href="${memorialUrl}" style="display:inline-block;background:#b8944a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px">Otvorite memorijal</a>
          </p>
          <p style="font-size:13px;line-height:1.7;color:#6b6b70;margin:0">
            Ako imate bilo kakvih pitanja, odgovorite na ovaj e-mail i rado ćemo vam pomoći.<br/>
            S poštovanjem,<br/>osmrtnica.com.hr
          </p>
        </div>
      </div>`;

    await sendMail({
      to: [email],
      subject: `Hvala na kupnji – račun ${invoiceNumber}`,
      html,
      attachments: [
        {
          filename: `Racun-${invoiceNumber}.pdf`,
          content: pdfBytes,
          contentType: "application/pdf",
        },
      ],
    });

    await admin
      .from("memorials")
      .update({ invoice_number: invoiceNumber, invoice_email: email, invoice_sent_at: new Date().toISOString() })
      .eq("id", memorial.id);

    log("Invoice sent", { memorialId: memorial.id, invoiceNumber });

    return new Response(JSON.stringify({ sent: true, invoice_number: invoiceNumber }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
