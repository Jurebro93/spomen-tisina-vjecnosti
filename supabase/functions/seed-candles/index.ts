import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const testCandles = [
  {
    pokojnik_ime: "Marija",
    pokojnik_prezime: "Horvat",
    zapalio_ime: "Ana Petrović",
    zapalio_email: "ana.petrovic@gmail.com",
    poruka: "Vječno ćeš ostati u našim srcima, draga mama."
  },
  {
    pokojnik_ime: "Josip",
    pokojnik_prezime: "Novak",
    zapalio_ime: "Marko Novak",
    zapalio_email: "marko.novak@gmail.com",
    poruka: "Počivaj u miru, tata. Nedostaješ nam svaki dan."
  },
  {
    pokojnik_ime: "Kata",
    pokojnik_prezime: "Babić",
    zapalio_ime: "Petra Babić",
    zapalio_email: "petra.babic@gmail.com",
    poruka: "Hvala ti za sve ljubavi koju si nam dala, baka."
  },
  {
    pokojnik_ime: "Ante",
    pokojnik_prezime: "Kovačević",
    zapalio_ime: "Tomislav Kovačević",
    zapalio_email: "tomislav.kovacevic@gmail.com",
    poruka: "Uvijek ćeš biti naš heroj i uzor."
  },
  {
    pokojnik_ime: "Dragica",
    pokojnik_prezime: "Matić",
    zapalio_ime: "Ivana Matić",
    zapalio_email: "ivana.matic@gmail.com",
    poruka: "Tvoja dobrota i ljubav žive u nama."
  },
  {
    pokojnik_ime: "Stjepan",
    pokojnik_prezime: "Jurić",
    zapalio_ime: "Miroslav Jurić",
    zapalio_email: "miroslav.juric@gmail.com",
    poruka: "Počivaj u miru, dragi dede. Volimo te."
  },
  {
    pokojnik_ime: "Milka",
    pokojnik_prezime: "Pavlović",
    zapalio_ime: "Damir Pavlović",
    zapalio_email: "damir.pavlovic@gmail.com",
    poruka: "Hvala ti za sve žrtve i nesebičnu ljubav."
  },
  {
    pokojnik_ime: "Franjo",
    pokojnik_prezime: "Knežević",
    zapalio_ime: "Kristina Knežević",
    zapalio_email: "kristina.knezevic@gmail.com",
    poruka: "Tvoja mudrost i savjeti će nam uvijek biti vodilja."
  },
  {
    pokojnik_ime: "Ruža",
    pokojnik_prezime: "Božić",
    zapalio_ime: "Goran Božić",
    zapalio_email: "goran.bozic@gmail.com",
    poruka: "Anđeo koji je krasio naše živote."
  },
  {
    pokojnik_ime: "Ivo",
    pokojnik_prezime: "Marić",
    zapalio_ime: "Sanja Marić",
    zapalio_email: "sanja.maric@gmail.com",
    poruka: "Tvoj osmijeh će zauvijek ostati u našim mislima."
  },
  {
    pokojnik_ime: "Anica",
    pokojnik_prezime: "Popović",
    zapalio_ime: "Dragan Popović",
    zapalio_email: "dragan.popovic@gmail.com",
    poruka: "Počivaj u miru, draga supruga."
  },
  {
    pokojnik_ime: "Petar",
    pokojnik_prezime: "Bošnjak",
    zapalio_ime: "Marija Bošnjak",
    zapalio_email: "marija.bosnjak@gmail.com",
    poruka: "Nedostaješ nam više nego što riječi mogu opisati."
  },
  {
    pokojnik_ime: "Ljubica",
    pokojnik_prezime: "Tomić",
    zapalio_ime: "Nikola Tomić",
    zapalio_email: "nikola.tomic@gmail.com",
    poruka: "Tvoja ljubav će zauvijek biti naša snaga."
  },
  {
    pokojnik_ime: "Mato",
    pokojnik_prezime: "Vuković",
    zapalio_ime: "Željka Vuković",
    zapalio_email: "zeljka.vukovic@gmail.com",
    poruka: "Hvala ti za sve prekrasne uspomene, tata."
  },
  {
    pokojnik_ime: "Nada",
    pokojnik_prezime: "Radić",
    zapalio_ime: "Hrvoje Radić",
    zapalio_email: "hrvoje.radic@gmail.com",
    poruka: "Uvijek ćeš biti naš svjetionik u tami."
  }
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting to seed candles...');

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Insert test candles with paid=true and active=true
    const candlesWithDefaults = testCandles.map((candle, index) => ({
      ...candle,
      paid: true,
      active: true,
      created_at: new Date(Date.now() - (index * 2 * 60 * 60 * 1000)).toISOString(), // Spread over last 30 hours
    }));

    const { data, error } = await supabase
      .from('virtual_candles')
      .insert(candlesWithDefaults)
      .select();

    if (error) {
      console.error('Error inserting candles:', error);
      throw error;
    }

    console.log(`Successfully inserted ${data.length} candles`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully inserted ${data.length} candles`,
        candles: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in seed-candles function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});