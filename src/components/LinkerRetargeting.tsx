import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CONSENT_CHANGED } from '@/lib/consent';
import { fireLinkerRetargeting } from '@/lib/linkerPixel';

/** Linker.hr retargeting pixel on memorial pages: on every SPA route view and when marketing consent is given there. */
const LinkerRetargeting = () => {
  const { pathname, key } = useLocation();

  useEffect(() => {
    const fire = () => fireLinkerRetargeting(pathname, key);
    fire();
    window.addEventListener(CONSENT_CHANGED, fire);
    return () => window.removeEventListener(CONSENT_CHANGED, fire);
  }, [pathname, key]);

  return null;
};

export default LinkerRetargeting;
