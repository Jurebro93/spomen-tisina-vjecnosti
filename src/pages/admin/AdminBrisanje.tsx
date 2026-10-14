import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminGuard from '@/components/admin/AdminGuard';

interface Row {
  id: string;
  ime: string;
  prezime: string;
  slug: string | null;
  datum_smrti: string | null;
  mjesto_smrti: string | null;
  memorial?: { id: string; slug: string; paid: boolean } | null;
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('hr-HR') : '—');

const Inner = () => {
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async (term: string) => {
    setLoading(true);
    let query = supabase.from('obituaries').select('id, ime, prezime, slug, datum_smrti, mjesto_smrti')
      .order('created_at', { ascending: false }).limit(100);
    const t = term.trim().replace(/[%,()]/g, '');
    if (t) query = query.or(`ime.ilike.%${t}%,prezime.ilike.%${t}%,slug.ilike.%${t}%`);
    const { data, error } = await query;
    if (error) { toast({ title: 'Greška', description: error.message, variant: 'destructive' }); setLoading(false); return; }
    const list = (data ?? []) as Row[];
    const ids = list.map((r) => r.id);
    const { data: mems } = ids.length
      ? await supabase.from('memorials').select('id, slug, paid, deceased_id').in('deceased_id', ids)
      : { data: [] };
    const map = new Map((mems ?? []).map((m) => [m.deceased_id, m]));
    setRows(list.map((r) => ({ ...r, memorial: map.get(r.id) ?? null })));
    setLoading(false);
  };

  useEffect(() => { load(''); }, []);

  const run = async (key: string, confirmText: string, fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    if (!window.confirm(confirmText)) return;
    setBusy(key);
    const { error } = await fn();
    setBusy(null);
    if (error) { toast({ title: 'Nije obrisano', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Obrisano.' });
    load(q);
  };

  return (
    <main className="flex-1 container mx-auto px-4 py-10">
      <h1 className="font-serif text-3xl mb-2">Brisanje osmrtnica i memorijala</h1>
      <p className="text-muted-foreground mb-6">Trajno brisanje iz baze. Brisanjem osmrtnice briše se i njezin memorijal. Računi i narudžbe ostaju sačuvani.</p>
      <form className="flex gap-2 mb-6 max-w-lg" onSubmit={(e) => { e.preventDefault(); load(q); }}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ime, prezime ili adresa" />
        <Button type="submit"><Search className="h-4 w-4 mr-2" />Traži</Button>
      </form>
      <Card><CardContent className="p-0 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="p-6 text-muted-foreground">Nema rezultata.</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Osoba</TableHead><TableHead>Datum smrti</TableHead><TableHead>Mjesto</TableHead>
              <TableHead>Memorijal</TableHead><TableHead className="text-right">Akcije</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => {
                const name = `${r.ime} ${r.prezime}`;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.slug ? <Link className="underline" to={`/${r.slug}`}>{name}</Link> : name}</TableCell>
                    <TableCell>{fmt(r.datum_smrti)}</TableCell>
                    <TableCell>{r.mjesto_smrti ?? '—'}</TableCell>
                    <TableCell>
                      {r.memorial ? (
                        <div className="flex items-center gap-2">
                          <Link className="underline" to={`/memorijal/${r.memorial.slug}`}>{r.memorial.slug}</Link>
                          {r.memorial.paid && <Badge variant="secondary">Plaćeno</Badge>}
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap space-x-2">
                      {r.memorial && (
                        <Button size="sm" variant="outline" disabled={busy !== null}
                          onClick={() => run(`m${r.id}`, `Trajno obrisati memorijal za ${name}? Osmrtnica ostaje.`,
                            () => supabase.rpc('admin_delete_memorial' as never, { _memorial_id: r.memorial!.id } as never))}>
                          {busy === `m${r.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}Memorijal
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" disabled={busy !== null}
                        onClick={() => run(`o${r.id}`, `Trajno obrisati osmrtnicu za ${name}${r.memorial ? ' i njezin memorijal' : ''}?`,
                          () => supabase.rpc('admin_delete_obituary' as never, { _obituary_id: r.id } as never))}>
                        {busy === `o${r.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}Osmrtnica
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </main>
  );
};

const AdminBrisanje = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <Header />
    <AdminGuard><Inner /></AdminGuard>
    <Footer />
  </div>
);

export default AdminBrisanje;
