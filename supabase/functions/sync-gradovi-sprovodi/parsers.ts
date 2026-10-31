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
  // genitive, as in "21. listopada 2026."
  sijecnja: '01', veljace: '02', ozujka: '03', travnja: '04', svibnja: '05', lipnja: '06',
  srpnja: '07', kolovoza: '08', rujna: '09', listopada: '10', studenoga: '11', studenog: '11', prosinca: '12',
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

function splitName(full: string, surnameFirst = false) {
  const parts = titleCase(full.replace(/\s+/g, ' ').trim()).split(' ')
  const ime = (surnameFirst ? parts.pop() : parts.shift()) ?? ''
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

function row(source: string, prefix: string, grad: string, fullName: string, groblje: string, date: string, time: string, godina: number | null, surnameFirst = false): ScheduleRow | null {
  const { ime, prezime } = splitName(fullName, surnameFirst)
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
    // "GOD." is sometimes left out: "ČETVRTAK, 22.10.2026."
    const header = text.match(/^[A-ZČĆŽŠĐ]+,\s*(\d{1,2}\.\d{1,2}\.\d{4})\.?\s*(GOD\.?)?$/i)
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
    // Since 28.10.2026 the feed (boninovo.hr/sprovodi.rss) has <bn:datum>, <bn:vrijeme> and a plain-text description.
    let date = item.match(/<bn:datum>(\d{4}-\d{2}-\d{2})<\/bn:datum>/)?.[1] ?? ''
    let time = item.match(/<bn:vrijeme>(\d{1,2}:\d{2})<\/bn:vrijeme>/)?.[1] ?? ''
    if (!date) {
      const dateText = item.match(/jem_date-1">([^<]+)</i)?.[1] ?? ''
      time = item.match(/jem_time-1">,?\s*(\d{1,2}:\d{2})/i)?.[1] ?? ''
      const d = dateText.match(/(\d{1,2})\.\s*([A-Za-zČĆŽŠĐčćžšđ]+)\s+(\d{4})/)
      const month = d && HR_MONTHS[slug(d[2]).replace(/-/g, '')]
      if (!d || !month) continue
      date = `${d[3]}-${month}-${d[1].padStart(2, '0')}`
    }
    if (date < fromDate) continue
    const name = title
      .replace(/\(\D[^)]*\)/g, ' ')
      .replace(/\(\s*\d{4}\.?\s*\)/g, ' ')
      .replace(/\s\d{4}\.?$/, '')
      .replace(/\s(rođ|pok|ud)\.\s.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim()
    const description = stripTags(item.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ?? '')
    const r = row('boninovo-dubrovnik', 'bdu', 'Dubrovnik', name, grobljeFromText(description) ?? 'Boninovo', date, time, null)
    if (r) items.push({ row: r, link })
  }
  return items
}

/** "… u 14 sati na groblju u Rumbocima u Rami – B i H" -> "groblje u Rumbocima u Rami – B i H" */
export function boninovoGroblje(html: string) {
  return grobljeFromText(stripTags(html.match(/itemprop="description"([\s\S]*?)<\/div>/i)?.[1] ?? ''))
}

function grobljeFromText(value: string) {
  // Up to the first full stop, but "sv." (sveti) does not end the name.
  const m = value.replace(/\s+/g, ' ').match(/na\s+(groblju|grobl\w*)\s+((?:\b[Ss]v\.\s*|[^.])+)/i)
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

/**
 * Varaždin, Parkovi d.o.o.: Elementor/JetEngine listing, surname first.
 *   <div class="jet-listing-dynamic-field__content">21. listopada 2026. u 11:45 h</div>
 *   <h2 class="elementor-heading-title …">Kolak Tomislav</h2>
 *   <b>Groblje:</b> Varaždin … <b>Starosna dob:</b> 83
 */
export function parseVarazdin(html: string, fromDate: string): ScheduleRow[] {
  const rows: ScheduleRow[] = []
  const body = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
  const lines = stripTags(body.replace(/<\/(div|h\d|p|li)>/gi, '\n')).split('\n').map((l) => l.trim()).filter(Boolean)
  for (let i = 0; i < lines.length; i++) {
    const when = lines[i].match(/^(\d{1,2})\.\s*([A-Za-zČĆŽŠĐčćžšđ]+)\s+(\d{4})\.?\s*u\s*(\d{1,2})[:.](\d{2})\s*h$/)
    if (!when) continue
    const month = HR_MONTHS[slug(when[2]).replace(/-/g, '')]
    const name = lines[i + 1] ?? ''
    const place = lines[i + 2]?.match(/^Groblje:\s*(.+)$/)?.[1]?.trim()
    const age = lines[i + 3]?.match(/^Starosna dob:\s*(\d{1,3})/)?.[1]
    if (!month || !place) continue
    const date = `${when[3]}-${month}-${when[1].padStart(2, '0')}`
    if (date < fromDate) continue
    const groblje = /^vara[zž]din$/i.test(place) ? 'Gradsko groblje Varaždin' : `Groblje ${place}`
    const r = row('parkovi-varazdin', 'pvz', 'Varaždin', name, groblje, date, `${when[4]}:${when[5]}`, age ? Number(age) : null, true)
    if (r) rows.push(r)
  }
  return rows
}

/**
 * Čakovec, GKP Čakom: the latest funerals, newest first.
 *   pogrebi__pogreb-ime:         "Nada Marčec rođ. Bacinger st.76 iz Čakovca"
 *   pogrebi__pogreb-datum:       "Utorak, 20. 10. 2026. u 14:00"
 *   pogrebi__pogreb-mjesto-text: "Čakovec" (where the cemetery is)
 */
export function parseCakovec(html: string, fromDate: string): ScheduleRow[] {
  const rows: ScheduleRow[] = []
  const field = (block: string, name: string) =>
    stripTags(block.match(new RegExp(`pogrebi__pogreb-${name}\\b[^"]*"[^>]*>([\\s\\S]*?)</div>`))?.[1] ?? '')
  for (const block of html.split(/class="[^"]*\bpogrebi__pogreb(?=[\s"])/).slice(1)) {
    const who = field(block, 'ime')
    const when = field(block, 'datum')
    const place = field(block, 'mjesto-text')
    const date = parseNumericDate(when)
    const time = when.match(/(\d{1,2})[:.](\d{2})\s*$/)
    if (!who || !date || !time || date < fromDate) continue
    const age = who.match(/\bst\.?\s*(\d{1,3})\b/i)
    const name = who.replace(/\s+(rođ\.|st\.|iz\s).*$/i, '').trim()
    const r = row('cakom-cakovec', 'cck', 'Čakovec', name, `Groblje ${place || 'Čakovec'}`, date, `${time[1]}:${time[2]}`, age ? Number(age[1]) : null)
    if (r) rows.push(r)
  }
  return rows
}

/**
 * Velika Gorica, VG Komunalac: OData behind the Axiom Memento iframe on
 * vgkomunalac.hr/djelatnosti/groblja/raspored-sprovoda-ispracaja.
 * value[]: IME_OSOB, PREZIME_OSOB, STAROST_GODINA, NAZIV_MJISP, DATIVR_ISPRACAJA (local ISO).
 */
export function parseVelikaGorica(json: unknown, fromDate: string): ScheduleRow[] {
  // deno-lint-ignore no-explicit-any
  const items: any[] = (json as any)?.value ?? []
  const rows: ScheduleRow[] = []
  for (const item of items) {
    const m = String(item?.DATIVR_ISPRACAJA ?? '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
    if (!m || m[1] < fromDate) continue
    const groblje = cleanGroblje(String(item.NAZIV_MJISP ?? '')) || 'Groblje Velika Gorica'
    const age = Number(item.STAROST_GODINA)
    const r = row('vgkomunalac-velika-gorica', 'vgk', 'Velika Gorica', `${item.IME_OSOB ?? ''} ${item.PREZIME_OSOB ?? ''}`, groblje, m[1], m[2], age > 0 ? age : null)
    if (r) rows.push(r)
  }
  return rows
}

/**
 * Požega, Komunalac Požega: Joomla blog of current funerals.
 *   <h2>DRAGO BUŠIĆ</h2> <p>preminuo u 89. godini života</p>
 *   Groblje: Krista Kralja · Datum sahrane: 21. 10. 2026. u 13.30
 */
export function parsePozega(html: string, fromDate: string): ScheduleRow[] {
  const rows: ScheduleRow[] = []
  for (const block of html.split(/itemprop="blogPost"/).slice(1)) {
    const name = stripTags(block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? '')
    const field = (cls: string) => stripTags(block.match(new RegExp(`field-entry ${cls}[\\s\\S]*?field-value[^>]*>([\\s\\S]*?)</span>`))?.[1] ?? '')
    const place = field('groblje')
    const when = field('datum-sahrane')
    const date = parseNumericDate(when)
    const time = when.match(/u\s*(\d{1,2})[:.](\d{2})/)
    if (!name || !date || !time || date < fromDate) continue
    const age = stripTags(block).match(/u\s+(\d{1,3})\.\s*godini/i)
    const groblje = place ? `Groblje ${place}` : 'Groblje Požega'
    // "u 89. godini života" means 88 full years.
    const r = row('komunalac-pozega', 'kpz', 'Požega', name, groblje, date, `${time[1]}:${time[2]}`, age ? Number(age[1]) - 1 : null)
    if (r) rows.push(r)
  }
  return rows
}

/**
 * Jastrebarsko, Groblja Jastrebarsko d.o.o.: the "Raspored ukopa" box lists the
 * coming funerals by cemetery; only families who agreed are published.
 *   <li><span class="si_naslov">Groblje Desinec Gornji</span></li>
 *   <li>22.10.2026. 14:00 JOSIP BURJAN  (73)</li>
 */
export function parseJastrebarsko(html: string, fromDate: string): ScheduleRow[] {
  const box = html.match(/<h3>\s*Raspored ukopa\s*<\/h3>\s*<ul[^>]*>([\s\S]*?)<\/ul>/i)?.[1] ?? ''
  const rows: ScheduleRow[] = []
  let groblje = ''
  for (const li of box.match(/<li[^>]*>[\s\S]*?<\/li>/gi) ?? []) {
    const heading = li.match(/si_naslov[^>]*>([\s\S]*?)<\/span>/i)
    if (heading) {
      groblje = cleanGroblje(stripTags(heading[1]))
      continue
    }
    const m = stripTags(li).match(/^(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})\.?\s+(\d{1,2})[:.](\d{2})\s+(.+?)\s*(?:\((\d{1,3})\))?$/)
    if (!m || !groblje) continue
    const date = parseNumericDate(m[1])
    if (!date || date < fromDate) continue
    const r = row('groblja-jastrebarsko', 'gja', 'Jastrebarsko', m[4], groblje, date, `${m[2]}:${m[3]}`, m[5] ? Number(m[5]) : null)
    if (r) rows.push(r)
  }
  return rows
}
