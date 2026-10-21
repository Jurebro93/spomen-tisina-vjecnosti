import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Suspense, useEffect, useLayoutEffect } from "react";
import { lazyPage } from "./lib/lazyPage";
import { AuthProvider } from "./hooks/useAuth";
import CookieConsent from "./components/CookieConsent";
import MetaPixel from "./components/MetaPixel";
import BillingDetailsDialog from "./components/billing/BillingDetailsDialog";
import DiscountPopup from "./components/DiscountPopup";


// Pages load on demand, so a visitor downloads only the code of the page they
// open. main.tsx preloads the current page before the first render, so the
// server-rendered HTML in #root stays on screen until the real page is ready.
const Index = lazyPage(() => import("./pages/Index"));
const HomepageTwo = lazyPage(() => import("./pages/HomepageTwo"));
const HomepageThree = lazyPage(() => import("./pages/HomepageThree"));
const NotFound = lazyPage(() => import("./pages/NotFound"));
const Umrli = lazyPage(() => import("./pages/Umrli"));
const UmrliArhiva = lazyPage(() => import("./pages/UmrliArhiva"));
const Gradovi = lazyPage(() => import("./pages/Gradovi"));
const Sprovodi = lazyPage(() => import("./pages/Sprovodi"));
const MemorijalniVrt = lazyPage(() => import("./pages/MemorijalniVrt"));
const Informacije = lazyPage(() => import("./pages/Informacije"));
const BesplatniVodic = lazyPage(() => import("./pages/BesplatniVodic"));
const Blog = lazyPage(() => import("./pages/Blog"));
const BlogPost = lazyPage(() => import("./pages/BlogPost"));
const ObituaryPage = lazyPage(() => import("./pages/ObituaryPage"));
const LegacySlugRoute = lazyPage(() => import("./components/LegacySlugRoute"));
const VirtualneSvijece = lazyPage(() => import("./pages/VirtualneSvijece"));
const ZapaliSvijecu = lazyPage(() => import("./pages/ZapaliSvijecu"));
const ObjaviOsmrtnicu = lazyPage(() => import("./pages/ObjaviOsmrtnicu"));
const ObituarySuccess = lazyPage(() => import("./pages/ObituarySuccess"));
const SearchResults = lazyPage(() => import("./pages/SearchResults"));
const KakoObjavitiOsmrtnicu = lazyPage(() => import("./pages/KakoObjavitiOsmrtnicu"));
const CestoPostavljenaPitanja = lazyPage(() => import("./pages/CestoPostavljenaPitanja"));
const UvjetiKoristenja = lazyPage(() => import("./pages/UvjetiKoristenja"));
const PolitikaPrivatnosti = lazyPage(() => import("./pages/PolitikaPrivatnosti"));
const Kolacici = lazyPage(() => import("./pages/Kolacici"));
const SitemapIndex = lazyPage(() => import("./pages/SitemapIndex"));
const GrobljaGrad = lazyPage(() => import("./pages/GrobljaGrad"));
const GrobljePage = lazyPage(() => import("./pages/GrobljePage"));
const DigitalniMemorijal = lazyPage(() => import("./pages/DigitalniMemorijal"));
const Prijava = lazyPage(() => import("./pages/Prijava"));
const Registracija = lazyPage(() => import("./pages/Registracija"));
const ResetPassword = lazyPage(() => import("./pages/ResetPassword"));
const MojRacun = lazyPage(() => import("./pages/MojRacun"));
const KreirajMemorijal = lazyPage(() => import("./pages/KreirajMemorijal"));
const MemorijalPlacanje = lazyPage(() => import("./pages/MemorijalPlacanje"));
const MojiMemorijali = lazyPage(() => import("./pages/MojiMemorijali"));
const UrediMemorijal = lazyPage(() => import("./pages/UrediMemorijal"));
const Memorijali = lazyPage(() => import("./pages/Memorijali"));
const MemorijalPrimjer = lazyPage(() => import("./pages/MemorijalPrimjer"));
const MemorijalOgledni = lazyPage(() => import("./pages/MemorijalOgledni"));
const MemorijalStranica = lazyPage(() => import("./pages/MemorijalStranica"));
const AdminInvoices = lazyPage(() => import("./pages/admin/AdminInvoices"));
const AdminInvoiceDetail = lazyPage(() => import("./pages/admin/AdminInvoiceDetail"));
const AdminMinimax = lazyPage(() => import("./pages/admin/AdminMinimax"));
const AdminAdmins = lazyPage(() => import("./pages/admin/AdminAdmins"));
const AdminPromoCodes = lazyPage(() => import("./pages/admin/AdminPromoCodes"));
const AdminPromoCodeDetail = lazyPage(() => import("./pages/admin/AdminPromoCodeDetail"));
const AuthCallback = lazyPage(() => import("./pages/AuthCallback"));
const AdminPortraits = lazyPage(() => import("./pages/admin/AdminPortraits"));
const AdminStatistika = lazyPage(() => import("./pages/admin/AdminStatistika"));
const AdminBrisanje = lazyPage(() => import("./pages/admin/AdminBrisanje"));
const AdminPredmeti = lazyPage(() => import("./pages/admin/AdminPredmeti"));
const Kontakt = lazyPage(() => import("./pages/Kontakt"));
const RaskidIPovrat = lazyPage(() => import("./pages/RaskidIPovrat"));
const Prigovori = lazyPage(() => import("./pages/Prigovori"));
const PravilaObjavljivanja = lazyPage(() => import("./pages/PravilaObjavljivanja"));
const PrijavaSadrzaja = lazyPage(() => import("./pages/PrijavaSadrzaja"));
const CityIndexPage = lazyPage(() => import("./pages/CityIndexPage"));

