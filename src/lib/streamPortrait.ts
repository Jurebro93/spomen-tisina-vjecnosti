import { createParser } from 'eventsource-parser';

type ImagePayload = {
  type?: string;
  b64_json?: string;
  storage_path?: string;
  error?: { message?: string };
};

export async function streamPortraitEdit(
  endpoint: string,
  photoId: string,
  accessToken: string,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ photo_id: photoId }),
  });
  if (!response.ok || !response.body) {
    const raw = await response.text().catch(() => '');
    try {
      const parsed = JSON.parse(raw) as { error?: string };
      throw new Error(parsed.error || raw || `Uređivanje nije uspjelo (${response.status}).`);
    } catch (error) {
      if (error instanceof Error && error.message !== raw) throw error;
      throw new Error(raw || `Uređivanje nije uspjelo (${response.status}).`);
    }
  }

  let completed = false;
  let terminalError = '';
  let storagePath = '';
  const parser = createParser({
    onEvent(event) {
      let payload: ImagePayload | undefined;
      try {
        payload = JSON.parse(event.data) as ImagePayload;
      } catch {
        return;
      }
      if (event.event === 'error' || payload.type === 'error') {
        terminalError = payload.error?.message || 'Uređivanje fotografije nije uspjelo.';
        return;
      }
      const type = event.event || payload.type;
      const isFinal = type === 'image_edit.completed' || type === 'image_generation.completed';
      const isPartial = type === 'image_edit.partial_image' || type === 'image_generation.partial_image';
      if (!isFinal && !isPartial) return;
      if (!payload.b64_json) {
        terminalError = 'AI odgovor nije sadržavao fotografiju.';
        return;
      }
      onFrame(`data:image/png;base64,${payload.b64_json}`, isFinal);
      if (isFinal) {
        completed = true;
        storagePath = payload.storage_path || '';
      }
    },
  });

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    parser.feed(chunk.value);
  }
  if (terminalError) throw new Error(terminalError);
  if (!completed || !storagePath) throw new Error('Uređivanje nije završeno ili fotografija nije spremljena.');
  return storagePath;
}