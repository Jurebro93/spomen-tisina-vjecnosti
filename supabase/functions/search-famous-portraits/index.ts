import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "npm:zod@3.23.8";
import {
  bytesToDataUrl,
  callVisionJson,
  corsHeaders,
  extensionForMime,
  fetchImageBytes,
  GatewayHttpError,
  jsonResponse,
  licenseAllowsEdits,
  PORTRAIT_BUCKET,
  requireAdmin,
  stripHtml,
} from "../_shared/famousPortraits.ts";

const BodySchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
});

type CommonsMetadata = { value?: string };
type CommonsPage = {
  title?: string;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    width?: number;
    height?: number;
    mime?: string;
    descriptionurl?: string;
    extmetadata?: Record<string, CommonsMetadata>;
  }>;
};

type DownloadedCandidate = {
  title: string;
  sourcePageUrl: string;
  sourceFileUrl: string;
  author: string;
  licenseName: string;
  licenseUrl: string | null;
  attributionText: string;
  width: number | null;
  height: number | null;
  bytes: Uint8Array;
  mime: string;
};

type VisionResult = {
  photos?: Array<{
    index?: number;
    matches_person?: boolean;
    confidence?: number;
    reason?: string;
    suitable_portrait?: boolean;
  }>;
};

const metadataValue = (metadata: Record<string, CommonsMetadata>, key: string) =>
  stripHtml(metadata[key]?.value ?? "");

const commonsApiUrl = (name: string) => {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    origin: "*",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "24",
    gsrsearch: `"${name}" filetype:bitmap`,
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "1400",
  });
  return `https://commons.wikimedia.org/w/api.php?${params.toString()}`;
};

