import { Link } from 'react-router-dom';
import { Sparkles, ImageIcon, Share2, QrCode, Heart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  { icon: ImageIcon, title: 'Fotografije i priča', description: 'Sačuvajte uspomene, životnu priču i najvažnije trenutke.' },
  { icon: Share2, title: 'Jednostavno dijeljenje', description: 'Pošaljite link obitelji i prijateljima putem e-pošte ili društvenih mreža.' },
  { icon: QrCode, title: 'QR kod za spomenar', description: 'Preuzmite QR kod koji vodi izravno na stranicu memorijala.' },
  { icon: Heart, title: 'Virtualne svijeće i poruke', description: 'Bližnji mogu zapaliti svijeću i ostaviti riječi sjećanja.' },
];

const MemorialCtaSection = () => {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background via-memorial-warm to-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-accent-foreground bg-accent rounded-full px-4 py-1.5 mb-4 shadow-sm ring-1 ring-accent/40">
            <Sparkles className="h-4 w-4" /> Digitalni memorijal
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-medium mb-4">
            Stvorite trajno mjesto sjećanja
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Digitalni memorijal je mirna stranica posvećena vašoj voljenoj osobi — s fotografijama, životnom pričom, porukama obitelji i virtualnim svijećama.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-card/60 backdrop-blur-sm border-border/60 h-full">
              <CardContent className="p-6">
                <feature.icon className="h-8 w-8 text-accent mb-4" />
                <h3 className="font-display text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="elegant-button w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link to="/digitalni-memorijal/kreiraj">
              <Sparkles className="mr-2 h-5 w-5" />
              Kreiraj digitalni memorijal
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default MemorialCtaSection;
