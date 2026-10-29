-- Promo codes can also be made for paid candles ('candle') or for everything ('all').
-- 'both' keeps meaning obituary + memorial.
CREATE OR REPLACE FUNCTION public.validate_promo_code_row()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.code := upper(btrim(NEW.code));
  IF NEW.code = '' THEN RAISE EXCEPTION 'Promo kod ne može biti prazan.'; END IF;
  IF NEW.discount_type NOT IN ('percentage','fixed','free') THEN
    RAISE EXCEPTION 'Nepoznata vrsta popusta: %', NEW.discount_type;
  END IF;
  IF NEW.product_type NOT IN ('memorial','obituary','candle','both','all') THEN
    RAISE EXCEPTION 'Nepoznata vrsta proizvoda: %', NEW.product_type;
  END IF;
  IF NEW.discount_type = 'percentage' AND (NEW.discount_value <= 0 OR NEW.discount_value > 100) THEN
    RAISE EXCEPTION 'Postotni popust mora biti između 1 i 100.';
  END IF;
  IF NEW.discount_type = 'fixed' AND NEW.discount_value <= 0 THEN
    RAISE EXCEPTION 'Fiksni popust mora biti veći od 0.';
  END IF;
  IF NEW.discount_type = 'free' THEN NEW.discount_value := 100; END IF;
  IF NEW.max_uses IS NOT NULL AND NEW.max_uses < 1 THEN
    RAISE EXCEPTION 'Maksimalan broj korištenja mora biti najmanje 1.';
  END IF;
  IF NEW.max_uses_per_user < 1 THEN
    RAISE EXCEPTION 'Maksimalan broj korištenja po korisniku mora biti najmanje 1.';
  END IF;
  RETURN NEW;
END;
$$;
