import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { candleId } = await req.json()

    if (!candleId) {
      return new Response(JSON.stringify({ error: 'Candle ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Relighting candle:', candleId)

    // Update the candle's expiration date to 2 weeks from now
    const newExpirationDate = new Date()
    newExpirationDate.setDate(newExpirationDate.getDate() + 14)

    const { data, error } = await supabase
      .from('virtual_candles')
      .update({ 
        expires_at: newExpirationDate.toISOString(),
        created_at: new Date().toISOString() // Update created_at to show as recently lit
      })
      .eq('id', candleId)
      .eq('paid', true) // Only allow relighting paid candles
      .eq('active', true) // Only allow relighting active candles
      .select()

    if (error) {
      console.error('Error relighting candle:', error)
      return new Response(JSON.stringify({ error: 'Failed to relight candle' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!data || data.length === 0) {
      return new Response(JSON.stringify({ error: 'Candle not found or cannot be relit' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Candle successfully relit:', data[0])

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Svijeća je uspješno ponovno zapaljena',
      candle: data[0]
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in relight-candle function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})