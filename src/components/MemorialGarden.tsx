import { Quote, Leaf, Heart, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
const memorialGardenImage = "https://umpvnepxsqfkxjpclkxc.supabase.co/storage/v1/object/public/obituary-photos/site/memorial-garden.jpg";
const MemorialGarden = () => {
  const navigate = useNavigate();
  const quotes = [{
    text: "Oni koji volimo nikad ne umiru, oni samo nestaju iz naših očiju, ali ne iz naših srca.",
    author: "Nepoznato",
    category: "Ljubav"
  }, {
    text: "Smrt nije gašenje svjetlosti, već gašenje svjetiljke zato što je došla zora.",
    author: "Rabindranath Tagore",
    category: "Filosofija"
  }, {
    text: "Grob je svjetlo koje grije put onima koji ostaju.",
    author: "Hrvatska poslovica",
    category: "Tradicija"
  }, {
    text: "Što je život nego sjećanje na sreću, a smrt nego zaborav na tugu?",
    author: "Khalil Gibran",
    category: "Mudrost"
  }, {
    text: "Vječni pokoj, vječna ljubav - to je što ostaje nakon nas.",
    author: "Sv. Augustin",
    category: "Duhovnost"
  }, {
    text: "Pokojni žive u našim srcima sve dok ih se sjećamo.",
    author: "Hrvatska tradicionalna",
    category: "Sjećanje"
  }];
  const steps = [{
    number: 1,
    title: "Odaberite citat",
    description: "Izaberite citat koji najbolje opisuje vaša osjećanja",
    icon: Quote
  }, {
    number: 2,
    title: "Personalizirajte",
    description: "Dodajte ime pokojnika i vlastite riječi",
    icon: Heart
  }, {
    number: 3,
    title: "Postavite u vrt",
    description: "Vaš memorijalni citat postaje dio vječnog vrta",
    icon: Leaf
  }];
  return <section className="py-16 bg-gradient-to-br from-memorial-warm to-background" id="memorijalni-vrt">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="memorial-title mb-4">Memorijalni vrt</h2>
          <p className="memorial-subtitle max-w-2xl mx-auto">
            Prostor za tišinu, sjećanje i utjehu kroz mudre riječi o životu i smrti
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Content */}
          <div className="space-y-8 fade-in">
            <div className="space-y-6">
              <h3 className="memorial-title text-2xl md:text-3xl">
                Vječni citati za vječnu uspomenu
              </h3>
              
              <p className="memorial-body">
                Naš memorijalni vrt je mjesto gdje se riječi pretvaraju u utjehu. 
                Ovdje možete pronaći inspirativne citatie o životu, smrti i sjećanju, 
                ili stvoriti vlastiti memorijalni citat za vaše najmilije.
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-6">
              {steps.map(step => {
              const Icon = step.icon;
              return <div key={step.number} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-accent text-accent-foreground rounded-full flex items-center justify-center">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h4 className="font-display text-lg font-semibold text-foreground mb-2">
                        {step.title}
                      </h4>
                      <p className="text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>;
            })}
            </div>

            <Button size="lg" className="elegant-button bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => navigate('/memorijalni-vrt')}>
              <Leaf className="mr-2" size={20} />
              Ostavi poruku sjećanja
            </Button>
          </div>

          {/* Image */}
          <div className="relative slide-up">
            <div className="relative rounded-2xl overflow-hidden shadow-memorial">
              <img src={memorialGardenImage} alt="Memorijalni vrt s cvijećem" className="w-full h-[500px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
          </div>
        </div>

        {/* Quotes Grid */}
        <div className="mb-12">
          <h3 className="memorial-title text-center mb-8">Citati za razmišljanje</h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quotes.map((quote, index) => <Card key={index} className="memorial-card hover:shadow-memorial transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <Quote className="text-memorial-gold flex-shrink-0 mt-1" size={20} />
                    <div className="flex-1">
                      <p className="text-foreground font-medium leading-relaxed mb-3">
                        "{quote.text}"
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          — {quote.author}
                        </p>
                        <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">
                          {quote.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                </CardContent>
              </Card>)}
          </div>
        </div>

        <div className="text-center">
          
        </div>
      </div>
    </section>;
};
export default MemorialGarden;