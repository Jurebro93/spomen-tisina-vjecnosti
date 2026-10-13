-- Ukloni dupla groblja - zadrži samo prva po created_at
DELETE FROM public.groblja 
WHERE id IN (
    SELECT id 
    FROM (
        SELECT id, 
               ROW_NUMBER() OVER (PARTITION BY naziv, grad ORDER BY created_at ASC) as row_num
        FROM public.groblja
    ) t 
    WHERE row_num > 1
);