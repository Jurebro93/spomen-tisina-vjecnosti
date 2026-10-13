// Order confirmation e-mail on a durable medium: provider identity, order, amounts,
// contract/service start, full terms text and withdrawal info + model form.
import { isMailConfigured, sendMail } from "./mail.ts";

type Admin = any;
export type ConfirmationInput = {
  orderId: string; email: string; customerName: string | null; memorialSlug: string | null; fullName: string;
  originalAmount: number; discountAmount: number; amountPaid: number; promoCode: string | null;
  contractAt: string; serviceStartAt: string; termsVersion: string; isFree: boolean;
};

const SITE = "https://osmrtnica.com.hr";
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;
const dt = (iso: string) => new Date(iso).toLocaleString("hr-HR", { timeZone: "Europe/Zagreb", dateStyle: "long", timeStyle: "short" });

const termsHtml = (biz: any) => `
<h3>Uvjeti korištenja i kupnje (sažetak ugovornih odredbi važećih u trenutku narudžbe)</h3>
<p>Pružatelj usluge je ${esc(biz.legal_name)}, ${esc(biz.address)}, ${esc([biz.postal_code, biz.city].filter(Boolean).join(" "))}, ${esc(biz.country)}, OIB ${esc(biz.oib)}. Ugovor se sklapa na hrvatskom jeziku.</p>
<p><b>Digitalni memorijal</b> omogućuje čuvanje i predstavljanje uspomena kroz fotografije, videozapise i tekstove te naknadno uređivanje sadržaja. Cijena iznosi 39,00 € i plaća se jednokratno. Ne postoji pretplata ni naknada za obnovu. ${esc(biz.tax_note)}</p>
<p><b>Trajanje:</b> memorijal čuvamo trajno, bez unaprijed određenog roka isteka. Trajno čuvanje ne sprječava uklanjanje na zahtjev ovlaštenog korisnika, nakon raskida ugovora ili kada za uklanjanje postoji zakonska osnova.</p>
<p><b>Vidljivost:</b> Javno — dostupno svima i tražilicama. Samo putem poveznice — ne prikazuje se u popisima i pretraživanju, ali ga može otvoriti svatko tko ima poveznicu. Privatno — vide ga vlasnik i pozvani članovi obitelji.</p>
<p><b>Sklapanje ugovora:</b> kod plaćene narudžbe u trenutku potvrde uspješne naplate; kod besplatne aktivacije u trenutku potvrde gumbom „Aktiviraj besplatno”.</p>
<p><b>Promotivni kodovi:</b> kod sa 100 % popusta omogućuje besplatnu aktivaciju i ne daje pravo na isplatu redovne cijene u novcu.</p>
<p><b>Odustajanje:</b> potrošač može odustati od kupnje u roku od 14 dana od sklapanja ugovora bez navođenja razloga. Vraćamo cjelokupan stvarno plaćeni iznos, bez naknade za dotadašnje korištenje, najkasnije 14 dana od primitka izjave, istim sredstvom plaćanja. Pravo na raskid ne zamjenjuje prava zbog neisporuke ili neusklađenosti usluge.</p>
<p><b>Mjerodavno pravo:</b> pravo Republike Hrvatske, uz očuvanje prisilnih prava potrošača.</p>`;

const modelForm = `
<h3>Obrazac za jednostrani raskid</h3>
<p>Raskid možete podnijeti na <a href="${SITE}/raskid-i-povrat">${SITE}/raskid-i-povrat</a> ili poslati ovu izjavu e-mailom:</p>
<pre style="background:#f6f6f6;padding:12px;white-space:pre-wrap">Ovim izjavljujem da jednostrano raskidam ugovor o kupnji digitalnog memorijala na osmrtnica.com.hr.

Ime i prezime:
E-mail korišten pri kupnji:
Broj narudžbe ili oznaka memorijala:
Datum sklapanja ugovora, ako je poznat:
Datum podnošenja izjave:</pre>`;

export const sendOrderConfirmation = async (admin: Admin, i: ConfirmationInput) => {
  if (!i.email || !isMailConfigured()) return false;
  const { data: already } = await admin.from("payment_events").select("id").eq("order_id", i.orderId).eq("event_type", "confirmation_email").maybeSingle();
  if (already) return false;
  const { data: biz } = await admin.from("business_settings").select("*").eq("id", 1).single();
  const orderNo = i.orderId.slice(0, 8).toUpperCase();
  const immediate = new Date(i.serviceStartAt).getTime() - new Date(i.contractAt).getTime() < 60_000;
  const rows: [string, string][] = [
    ["Broj narudžbe", orderNo],
    ["Usluga", `Digitalni memorijal — ${i.fullName}`],
    ["Redovna cijena", eur(i.originalAmount)],
    ...(i.discountAmount > 0 ? [["Popust" + (i.promoCode ? ` (${i.promoCode})` : ""), `−${eur(i.discountAmount)}`] as [string, string]] : []),
    ["Konačni iznos", i.isFree ? "0,00 € (besplatna aktivacija)" : eur(i.amountPaid)],
    ["Ugovor sklopljen", dt(i.contractAt)],
    ["Početak usluge", immediate ? `${dt(i.serviceStartAt)} (na vaš izričit zahtjev odmah)` : `${dt(i.serviceStartAt)} (nakon isteka roka od 14 dana)`],
    ["Trajanje", "Trajno, bez unaprijed određenog roka isteka i bez naknade za obnovu"],
    ["Verzija uvjeta", i.termsVersion],
  ];
  const html = `<div style="font-family:Arial,sans-serif;max-width:680px;color:#222">
<h2>Potvrda narudžbe</h2>
<p>Poštovani${i.customerName ? ` ${esc(i.customerName)}` : ""}, hvala na narudžbi. U nastavku su podaci o ugovoru — sačuvajte ovaj e-mail.</p>
<table>${rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>
${i.memorialSlug ? `<p>Memorijal: <a href="${SITE}/memorijal/${esc(i.memorialSlug)}">${SITE}/memorijal/${esc(i.memorialSlug)}</a></p>` : ""}
${i.isFree ? "" : "<p>Ova potvrda nije fiskalizirani račun. Račun se izdaje zasebno.</p>"}
${termsHtml(biz)}
${modelForm}
<p style="color:#666;font-size:13px">${esc(biz.legal_name)} · ${esc(biz.address)}, ${esc([biz.postal_code, biz.city].filter(Boolean).join(" "))} · OIB ${esc(biz.oib)} · Podrška: ${esc(biz.email)}</p>
</div>`;
  await sendMail({ to: i.email, subject: `Potvrda narudžbe ${orderNo} — Digitalni memorijal`, html });
  await admin.from("payment_events").insert({ order_id: i.orderId, event_type: "confirmation_email", status: "sent" });
  return true;
};
