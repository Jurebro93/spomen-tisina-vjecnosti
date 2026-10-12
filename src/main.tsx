import './lib/entityDecodingBootstrap'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { captureAttribution } from './lib/funnel'

captureAttribution();
window.addEventListener('cookie-consent-changed', () => captureAttribution());

createRoot(document.getElementById("root")!).render(<App />);
