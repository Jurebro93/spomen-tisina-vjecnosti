import { supabase } from '@/integrations/supabase/client';
import DOMPurify from 'dompurify';

export const MEMORIAL_BUCKET = 'obituary-photos';

export type MemorialVisibility = 'public' | 'unlisted' | 'private';
export type MemorialStatus = 'draft' | 'published' | 'archived';
export type ManagerRole = 'owner' | 'admin' | 'editor';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface Deceased {
  id: string;
  ime: string;
  prezime: string;
  datum_rodenja: string | null;
  datum_smrti: string | null;
  mjesto_rodenja: string | null;
  mjesto_smrti: string | null;
  biografija: string | null;
  fotografija_url: string | null;
  groblje: string | null;
  profesija: string | null;
  podnaslov: string | null;
  slug: string | null;
  /** false = zapis unesen samo za memorijal (nema objavljene osmrtnice) */
  active?: boolean | null;
}

export const DECEASED_FIELDS =
  'id, ime, prezime, datum_rodenja, datum_smrti, mjesto_rodenja, mjesto_smrti, biografija, fotografija_url, groblje, profesija, podnaslov, slug, active';

export interface Memorial {
  id: string;
  deceased_id: string;
  slug: string;
  owner_id: string;
  relationship: string | null;
  quote: string | null;
  life_story: string | null;
  visibility: MemorialVisibility;
  status: MemorialStatus;
  allow_tributes: boolean;
  allow_candles: boolean;
  tributes_require_approval?: boolean;
  allow_media_download: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
  paid?: boolean | null;
  paid_at?: string | null;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
}

export const MEMORIAL_PRICE_EUR = 39;

export const MEMORIAL_PRICE_LABEL = '39 €';

export const RELATIONSHIPS = [
  'suprug/supruga',
  'sin/kći',
  'roditelj',
  'brat/sestra',
  'unuk/unuka',
  'drugi član obitelji',
  'prijatelj/prijateljica',
  'drugo',
];

export const VISIBILITY_LABELS: Record<MemorialVisibility, string> = {
  public: 'Javno',
  unlisted: 'Samo putem poveznice',
  private: 'Privatno',
};

export const STATUS_LABELS: Record<MemorialStatus, string> = {
  draft: 'Skica',
  published: 'Objavljeno',
  archived: 'Arhivirano',
};

/* ---------------- formatting ---------------- */

const MONTHS = [
  'siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja',
  'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca',
];

export const formatCroatianDate = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}.`;
};

export const yearOf = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.getFullYear();
};

export const lifeYears = (birth?: string | null, death?: string | null) => {
  const b = yearOf(birth);
  const d = yearOf(death);
  if (b && d) return `${b}. – ${d}.`;
  if (d) return `† ${d}.`;
  if (b) return `${b}. –`;
  return '';
};

export const fullName = (d?: Pick<Deceased, 'ime' | 'prezime'> | null) =>
  d ? `${d.ime ?? ''} ${d.prezime ?? ''}`.trim() : '';

/* ---------------- sanitization ---------------- */

export const sanitizeRichText = (html: string) =>
  // Browsers use divs for Enter in contentEditable. Preserve those paragraph
  // boundaries before sanitization removes unsupported editor wrappers.
  DOMPurify.sanitize((html ?? '').replace(/<div\b[^>]*>/gi, '<p>').replace(/<\/div\s*>/gi, '</p>'), {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#|\/)/i,
  });

/**
 * Formats a stored life story for display. HTML paragraphs are preserved; plain text or
 * light markdown (## headings, **bold**, blank-line paragraphs) becomes HTML.
 */
export const formatLifeStory = (raw: string) => {
  const text = (raw ?? '').trim();
  if (!text) return '';
  if (/<[a-z][^>]*>/i.test(text)) {
    const safe = sanitizeRichText(text);
    if (/<(p|h2|h3|ul|ol|blockquote)\b/i.test(safe)) return safe;
    // Older editor content used only br separators, with no paragraph spacing.
    return sanitizeRichText(safe.split(/<br\s*\/?\s*>|\r?\n/i)
      .map((line) => `<p>${line.trim() || '<br />'}</p>`).join(''));
  }
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  let blocks = text.replace(/\r/g, '').split(/\n{2,}/);
  // Single-newline text (one big block) → split into sentences groups.
  if (blocks.length === 1 && !blocks[0].startsWith('#')) blocks = blocks[0].split(/\n+/);
  const html = blocks
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      const lines = b.split('\n');
      const out: string[] = [];
      let para: string[] = [];
      const flush = () => { if (para.length) out.push(`<p>${para.map(inline).join('<br />')}</p>`); para = []; };
      for (const l of lines) {
        const h = l.match(/^#{1,3}\s+(.+)/);
        if (h) { flush(); out.push(`<h3>${inline(h[1].replace(/\*\*/g, ''))}</h3>`); } else para.push(l);
      }
      flush();
      return out.join('');
    })
    .join('');
  return sanitizeRichText(html);
};

/** Turns plain text (with blank-line paragraphs) into safe HTML. */
export const plainTextToHtml = (text: string) =>
  sanitizeRichText(
    (text ?? '')
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, '<br />').replace(/</g, '&lt;')}</p>`)
      .join('')
  );

