import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { safeRedirect } from '@/hooks/useAuth';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    const finishGoogleLogin = async () => {
      const destination = safeRedirect(params.get('next'));
      const oauthError = params.get('error_description') || params.get('error');

      if (oauthError) {
        if (active) setFailed(true);
        return;
      }

      const code = params.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            if (active) setFailed(true);
            return;
          }
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) navigate(destination, { replace: true });
      else setFailed(true);
    };

    void finishGoogleLogin();
    return () => { active = false; };
  }, [navigate, params]);

  if (failed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Google prijava nije dovršena</h1>
          <p className="mt-3 text-muted-foreground">Vratite se na prijavu i pokušajte ponovno.</p>
          <a className="mt-6 inline-flex text-accent underline underline-offset-4" href="/prijava">Natrag na prijavu</a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background" aria-live="polite">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        Dovršavamo prijavu…
      </div>
    </main>
  );
};

export default AuthCallback;