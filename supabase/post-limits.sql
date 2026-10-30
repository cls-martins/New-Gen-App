-- CONFIGURAÇÃO DOS LIMITES DIÁRIOS DA NEWGEN
-- Edite somente os números abaixo: free = normal; premium = Premium.
-- Depois execute este arquivo no SQL Editor do seu projeto Supabase.
-- Alterar/salvar o arquivo sozinho NÃO altera o banco conectado.
-- O bloqueio real e os contadores do app usam public.plan_limits.
-- O dia é contado no fuso America/Sao_Paulo.
BEGIN;
UPDATE public.plan_limits
SET daily_posts = config.daily_posts
FROM (VALUES
  ('free'::public.plan_type, 7),
  ('premium'::public.plan_type, 20)
) AS config(plan, daily_posts)
WHERE plan_limits.plan = config.plan;
COMMIT;

SELECT plan, daily_posts FROM public.plan_limits ORDER BY plan;
