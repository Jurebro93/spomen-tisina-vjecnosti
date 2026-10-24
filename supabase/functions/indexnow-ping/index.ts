// Tells Bing, Yandex and the other IndexNow engines about new obituaries right
// away instead of waiting for the next sitemap crawl (Ahrefs: every page was
// "not submitted to IndexNow"). Bing also feeds Copilot and ChatGPT search.
//
// Runs hourly from pg_cron (migration 20261023120000_indexnow_ping.sql) and
// submits the obituaries created in the last `minutes` (default 70, so runs
// overlap a little) plus the obituary hubs. The key file is
// public/8ccfd9e1bf5e104bb18163e8a1617d1a.txt; IndexNow keys are public by design.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SITE = 'https://osmrtnica.com.hr'
const HOST = 'osmrtnica.com.hr'
const KEY = '8ccfd9e1bf5e104bb18163e8a1617d1a'
const HUBS = ['/', '/umrli', '/sprovodi']

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '')
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
  const minutes = Math.min(Math.max(Number(body.minutes) || 70, 1), 60 * 24 * 7)
  const since = new Date(Date.now() - minutes * 60_000).toISOString()

  const { data, error } = await supabase
    .from('obituaries')
    .select('slug')
    .eq('active', true)
    .not('slug', 'is', null)
    .gte('created_at', since)
    .limit(10000)
  if (error) return json({ error: error.message }, 500)

  const slugs = (data ?? []).map((r) => r.slug).filter(Boolean)
  if (slugs.length === 0) return json({ submitted: 0 })

  const urlList = [...HUBS, ...slugs.map((s) => `/${s}`)].map((p) => SITE + p)
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
  })
  // 200 and 202 both mean accepted; anything else is logged for the cron history.
  const ok = res.status === 200 || res.status === 202
  if (!ok) console.error('indexnow', res.status, await res.text())
  return json({ submitted: ok ? urlList.length : 0, status: res.status }, ok ? 200 : 502)
})
