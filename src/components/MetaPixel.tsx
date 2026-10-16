import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { CONSENT_EVENT, initMetaPixel, setMetaUser, trackPageView } from '@/lib/metaPixel';

/**
 * Initialises the Meta Pixel once (after cookie consent and after the session is known,
 * so signed-in visitors are sent with advanced matching) and reports PageView
 * on the first load and on every SPA route change.
 */
const MetaPixel = () => {
  const { pathname, search } = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const init = () => initMetaPixel();
    void setMetaUser(user ? { id: user.id, email: user.email } : null).then(() => {
      if (!cancelled) init();
    });
    window.addEventListener(CONSENT_EVENT, init);
    return () => {
      cancelled = true;
      window.removeEventListener(CONSENT_EVENT, init);
    };
  }, [loading, user]);

  useEffect(() => {
    trackPageView(pathname + search);
  }, [pathname, search]);

  return null;
};

export default MetaPixel;
