import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SOURCE = 'gradska-groblja-zagreb'
const SCHEDULE_URL = 'https://www.gradskagroblja.hr/raspored-sprovoda-i-ispracaja/477'
const PLACE_NAMES: Record<string, string> = {
  'mark.polje': 'Markovo polje',
  'k.kraljevec': 'Kraljevec',
}

type ScheduleRow = {
  ime: string
  prezime: string
  datum_smrti: string
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!serviceKey) return json({ error: 'Unauthorized' }, 401)
  const supabase = createClient(supabaseUrl, serviceKey)

  // The cron job sends the vault secret; a manual run can use the service role key.
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const provided = req.headers.get('x-sync-secret') ?? ''
  let authorized = bearer === serviceKey
  if (!authorized && provided) {
    const { data: expected } = await supabase.rpc('sprovodi_sync_secret')
    authorized = typeof expected === 'string' && expected.length > 0 && provided === expected
  }
  if (!authorized) return json({ error: 'Unauthorized' }, 401)

  try {
    const datumToday = zagrebDatum()
    const firstHtml = await fetchSchedule(datumToday)
    const published = publishedDates(firstHtml)
    const dates = published.length > 0 ? published : [datumToday]

    const pages = new Map<string, string>()
    if (published.length === 0 || published.includes(datumToday)) {
      pages.set(datumToday, firstHtml)
    }

    for (const datum of dates) {
      if (pages.has(datum)) continue
      await sleep(400)
      pages.set(datum, await fetchSchedule(datum))
    }

    const synced: { datum: string; iso: string; rows: ScheduleRow[] }[] = []

    for (const datum of dates) {
      const html = pages.get(datum)
      const isoDate = datum ? parseHrDate(datum) : null
      if (!html || !isoDate) continue
      const pageDate = parseHrDate(html.match(/class="ssb-date">\s*([^<]+)/)?.[1] ?? '')
      if (pageDate !== isoDate) {
        throw new Error(`Schedule page for ${datum} did not include that date`)
      }
      const rows = dedupe(parseSchedule(html, isoDate))
      if (/class="ssb-cat"/.test(html) && rows.length === 0) {
        throw new Error(`Parsed no funerals from ${datum}`)
      }
      synced.push({ datum, iso: isoDate, rows })
    }

    if (published.length > 0 && synced.length !== dates.length) {
      throw new Error('Not every published day was parsed')
    }

    const allRows = synced.flatMap((day) => day.rows)
    if (allRows.length > 0) {
      const { error } = await supabase.from('sprovodi').upsert(allRows, { onConflict: 'source_key' })
      if (error) throw new Error(`Upsert failed: ${error.message}`)
    }

    const summary: { datum: string; upserted: number; removed: number }[] = []
    for (const day of synced) {
      const keys = day.rows.map((row) => row.source_key)
      let deleteQuery = supabase.from('sprovodi').delete({ count: 'exact' }).eq('izvor', SOURCE).eq('datum_sprovoda', day.iso)
      if (keys.length > 0) deleteQuery = deleteQuery.not('source_key', 'in', `(${keys.map((key) => `"${key}"`).join(',')})`)
      const { error, count } = await deleteQuery
      if (error) throw new Error(`Cleanup ${day.datum}: ${error.message}`)
      summary.push({ datum: day.datum, upserted: day.rows.length, removed: count ?? 0 })
    }

    const todayIso = parseHrDate(datumToday)
    if (published.length > 0 && todayIso) {
      const publishedIso = synced.map((day) => day.iso)
      const { error } = await supabase
        .from('sprovodi')
        .delete()
        .eq('izvor', SOURCE)
        .gte('datum_sprovoda', todayIso)
        .not('datum_sprovoda', 'in', `(${publishedIso.map((day) => `"${day}"`).join(',')})`)
      if (error) throw new Error(`Cleanup unpublished days: ${error.message}`)
    }

    return json({ ok: true, summary })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Sync failed'
    return json({ ok: false, error: message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function zagrebDatum(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Zagreb',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('day')}.${get('month')}.${get('year')}.`
}

async function fetchSchedule(datum: string) {
  const url = `${SCHEDULE_URL}?datum=${encodeURIComponent(datum)}&grobljeNaziv=${encodeURIComponent('sva_groblja')}`
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'osmrtnica.com.hr funeral-schedule sync',
      Accept: 'text/html',
    },
  })
  if (!response.ok) throw new Error(`Gradska groblja responded ${response.status} for ${datum}`)
  return await response.text()
}

function publishedDates(html: string) {
  return [...html.matchAll(/class="filterSprovodi\b[^"]*"[^>]*data-val="(\d{2}\.\d{2}\.\d{4}\.)"/g)].map((match) => match[1])
}

function parseSchedule(html: string, isoDate: string): ScheduleRow[] {
  const pageDate = parseHrDate(html.match(/class="ssb-date">\s*([^<]+)/)?.[1] ?? '')
  if (pageDate !== isoDate) return []

  const rows: ScheduleRow[] = []
  for (const part of html.split(/<div class="ssb-cat">/i).slice(1)) {
    const title = stripTags(part.match(/<h3 class="ssb-title">([\s\S]*?)<\/h3>/i)?.[1] ?? '')
    if (!title) continue
    const header = stripTags(part.match(/class="tablicaNaslov">([\s\S]*?)<\/td>/i)?.[1] ?? '')
    const tip: ScheduleRow['tip_sprovoda'] = /ispra/i.test(header) ? 'Ispraćaj' : 'Sprovod'
    const groblje = PLACE_NAMES[title.toLowerCase()] ?? title
    const dvorana = /^Krematorij\s+/i.test(title) ? title.replace(/^Krematorij\s+/i, '') : null
    const table = part.split('</table>')[0]
    const trs = table.match(/<tr[\s\S]*?<\/tr>/gi) ?? []
    for (const tr of trs) {
      if (/tablicaNaslov/.test(tr)) continue
      const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => stripTags(match[1]))
      const vrijeme = cells[0] ?? ''
      const fullName = cells[1] ?? ''
      const datumSmrti = parseHrDate(cells[2] ?? '')
      const godine = Number.parseInt(cells[4] ?? '', 10)
      if (!/^\d{1,2}:\d{2}$/.test(vrijeme) || !fullName || !datumSmrti) continue
      const [ime, ...rest] = fullName.split(/\s+/)
      const prezime = rest.join(' ') || ime
      rows.push({
        ime,
        prezime,
        datum_smrti: datumSmrti,
        godina: Number.isFinite(godine) ? godine : null,
        groblje,
        grad: 'Zagreb',
        lokacija: groblje,
        tip_sprovoda: tip,
        datum_sprovoda: isoDate,
        vrijeme_sprovoda: `${vrijeme}:00`,
        dvorana,
        izvor: SOURCE,
        source_key: `ggz:${isoDate}:${vrijeme}:${slug(groblje)}:${slug(fullName)}`,
      })
    }
  }
  return rows
}

function dedupe(rows: ScheduleRow[]) {
  const byKey = new Map<string, ScheduleRow>()
  for (const row of rows) byKey.set(row.source_key, row)
  return [...byKey.values()]
}

function parseHrDate(value: string) {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})\.?$/)
  if (!match) return null
  return `${match[3]}-${match[2]}-${match[1]}`
}

function stripTags(value: string) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim()
}

function slug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
