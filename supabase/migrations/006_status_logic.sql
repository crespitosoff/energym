-- ============================================================================
-- ENERGYM - Migration 006: Corrección de lógica de estados y métricas por plan
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Redefinir calculate_membership_status con la nueva lógica de 4 estados
CREATE OR REPLACE FUNCTION public.calculate_membership_status(p_fecha_vencimiento DATE)
RETURNS TEXT AS $$
BEGIN
  -- Si venció hace más de 3 días → inactivo
  IF p_fecha_vencimiento < (CURRENT_DATE - INTERVAL '3 days') THEN
    RETURN 'inactivo';
  END IF;
  -- Si venció (entre 0 y 3 días atrás) → vencido
  IF p_fecha_vencimiento < CURRENT_DATE THEN
    RETURN 'vencido';
  END IF;
  -- Si vence dentro de los próximos 7 días (incluido hoy) → por_vencer
  IF p_fecha_vencimiento <= (CURRENT_DATE + INTERVAL '7 days') THEN
    RETURN 'por_vencer';
  END IF;
  -- De lo contrario → activo
  RETURN 'activo';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Recrear vista principal y sub-vistas
DROP VIEW IF EXISTS public.inactive_members CASCADE;
DROP VIEW IF EXISTS public.members_expiring_soon CASCADE;
DROP VIEW IF EXISTS public.active_members CASCADE;
DROP VIEW IF EXISTS public.members_with_status CASCADE;

CREATE VIEW public.members_with_status AS
SELECT
  m.id,
  m.nombre,
  m.apellido,
  m.email,
  m.telefono,
  m.fecha_nacimiento,
  m.plan_id,
  p.nombre AS plan_nombre,
  p.dias_duracion AS plan_dias,
  p.precio AS plan_precio,
  m.fecha_inicio,
  m.fecha_vencimiento,
  CASE
    WHEN m.plan_id IS NULL THEN 'inactivo'
    ELSE public.calculate_membership_status(m.fecha_vencimiento)
  END AS estado,
  m.activo,
  m.created_at,
  m.updated_at,
  m.created_by,
  m.updated_by,
  (m.fecha_vencimiento - CURRENT_DATE) AS dias_restantes
FROM public.members m
LEFT JOIN public.plans p ON m.plan_id = p.id;

CREATE VIEW public.active_members AS
SELECT * FROM public.members_with_status
WHERE activo = true AND estado = 'activo';

CREATE VIEW public.members_expiring_soon AS
SELECT * FROM public.members_with_status
WHERE activo = true AND estado = 'por_vencer';

CREATE VIEW public.inactive_members AS
SELECT * FROM public.members_with_status
WHERE activo = true AND estado = 'inactivo';

-- FIN MIGRATION 006
