// Privremena pomoćna funkcija za prijenos seed slika u Supabase Storage.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BUCKET = "obituary-photos";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Metoda nije podržana." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { path?: string; base64?: string; content_type?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Neispravan zahtjev." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const path = String(body.path ?? "");
  const base64 = String(body.base64 ?? "");
  const contentType = String(body.content_type ?? "image/jpeg");
  const allowed = path.startsWith("memorials/") || path.startsWith("portraits/") || path.startsWith("site/") || path.startsWith("blog/");
  if (!allowed || path.includes("..") || !base64) {
    return new Response(JSON.stringify({ error: "Putanja nije dopuštena." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  if (bytes.byteLength > 8 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: "Datoteka je prevelika." }), {
      status: 413,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return new Response(JSON.stringify({ path, public_url: data.publicUrl }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
