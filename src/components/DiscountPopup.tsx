import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Check, Copy } from "lucide-react";
import { CONSENT_CHANGED, readConsent } from "@/lib/consent";
import { trackNewsletterSignup } from "@/lib/newsletterTracking";

const DISMISS_KEY = "discountPopupDismissedAt";
const CLAIMED_KEY = "discountPopupClaimed";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

/** Paths where the popup must never interrupt (checkout, editing, admin). */
const isBlockedPath = (p: string) =>
  p.startsWith("/admin") ||
  p.startsWith("/kreiraj-memorijal") ||
  p.startsWith("/digitalni-memorijal/placanje") ||
  p.startsWith("/zahvaljujemo") ||
  /^\/memorijal\/[^/]+\/uredi/.test(p) ||
  p.startsWith("/auth") ||
  p.startsWith("/prijava");

export const shouldSuppressPopup = (now = Date.now()) => {
  try {
    if (localStorage.getItem(CLAIMED_KEY)) return true;
    const d = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return d > 0 && now - d < WEEK_MS;
  } catch {
    return false;
  }
};

const DiscountPopup = () => {
  const { pathname } = useLocation();
  const { user, loading } = useAuth() as ReturnType<typeof useAuth> & { loading?: boolean };
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ code: string; emailSent: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  // Wait until the cookie prompt is answered, so a visitor never faces two popups at once.
  const [consentDecided, setConsentDecided] = useState(() => readConsent() !== null);

  useEffect(() => {
    const onConsent = () => setConsentDecided(readConsent() !== null);
    window.addEventListener(CONSENT_CHANGED, onConsent);
    return () => window.removeEventListener(CONSENT_CHANGED, onConsent);
  }, []);

  useEffect(() => {
    if (!consentDecided || open || result || loading || isBlockedPath(pathname) || shouldSuppressPopup()) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (user) {
        const { count } = await supabase
          .from("memorials")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id)
          .eq("paid", true);
        if ((count ?? 0) > 0) return;
      }
      if (!cancelled && !isBlockedPath(window.location.pathname) && !shouldSuppressPopup()) setOpen(true);
    }, 3000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname, user, loading, open, result, consentDecided]);

  // Hide immediately if user navigates into checkout/admin.
  useEffect(() => {
    if (open && isBlockedPath(pathname)) setOpen(false);
  }, [pathname, open]);

  const handleOpenChange = (next: boolean) => {
    if (next) return;
    setOpen(false);
    try {
      if (!result) localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch { /* ignore */ }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("Upiši ispravnu e-mail adresu.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("claim-popup-discount", {
        body: { email: value, newsletter },
      });
      if (fnError) {
        let msg = "Kod trenutno nije moguće izdati. Pokušaj ponovno.";
        try {
          const body = await (fnError as { context?: Response }).context?.json();
          if (body?.error) msg = body.error;
        } catch { /* ignore */ }
        setError(msg);
        return;
      }
      setResult({ code: data.code, emailSent: Boolean(data.emailSent) });
      trackNewsletterSignup("discount_popup", newsletter ? "discount_newsletter" : "discount_only");
      try { localStorage.setItem(CLAIMED_KEY, "1"); } catch { /* ignore */ }
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg border-2 border-memorial-gold p-6 sm:p-8">
        {!result ? (
          <>
            <DialogHeader className="text-center sm:text-center">
              <DialogTitle className="font-serif text-2xl sm:text-3xl leading-tight">
                30% popusta u samo 5 sekundi
              </DialogTitle>
              <DialogDescription className="text-base">
                Upiši svoju e-mail adresu i preuzmi 30% popusta za izradu digitalnog memorijala.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3 mt-2" noValidate>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Tvoja e-mail adresa"
                aria-label="Tvoja e-mail adresa"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
                className="h-12 text-base"
              />
              <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer">
                <Checkbox checked={newsletter} onCheckedChange={(v) => setNewsletter(v === true)} className="mt-0.5" />
                <span>Želim primati newsletter (neobvezno).</span>
              </label>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 text-base font-semibold bg-memorial-gold text-memorial-gold-foreground hover:bg-memorial-gold/90"
              >
                {submitting ? "Izdajem kod…" : "Preuzmi 30% popusta"}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center mt-1">
              E-mail koristimo za slanje koda za popust.{" "}
              <Link to="/politika-privatnosti" className="underline hover:text-foreground" onClick={() => handleOpenChange(false)}>
                Politika privatnosti
              </Link>
            </p>
          </>
        ) : (
          <>
            <DialogHeader className="text-center sm:text-center">
              <DialogTitle className="font-serif text-2xl sm:text-3xl">Tvojih 30% popusta je spremno!</DialogTitle>
              <DialogDescription className="text-base">
                Kod vrijedi za jednu kupnju digitalnog memorijala i ne zbraja se s drugim promo kodovima.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 rounded-md border border-memorial-gold bg-muted px-3 py-3 text-center font-mono text-lg font-bold tracking-wider break-all">
                {result.code}
              </div>
              <Button type="button" variant="outline" onClick={copy} className="h-12 shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="ml-1">{copied ? "Kopirano" : "Kopiraj kod"}</span>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {result.emailSent
                ? `Kod smo poslali i na ${email.trim()}.`
                : "Spremi ovaj kod — trenutačno ga nismo mogli poslati e-mailom."}
            </p>
            <Button asChild className="w-full h-12 text-base font-semibold bg-memorial-gold text-memorial-gold-foreground hover:bg-memorial-gold/90">
              <Link to="/digitalni-memorijal" onClick={() => setOpen(false)}>Izradi digitalni memorijal</Link>
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DiscountPopup;
