import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { isMailConfigured, sendMail } from '../_shared/mail.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const ROLES = ['admin', 'editor'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Metoda nije podržana' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return json({ error: 'Neautorizirano' }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) return json({ error: 'Neautorizirano' }, 401);
  const user = userData.user;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Neispravan zahtjev' }, 400);
  }

  const memorialId = String(body.memorial_id ?? '');
  const email = String(body.email ?? '').trim().toLowerCase();
  const role = String(body.role ?? '');
  const tokenHash = String(body.token_hash ?? '');
  const inviteToken = String(body.token ?? '');

  if (!/^[0-9a-f-]{36}$/i.test(memorialId)) return json({ error: 'Neispravan memorijal' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) return json({ error: 'Neispravna e-mail adresa' }, 400);
  if (!ROLES.includes(role)) return json({ error: 'Neispravna uloga' }, 400);
  if (!/^[0-9a-f]{64}$/.test(tokenHash) || inviteToken.length < 32) return json({ error: 'Neispravan token' }, 400);

  // Only owners/admins of this memorial may invite collaborators.
  const { data: manager } = await admin
    .from('memorial_managers')
    .select('role')
    .eq('memorial_id', memorialId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!manager || !['owner', 'admin'].includes(manager.role)) return json({ error: 'Nemate dopuštenje' }, 403);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error: insertError } = await admin.from('memorial_invites').insert({
    memorial_id: memorialId,
    email,
    role,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_by: user.id,
  });
  if (insertError) return json({ error: 'Pozivnicu nije bilo moguće kreirati' }, 500);

  const { data: memorial } = await admin
    .from('memorials')
    .select('slug, deceased_id')
    .eq('id', memorialId)
    .maybeSingle();
  let personName = 'voljenu osobu';
  if (memorial?.deceased_id) {
    const { data: deceased } = await admin
      .from('obituaries')
      .select('ime, prezime')
      .eq('id', memorial.deceased_id)
      .maybeSingle();
    if (deceased) personName = `${deceased.ime} ${deceased.prezime}`.trim();
  }

  const origin = req.headers.get('origin') ?? 'https://spomen-tisina-vjecnosti.lovable.app';
  const link = `${origin}/memorijal/${memorial?.slug ?? ''}/uredi?poziv=${encodeURIComponent(inviteToken)}`;

  let emailed = false;
  if (isMailConfigured()) {
    const roleLabel = role === 'admin' ? 'administrator' : 'urednik';
    try {
      await sendMail({
        to: [email],
        subject: `Poziv za suradnju na memorijalu — ${personName}`,
        html: `
          <p>Pozvani ste da kao <strong>${roleLabel}</strong> pomognete u uređivanju digitalnog memorijala za ${personName}.</p>
          <p><a href="${link}">Otvorite memorijal i prihvatite poziv</a></p>
          <p>Poziv vrijedi 7 dana. Ako se ne možete prijaviti, prvo izradite račun s ovom e-mail adresom.</p>
        `,
      });
      emailed = true;
    } catch {
      return json({ ok: true, emailed: false, link }, 200);
    }
  }

  return json({ ok: true, emailed }, 200);
});