// Order matters: "/:slug" (obituaries) must stay right before the catch-all.
export const routes = [
  { path: "/", element: <Index />, preload: Index.preload },
  { path: "/homepage-2/", element: <HomepageTwo />, preload: HomepageTwo.preload },
  { path: "/homepage-3/", element: <HomepageThree />, preload: HomepageThree.preload },
  { path: "/umrli", element: <Umrli />, preload: Umrli.preload },
  { path: "/umrli/:city", element: <Umrli />, preload: Umrli.preload },
  { path: "/umrli/:city/:godina/:mjesec", element: <UmrliArhiva />, preload: UmrliArhiva.preload },
  { path: "/gradovi", element: <Gradovi />, preload: Gradovi.preload },
  { path: "/sprovodi", element: <CityIndexPage kind="sprovodi" />, preload: CityIndexPage.preload },
  { path: "/sprovodi/:city", element: <Sprovodi />, preload: Sprovodi.preload },
  { path: "/groblja", element: <CityIndexPage kind="groblja" />, preload: CityIndexPage.preload },
  { path: "/groblja/:city", element: <GrobljaGrad />, preload: GrobljaGrad.preload },
  { path: "/groblje/:slug", element: <GrobljePage />, preload: GrobljePage.preload },
  { path: "/memorijalni-vrt", element: <MemorijalniVrt />, preload: MemorijalniVrt.preload },
  { path: "/digitalni-memorijal", element: <DigitalniMemorijal />, preload: DigitalniMemorijal.preload },
  { path: "/memorijali", element: <Memorijali />, preload: Memorijali.preload },
  { path: "/memorijal-primjer/obiteljske-uspomene", element: <MemorijalOgledni />, preload: MemorijalOgledni.preload },
  { path: "/memorijal-primjer/:slug", element: <MemorijalPrimjer />, preload: MemorijalPrimjer.preload },
  { path: "/memorijal/:slug", element: <MemorijalStranica />, preload: MemorijalStranica.preload },
  { path: "/memorijal/:slug/uredi", element: <UrediMemorijal />, preload: UrediMemorijal.preload },
  { path: "/kreiraj-memorijal", element: <KreirajMemorijal />, preload: KreirajMemorijal.preload },
  { path: "/digitalni-memorijal/kreiraj", element: <KreirajMemorijal />, preload: KreirajMemorijal.preload },
  { path: "/digitalni-memorijal/placanje", element: <MemorijalPlacanje />, preload: MemorijalPlacanje.preload },
  { path: "/zahvaljujemo", element: <MemorijalPlacanje />, preload: MemorijalPlacanje.preload },
  { path: "/moji-memorijali", element: <MojiMemorijali />, preload: MojiMemorijali.preload },
  { path: "/admin/invoices", element: <AdminInvoices />, preload: AdminInvoices.preload },
  { path: "/admin/invoices/:id", element: <AdminInvoiceDetail />, preload: AdminInvoiceDetail.preload },
  { path: "/admin/integrations/minimax", element: <AdminMinimax />, preload: AdminMinimax.preload },
  { path: "/admin/administratori", element: <AdminAdmins />, preload: AdminAdmins.preload },
  { path: "/admin/promo-kodovi", element: <AdminPromoCodes />, preload: AdminPromoCodes.preload },
  { path: "/admin/promo-kodovi/:id", element: <AdminPromoCodeDetail />, preload: AdminPromoCodeDetail.preload },
  { path: "/admin/portreti", element: <AdminPortraits />, preload: AdminPortraits.preload },
  { path: "/admin/statistika", element: <AdminStatistika />, preload: AdminStatistika.preload },
  { path: "/admin/brisanje", element: <AdminBrisanje />, preload: AdminBrisanje.preload },
  { path: "/prijava", element: <Prijava />, preload: Prijava.preload },
  { path: "/registracija", element: <Registracija />, preload: Registracija.preload },
  { path: "/auth/callback", element: <AuthCallback />, preload: AuthCallback.preload },
  { path: "/reset-password", element: <ResetPassword />, preload: ResetPassword.preload },
  { path: "/moj-racun", element: <MojRacun />, preload: MojRacun.preload },
  { path: "/informacije", element: <Informacije />, preload: Informacije.preload },
  { path: "/besplatni-vodic", element: <BesplatniVodic />, preload: BesplatniVodic.preload },
  { path: "/blog", element: <Blog />, preload: Blog.preload },
  { path: "/blog/:slug", element: <BlogPost />, preload: BlogPost.preload },
  { path: "/virtualne-svijece", element: <VirtualneSvijece />, preload: VirtualneSvijece.preload },
  { path: "/zapali-svijecu", element: <ZapaliSvijecu />, preload: ZapaliSvijecu.preload },
  { path: "/objavi-osmrtnicu", element: <ObjaviOsmrtnicu />, preload: ObjaviOsmrtnicu.preload },
  { path: "/obituary-success", element: <ObituarySuccess />, preload: ObituarySuccess.preload },
  { path: "/pretraga", element: <SearchResults />, preload: SearchResults.preload },
  { path: "/kako-objaviti-osmrtnicu", element: <KakoObjavitiOsmrtnicu />, preload: KakoObjavitiOsmrtnicu.preload },
  { path: "/cesto-postavljena-pitanja", element: <CestoPostavljenaPitanja />, preload: CestoPostavljenaPitanja.preload },
  { path: "/uvjeti-koristenja/", element: <UvjetiKoristenja />, preload: UvjetiKoristenja.preload },
  { path: "/politika-privatnosti/", element: <PolitikaPrivatnosti />, preload: PolitikaPrivatnosti.preload },
  { path: "/kolacici/", element: <Kolacici />, preload: Kolacici.preload },
  { path: "/kontakt", element: <Kontakt />, preload: Kontakt.preload },
  { path: "/raskid-i-povrat", element: <RaskidIPovrat />, preload: RaskidIPovrat.preload },
  { path: "/prigovori", element: <Prigovori />, preload: Prigovori.preload },
  { path: "/pravila-objavljivanja", element: <PravilaObjavljivanja />, preload: PravilaObjavljivanja.preload },
  { path: "/prijava-sadrzaja", element: <PrijavaSadrzaja />, preload: PrijavaSadrzaja.preload },
  { path: "/admin/predmeti", element: <AdminPredmeti />, preload: AdminPredmeti.preload },
  { path: "/sitemap_index.xml", element: <SitemapIndex />, preload: SitemapIndex.preload },
  { path: "/osmrtnica/:slug", element: <ObituaryPage />, preload: ObituaryPage.preload },
  { path: "/:slug", element: <LegacySlugRoute />, preload: LegacySlugRoute.preload },
  { path: "*", element: <NotFound />, preload: NotFound.preload },
];

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (typeof window !== 'undefined' && window.history) {
      window.history.scrollRestoration = 'manual';
    }
    if (hash) {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'auto' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash]);

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'auto' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return null;
};

const App = () => {
  console.log('App component rendering');
  return (
  <HelmetProvider>
    {/* Site-wide fallback: index.html's description is managed by Helmet (data-rh),
        so pages without their own description still get this one. */}
    <Helmet>
      <meta name="description" content="Osmrtnice, digitalni memorijali, sprovodi i groblja u Hrvatskoj. Pretražite osmrtnice po imenu ili gradu, zapalite virtualnu svijeću i sačuvajte uspomenu digitalnim memorijalom." />
    </Helmet>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <MetaPixel />
          <CookieConsent />
          <BillingDetailsDialog />
          <DiscountPopup />
          <ScrollToTop />
          <Suspense fallback={null}>
            <Routes>
              {routes.map(({ path, element }) => (
                <Route key={path} path={path} element={element} />
              ))}
            </Routes>
          </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
  );
};

export default App;
