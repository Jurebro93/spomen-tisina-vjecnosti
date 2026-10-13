import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { tributeStatus, validTributePhoto } from './rules.ts';
import { z } from 'npm:zod@3.23.8';
import { isMailConfigured, sendMail } from '../_shared/mail.ts';

const schema = z.object({
  memorial_id: z.string().uuid(), author_name: z.string().trim().min(1).max(100),
  author_email: z.string().trim().email().max(255),
  relationship: z.string().max(120).nullable().optional(), title: z.string().trim().max(120).nullable().optional(),
  message: z.string().trim().min(1).max(2000), consent: z.literal(true),
  photo_path: z.string().max(400).nullable().optional(),
});
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Provjerite ime, e-mail, poruku i privolu.' }, 400);
  const b = parsed.data;
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  try {
    // Public guest submission: no privileged action is derived from a caller's identity.
    // Resolve publication, privacy and approval settings on the server, not from the form.
    const { data: memorial, error: memorialError } = await admin.from('memorials')
      .select('id,slug,owner_id,status,visibility,allow_tributes,tributes_require_approval').eq('id', b.memorial_id).maybeSingle();
    if (memorialError) throw memorialError;
    if (!memorial || memorial.status !== 'published' || !['public','unlisted'].includes(memorial.visibility) || !memorial.allow_tributes) {
      return json({ error: 'Na ovom memorijalu nije moguće poslati sjećanje.' }, 403);
    }
    if (!validTributePhoto(memorial.id, b.photo_path)) return json({ error: 'Neispravna fotografija.' }, 400);
    const email = b.author_email.toLowerCase();
    const { count, error: recentError } = await admin.from('memorial_tributes').select('id', { count: 'exact', head: true })
      .eq('memorial_id', memorial.id).ilike('author_email', email).gte('created_at', new Date(Date.now() - 60_000).toISOString());
    if (recentError) throw recentError;
    if (count) return json({ error: 'Pričekajte minutu prije slanja novog sjećanja.' }, 429);
    const status = tributeStatus(memorial.tributes_require_approval);
    const { data: tribute, error } = await admin.from('memorial_tributes').insert({ ...b, author_email: email, status,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
    }).select('id').single();
    if (error) throw error;
    let emailSent = false;
    try {
      if (!isMailConfigured()) throw new Error('Mail is not configured');
      const [managers, admins, person] = await Promise.all([
        admin.from('memorial_managers').select('user_id').eq('memorial_id', memorial.id).in('role', ['owner','admin']),
        admin.from('admin_users').select('email').eq('active', true),
        admin.from('memorials').select('obituaries(ime,prezime)').eq('id', memorial.id).single(),
      ]);
      const ids = [...new Set([memorial.owner_id, ...(managers.data ?? []).map((m) => m.user_id)])];
      const { data: profiles } = await admin.from('profiles').select('email').in('id', ids);
      const recipients = [...new Set([...(profiles ?? []).map((p) => p.email), ...(admins.data ?? []).map((a) => a.email)].filter((e): e is string => !!e))];
      if (!recipients.length) throw new Error('No notification recipients');
      const related = person.data?.obituaries;
      const deceased = Array.isArray(related) ? related[0] : related;
      const name = [deceased?.ime, deceased?.prezime].filter(Boolean).join(' ');
      const url = `https://osmrtnica.com.hr/memorijal/${encodeURIComponent(memorial.slug)}/uredi?tab=uspomene`;
      const html = `<h2>Novo sjećanje — ${escape(name)}</h2><p>${escape(b.author_name)} je poslao/la sjećanje.</p><p>${escape(b.message).replace(/\n/g, '<br>')}</p><p>${status === 'pending' ? 'Sjećanje čeka vaše odobrenje.' : 'Sjećanje je automatski objavljeno.'}</p><p><a href="${url}">Pregledaj i potvrdi sjećanja</a></p>`;
      await Promise.all(recipients.map((to) => sendMail({ to, subject: `Novo sjećanje — ${name}`, html })));
      emailSent = true;
    } catch {
      console.error('Tribute notification failed', tribute.id);
    }
    await admin.from('memorial_audit_log').insert({ memorial_id: memorial.id, action: emailSent ? 'tribute_notification_sent' : 'tribute_notification_failed', entity_type: 'memorial_tributes', entity_id: tribute.id });
    return json({ success: true, status, email_sent: emailSent });
  } catch {
    console.error('Tribute submission failed');
    return json({ error: 'Sjećanje nije moguće poslati. Pokušajte ponovno.' }, 500);
  }
});