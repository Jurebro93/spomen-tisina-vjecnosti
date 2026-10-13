import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CLEANUP-OLD-QUOTES] Function started');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate date 365 days ago
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    const cutoffDate = oneYearAgo.toISOString();

    console.log(`[CLEANUP-OLD-QUOTES] Deleting quotes older than: ${cutoffDate}`);

    // Delete quotes older than 365 days
    const { data, error } = await supabaseClient
      .from('memorijalni_citati')
      .delete()
      .eq('status', 'approved')
      .lt('approved_at', cutoffDate);

    if (error) {
      console.error('[CLEANUP-OLD-QUOTES] Error:', error);
      throw error;
    }

    console.log(`[CLEANUP-OLD-QUOTES] Cleanup completed successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Old quotes cleaned up successfully',
        cutoffDate 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('[CLEANUP-OLD-QUOTES] Function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});