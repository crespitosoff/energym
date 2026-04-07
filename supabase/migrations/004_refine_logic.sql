-- ============================================================================
-- ENERGYM - Migration 004: Refinamiento de Membresias e Inactividad
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Agregar columna activo si no existe
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- 2. Actualizar la funcion de estado
CREATE OR REPLACE FUNCTION public.calculate_membership_status(p_fecha_vencimiento DATE)
RETURNS TEXT AS $$
BEGIN
  -- Si han pasado mas de 3 dias desde el vencimiento -> inactivo
  IF p_fecha_vencimiento <= CURRENT_DATE - INTERVAL '3 days' THEN
    RETURN 'inactivo';
  -- Si esta vencido, pero hace menos de 3 dias (periodo de gracia/cobro) -> vencido
  ELSIF p_fecha_vencimiento < CURRENT_DATE THEN
    RETURN 'vencido';
  -- Si faltan 7 dias o menos para vencer -> por_vencer
  ELSIF p_fecha_vencimiento <= CURRENT_DATE + INTERVAL '7 days' THEN
    RETURN 'por_vencer';
  -- De lo contrario -> activo
  ELSE
    RETURN 'activo';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- RECREAR LAS VISTAS para que usen la nueva definicion (ya que la funcion cambio logicamente, 
-- postgres actualizará al vuelo, pero si queremos hacer querys más especificos, limpiamos las subvistas)
DROP VIEW IF EXISTS public.active_members CASCADE;
DROP VIEW IF EXISTS public.members_expiring_soon CASCADE;

CREATE VIEW public.active_members AS
SELECT * FROM public.members_with_status
WHERE activo = true AND estado = 'activo';

CREATE VIEW public.members_expiring_soon AS
SELECT * FROM public.members_with_status
WHERE activo = true AND estado = 'por_vencer';

-- Y creemos una para inactivos para facilitar si se busca en frontend (opcional)
CREATE OR REPLACE VIEW public.inactive_members AS
SELECT * FROM public.members_with_status
WHERE activo = true AND estado = 'inactivo';

-- 2. Eliminar la contabilidad de la base de datos (se usa ahora "sales" y "register_sessions")
-- Primero borrar triggers y policies para estar limpios
DROP POLICY IF EXISTS "Transactions select policy" ON public.transactions;
DROP POLICY IF EXISTS "Transactions insert policy" ON public.transactions;
DROP POLICY IF EXISTS "Transactions update policy" ON public.transactions;
DROP POLICY IF EXISTS "Transactions delete policy" ON public.transactions;
DROP TABLE IF EXISTS public.transactions CASCADE;

-- 3. Limpiar conceptos en "sales"
-- Ahora el gimnasio es simple: todo lo que entra es "membresia" o "renovacion".
-- Borramos el CHECK anterior y agregamos el nuevo
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_concepto_check;

ALTER TABLE public.sales 
  ADD CONSTRAINT sales_concepto_check 
  CHECK (concepto IN ('nueva_membresia', 'renovacion'));

-- FIN MIGRATION 004
