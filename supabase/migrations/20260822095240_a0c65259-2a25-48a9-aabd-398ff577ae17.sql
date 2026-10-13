DROP POLICY "Anyone can light pending candle" ON public.memorial_candles;

CREATE POLICY "Anyone can light candle"
ON public.memorial_candles
FOR INSERT
WITH CHECK (
  status = 'approved'
  AND approved_by IS NULL
  AND public.memorial_allows(memorial_id, 'candles')
);