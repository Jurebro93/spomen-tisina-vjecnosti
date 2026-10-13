import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { mediaPublicUrl, uploadMemorialImage, validateImage } from '@/lib/memorial';
import { useToast } from '@/hooks/use-toast';

export interface MediaItem {
  id: string;
  memorial_id: string;
  type: 'image' | 'video';
  storage_path: string | null;
  external_url: string | null;
  title: string | null;
  description: string | null;
  media_date: string | null;
  sort_order: number;
  is_cover: boolean;
  className?: string;
}

interface Props {
  memorialId: string;
  media: MediaItem[];
  onChange: (media: MediaItem[]) => void;
}

const PhotoUploader = ({ memorialId, media, onChange }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const images = media.filter((m) => m.type === 'image');

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length || uploading) return;
    setUploading(true);
    const created: MediaItem[] = [];
    try {
      for (const file of Array.from(files).slice(0, 20)) {
        const invalid = validateImage(file);
        if (invalid) {
          toast({ title: 'Fotografija nije prihvaćena', description: invalid, variant: 'destructive' });
          continue;
        }
        const path = await uploadMemorialImage(memorialId, file, 'photos');
        const { data, error } = await supabase
          .from('memorial_media')
          .insert({
            memorial_id: memorialId,
            type: 'image',
            storage_path: path,
            sort_order: images.length + created.length,
            is_cover: images.length + created.length === 0,
          })
          .select('*')
          .single();
        if (error) throw error;
        created.push(data as MediaItem);
      }
      if (created.length) onChange([...media, ...created]);
    } catch {
      toast({ title: 'Prijenos nije uspio', description: 'Fotografije nije bilo moguće prenijeti. Pokušajte ponovno.', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const updateItem = async (item: MediaItem, patch: Partial<MediaItem>) => {
    onChange(media.map((m) => (m.id === item.id ? { ...m, ...patch } : m)));
    const { error } = await supabase.from('memorial_media').update(patch).eq('id', item.id);
    if (error) toast({ title: 'Nije spremljeno', description: 'Promjene nije bilo moguće spremiti.', variant: 'destructive' });
  };

  const setCover = async (item: MediaItem) => {
    onChange(media.map((m) => ({ ...m, is_cover: m.id === item.id })));
    await supabase.from('memorial_media').update({ is_cover: false }).eq('memorial_id', memorialId);
    await supabase.from('memorial_media').update({ is_cover: true }).eq('id', item.id);
  };

  const removeItem = async (item: MediaItem) => {
    onChange(media.filter((m) => m.id !== item.id));
    if (item.storage_path) await supabase.storage.from('obituary-photos').remove([item.storage_path]);
    await supabase.from('memorial_media').delete().eq('id', item.id);
  };

  return (
    <div className="space-y-4">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only"
        aria-label="Odaberite fotografije" onChange={(e) => handleFiles(e.target.files)} />

      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-2" />}
        {images.length ? 'Dodaj još fotografija' : 'Dodaj prvu fotografiju'}
      </Button>

      {!images.length ? (
        <p className="text-sm text-muted-foreground">Još niste dodali fotografije. Podržani formati: JPG, PNG i WEBP (do 8 MB).</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {images.map((item) => (
            <div key={item.id} className="rounded-lg border border-border overflow-hidden bg-card">
              <img src={mediaPublicUrl(item.storage_path) ?? ''} alt={item.title ?? 'Fotografija memorijala'}
                className="w-full h-44 object-cover" loading="lazy" />
              <div className="p-3 space-y-2">
                <Input placeholder="Naslov (nije obvezno)" value={item.title ?? ''} maxLength={120}
                  onChange={(e) => onChange(media.map((m) => (m.id === item.id ? { ...m, title: e.target.value } : m)))}
                  onBlur={(e) => updateItem(item, { title: e.target.value })} />
                <Input placeholder="Opis (nije obvezno)" value={item.description ?? ''} maxLength={300}
                  onChange={(e) => onChange(media.map((m) => (m.id === item.id ? { ...m, description: e.target.value } : m)))}
                  onBlur={(e) => updateItem(item, { description: e.target.value })} />
                <Input type="date" value={item.media_date ?? ''} aria-label="Datum fotografije"
                  onChange={(e) => updateItem(item, { media_date: e.target.value || null })} />
                <div className="flex items-center justify-between pt-1">
                  <Button type="button" variant={item.is_cover ? 'default' : 'ghost'} size="sm" onClick={() => setCover(item)}>
                    <Star className="h-4 w-4 mr-1" />
                    {item.is_cover ? 'Glavna' : 'Postavi kao glavnu'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item)} aria-label="Obriši fotografiju">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
