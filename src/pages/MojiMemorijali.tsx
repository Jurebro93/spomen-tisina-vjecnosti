import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CreditCard, Eye, Flower2, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CitiesSection from '@/components/CitiesSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  DECEASED_FIELDS, MEMORIAL_PRICE_LABEL, STATUS_LABELS, VISIBILITY_LABELS, friendlyError, fullName,
  lifeYears, mediaPublicUrl, type Deceased, type Memorial,
} from '@/lib/memorial';
import { deleteMemorial } from '@/lib/memorialActions';
import PayMemorialDialog from '@/components/promo/PayMemorialDialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Row {
  memorial: Memorial;
  deceased: Deceased | null;
  role: string;
  cover: string | null;
  pendingTributes: number;
  pendingRequests: number;
}

const MojiMemorijali = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payId, setPayId] = useState<string | null>(null);

  const handleDelete = async (memorial: Memorial, name: string) => {
    if (!window.confirm(`Trajno obrisati memorijal za ${name}? Sve fotografije, uspomene i svijeće bit će obrisane.`)) return;
    setBusyId(memorial.id);
    try {
      await deleteMemorial(memorial.id);
      setRows((prev) => prev.filter((r) => r.memorial.id !== memorial.id));
      toast({ title: 'Memorijal je obrisan.' });
    } catch (error) {
      toast({ title: 'Nije obrisano', description: friendlyError(error), variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) navigate('/prijava?redirect=%2Fmoji-memorijali', { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data: managers } = await supabase
        .from('memorial_managers')
        .select('memorial_id, role')
        .eq('user_id', user.id);
      const ids = (managers ?? []).map((m) => m.memorial_id);
      if (!ids.length) { if (active) { setRows([]); setLoading(false); } return; }

      const [mem, media, tributes, requests] = await Promise.all([
        supabase.from('memorials').select('*').in('id', ids).order('updated_at', { ascending: false }),
        supabase.from('memorial_media').select('memorial_id, storage_path, is_cover, sort_order').in('memorial_id', ids),
        supabase.from('memorial_tributes').select('memorial_id').in('memorial_id', ids).eq('status', 'pending'),
        supabase.from('memorial_access_requests').select('memorial_id').in('memorial_id', ids).eq('status', 'pending'),
      ]);
      const memorials = (mem.data as Memorial[]) ?? [];
      const deceasedIds = memorials.map((m) => m.deceased_id);
      const { data: dec } = deceasedIds.length
        ? await supabase.from('obituaries').select(DECEASED_FIELDS).in('id', deceasedIds)
        : { data: [] as Deceased[] };

      if (!active) return;
      const decMap = new Map((((dec as Deceased[]) ?? [])).map((d) => [d.id, d]));
      const roleMap = new Map((managers ?? []).map((m) => [m.memorial_id, m.role]));
      const count = (list: { memorial_id: string }[] | null, id: string) =>
        (list ?? []).filter((x) => x.memorial_id === id).length;

      setRows(memorials.map((m) => {
        const mine = (media.data ?? []).filter((x) => x.memorial_id === m.id);
        const cover = mine.find((x) => x.is_cover) ?? mine.sort((a, b) => a.sort_order - b.sort_order)[0];
        const d = decMap.get(m.deceased_id) ?? null;
        return {
          memorial: m,
          deceased: d,
          role: roleMap.get(m.id) ?? 'editor',
          cover: mediaPublicUrl(cover?.storage_path) ?? d?.fotografija_url ?? null,
          pendingTributes: count(tributes.data, m.id),
          pendingRequests: count(requests.data, m.id),
        };
      }));
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [user]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Moji memorijali | Digitalni memorijal</title>
        <meta name="description" content="Upravljajte svojim digitalnim memorijalima, uredite sadržaj i odobrite uspomene koje su poslali posjetitelji." />
        <meta name="robots" content="noindex,follow" />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 md:py-14">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl">Moji memorijali</h1>
            <p className="text-muted-foreground mt-2">Memorijali koje ste stvorili ili kojima upravljate.</p>
          </div>
          <Button asChild>
            <Link to="/kreiraj-memorijal"><Plus className="h-4 w-4 mr-2" /> Novi memorijal</Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center space-y-4">
              <Flower2 className="h-8 w-8 mx-auto text-accent" />
              <h2 className="font-serif text-2xl">Još nemate memorijala</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Stvorite trajno mjesto sjećanja na voljenu osobu — s fotografijama, životnom pričom i porukama obitelji.
              </p>
              <Button asChild><Link to="/kreiraj-memorijal">Stvori memorijal</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {rows.map(({ memorial, deceased, role, cover, pendingTributes, pendingRequests }) => (
              <Card key={memorial.id} className="overflow-hidden">
                <div className="aspect-[16/10] bg-secondary overflow-hidden">
                  {cover ? (
                    <img src={cover} alt={`Fotografija — ${fullName(deceased)}`} loading="lazy"
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Flower2 className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <CardContent className="p-5 space-y-4">
                  <div>
                    <h2 className="font-serif text-xl">{fullName(deceased)}</h2>
                    <p className="text-sm text-muted-foreground">
                      {lifeYears(deceased?.datum_rodenja, deceased?.datum_smrti)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{STATUS_LABELS[memorial.status]}</Badge>
                    <Badge variant="outline">{VISIBILITY_LABELS[memorial.visibility]}</Badge>
                    <Badge variant="outline">{role === 'owner' ? 'Vlasnik' : role === 'admin' ? 'Administrator' : 'Urednik'}</Badge>
                    {memorial.paid !== true && <Badge variant="destructive">Nije plaćeno</Badge>}
                  </div>
                  {(pendingTributes > 0 || pendingRequests > 0) && (
                    <p className="text-sm text-accent-foreground bg-accent/15 rounded-md px-3 py-2">
                      {pendingTributes > 0 && `${pendingTributes} uspomena čeka odobrenje. `}
                      {pendingRequests > 0 && `${pendingRequests} zahtjev(a) za pristup.`}
                    </p>
                  )}
                  {memorial.paid !== true && (
                    <p className="text-sm text-muted-foreground">
                      Memorijal još nije plaćen pa nije objavljen niti ga je moguće dijeliti.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1">
                      <Link to={`/memorijal/${memorial.slug}/uredi`}><Pencil className="h-4 w-4 mr-2" /> Uredi</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link to={`/memorijal/${memorial.slug}`}><Eye className="h-4 w-4 mr-2" /> Pogledaj memorijal</Link>
                    </Button>
                  </div>
                  {(memorial.paid !== true || role === 'owner') && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                      {memorial.paid !== true && role === 'owner' && (
                        <Button size="sm" variant="gold" className="flex-1 mt-3"
                          disabled={busyId === memorial.id} onClick={() => setPayId(memorial.id)}>
                          <CreditCard className="h-4 w-4 mr-2" /> Plati i objavi ({MEMORIAL_PRICE_LABEL})
                        </Button>
                      )}
                      {role === 'owner' && (
                        <Button size="sm" variant="ghost" className="mt-3 text-destructive hover:text-destructive"
                          disabled={busyId === memorial.id} onClick={() => handleDelete(memorial, fullName(deceased))}>
                          <Trash2 className="h-4 w-4 mr-2" /> Obriši
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <CitiesSection />
      <Footer />
      <PayMemorialDialog
        memorialId={payId}
        open={payId !== null}
        onOpenChange={(open) => { if (!open) setPayId(null); }}
      />
    </div>
  );
};

export default MojiMemorijali;
