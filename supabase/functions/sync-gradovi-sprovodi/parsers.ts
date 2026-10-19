// Parsers for public funeral schedules outside Zagreb. Each takes the raw
// response of its source and returns schedule rows; only facts are kept
// (name, age, cemetery, date and time), never notice texts or photos.

export type ScheduleRow = {
  ime: string
  prezime: string
  datum_smrti: string | null
  godina: number | null
  groblje: string
  grad: string
  lokacija: string
  tip_sprovoda: 'Sprovod' | 'Ispraćaj'
  datum_sprovoda: string
  vrijeme_sprovoda: string
  dvorana: string | null
  izvor: string
  source_key: string
}

const HR_MONTHS: Record<string, string> = {
  sijecanj: '01', veljaca: '02', ozujak: '03', travanj: '04', svibanj: '05', lipanj: '06',
  srpanj: '07', kolovoz: '08', rujan: '09', listopad: '10', studeni: '11', prosinac: '12',
}

export function stripTags(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8220;|&#8221;|&#8222;|&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/[ \t]+/g, ' ')
    .trim()
}

export function slug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// "VIOLETA KNEŽEVIĆ-VUČKOVIĆ" -> "Violeta Knežević-Vučković"
export function titleCase(value: string) {
  return value
    .toLocaleLowerCase('hr')
    .replace(/(^|[\s\-'(])(\p{L})/gu, (_, sep, ch) => sep + ch.toLocaleUpperCase('hr'))
    .trim()
}

function splitName(full: string) {
  const parts = titleCase(full.replace(/\s+/g, ' ').trim()).split(' ')
  const ime = parts.shift() ?? ''
  return { ime, prezime: parts.join(' ') || ime }
}

// "20.10.2026." / "20. 10. 2026" -> "2026-10-20"
export function parseNumericDate(value: string) {
  const m = value.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/)
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

function cleanGroblje(value: string) {
  return value.replace(/["“”„]/g, '').replace(/\s+/g, ' ').replace(/(\S) Groblje\b/g, '$1 groblje').trim()
}

function row(source: string, prefix: string, grad: string, fullName: string, groblje: string, date: string, time: string, godina: number | null): ScheduleRow | null {
  const { ime, prezime } = splitName(fullName)
  if (!ime || !date || !/^\d{1,2}:\d{2}$/.test(time)) return null
  const hhmm = time.padStart(5, '0')
  return {
    ime,
    prezime,
    datum_smrti: null,
    godina,
    groblje,
    grad,
    lokacija: groblje,
    tip_sprovoda: 'Sprovod',
    datum_sprovoda: date,
    vrijeme_sprovoda: `${hhmm}:00`,
    dvorana: null,
    izvor: source,
    source_key: `${prefix}:${date}:${hhmm}:${slug(groblje)}:${slug(fullName)}`,
  }
}

/**
 * Karlovac, Zelenilo d.o.o.: one WordPress page per year, newest first.
 *   <p><strong>SRIJEDA, 21.10.2026. GOD.</strong></p>
 *   <p>MARINA VNUČEC, ROĐ. DRAŠKOVIĆ, OTAC IVAN, STARA 69 GOD.<br />UKOP NA GROBLJU HRNETIĆ U 12:00 SATI</p>
 */
export function parseKarlovac(html: string, fromDate: string): ScheduleRow[] {
  const rows: ScheduleRow[] = []
  let date: string | null = null
  for (const match of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = stripTags(match[1])
    const header = text.match(/^[A-ZČĆŽŠĐ]+,\s*(\d{1,2}\.\d{1,2}\.\d{4})\.?\s*GOD\.?$/i)
    if (header) {
      date = parseNumericDate(header[1])
      continue
    }
    if (!date || date < fromDate) continue
    const ukop = text.match(/UKOP\s+NA\s+(.+?)\s+U\s+(\d{1,2})[:.](\d{2})\s*SATI/i)
    if (!ukop) continue
    const person = text.split('\n')[0]
    const name = person.split(',')[0]
    const age = person.match(/STARA?\s+(\d{1,3})\s*GOD/i)
    const groblje = cleanGroblje(titleCase(ukop[1].replace(/^(KATOLIČKOM|PRAVOSLAVNOM)?\s*GROBLJU\s+/i, (m) => m.replace(/GROBLJU/i, 'GROBLJE').replace(/KATOLIČKOM/i, 'KATOLIČKO').replace(/PRAVOSLAVNOM/i, 'PRAVOSLAVNO'))))
    const r = row('zelenilo-karlovac', 'zkk', 'Karlovac', name, groblje, date, `${ukop[2]}:${ukop[3]}`, age ? Number(age[1]) : null)
    if (r) rows.push(r)
  }
  return rows
}

/**
 * Koprivnica, Komunalac d.o.o.: a table of the next few days.
 * Columns: Datum, Ime, Prezime, Godina rođenja, Mjesto pogreba, Vrijeme.
 */
export function parseKoprivnica(html: string, fromDate: string): ScheduleRow[] {
  const table = html.match(/<table[^>]*wp-table-reloaded[\s\S]*?<\/table>/i)?.[0] ?? ''
  const rows: ScheduleRow[] = []
  for (const tr of table.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1]))
    if (cells.length < 6) continue
    const date = parseNumericDate(cells[0])
    if (!date || date < fromDate) continue
    const time = cells[5].replace('.', ':').match(/\d{1,2}:\d{2}/)?.[0] ?? ''
    const r = row('komunalac-koprivnica', 'kkc', 'Koprivnica', `${cells[1]} ${cells[2]}`, cleanGroblje(cells[4]), date, time, null)
    if (r) rows.push(r)
  }
  return rows
}

/**
 * Dubrovnik, Boninovo d.o.o.: Joomla JEM events RSS.
 *   <title>ANICA RAGUŽ rođ. Perić (1932.)</title>
 *   <span class="jem_date-1">Uto, 20. Listopad 2026</span><span class="jem_time-1">, 14:00 h</span>
 * The cemetery is only in the event page text; see boninovoGroblje.
 */
export function parseDubrovnikRss(xml: string, fromDate: string) {
  const items: { row: ScheduleRow; link: string }[] = []
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const item = m[1]
    const title = stripTags(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '')
    const link = stripTags(item.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ?? '')
    const dateText = item.match(/jem_date-1">([^<]+)</i)?.[1] ?? ''
    const time = item.match(/jem_time-1">,?\s*(\d{1,2}:\d{2})/i)?.[1] ?? ''
    const d = dateText.match(/(\d{1,2})\.\s*([A-Za-zČĆŽŠĐčćžšđ]+)\s+(\d{4})/)
    if (!d) continue
    const month = HR_MONTHS[slug(d[2]).replace(/-/g, '')]
    if (!month) continue
    const date = `${d[3]}-${month}-${d[1].padStart(2, '0')}`
    if (date < fromDate) continue
    const name = title
      .replace(/\(\D[^)]*\)/g, ' ')
      .replace(/\(\s*\d{4}\.?\s*\)/g, ' ')
      .replace(/\s(rođ|pok)\.\s.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim()
    const r = row('boninovo-dubrovnik', 'bdu', 'Dubrovnik', name, 'Boninovo', date, time, null)
    if (r) items.push({ row: r, link })
  }
  return items
}

/** "… u 14 sati na groblju u Rumbocima u Rami – B i H" -> "groblje u Rumbocima u Rami – B i H" */
export function boninovoGroblje(html: string) {
  const description = html.match(/itemprop="description"([\s\S]*?)<\/div>/i)?.[1] ?? ''
  const text = stripTags(description).replace(/\s+/g, ' ')
  const m = text.match(/na\s+(groblju|grobl\w*)\s+(.+?)(?:\.|$)/i)
  if (!m) return null
  return cleanGroblje(`Groblje ${m[2]}`).slice(0, 120)
}

/**
 * Rijeka, KD Kozala: JSON behind kd-kozala.hr/raspored-sahrana.aspx.
 * result.items[]: firstName, lastName, birth.year, date (local ISO), graveyard.
 */
export function parseRijeka(json: unknown, fromDate: string): ScheduleRow[] {
  // deno-lint-ignore no-explicit-any
  const items: any[] = (json as any)?.result?.items ?? []
  const rows: ScheduleRow[] = []
  for (const item of items) {
    const m = String(item?.date ?? '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
    if (!m || m[1] < fromDate) continue
    const groblje = cleanGroblje(String(item.graveyard ?? '')) || 'Kozala'
    const r = row('kd-kozala-rijeka', 'kzr', 'Rijeka', `${item.firstName ?? ''} ${item.lastName ?? ''}`, groblje, m[1], m[2], null)
    if (r) rows.push(r)
  }
  return rows
}
