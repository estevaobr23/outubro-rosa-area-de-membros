-- Aplicada via MCP do Supabase no projeto outubro-rosa-membros (foxwfqvnbnyimisnhjfl).
-- ============================================================================
-- BUCKET PRIVADO para as imagens das cartinhas
-- ============================================================================
-- A imagem só sai por URL assinada, gerada por /api/cartinha/[id] e
-- /api/download/cartinha/[id] depois de conferir sessão + entitlement.
-- O produto já foi inserido em 0001_motor.sql.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('cartinhas', 'cartinhas', false)
on conflict (id) do nothing;
