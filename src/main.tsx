import './lib/entityDecodingBootstrap'
import { createRoot } from 'react-dom/client'
import { matchRoutes } from 'react-router-dom'
import App, { routes } from './App.tsx'
import './index.css'
import { captureAttribution } from './lib/funnel'
import { installPhotoFallback } from './lib/photoFallback'

installPhotoFallback();
captureAttribution();
window.addEventListener('cookie-consent-changed', () => captureAttribution());

// Load the current page's code before rendering: until then the
// server-rendered HTML in #root stays visible instead of a blank screen.
const matches = matchRoutes(routes, window.location.pathname);
const match = matches ? matches[matches.length - 1].route : null;
const render = () => createRoot(document.getElementById("root")!).render(<App />);
(match ? match.preload() : Promise.resolve()).then(render, render);
