import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ShieldCheck, Tag, Trash2, UserPlus } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import AdminGuard from '@/components/admin/AdminGuard';

interface AdminRow {
  id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  active: boolean;
  created_at: string;
  created_by: string | null;
}

const formatDate = (value: string) => new Date(value).toLocaleDateString('hr-HR');

const AdminAdminsInner = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [codeCounts, setCodeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: admins }, { data: codes }] = await Promise.all([
      supabase.from('admin_users').select('*').order('created_at', { ascending: true }),
      supabase.from('promo_codes').select('created_by_admin_id'),
    ]);
    setRows((admins as AdminRow[]) ?? []);
    const counts: Record<string, number> = {};
    (codes ?? []).forEach((c: { created_by_admin_id: string | null }) => {
      if (c.created_by_admin_id) counts[c.created_by_admin_id] = (counts[c.created_by_admin_id] ?? 0) + 1;
    });
    setCodeCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => {
    document.title = 'Administratori | Admin';
    load();
  }, [load]);

  const addAdmin = async () => {
    const email = form.email.trim().toLowerCase();
    if (!email) {
      toast({ title: 'Unesite e-mail adresu.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    // If the person already has an account we link it right away; otherwise the record
    // stays pending and the role is granted automatically on registration or sign-in.
    const { data: profile } = await supabase.from('profiles').select('id').ilike('email', email).maybeSingle();
    const { error } = await supabase.from('admin_users').insert({
      email,
      name: form.name.trim() || null,
      user_id: profile?.id ?? null,
      created_by: user?.id ?? null,
      active: true,
    });
    setSaving(false);
    if (error) {
      toast({
        title: 'Administrator nije dodan',
        description: error.message.includes('duplicate') || error.code === '23505'
          ? 'Ova e-mail adresa već je na popisu administratora.'
          : error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Administrator je dodan',
      description: profile?.id
        ? 'Administratorska prava su odmah aktivna.'
        : 'Prava će biti dodijeljena automatski kada se korisnik registrira ili prijavi.',
    });
    setForm({ name: '', email: '' });
    setOpen(false);
    load();
  };

  const toggleActive = async (row: AdminRow) => {
    const { error } = await supabase.from('admin_users').update({ active: !row.active }).eq('id', row.id);
    if (error) {
      toast({ title: 'Promjena nije uspjela', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: row.active ? 'Administrator je deaktiviran' : 'Administrator je aktiviran' });
    load();
  };

  const removeAdmin = async (row: AdminRow) => {
    if (!window.confirm(`Ukloniti administratora ${row.email}?`)) return;
    const { error } = await supabase.from('admin_users').delete().eq('id', row.id);
    if (error) {
      toast({ title: 'Uklanjanje nije uspjelo', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Administrator je uklonjen' });
    load();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-accent" /> Administratori
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Svi administratori imaju jednake ovlasti.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link to="/admin/promo-kodovi"><Tag className="h-4 w-4 mr-2" />Promo kodovi</Link></Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><UserPlus className="h-4 w-4 mr-2" />Dodaj administratora</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dodaj administratora</DialogTitle>
                  <DialogDescription>
                    Ako osoba još nema račun, prava se dodjeljuju automatski nakon registracije.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-name">Ime</Label>
                    <Input id="admin-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-email">E-mail *</Label>
                    <Input id="admin-email" type="email" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={addAdmin} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Dodaj
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ime</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dodan</TableHead>
                  <TableHead className="text-right">Promo kodovi</TableHead>
                  <TableHead className="text-right">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name || '—'}</TableCell>
                    <TableCell className="break-all">{row.email}</TableCell>
                    <TableCell>
                      {row.active ? (
                        <Badge>{row.user_id ? 'Aktivan' : 'Čeka registraciju'}</Badge>
                      ) : (
                        <Badge variant="secondary">Neaktivan</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(row.created_at)}</TableCell>
                    <TableCell className="text-right">{codeCounts[row.id] ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => toggleActive(row)}>
                          {row.active ? 'Deaktiviraj' : 'Aktiviraj'}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeAdmin(row)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!rows.length && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nema administratora.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

const AdminAdmins = () => (
  <AdminGuard><AdminAdminsInner /></AdminGuard>
);

export default AdminAdmins;
