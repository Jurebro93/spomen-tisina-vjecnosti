-- Add RLS protection to public views to prevent unauthorized access

-- Enable RLS on all public views
ALTER VIEW public.virtual_candles_public SET (security_invoker = true);
ALTER VIEW public.sprovodi_public SET (security_invoker = true);  
ALTER VIEW public.obituaries_public SET (security_invoker = true);

-- Since views inherit RLS from underlying tables and we've blocked all public access to base tables,
-- we need to create explicit grants for anon and authenticated roles to access the views

-- Grant SELECT access to public views for anon users (website visitors)
GRANT SELECT ON public.virtual_candles_public TO anon;
GRANT SELECT ON public.sprovodi_public TO anon;
GRANT SELECT ON public.obituaries_public TO anon;

-- Grant SELECT access to public views for authenticated users
GRANT SELECT ON public.virtual_candles_public TO authenticated;
GRANT SELECT ON public.sprovodi_public TO authenticated;
GRANT SELECT ON public.obituaries_public TO authenticated;