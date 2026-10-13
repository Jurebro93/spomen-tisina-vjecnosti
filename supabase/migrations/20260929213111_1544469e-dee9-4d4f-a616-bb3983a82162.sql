ALTER TABLE public.famous_portrait_photos
  ADD COLUMN edit_preservation_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN edit_preservation_confidence numeric(5,4),
  ADD COLUMN edit_preservation_reason text;