// Invoice pipeline shared by the Stripe webhook, retry and admin functions.
// Never trusts client input: amounts always come from the verified Stripe object.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  getAccessToken,
  getMinimaxConfig,
  MinimaxError,
  MinimaxNotConfigured,
  minimaxFetch,
  minimaxRequest,
  type MinimaxConfig,
} from "./minimax.ts";
import { sendMail } from "./mail.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const adminClient = (): SupabaseClient =>
  createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });

export const logInvoice = async (
  admin: SupabaseClient,
  invoiceId: string | null,
  event: string,
  status: string,
  message?: string,
  externalId?: string | null
) => {
  await admin.from("invoice_logs").insert({
    invoice_id: invoiceId,
    event,
    status,
    message: message ? message.slice(0, 2000) : null,
    external_id: externalId ?? null,
  });
};

export interface InvoiceSettings {
  id: string;
  minimax_organisation_id: string | null;
  default_customer_type: string;
  default_item_name: string;
  default_item_code: string | null;
  default_vat_rate: number;
  vat_exempt: boolean;
  default_currency: string;
  default_payment_method: string;
  document_numbering: string | null;
  test_mode: boolean;
  auto_issue: boolean;
  send_email_to_customer: boolean;
}

export const getSettings = async (admin: SupabaseClient): Promise<InvoiceSettings | null> => {
  const { data } = await admin.from("invoice_settings").select("*").limit(1).maybeSingle();
  return (data as InvoiceSettings) ?? null;
};

