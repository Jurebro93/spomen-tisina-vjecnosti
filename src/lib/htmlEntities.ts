/**
 * Safe HTML entity decoding for text that comes from the database / API.
 *
 * Deliberately does NOT decode &lt; and &gt; (or their numeric forms), so
 * decoded text can never turn into live markup / script tags.
 * Handles double (and triple) encoding like &amp;#8211; by decoding repeatedly.
 */

const NAMED: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  nbsp: "\u00A0",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  sbquo: "‚",
  ldquo: "“",
  rdquo: "”",
  bdquo: "„",
  laquo: "«",
  raquo: "»",
  bull: "•",
  middot: "·",
  deg: "°",
  euro: "€",
  copy: "©",
  reg: "®",
  trade: "™",
  times: "×",
  eacute: "é",
  scaron: "š",
  Scaron: "Š",
  ccaron: "č",
  zcaron: "ž",
  Zcaron: "Ž",
  shy: "",
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  zwj: "",
  zwnj: "",
};

// Codepoints we refuse to decode so markup can never be created.
const FORBIDDEN = new Set([60, 62]); // < >

const ENTITY_RE = /&(#[xX]?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]{1,31});/g;

function decodeOnce(input: string): string {
  return input.replace(ENTITY_RE, (match, body: string) => {
    if (body[0] === "#") {
      const isHex = body[1] === "x" || body[1] === "X";
      const code = parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
      if (FORBIDDEN.has(code)) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    const named = NAMED[body];
    return named === undefined ? match : named;
  });
}

/** Decode HTML entities in a plain string, resolving double encoding. */
export function decodeHtmlEntities(value: string): string {
  if (typeof value !== "string" || value.indexOf("&") === -1) return value;
  let out = value;
  for (let i = 0; i < 3; i++) {
    const next = decodeOnce(out);
    if (next === out) break;
    out = next;
  }
  return out;
}

/** Deep-decode every string inside an object/array (returns same shape). */
export function decodeDeep<T>(value: T): T {
  if (typeof value === "string") return decodeHtmlEntities(value) as unknown as T;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = decodeDeep(value[i]);
    return value;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) obj[key] = decodeDeep(obj[key]);
    }
    return value;
  }
  return value;
}
