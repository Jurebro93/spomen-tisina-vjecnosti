import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { normalizeCityName } from '@/lib/cityRegions';

interface CityData {
  name: string;
  count: number;
}

const MAIN_CITIES = [
  'Zagreb',
  'Split',
  'Osijek',
  'Zadar',
  'Rijeka',
  'Pula',
  'Makarska',
  'Imotski',
  'Šibenik',
  'Trogir',
  'Solin',
  'Metković',
];

const CitiesSection = () => {
  const [mainCities, setMainCities] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCityData = async () => {
      try {
        const { data, error } = await supabase.rpc('obituary_city_counts');

        if (error) {
          console.error('Error fetching city data:', error);
          return;
        }

        // "Grad Zagreb" -> "Zagreb", spajanje duplikata istog naziva
        const merged = new Map<string, CityData>();
        data.forEach((row: { name: string; count: number }) => {
          const name = normalizeCityName(row.name);
          const existing = merged.get(name.toLowerCase());
          if (existing) existing.count += row.count;
          else merged.set(name.toLowerCase(), { name, count: row.count });
        });
        const allCities = Array.from(merged.values());

        // Glavni gradovi — istaknute kartice
        const main: CityData[] = MAIN_CITIES
          .map((name) => allCities.find((c) => c.name.toLowerCase() === name.toLowerCase() || c.name.toLowerCase().startsWith(`${name.toLowerCase()}-`)))
          .filter((c): c is CityData => Boolean(c))
          .map((c) => {
            const label = MAIN_CITIES.find((n) => c.name.toLowerCase() === n.toLowerCase() || c.name.toLowerCase().startsWith(`${n.toLowerCase()}-`)) || c.name;
            return { ...c, name: label };
          });

        setMainCities(main);
      } catch (error) {
        console.error('Error fetching city data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCityData();
  }, []);

  return (
    <section className="bg-gradient-to-b from-memorial-gold/5 to-background py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MapPin className="h-8 w-8 text-memorial-gold" />
            <h2 className="text-3xl font-bold text-primary">Umrli po gradovima</h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Pronađite osmrtnice i informacije o preminulima u vašem gradu
          </p>
          <div className="w-24 h-1 bg-memorial-gold mx-auto rounded-full"></div>
        </div>

        {/* Cities Grid */}
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-memorial-gold"></div>
              <p className="mt-4 text-muted-foreground">Učitava gradove...</p>
            </div>
          ) : mainCities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nema dostupnih podataka o gradovima.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
              {mainCities.map((city) => (
                <Link
                  key={city.name}
                  to={`/umrli/${city.name.toLowerCase()}`}
                  className="flex items-center justify-between rounded-lg border border-memorial-gold/40 bg-memorial-gold/5 px-4 py-3 transition-colors hover:border-memorial-gold hover:bg-memorial-gold/15 group"
                >
                  <span className="font-semibold text-primary group-hover:text-memorial-gold transition-colors">
                    {city.name}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5 text-memorial-gold" />
                    {city.count}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {!loading && mainCities.length > 0 && (
            <div className="text-center mt-8">
              <Button asChild variant="outline"
                className="border-memorial-gold text-memorial-gold hover:bg-memorial-gold hover:text-white transition-colors">
                <Link to="/gradovi">
                  Pogledaj sve
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default CitiesSection;