/** Creates the invoice record for a paid Stripe checkout session. Idempotent. */
export const upsertInvoiceForSession = async (
  admin: SupabaseClient,
  args: {
    sessionId: string;
    paymentIntentId: string | null;
    customerId: string | null;
    livemode: boolean;
    amountGross: number; // in currency units, from Stripe
    currency: string;
    memorialId: string | null;
    userId: string | null;
    stripeEmail: string | null;
    productName: string;
    productDescription: string | null;
    paidAt: string;
  }
) => {
  // Duplicate guard on both Stripe identifiers.
  const { data: existing } = await admin
    .from("invoices")
    .select("*")
    .or(
      [
        `stripe_checkout_session_id.eq.${args.sessionId}`,
        args.paymentIntentId ? `stripe_payment_intent_id.eq.${args.paymentIntentId}` : null,
      ]
        .filter(Boolean)
        .join(",")
    )
    .maybeSingle();

  if (existing) return { invoice: existing, created: false };

  const settings = await getSettings(admin);

  let billing: Record<string, unknown> | null = null;
  if (args.memorialId) {
    const { data } = await admin
      .from("billing_details")
      .select("*")
      .eq("memorial_id", args.memorialId)
      .maybeSingle();
    billing = data ?? null;
  }

  let name = (billing?.full_name as string) ?? "";
  let email = (billing?.email as string) ?? args.stripeEmail ?? "";
  if (!name && args.userId) {
    const { data: profile } = await admin
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", args.userId)
      .maybeSingle();
    name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
    email = email || (profile?.email ?? "");
  }

  const vatRate = settings?.vat_exempt ? 0 : Number(settings?.default_vat_rate ?? 0);
  const gross = args.amountGross;
  const net = vatRate > 0 ? Number((gross / (1 + vatRate / 100)).toFixed(2)) : gross;
  const tax = Number((gross - net).toFixed(2));

  const { data: inserted, error } = await admin
    .from("invoices")
    .insert({
      memorial_id: args.memorialId,
      user_id: args.userId,
      stripe_checkout_session_id: args.sessionId,
      stripe_payment_intent_id: args.paymentIntentId,
      stripe_customer_id: args.customerId,
      stripe_livemode: args.livemode,
      customer_type: (billing?.customer_type as string) ?? settings?.default_customer_type ?? "individual",
      customer_name: name,
      customer_email: email,
      customer_address: (billing?.address as string) ?? null,
      customer_city: (billing?.city as string) ?? null,
      customer_postal_code: (billing?.postal_code as string) ?? null,
      customer_country: (billing?.country as string) ?? "HR",
      customer_oib: (billing?.oib as string) ?? null,
      customer_company: (billing?.company_name as string) ?? null,
      customer_vat_id: (billing?.vat_id as string) ?? null,
      product_name: args.productName || settings?.default_item_name || "Digitalni memorijal",
      product_description: args.productDescription,
      quantity: 1,
      amount_net: net,
      tax_rate: vatRate,
      tax_amount: tax,
      amount_gross: gross,
      currency: args.currency.toUpperCase(),
      payment_method: "card",
      invoice_status: "pending",
      fiscalization_status: "not_started",
      stripe_paid_at: args.paidAt,
      invoice_created_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    // Unique violation → another webhook delivery won the race.
    const { data: raced } = await admin
      .from("invoices")
      .select("*")
      .eq("stripe_checkout_session_id", args.sessionId)
      .maybeSingle();
    if (raced) return { invoice: raced, created: false };
    throw new Error(error.message);
  }

  await logInvoice(admin, inserted.id, "stripe_payment_received", "ok", `Session ${args.sessionId}`, args.paymentIntentId);
  await logInvoice(admin, inserted.id, "invoice_created", "pending");
  return { invoice: inserted, created: true };
};

/**
 * Records a 0 € activation (100 % promo code) in the admin invoice list.
 * Not sent to Minimax: nothing was charged, so there is nothing to fiscalize.
 */
export const upsertFreeInvoice = async (
  admin: SupabaseClient,
  args: { orderId: string | null; memorialId: string; userId: string | null; email: string | null; name: string | null; promoCode: string | null; livemode: boolean; paidAt: string }
) => {
  const { data: existing } = await admin
    .from("invoices").select("id").eq("memorial_id", args.memorialId).eq("payment_method", "promo_code").maybeSingle();
  if (existing) return existing;
  const { data: billing } = await admin.from("billing_details").select("*").eq("memorial_id", args.memorialId).maybeSingle();
  const { data, error } = await admin.from("invoices").insert({
    order_id: args.orderId,
    memorial_id: args.memorialId,
    user_id: args.userId,
    stripe_livemode: args.livemode,
    customer_type: billing?.customer_type ?? "individual",
    customer_name: billing?.full_name ?? args.name ?? "",
    customer_email: billing?.email ?? args.email ?? "",
    customer_company: billing?.company_name ?? null,
    customer_oib: billing?.oib ?? null,
    customer_country: billing?.country ?? "HR",
    product_name: "Digitalni memorijal",
    product_description: args.promoCode ? `Besplatno uz promo kod ${args.promoCode}` : "Besplatna aktivacija",
    quantity: 1,
    amount_net: 0, tax_rate: 0, tax_amount: 0, amount_gross: 0,
    currency: "EUR",
    payment_method: "promo_code",
    invoice_status: "free",
    fiscalization_status: "not_required",
    stripe_paid_at: args.paidAt,
    invoice_created_at: new Date().toISOString(),
  }).select("id").single();
  if (error) throw new Error(error.message);
  await logInvoice(admin, data.id, "free_activation", "ok", args.promoCode ?? undefined);
  return data;
};

const isoDate = (d = new Date()) => d.toISOString().slice(0, 10);

const rowsOf = (data: unknown): Record<string, any>[] => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const record = data as Record<string, unknown>;
  if (Array.isArray(record.Rows)) return record.Rows as Record<string, any>[];
  if (Array.isArray(record.Item)) return record.Item as Record<string, any>[];
  return [];
};

const searchMinimax = async (cfg: MinimaxConfig, path: string, searchString?: string) => {
  const params = new URLSearchParams({ CurrentPage: "1", PageSize: "100" });
  if (searchString) params.set("SearchString", searchString);
  return rowsOf(await minimaxFetch(cfg, `${path}?${params.toString()}`));
};

const resourceId = (data: unknown, location: string | null, keys: string[]) => {
  const record = (data ?? {}) as Record<string, any>;
  for (const key of keys) {
    const value = record[key] ?? record.Data?.[key];
    if (value !== undefined && value !== null && value !== "") return String(value);
  }
  return location?.match(/\/(\d+)\/?(?:\?.*)?$/)?.[1] ?? "";
};

