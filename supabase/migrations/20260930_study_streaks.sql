-- =========================================================================
-- MIGRATION: Sequência de Estudos (Streaks) e Recordes
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard)
-- =========================================================================

-- 1. Adicionar colunas de streak e recordes na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS sequencia_dias_atual INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sequencia_dias_recorde INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS questoes_hoje INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS questoes_recorde_diario INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultimo_dia_estudado DATE;

-- 2. Comentários descritivos das colunas
COMMENT ON COLUMN public.profiles.sequencia_dias_atual IS 'Sequência atual de dias consecutivos estudados';
COMMENT ON COLUMN public.profiles.sequencia_dias_recorde IS 'Recorde histórico de dias consecutivos estudados';
COMMENT ON COLUMN public.profiles.questoes_hoje IS 'Quantidade de questões resolvidas hoje';
COMMENT ON COLUMN public.profiles.questoes_recorde_diario IS 'Recorde de questões resolvidas em um único dia';
COMMENT ON COLUMN public.profiles.ultimo_dia_estudado IS 'Última data em que o usuário registrou um estudo (formato YYYY-MM-DD)';

-- 3. Habilitar publicação Realtime para sincronização instantânea entre múltiplos dispositivos (Multi-Device Sync)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