async function findCandidates(fullName: string) {
  const response = await fetch(commonsApiUrl(fullName), {
    headers: { "User-Agent": "OsmrtnicaMemorialPortraits/1.0 (https://osmrtnica.com.hr)" },
  });
  if (!response.ok) throw new Error(`Wikimedia Commons pretraga nije dostupna (${response.status}).`);
  const payload = await response.json() as { query?: { pages?: CommonsPage[] } };
  const pages = payload.query?.pages ?? [];
  const candidates: Omit<DownloadedCandidate, "bytes" | "mime">[] = [];

  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const metadata = info?.extmetadata ?? {};
    const licenseName = metadataValue(metadata, "LicenseShortName") || metadataValue(metadata, "UsageTerms");
    const fileUrl = info?.thumburl || info?.url;
    const sourcePageUrl = info?.descriptionurl;
    const mime = (info?.mime ?? "").toLowerCase();
    if (!fileUrl || !sourcePageUrl || !["image/jpeg", "image/png", "image/webp"].includes(mime)) continue;
    if (!licenseAllowsEdits(licenseName)) continue;
    if ((info?.width ?? 0) < 500 || (info?.height ?? 0) < 500) continue;

    const author = metadataValue(metadata, "Artist") || metadataValue(metadata, "Credit") || "Nepoznat autor";
    const licenseUrl = metadataValue(metadata, "LicenseUrl") || null;
    candidates.push({
      title: stripHtml(page.title?.replace(/^File:/, "") ?? fullName),
      sourcePageUrl,
      sourceFileUrl: fileUrl,
      author,
      licenseName,
      licenseUrl,
      attributionText: `${author} — ${licenseName}`,
      width: info?.width ?? null,
      height: info?.height ?? null,
    });
    if (candidates.length >= 8) break;
  }

  const downloaded: DownloadedCandidate[] = [];
  for (const candidate of candidates) {
    try {
      const image = await fetchImageBytes(candidate.sourceFileUrl);
      downloaded.push({ ...candidate, ...image });
    } catch {
      // A broken source must not prevent the remaining candidates from being checked.
    }
  }
  return downloaded;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Metoda nije podržana." }, 405);

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  let parsed;
  try {
    parsed = BodySchema.safeParse(await req.json());
  } catch {
    return jsonResponse({ error: "Neispravan zahtjev." }, 400);
  }
  if (!parsed.success) return jsonResponse({ error: "Unesite ime i prezime osobe." }, 400);

  const { first_name: firstName, last_name: lastName } = parsed.data;
  const fullName = `${firstName} ${lastName}`;
  const { admin, userId } = auth;
  const { data: job, error: jobError } = await admin
    .from("famous_portrait_jobs")
    .insert({ created_by: userId, first_name: firstName, last_name: lastName, status: "searching" })
    .select("id")
    .single();
  if (jobError || !job) return jsonResponse({ error: jobError?.message ?? "Posao nije moguće otvoriti." }, 500);

  try {
    const candidates = await findCandidates(fullName);
    if (!candidates.length) {
      await admin.from("famous_portrait_jobs").update({ status: "completed", found_count: 0, missing_count: 3 }).eq("id", job.id);
      return jsonResponse({ job_id: job.id, photos: [], found_count: 0, missing_count: 3 });
    }

    const verification = await callVisionJson<VisionResult>(
      `Provjeri prikazuje li svaka priložena fotografija upravo poznatu osobu ${fullName}. ` +
      "Osloni se na prepoznatljive crte lica, dob i kontekst. Odbij fotografije druge osobe, grupe bez jasno prepoznatljive tražene osobe, " +
      "crteže, kipove, logotipe i kadrove u kojima lice nije dovoljno vidljivo. Vrati isključivo JSON oblika " +
      '{"photos":[{"index":1,"matches_person":true,"confidence":0.95,"reason":"kratko obrazloženje","suitable_portrait":true}]}. ' +
      "Uključi redak za svaku fotografiju i koristi indekse počevši od 1.",
      candidates.map((candidate) => bytesToDataUrl(candidate.bytes, candidate.mime)),
    );

    const checked = new Map((verification.photos ?? []).map((item) => [item.index, item]));
    const selected = candidates
      .map((candidate, index) => ({ candidate, check: checked.get(index + 1) }))
      .filter(({ check }) => check?.matches_person === true && check?.suitable_portrait === true && Number(check?.confidence ?? 0) >= 0.72)
      .sort((a, b) => Number(b.check?.confidence ?? 0) - Number(a.check?.confidence ?? 0))
      .slice(0, 3);

    const saved = [];
    for (let index = 0; index < selected.length; index += 1) {
      const { candidate, check } = selected[index];
      const photoId = crypto.randomUUID();
      const sourcePath = `portraits/${job.id}/${photoId}/source.${extensionForMime(candidate.mime)}`;
      const { error: uploadError } = await admin.storage
        .from(PORTRAIT_BUCKET)
        .upload(sourcePath, candidate.bytes, { contentType: candidate.mime, upsert: false });
      if (uploadError) continue;

      const { data: photo, error: insertError } = await admin
        .from("famous_portrait_photos")
        .insert({
          id: photoId,
          job_id: job.id,
          source_page_url: candidate.sourcePageUrl,
          source_file_url: candidate.sourceFileUrl,
          source_title: candidate.title,
          author: candidate.author,
          license_name: candidate.licenseName,
          license_url: candidate.licenseUrl,
          attribution_text: candidate.attributionText,
          source_storage_path: sourcePath,
          mime_type: candidate.mime,
          source_width: candidate.width,
          source_height: candidate.height,
          identity_verified: true,
          identity_confidence: Math.min(1, Math.max(0, Number(check?.confidence ?? 0))),
          identity_reason: String(check?.reason ?? "Identitet je potvrđen vizualnom provjerom.").slice(0, 500),
          status: "verified",
          sort_order: index,
        })
        .select("*")
        .single();
      if (!insertError && photo) saved.push(photo);
    }

    await admin.from("famous_portrait_jobs").update({
      status: saved.length ? "ready" : "completed",
      found_count: saved.length,
      missing_count: Math.max(0, 3 - saved.length),
      error_message: null,
    }).eq("id", job.id);

    return jsonResponse({ job_id: job.id, photos: saved, found_count: saved.length, missing_count: Math.max(0, 3 - saved.length) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pretraga fotografija nije uspjela.";
    await admin.from("famous_portrait_jobs").update({ status: "failed", error_message: message.slice(0, 1000) }).eq("id", job.id);
    return jsonResponse({ error: message, job_id: job.id }, error instanceof GatewayHttpError ? error.status : 500);
  }
});