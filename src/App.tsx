import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { useEffect, useLayoutEffect } from "react";
import Index from "./pages/Index";
import HomepageTwo from "./pages/HomepageTwo";
import HomepageThree from "./pages/HomepageThree";
import NotFound from "./pages/NotFound";
import Umrli from "./pages/Umrli";
import Gradovi from "./pages/Gradovi";
import Sprovodi from "./pages/Sprovodi";
import MemorijalniVrt from "./pages/MemorijalniVrt";
import Informacije from "./pages/Informacije";
import BesplatniVodic from "./pages/BesplatniVodic";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import ObituaryPage from "./pages/ObituaryPage";
import LegacySlugRoute from "./components/LegacySlugRoute";
import VirtualneSvijece from "./pages/VirtualneSvijece";
import ZapaliSvijecu from "./pages/ZapaliSvijecu";
import ObjaviOsmrtnicu from "./pages/ObjaviOsmrtnicu";
import ObituarySuccess from "./pages/ObituarySuccess";
import SearchResults from "./pages/SearchResults";
import KakoObjavitiOsmrtnicu from "./pages/KakoObjavitiOsmrtnicu";
import CestoPostavljenaPitanja from "./pages/CestoPostavljenaPitanja";
import UvjetiKoristenja from "./pages/UvjetiKoristenja";
import PolitikaPrivatnosti from "./pages/PolitikaPrivatnosti";
import Kolacici from "./pages/Kolacici";
import SitemapIndex from "./pages/SitemapIndex";
import GrobljaGrad from "./pages/GrobljaGrad";
import GrobljePage from "./pages/GrobljePage";
import DigitalniMemorijal from "./pages/DigitalniMemorijal";
import Prijava from "./pages/Prijava";
import Registracija from "./pages/Registracija";
import ResetPassword from "./pages/ResetPassword";
import MojRacun from "./pages/MojRacun";
import KreirajMemorijal from "./pages/KreirajMemorijal";
import MemorijalPlacanje from "./pages/MemorijalPlacanje";
import MojiMemorijali from "./pages/MojiMemorijali";
import UrediMemorijal from "./pages/UrediMemorijal";
import Memorijali from "./pages/Memorijali";
import MemorijalPrimjer from './pages/MemorijalPrimjer';
import MemorijalOgledni from './pages/MemorijalOgledni';
import MemorijalStranica from "./pages/MemorijalStranica";
import { AuthProvider } from "./hooks/useAuth";
import CookieConsent from "./components/CookieConsent";
import MetaPixel from "./components/MetaPixel";
import BillingDetailsDialog from "./components/billing/BillingDetailsDialog";
import DiscountPopup from "./components/DiscountPopup";
import AdminInvoices from "./pages/admin/AdminInvoices";
import AdminInvoiceDetail from "./pages/admin/AdminInvoiceDetail";
import AdminMinimax from "./pages/admin/AdminMinimax";
import AdminAdmins from "./pages/admin/AdminAdmins";
import AdminPromoCodes from "./pages/admin/AdminPromoCodes";
import AdminPromoCodeDetail from "./pages/admin/AdminPromoCodeDetail";
import AuthCallback from "./pages/AuthCallback";
import AdminPortraits from "./pages/admin/AdminPortraits";
import AdminStatistika from "./pages/admin/AdminStatistika";
import AdminBrisanje from "./pages/admin/AdminBrisanje";
import AdminPredmeti from "./pages/admin/AdminPredmeti";
import Kontakt from "./pages/Kontakt";
import RaskidIPovrat from "./pages/RaskidIPovrat";
import Prigovori from "./pages/Prigovori";
import PravilaObjavljivanja from "./pages/PravilaObjavljivanja";
import PrijavaSadrzaja from "./pages/PrijavaSadrzaja";
import CityIndexPage from "./pages/CityIndexPage";


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
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/homepage-2/" element={<HomepageTwo />} />
            <Route path="/homepage-3/" element={<HomepageThree />} />
            <Route path="/umrli" element={<Umrli />} />
            <Route path="/umrli/:city" element={<Umrli />} />
            <Route path="/gradovi" element={<Gradovi />} />
            <Route path="/sprovodi" element={<CityIndexPage kind="sprovodi" />} />
            <Route path="/sprovodi/:city" element={<Sprovodi />} />
            <Route path="/groblja" element={<CityIndexPage kind="groblja" />} />
            <Route path="/groblja/:city" element={<GrobljaGrad />} />
            <Route path="/groblje/:slug" element={<GrobljePage />} />
            <Route path="/memorijalni-vrt" element={<MemorijalniVrt />} />
            <Route path="/digitalni-memorijal" element={<DigitalniMemorijal />} />
            <Route path="/memorijali" element={<Memorijali />} />
            <Route path="/memorijal-primjer/obiteljske-uspomene" element={<MemorijalOgledni />} />
            <Route path="/memorijal-primjer/:slug" element={<MemorijalPrimjer />} />
            <Route path="/memorijal/:slug" element={<MemorijalStranica />} />
            <Route path="/memorijal/:slug/uredi" element={<UrediMemorijal />} />
            <Route path="/kreiraj-memorijal" element={<KreirajMemorijal />} />
            <Route path="/digitalni-memorijal/kreiraj" element={<KreirajMemorijal />} />
            <Route path="/digitalni-memorijal/placanje" element={<MemorijalPlacanje />} />
            <Route path="/zahvaljujemo" element={<MemorijalPlacanje />} />
            <Route path="/moji-memorijali" element={<MojiMemorijali />} />
            <Route path="/admin/invoices" element={<AdminInvoices />} />
            <Route path="/admin/invoices/:id" element={<AdminInvoiceDetail />} />
            <Route path="/admin/integrations/minimax" element={<AdminMinimax />} />
            <Route path="/admin/administratori" element={<AdminAdmins />} />
            <Route path="/admin/promo-kodovi" element={<AdminPromoCodes />} />
            <Route path="/admin/promo-kodovi/:id" element={<AdminPromoCodeDetail />} />
            <Route path="/admin/portreti" element={<AdminPortraits />} />
            <Route path="/admin/statistika" element={<AdminStatistika />} />
            <Route path="/admin/brisanje" element={<AdminBrisanje />} />
            <Route path="/prijava" element={<Prijava />} />
            <Route path="/registracija" element={<Registracija />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/moj-racun" element={<MojRacun />} />
            <Route path="/informacije" element={<Informacije />} />
            <Route path="/besplatni-vodic" element={<BesplatniVodic />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/virtualne-svijece" element={<VirtualneSvijece />} />
            <Route path="/zapali-svijecu" element={<ZapaliSvijecu />} />
            <Route path="/objavi-osmrtnicu" element={<ObjaviOsmrtnicu />} />
            <Route path="/obituary-success" element={<ObituarySuccess />} />
            <Route path="/pretraga" element={<SearchResults />} />
            <Route path="/kako-objaviti-osmrtnicu" element={<KakoObjavitiOsmrtnicu />} />
            <Route path="/cesto-postavljena-pitanja" element={<CestoPostavljenaPitanja />} />
            <Route path="/uvjeti-koristenja/" element={<UvjetiKoristenja />} />
            <Route path="/politika-privatnosti/" element={<PolitikaPrivatnosti />} />
            <Route path="/kolacici/" element={<Kolacici />} />
            <Route path="/kontakt" element={<Kontakt />} />
            <Route path="/raskid-i-povrat" element={<RaskidIPovrat />} />
            <Route path="/prigovori" element={<Prigovori />} />
            <Route path="/pravila-objavljivanja" element={<PravilaObjavljivanja />} />
            <Route path="/prijava-sadrzaja" element={<PrijavaSadrzaja />} />
            <Route path="/admin/predmeti" element={<AdminPredmeti />} />
            <Route path="/sitemap_index.xml" element={<SitemapIndex />} />
            
            {/* Legacy route for backward compatibility */}
            <Route path="/osmrtnica/:slug" element={<ObituaryPage />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            {/* Obituary route must be last before catch-all */}
            <Route path="/:slug" element={<LegacySlugRoute />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
  );
};

export default App;
