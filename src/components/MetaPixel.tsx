import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CONSENT_EVENT, initMetaPixel, trackPageView } from '@/lib/metaPixel';

/**
 * Initialises the Meta Pixel once (after cookie consent) and reports PageView
 * on the first load and on every SPA route change.
 */
const MetaPixel = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    initMetaPixel();
    const onConsent = () => initMetaPixel();
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  useEffect(() => {
    trackPageView(pathname + search);
  }, [pathname, search]);

  return null;
};

export default MetaPixel;
