import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendMail } from "../_shared/mail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBMIT-OBITUARY] ${step}${detailsStr}`);
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES: Record<string, { extension: string; signatures: number[][] }> = {
  "image/jpeg": { extension: "jpg", signatures: [[0xff, 0xd8, 0xff]] },
  "image/png": { extension: "png", signatures: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] },
  "image/webp": { extension: "webp", signatures: [[0x52, 0x49, 0x46, 0x46]] },
  "image/gif": { extension: "gif", signatures: [[0x47, 0x49, 0x46, 0x38]] },
};

const decodePhoto = (photoUpload: unknown) => {
  if (!photoUpload || typeof photoUpload !== "object") return null;
  const input = photoUpload as { data?: unknown; contentType?: unknown };
  if (typeof input.data !== "string" || typeof input.contentType !== "string") {
    throw new Error("Invalid photo upload");
  }
  const format = PHOTO_TYPES[input.contentType];
  if (!format || input.data.length > Math.ceil(MAX_PHOTO_BYTES * 4 / 3) + 8) {
    throw new Error("Invalid photo upload");
  }

  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(input.data), (char) => char.charCodeAt(0));
  } catch {
    throw new Error("Invalid photo upload");
  }
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) throw new Error("Invalid photo upload");
  if (!format.signatures.some((signature) => signature.every((byte, index) => bytes[index] === byte))) {
    throw new Error("Invalid photo upload");
  }
  if (input.contentType === "image/webp" && new TextDecoder().decode(bytes.slice(8, 12)) !== "WEBP") {
    throw new Error("Invalid photo upload");
  }
  return { bytes, contentType: input.contentType, extension: format.extension };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const { obituaryData, photoUpload } = await req.json();
    logStep("Received obituary submission");

    if (!obituaryData) throw new Error("Missing obituary data");
    const photo = decodePhoto(photoUpload);

    // Helper function to convert empty strings to null
    const toNullIfEmpty = (value: string) => {
      if (value === null || value === undefined) return null;
      if (typeof value !== 'string') return value;
      return value.trim() !== '' ? value : null;
    };

    const toTimestampIfValid = (value: string) => {
      logStep("Processing timestamp", { value, type: typeof value });
      if (!value || value === null || value === undefined) return null;
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      if (trimmed === '') return null;
      
      try {
        // Try to parse the date to validate it
        const date = new Date(trimmed);
        if (isNaN(date.getTime())) {
          logStep("Invalid date", { trimmed });
          return null;
        }
        logStep("Valid date", { trimmed, parsed: date.toISOString() });
        return trimmed;
      } catch (error) {
        logStep("Date parsing error", { trimmed, error: error.message });
        return null;
      }
    };

    // Insert obituary as pending (not active/paid)
    const { data: obituary, error: insertError } = await supabaseClient
      .from("obituaries")
      .insert({
        ime: obituaryData.ime,
        prezime: obituaryData.prezime,
        datum_rodenja: obituaryData.datum_rodenja,
        datum_smrti: obituaryData.datum_smrti,
        mjesto_rodenja: obituaryData.mjesto_rodenja,
        mjesto_smrti: obituaryData.mjesto_smrti,
        profesija: toNullIfEmpty(obituaryData.profesija),
        podnaslov: toNullIfEmpty(obituaryData.podnaslov),
        biografija: toNullIfEmpty(obituaryData.biografija),
        fotografija_url: toNullIfEmpty(obituaryData.fotografija_url),
        groblje: toNullIfEmpty(obituaryData.groblje),
        datum_ukopa: toTimestampIfValid(obituaryData.datum_ukopa),
        vrijeme_ukopa: toNullIfEmpty(obituaryData.vrijeme_ukopa),
        ozalosceni: obituaryData.ozalosceni && obituaryData.ozalosceni.trim() !== '' 
          ? obituaryData.ozalosceni.split(',').map((s: string) => s.trim()).filter(s => s !== '') 
          : null,
        mjesna_zajednica: toNullIfEmpty(obituaryData.mjesna_zajednica),
        kontakt_osoba_ime: obituaryData.kontakt_osoba_ime,
        kontakt_osoba_email: obituaryData.kontakt_osoba_email,
        kontakt_osoba_telefon: toNullIfEmpty(obituaryData.kontakt_osoba_telefon),
        kontakt_osobe: obituaryData.kontakt_osobe || null,
        paid: false,
        active: false,
      })
      .select()
      .single();

    if (insertError) throw new Error(`Database error: ${insertError.message}`);

    logStep("Obituary inserted", { obituaryId: obituary.id });

    if (photo) {
      const storagePath = `obituaries/${obituary.id}/${crypto.randomUUID()}.${photo.extension}`;
      const { error: uploadError } = await supabaseClient.storage
        .from("obituary-photos")
        .upload(storagePath, photo.bytes, { contentType: photo.contentType, upsert: false });

      if (uploadError) {
        await supabaseClient.from("obituaries").delete().eq("id", obituary.id);
        throw new Error("Photo upload failed");
      }

      const { data: publicUrlData } = supabaseClient.storage
        .from("obituary-photos")
        .getPublicUrl(storagePath);
      const { error: photoUpdateError } = await supabaseClient
        .from("obituaries")
        .update({ fotografija_url: publicUrlData.publicUrl })
        .eq("id", obituary.id);

      if (photoUpdateError) {
        await supabaseClient.storage.from("obituary-photos").remove([storagePath]);
        await supabaseClient.from("obituaries").delete().eq("id", obituary.id);
        throw new Error("Photo link failed");
      }
      obituary.fotografija_url = publicUrlData.publicUrl;
    }

    const approveUrl = `https://umpvnepxsqfkxjpclkxc.supabase.co/functions/v1/approve-obituary?id=${obituary.id}&action=approve`;
    const rejectUrl = `https://umpvnepxsqfkxjpclkxc.supabase.co/functions/v1/approve-obituary?id=${obituary.id}&action=reject`;

    await sendMail({
      to: ["seoexperiment.agency@gmail.com"],
      subject: `Nova osmrtnica za odobrenje: ${obituary.ime} ${obituary.prezime}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
          <h2 style="color:#333; border-bottom: 2px solid #d4af37; padding-bottom: 8px;">🔔 Nova osmrtnica čeka odobrenje</h2>
          <div style="background:#f8f9fa; border:1px solid #eee; padding:16px; border-radius:8px;">
            <p><strong>Ime i prezime:</strong> ${obituary.ime} ${obituary.prezime}</p>
            <p><strong>Datumi:</strong> ${obituary.datum_rodenja} – ${obituary.datum_smrti}</p>
            ${obituary.groblje ? `<p><strong>Groblje:</strong> ${obituary.groblje}</p>` : ''}
            ${obituary.datum_ukopa ? `<p><strong>Datum ukopa:</strong> ${obituary.datum_ukopa}</p>` : ''}
            ${obituary.kontakt_osoba_email ? `<p><strong>Kontakt email:</strong> ${obituary.kontakt_osoba_email}</p>` : ''}
          </div>
          <div style="text-align:center; margin-top:20px;">
            <a href="${approveUrl}" style="background:#22c55e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;margin-right:10px;display:inline-block;">✅ ODOBRI</a>
            <a href="${rejectUrl}" style="background:#ef4444;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">❌ ODBACI</a>
          </div>
        </div>
      `,
    });

    logStep("Email sent");

    return new Response(JSON.stringify({ success: true, id: obituary.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});