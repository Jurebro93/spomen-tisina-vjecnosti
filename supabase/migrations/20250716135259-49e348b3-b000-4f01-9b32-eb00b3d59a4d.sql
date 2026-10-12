-- Create table for virtual candles
CREATE TABLE public.virtual_candles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pokojnik_ime TEXT NOT NULL,
  pokojnik_prezime TEXT NOT NULL,
  zapalio_ime TEXT NOT NULL,
  zapalio_email TEXT NOT NULL,
  poruka TEXT,
  stripe_payment_intent_id TEXT,
  paid BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.virtual_candles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public viewing of active candles
CREATE POLICY "Anyone can view active candles" ON public.virtual_candles
  FOR SELECT
  USING (active = true AND paid = true);

-- Create policy to allow inserting new candles
CREATE POLICY "Anyone can insert candles" ON public.virtual_candles
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow updating payment status
CREATE POLICY "Anyone can update payment status" ON public.virtual_candles
  FOR UPDATE
  USING (true);