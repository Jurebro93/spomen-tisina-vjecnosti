// Parsing incoming mail and deciding whether it may be answered or trusted. No network, so it is unit-tested.
import PostalMime from "npm:postal-mime@2.4.4";

export type Parsed = {
  messageId: string;
  inReplyTo: string;
  references: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  subject: string;
  text: string;
  date: string;
  headers: Map<string, string[]>;
};

export async function parse(raw: Uint8Array): Promise<Parsed> {
  const email = await PostalMime.parse(raw);
  const headers = new Map<string, string[]>();
  for (const h of email.headers ?? []) {
    const k = h.key.toLowerCase();
    headers.set(k, [...(headers.get(k) ?? []), h.value]);
  }
  const text = (email.text ?? "").trim() ||
    (email.html ?? "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return {
    messageId: email.messageId ?? "",
    inReplyTo: email.inReplyTo ?? "",
    references: email.references ?? "",
    fromEmail: (email.from?.address ?? "").toLowerCase(),
    fromName: email.from?.name ?? "",
    replyTo: (email.replyTo?.[0]?.address ?? "").toLowerCase(),
    subject: email.subject ?? "",
    text: text.slice(0, 15000),
    date: email.date ?? "",
    headers,
  };
}

const header = (p: Parsed, k: string) => (p.headers.get(k) ?? []).join("\n");

/** Mail that must never get an automatic answer: bounces, auto-replies, newsletters, spam. */
export function skipReason(p: Parsed): string | null {
  if (!p.fromEmail) return "bez pošiljatelja";
  if (/^(mailer-daemon|postmaster|no-?reply|do-?not-?reply|bounce)/i.test(p.fromEmail)) return "automatska poruka sustava";
  if (/auto-(replied|generated|notified)/i.test(header(p, "auto-submitted"))) return "automatski odgovor";
  if (/bulk|list|junk/i.test(header(p, "precedence"))) return "masovna poruka";
  if (header(p, "list-unsubscribe") || header(p, "list-id")) return "newsletter";
  if (/^yes/i.test(header(p, "x-spam-flag")) || /^\*{5,}/.test(header(p, "x-spam-bar"))) return "spam";
  if (/^(re: )?(automatic reply|auto(matski)? odgovor|out of office|odsutan|odsutna)/i.test(p.subject)) return "automatski odgovor";
  return null;
}

/**
 * Is the From address really the sender? Only then may the assistant change anything. Trusts the receiving
 * server's Authentication-Results: DKIM pass for the sender's domain, or SPF pass for the same address.
 * Without that header nothing is verified, so no automatic change happens.
 */
export function senderVerified(p: Parsed): boolean {
  const domain = p.fromEmail.split("@")[1] ?? "";
  if (!domain) return false;
  // Anyone can write an Authentication-Results header into their own mail. Only the topmost one, added by our
  // receiving server (authserv-id on totohost.hr, or AUTHSERV_ID), counts.
  const top = (p.headers.get("authentication-results") ?? [])[0]?.toLowerCase() ?? "";
  const authserv = top.split(";")[0].trim().split(/\s+/)[0] ?? "";
  const trusted = (Deno.env.get("AUTHSERV_ID") ?? "").toLowerCase();
  if (!(authserv.endsWith(".totohost.hr") || (trusted && authserv === trusted))) return false;
  const ar = top;
  const dkim = [...ar.matchAll(/dkim=pass[^;]*?header\.(?:d|i)=@?([a-z0-9.-]+)/g)].map((m) => m[1]);
  if (dkim.some((d) => d === domain || domain.endsWith(`.${d}`))) {
    const dmarcFail = /dmarc=fail/.test(ar);
    return !dmarcFail;
  }
  const spf = [...ar.matchAll(/spf=pass[^;]*?smtp\.mailfrom=([^\s;]+)/g)].map((m) => m[1].toLowerCase());
  return spf.some((a) => a === p.fromEmail || a === domain);
}


/** Token of our owner copy that this mail answers (from In-Reply-To / References), or null. */
export function copyTokenOf(p: Parsed): string | null {
  const m = `${p.inReplyTo} ${p.references}`.match(/<copy-([0-9a-f]{32})@osmrtnica\.com\.hr>/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Only the new text of a reply: cuts the quoted mail below the mail app's "... wrote:" line (Gmail writes it in
 * the phone's language, sometimes over two lines) and any "> " lines.
 */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r/g, "").split("\n");
  const intro = /(wrote|napisao je|napisala je|je napisao|je napisala|napisao\/la je|je napisao\/la|schrieb|a écrit|ha scritto)\s*:\s*$/i;
  let cut = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/^-{2,}\s*(original message|izvorna poruka|prosli?jeđena poruka|forwarded message)/i.test(lines[i]) || /^>/.test(lines[i])) {
      cut = i;
      break;
    }
    if (intro.test(lines[i])) {
      // "sub, 7. stu 2026. u 10:45 Osmrtnica.com.hr <" + "info@osmrtnica.com.hr> napisao je:"
      cut = i > 0 && lines[i - 1].trim() && !/[.!?]$/.test(lines[i - 1].trim()) && /\d/.test(lines[i - 1]) ? i - 1 : i;
      break;
    }
  }
  return lines.slice(0, cut).join("\n").trim();
}
