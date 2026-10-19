import Header from '@/components/Header';
import Hero from '@/components/Hero';
import MediaMentionsSection from '@/components/MediaMentionsSection';
import ObituariesGallery from '@/components/ObituariesGallery';
import CitiesSection from '@/components/CitiesSection';
import MemorialGarden from '@/components/MemorialGarden';
import VirtualCandles from '@/components/VirtualCandles';
import MemorialCtaSection from '@/components/MemorialCtaSection';
import { MemorialPublicListing } from '@/components/MemorialPublicListing';
import Footer from '@/components/Footer';
import { MemorialArticlesSection, MemorialFinalCtaSection, MemorialHeroSection } from '@/components/HomepageMemorialSections';
import { HomepageFaqSection } from '@/components/HomepageFaqSection';
import { SEOHelmet } from '@/hooks/useSEO';
import EbookSignup from '@/components/EbookSignup';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHelmet pagePath="/" />
      <Header />
      <Hero />
      <MediaMentionsSection />
      <MemorialHeroSection />
      <MemorialPublicListing />
      <MemorialCtaSection />
      <ObituariesGallery />
      <div className="container mx-auto px-4 py-10">
        <EbookSignup variant="home" placement="homepage" />
      </div>
      <MemorialFinalCtaSection />
      <VirtualCandles />
      <CitiesSection />
      <MemorialGarden />
      <HomepageFaqSection />
      <MemorialArticlesSection />
      <Footer />
    </div>
  );
};

export default Index;
