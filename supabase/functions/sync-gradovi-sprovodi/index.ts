import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  boninovoGroblje,
  parseCakovec,
  parseDubrovnikRss,
  parseKarlovac,
  parseKoprivnica,
  parseRijeka,
  parseVarazdin,
  type ScheduleRow,
} from './parsers.ts'

// Daily funeral schedules for cities outside Zagreb, from the public pages of
// the companies that run their cemeteries. Each source is synced on its own,
// so one broken page never blocks the others. `?dry=1` parses without writing,
// `?source=<izvor>` runs one source.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; osmrtnica.com.hr funeral-schedule sync; +https://osmrtnica.com.hr)',
  'Accept-Language': 'hr',
}

type Source = { izvor: string; grad: string; load: (fromDate: string) => Promise<ScheduleRow[]> }

const SOURCES: Source[] = [
  {
    izvor: 'zelenilo-karlovac',
    grad: 'Karlovac',
    load: async (fromDate) => {
      // One page per year (raspored-ukopa-2026-g); early January still needs last year's page.
      const year = Number(fromDate.slice(0, 4))
      const rows: ScheduleRow[] = []
      for (const y of [year - 1, year]) {
        const pages = await getJson(`https://zelenilo.hr/wp-json/wp/v2/pages?slug=raspored-ukopa-${y}-g&_fields=id,content`)
        const html = (pages as { content?: { rendered?: string } }[])[0]?.content?.rendered
        if (html) rows.push(...parseKarlovac(html, fromDate))
      }
      return rows
    },
  },
  {
    izvor: 'komunalac-koprivnica',
    grad: 'Koprivnica',
    load: async (fromDate) => parseKoprivnica(await getText('https://komunalac-kc.hr/raspored-ukopa/'), fromDate),
  },
  {
    izvor: 'boninovo-dubrovnik',
    grad: 'Dubrovnik',
    load: async (fromDate) => {
      const items = parseDubrovnikRss(
        await getText('https://boninovo.hr/index.php/boninovo-d-o-o-lista-sprovoda?format=feed&type=rss'),
        fromDate,
      )
      // The cemetery is only written in the event text; a failed page keeps "Boninovo".
      for (const item of items) {
        try {
          await sleep(300)
          const groblje = boninovoGroblje(await getText(item.link))
          if (groblje) item.row.groblje = item.row.lokacija = groblje
        } catch (error) {
          console.warn('boninovo event', item.link, String(error))
        }
      }
      return items.map((item) => item.row)
    },
  },
  {
    izvor: 'parkovi-varazdin',
    grad: 'Varaždin',
    load: async (fromDate) => parseVarazdin(await getText('https://www.parkovi.eu/raspored-pogreba/'), fromDate),
  },
  {
    izvor: 'cakom-cakovec',
    grad: 'Čakovec',
    // The list is published on the day, so most entries are already past: keep the last two weeks.
    load: async (fromDate) => parseCakovec(await getText('https://www.cakom.hr/groblje-i-pogrebne-usluge/lista-pogreba/'), shiftDays(fromDate, -14)),
  },
  {
    izvor: 'kd-kozala-rijeka',
    grad: 'Rijeka',
    load: async (fromDate) =>
      parseRijeka(await getJson('https://rijeka-kozala.azurewebsites.net/api/services/app/Funeral/GetFunerals?MaxResultCount=80'), fromDate),
  },
]

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

  const url = new URL(req.url)
  const dry = url.searchParams.get('dry') === '1'
  const only = url.searchParams.get('source')
  const fromDate = zagrebToday()

  const summary: Record<string, unknown>[] = []
  for (const source of SOURCES.filter((s) => !only || s.izvor === only)) {
    try {
      const rows = dedupe(await source.load(fromDate))
      if (dry) {
        summary.push({ izvor: source.izvor, parsed: rows.length, sample: rows.slice(0, 3) })
        continue
      }
      let removed = 0
      // An empty parse usually means the page changed: keep what we have instead of wiping the city.
      if (rows.length > 0) {
        const { error } = await supabase.from('sprovodi').upsert(rows, { onConflict: 'source_key' })
        if (error) throw new Error(`upsert: ${error.message}`)
        const keys = rows.map((row) => `"${row.source_key}"`).join(',')
        const { error: cleanupError, count } = await supabase
          .from('sprovodi')
          .delete({ count: 'exact' })
          .eq('izvor', source.izvor)
          .gte('datum_sprovoda', fromDate)
          .not('source_key', 'in', `(${keys})`)
        if (cleanupError) throw new Error(`cleanup: ${cleanupError.message}`)
        removed = count ?? 0
      }
      summary.push({ izvor: source.izvor, upserted: rows.length, removed })
    } catch (error) {
      console.error(source.izvor, error)
      summary.push({ izvor: source.izvor, error: error instanceof Error ? error.message : String(error) })
    }
  }

  const failed = summary.filter((s) => 'error' in s).length
  return json({ ok: failed === 0, fromDate, summary }, failed === summary.length && failed > 0 ? 500 : 200)
})

async function getText(url: string) {
  const response = await fetch(url, { headers: { ...HEADERS, Accept: 'text/html,application/xml' } })
  if (!response.ok) throw new Error(`${new URL(url).host} responded ${response.status}`)
  return await response.text()
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { ...HEADERS, Accept: 'application/json' } })
  if (!response.ok) throw new Error(`${new URL(url).host} responded ${response.status}`)
  return await response.json()
}

function dedupe(rows: ScheduleRow[]) {
  const byKey = new Map<string, ScheduleRow>()
  for (const row of rows) byKey.set(row.source_key, row)
  return [...byKey.values()]
}

function zagrebToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function shiftDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