/* ---------------- storage ---------------- */

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export const validateImage = (file: File): string | null => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Dopuštene su samo JPG, PNG i WEBP fotografije.';
  if (file.size > MAX_IMAGE_BYTES) return 'Fotografija je prevelika (maksimalno 8 MB).';
  return null;
};

export const mediaPublicUrl = (storagePath?: string | null) => {
  if (!storagePath) return null;
  if (
    /^(https?:)?\/\//i.test(storagePath) ||
    storagePath.startsWith('data:') ||
    storagePath.startsWith('blob:') ||
    storagePath.startsWith('/')
  ) {
    return storagePath;
  }
  const { data } = supabase.storage.from(MEMORIAL_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
};

export const uploadMemorialImage = async (
  memorialId: string,
  file: File,
  folder: 'photos' | 'tributes' | 'timeline'
) => {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `memorials/${memorialId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(MEMORIAL_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
};

/* ---------------- queries ---------------- */

export const fetchDeceased = async (id: string) => {
  const { data, error } = await supabase.from('obituaries').select(DECEASED_FIELDS).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Deceased) ?? null;
};

export interface MemorialStub {
  id: string;
  slug: string;
  status: MemorialStatus;
  visibility: MemorialVisibility;
  deceased_id: string;
}

export const fetchMemorialForDeceased = async (deceasedId: string): Promise<MemorialStub | null> => {
  const { data, error } = await supabase
    .from('memorials')
    .select('id, slug, status, visibility, deceased_id')
    .eq('deceased_id', deceasedId)
    .maybeSingle();
  if (error) return null;
  return (data as MemorialStub) ?? null;
};

export const fetchMemorialsForDeceasedIds = async (ids: string[]): Promise<Record<string, MemorialStub>> => {
  if (!ids.length) return {};
  const { data } = await supabase
    .from('memorials')
    .select('id, slug, status, visibility, deceased_id')
    .in('deceased_id', ids);
  const map: Record<string, MemorialStub> = {};
  (data as MemorialStub[] | null)?.forEach((m) => { map[m.deceased_id] = m; });
  return map;
};

export const logMemorialAction = async (memorialId: string, userId: string, action: string, entityType?: string, entityId?: string) => {
  try {
    await supabase.from('memorial_audit_log').insert({
      memorial_id: memorialId,
      user_id: userId,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
    });
  } catch {
    /* audit log failures must never block the user */
  }
};

/** Simple client-side throttle for public forms (complements DB constraints). */
export const throttle = (key: string, minMs = 30_000): boolean => {
  try {
    const now = Date.now();
    const last = Number(localStorage.getItem(`throttle:${key}`) || 0);
    if (now - last < minMs) return false;
    localStorage.setItem(`throttle:${key}`, String(now));
    return true;
  } catch {
    return true;
  }
};

export const friendlyError = (error: unknown, fallback = 'Promjene nije bilo moguće spremiti. Pokušajte ponovno.') => {
  const message = (error as { message?: string } | null)?.message ?? '';
  if (message.includes('memorials_deceased_id_unique') || message.includes('duplicate key')) {
    return 'Za ovu osobu već postoji digitalni memorijal.';
  }
  return fallback;
};

export const isDuplicateMemorialError = (error: unknown) => {
  const message = (error as { message?: string } | null)?.message ?? '';
  const code = (error as { code?: string } | null)?.code ?? '';
  return code === '23505' || message.includes('memorials_deceased_id_unique');
};

export const memorialUrl = (slug: string) => `/memorijal/${slug}`;
export const memorialAbsoluteUrl = (slug: string) =>
  `${typeof window !== 'undefined' ? window.location.origin : ''}/memorijal/${slug}`;
