import { supabase } from '@/integrations/supabase/client';

/**
 * A guest with a Google-only account sets a password through the reset e-mail. Opening that link
 * replaces the guest session in this browser, so the guest's refresh token is kept here and the
 * draft is moved to the account as soon as it signs in (convert-guest-account, mode "claim").
 */
const KEY = 'osm_guest_claim';

const read = (): string | null => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};
const write = (value: string | null) => {
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch { /* storage blocked: the guest can still log in with the password on the checkout step */ }
};

/** Call before sending the reset e-mail while the visitor is still a guest. */
export const rememberGuestForClaim = async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user?.is_anonymous && data.session.refresh_token) write(data.session.refresh_token);
};

/** The guest session rotates its refresh token; keep the stored one current. */
export const updateGuestClaimToken = (refreshToken: string | undefined) => {
  if (refreshToken && read()) write(refreshToken);
};

let inFlight: Promise<boolean> | null = null;

/** Moves the remembered guest's drafts to the signed-in account. Resolves true when something was claimed. */
export const runPendingGuestClaim = (): Promise<boolean> => {
  if (inFlight) return inFlight;
  const guestRefreshToken = read();
  if (!guestRefreshToken) return Promise.resolve(false);
  write(null);
  inFlight = (async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token || session.session?.user?.is_anonymous) {
        write(guestRefreshToken);
        return false;
      }
      const { data } = await supabase.functions.invoke('convert-guest-account', {
        body: { mode: 'claim', guest_refresh_token: guestRefreshToken },
        headers: { Authorization: `Bearer ${token}` },
      });
      return Boolean(data?.ok);
    } catch {
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
};