const decodeBase64 = (value: string) => {
  const clean = value.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const findCountry = async (cfg: MinimaxConfig, code: string) => {
  const wanted = (code || "HR").trim();
  const rows = await searchMinimax(cfg, `api/orgs/${cfg.organisationId}/countries`, wanted);
  return rows.find((row) => String(row.Code).toUpperCase() === wanted.toUpperCase())
    ?? rows.find((row) => String(row.Name).toLowerCase() === wanted.toLowerCase())
    ?? null;
};

const findCurrencyId = async (cfg: MinimaxConfig, code: string, country: Record<string, any> | null) => {
  const countryCurrency = country?.Currency;
  if (countryCurrency?.ID && (code === "EUR" || String(countryCurrency.Name).toUpperCase() === code)) {
    return Number(countryCurrency.ID);
  }
  const rows = await searchMinimax(cfg, `api/orgs/${cfg.organisationId}/currencies`, code);
  const match = rows.find((row) => String(row.Code).toUpperCase() === code);
  if (!match?.CurrencyId) throw new MinimaxError(`Minimax nema valutu ${code}`, 0);
  return Number(match.CurrencyId);
};

const findVatRate = async (cfg: MinimaxConfig, countryId: number, percent: number, exempt: boolean) => {
  const rows = rowsOf(await minimaxFetch(
    cfg,
    `api/orgs/${cfg.organisationId}/vatrates?date=${isoDate()}&countryID=${countryId}&CurrentPage=1&PageSize=100`,
  ));
  const match = exempt || percent === 0
    ? rows.find((row) => row.Code === "O") ?? rows.find((row) => row.Code === "N") ?? rows.find((row) => Number(row.Percent) === 0)
    : rows.find((row) => Math.abs(Number(row.Percent) - percent) < 0.001)
      ?? (percent === 25 ? rows.find((row) => row.Code === "S") : undefined);
  if (!match?.VatRateId) throw new MinimaxError(`Minimax nema PDV stopu ${percent}%`, 0);
  return match;
};

const findPaymentMethodId = async (cfg: MinimaxConfig, preferred: string) => {
  const active = (await searchMinimax(cfg, `api/orgs/${cfg.organisationId}/paymentMethods`))
    .filter((row) => row.Usage !== "N");
  const wanted = preferred.trim().toLowerCase();
  const byName = active.find((row) => String(row.Name).toLowerCase() === wanted)
    ?? active.find((row) => wanted.length > 2 && String(row.Name).toLowerCase().includes(wanted));
  if (byName?.PaymentMethodId) return Number(byName.PaymentMethodId);
  if (["card", "kartica", "karticom"].includes(wanted)) {
    const card = active.find((row) => /kart|card|kredit/i.test(`${row.Name ?? ""} ${row.Type ?? ""}`));
    if (card?.PaymentMethodId) return Number(card.PaymentMethodId);
  }
  const fallback = active.find((row) => row.Default === "D") ?? active[0];
  if (!fallback?.PaymentMethodId) throw new MinimaxError("Minimax nema način plaćanja", 0);
  return Number(fallback.PaymentMethodId);
};

const findDocumentNumberingId = async (cfg: MinimaxConfig, preferred: string | null) => {
  const issued = (await searchMinimax(cfg, `api/orgs/${cfg.organisationId}/document-numbering`))
    .filter((row) => row.Document === "IR" && row.Usage !== "N");
  if (preferred?.trim()) {
    const name = preferred.trim().toLowerCase();
    const match = issued.find((row) => String(row.Code).toLowerCase() === name || String(row.Name).toLowerCase() === name);
    if (!match?.DocumentNumberingId) throw new MinimaxError(`Minimax nema numeraciju računa "${preferred.trim()}"`, 0);
    return Number(match.DocumentNumberingId);
  }
  const fallback = issued.find((row) => row.Default === "D") ?? issued[0];
  return fallback?.DocumentNumberingId ? Number(fallback.DocumentNumberingId) : null;
};

/** Finds or creates the Minimax customer for the invoice. */
const ensureMinimaxCustomer = async (
  cfg: MinimaxConfig,
  invoice: Record<string, any>,
  countryId: number,
  currencyId: number,
) => {
  const isCompany = invoice.customer_type === "company";
  const name = ((isCompany ? invoice.customer_company : invoice.customer_name) || invoice.customer_email || "Kupac").trim();
  const taxNumber = String(invoice.customer_oib ?? "").trim();
  const found = await searchMinimax(cfg, `api/orgs/${cfg.organisationId}/customers`, taxNumber || name);
  const existing = taxNumber
    ? found.find((row) => String(row.TaxNumber ?? "") === taxNumber)
    : found.find((row) => String(row.Name ?? "").trim().toLowerCase() === name.toLowerCase());
  if (existing?.CustomerId) return Number(existing.CustomerId);

  const payload: Record<string, unknown> = {
    Name: name,
    Country: { ID: countryId },
    Currency: { ID: currencyId },
    SubjectToVAT: isCompany ? (invoice.customer_vat_id ? "D" : "M") : "N",
    Usage: "D",
  };
  if (invoice.customer_address) payload.Address = invoice.customer_address;
  if (invoice.customer_postal_code) payload.PostalCode = invoice.customer_postal_code;
  if (invoice.customer_city) payload.City = invoice.customer_city;
  if (taxNumber) payload.TaxNumber = taxNumber;
  if (invoice.customer_vat_id) payload.VATIdentificationNumber = invoice.customer_vat_id;

  const created = await minimaxRequest(cfg, `api/orgs/${cfg.organisationId}/customers`, { method: "POST", body: payload });
  const id = resourceId(created.data, created.location, ["CustomerId"]);
  if (!id) throw new MinimaxError("Minimax nije vratio ID kupca", 0);
  return Number(id);
};

const loadInvoicePdf = async (cfg: MinimaxConfig, invoiceId: string) => {
  try {
    const data = await minimaxFetch(cfg, `api/orgs/${cfg.organisationId}/issuedinvoices/${invoiceId}/attachments`);
    const list = rowsOf(data);
    const file = list.find((row) => /pdf/i.test(`${row.AttachmentMimeType ?? ""} ${row.AttachmentFileName ?? ""}`)) ?? list[0];
    if (!file?.AttachmentData) return null;
    return decodeBase64(String(file.AttachmentData));
  } catch {
    return null;
  }
};

export interface IssueResult {
  minimaxInvoiceId: string;
  minimaxInvoiceNumber: string | null;
  minimaxDocumentId: string | null;
  pdf: Uint8Array | null;
}

/** Creates + issues (and generates PDF for) the invoice in Minimax. */
export const issueInMinimax = async (
  admin: SupabaseClient,
  invoice: Record<string, any>,
  settings: InvoiceSettings | null
): Promise<IssueResult> => {
  const cfg = getMinimaxConfig(settings?.minimax_organisation_id ?? null);
  await getAccessToken(cfg);
  await logInvoice(admin, invoice.id, "minimax_authentication", "ok");

  const country = await findCountry(cfg, invoice.customer_country || "HR");
  if (!country?.CountryId) throw new MinimaxError(`Minimax nema državu ${invoice.customer_country || "HR"}`, 0);
  const currencyCode = String(invoice.currency || settings?.default_currency || "EUR").toUpperCase();
  const currencyId = await findCurrencyId(cfg, currencyCode, country);
  const vatExempt = Boolean(settings?.vat_exempt);
  const vatPercent = vatExempt ? 0 : Number(invoice.tax_rate ?? settings?.default_vat_rate ?? 0);
  const vatRate = await findVatRate(cfg, Number(country.CountryId), vatPercent, vatExempt);
  const paymentMethodId = await findPaymentMethodId(cfg, settings?.default_payment_method || invoice.payment_method || "card");
  const numberingId = await findDocumentNumberingId(cfg, settings?.document_numbering ?? null);

  let minimaxInvoiceId = invoice.minimax_invoice_id ? String(invoice.minimax_invoice_id) : "";
  let detail: Record<string, any> | null = null;

  if (minimaxInvoiceId) {
    detail = (await minimaxFetch(cfg, `api/orgs/${cfg.organisationId}/issuedinvoices/${minimaxInvoiceId}`)) as Record<string, any> | null;
  } else {
    const customerId = await ensureMinimaxCustomer(cfg, invoice, Number(country.CountryId), currencyId);
    const quantity = Number(invoice.quantity ?? 1) || 1;
    const gross = Number(invoice.amount_gross ?? 0);
    const net = Number(invoice.amount_net ?? gross);
    const priceIncludesVat = !vatExempt && vatPercent > 0;
    const paidOn = isoDate(invoice.stripe_paid_at ? new Date(invoice.stripe_paid_at) : new Date());
    const body: Record<string, unknown> = {
      Customer: { ID: customerId },
      DateIssued: isoDate(),
      DateTransaction: paidOn,
      DateTransactionFrom: paidOn,
      DateDue: isoDate(),
      Currency: { ID: currencyId },
      InvoiceType: "R",
      PricesOnInvoice: priceIncludesVat ? "D" : "N",
      RecurringInvoice: "N",
      IssuedInvoiceRows: [{
        RowNumber: 1,
        ItemName: invoice.product_name || settings?.default_item_name || "Digitalni memorijal",
        ItemCode: settings?.default_item_code || undefined,
        Description: invoice.product_description || undefined,
        Quantity: quantity,
        UnitOfMeasurement: "kom",
        Price: priceIncludesVat ? Number((gross / quantity).toFixed(2)) : Number((net / quantity).toFixed(2)),
        VATPercent: vatPercent,
        VatRate: { ID: Number(vatRate.VatRateId) },
        ...(vatRate.VatRatePercentage?.ID ? { VatRatePercentage: { ID: Number(vatRate.VatRatePercentage.ID) } } : {}),
      }],
      IssuedInvoicePaymentMethods: [{
        PaymentMethod: { ID: paymentMethodId },
        Amount: gross,
        AlreadyPaid: "D",
      }],
    };
    if (numberingId) body.DocumentNumbering = { ID: numberingId };

    const created = await minimaxRequest(cfg, `api/orgs/${cfg.organisationId}/issuedinvoices`, { method: "POST", body });
    minimaxInvoiceId = resourceId(created.data, created.location, ["IssuedInvoiceId"]);
    if (!minimaxInvoiceId) throw new MinimaxError("Minimax nije vratio ID računa", 0);

    // Persist the ID immediately so a retry resumes this draft instead of creating another.
    await admin.from("invoices").update({ minimax_invoice_id: minimaxInvoiceId, invoice_status: "processing" }).eq("id", invoice.id);
    await logInvoice(admin, invoice.id, "minimax_invoice_created", "ok", null, minimaxInvoiceId);
    const createdRecord = created.data as Record<string, any> | null;
    detail = createdRecord?.RowVersion
      ? createdRecord
      : (await minimaxFetch(cfg, `api/orgs/${cfg.organisationId}/issuedinvoices/${minimaxInvoiceId}`)) as Record<string, any> | null;
  }

  if (detail?.Status !== "I") {
    const rowVersion = detail?.RowVersion;
    if (!rowVersion) throw new MinimaxError("Minimax nije vratio RowVersion računa", 0);
    await minimaxFetch(
      cfg,
      `api/orgs/${cfg.organisationId}/issuedinvoices/${minimaxInvoiceId}/actions/issueAndGeneratepdf?rowVersion=${encodeURIComponent(rowVersion)}`,
      { method: "PUT" },
    );
    detail = (await minimaxFetch(cfg, `api/orgs/${cfg.organisationId}/issuedinvoices/${minimaxInvoiceId}`)) as Record<string, any> | null;
  }

  return {
    minimaxInvoiceId,
    minimaxInvoiceNumber: detail?.InvoiceNumber != null ? String(detail.InvoiceNumber) : null,
    minimaxDocumentId: detail?.Document?.ID ? String(detail.Document.ID) : null,
    pdf: await loadInvoicePdf(cfg, minimaxInvoiceId),
  };
};

export const sendInvoiceEmail = async (
  admin: SupabaseClient,
  invoice: Record<string, any>,
  pdf: Uint8Array | null,
  invoiceNumber: string | null
) => {
  if (!invoice.customer_email) throw new Error("Kupac nema e-mail adresu");

  const html = `
    <div style="font-family:Georgia,'Times New Roman',serif;background:#faf9f7;padding:32px;color:#222">
      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #ece7dd;border-radius:12px;padding:32px">
        <p style="margin:0 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#b8944a">osmrtnica.com.hr</p>
        <h1 style="margin:0 0 16px;font-size:22px;color:#1f1f22">Vaš račun</h1>
        <p style="font-size:15px;line-height:1.7;margin:0 0 16px">Poštovani,</p>
        <p style="font-size:15px;line-height:1.7;margin:0 0 16px">
          hvala na kupnji digitalnog memorijala na osmrtnica.com.hr.
        </p>
        <p style="font-size:15px;line-height:1.7;margin:0 0 16px">
          ${pdf ? "U privitku" : "Putem poveznice"} možete pronaći račun za izvršenu kupnju${invoiceNumber ? ` (broj ${invoiceNumber})` : ""}.
        </p>
        ${!pdf && invoice.minimax_pdf_url ? `<p><a href="${invoice.minimax_pdf_url}">Preuzmite račun</a></p>` : ""}
        <p style="font-size:15px;line-height:1.7;margin:0">Lijep pozdrav,<br/>osmrtnica.com.hr</p>
      </div>
    </div>`;

  await sendMail({
    to: [invoice.customer_email],
    subject: "Vaš račun – osmrtnica.com.hr",
    html,
    attachments: pdf
      ? [{ filename: `Racun-${invoiceNumber ?? invoice.id.slice(0, 8)}.pdf`, content: pdf, contentType: "application/pdf" }]
      : undefined,
  });
  await admin.from("invoices").update({ email_sent_at: new Date().toISOString() }).eq("id", invoice.id);
  await logInvoice(admin, invoice.id, "email_sent", "ok", invoice.customer_email);
};

const RETRY_DELAYS_MIN = [5, 30, 120];

/** Full issue + email pipeline for one invoice row. Safe to call repeatedly. */
export const processInvoice = async (admin: SupabaseClient, invoiceId: string) => {
  const { data: invoice } = await admin.from("invoices").select("*").eq("id", invoiceId).maybeSingle();
  if (!invoice) return { ok: false, reason: "not_found" };
  if (invoice.invoice_status === "issued") return { ok: true, reason: "already_issued" };
  if (invoice.invoice_status === "refunded" || invoice.invoice_status === "cancelled") {
    return { ok: false, reason: invoice.invoice_status };
  }

  const settings = await getSettings(admin);

  // Live Stripe charges only. A test payment must never be fiscalized.
  if (!invoice.stripe_livemode) {
    await admin
      .from("invoices")
      .update({
        invoice_status: "manual_required",
        error_message: "Stripe test uplata se ne šalje u Minimax.",
      })
      .eq("id", invoice.id);
    await logInvoice(admin, invoice.id, "invoice_created", "manual_required", "Stripe test payment skipped");
    return { ok: false, reason: "stripe_test_skipped" };
  }

  try {
    const result = await issueInMinimax(admin, invoice, settings);
    await admin
      .from("invoices")
      .update({
        invoice_status: "issued",
        fiscalization_status: "fiscalized",
        fiscalized_at: new Date().toISOString(),
        minimax_invoice_id: result.minimaxInvoiceId,
        minimax_invoice_number: result.minimaxInvoiceNumber,
        minimax_document_id: result.minimaxDocumentId,
        error_message: null,
        next_retry_at: null,
      })
      .eq("id", invoice.id);
    await logInvoice(admin, invoice.id, "fiscalization_success", "ok", null, result.minimaxInvoiceId);

    if (settings?.send_email_to_customer !== false) {
      try {
        const { data: fresh } = await admin.from("invoices").select("*").eq("id", invoice.id).maybeSingle();
        await sendInvoiceEmail(admin, fresh ?? invoice, result.pdf, result.minimaxInvoiceNumber);
      } catch (mailError) {
        await logInvoice(admin, invoice.id, "email_sent", "failed", String(mailError));
      }
    }
    return { ok: true, reason: "issued" };
  } catch (error) {
    const notConfigured = error instanceof MinimaxNotConfigured;
    const retryable = error instanceof MinimaxError ? error.retryable : !notConfigured;
    const retryCount = Number(invoice.retry_count ?? 0) + (notConfigured ? 0 : 1);
    const delay = RETRY_DELAYS_MIN[Math.min(retryCount - 1, RETRY_DELAYS_MIN.length - 1)] ?? null;

    const status = notConfigured || !retryable || retryCount > RETRY_DELAYS_MIN.length ? "manual_required" : "failed";
    await admin
      .from("invoices")
      .update({
        invoice_status: status,
        fiscalization_status: notConfigured ? "not_started" : "failed",
        retry_count: retryCount,
        next_retry_at: status === "failed" && delay ? new Date(Date.now() + delay * 60_000).toISOString() : null,
        error_message: notConfigured ? "Minimax integration not configured" : String(error).slice(0, 1000),
      })
      .eq("id", invoice.id);
    await logInvoice(
      admin,
      invoice.id,
      notConfigured ? "invoice_created" : "fiscalization_failed",
      status,
      notConfigured ? "Minimax integration not configured" : String(error).slice(0, 1000)
    );
    return { ok: false, reason: status };
  }
};
