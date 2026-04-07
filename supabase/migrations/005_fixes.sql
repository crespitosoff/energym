-- ============================================================================
-- ENERGYM - Migration 005: Correccion de Bugs y Refinamientos
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Actualizar la vista `members_with_status` para que los que no tienen plan aparezcan inactivos
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

-- Recrear sub-vistas
CREATE VIEW public.active_members AS
SELECT * FROM public.members_with_status
WHERE activo = true AND estado = 'activo';

CREATE VIEW public.members_expiring_soon AS
SELECT * FROM public.members_with_status
WHERE activo = true AND estado = 'por_vencer';

CREATE VIEW public.inactive_members AS
SELECT * FROM public.members_with_status
WHERE activo = true AND estado = 'inactivo';


-- 2. Actualizar triggers de vencimiento para el plan de 1 día y cambios de fecha_inicio

CREATE OR REPLACE FUNCTION public.update_fecha_vencimiento_on_plan_change()
RETURNS TRIGGER AS $$
DECLARE
  v_dias INTEGER;
BEGIN
  -- Si el plan cambió o la fecha de inicio cambió
  IF (NEW.plan_id IS DISTINCT FROM OLD.plan_id) OR (NEW.fecha_inicio IS DISTINCT FROM OLD.fecha_inicio) THEN
    IF NEW.plan_id IS NOT NULL THEN
      -- Obtener días de duración del plan
      SELECT dias_duracion INTO v_dias
      FROM plans
      WHERE id = NEW.plan_id;

      IF v_dias IS NOT NULL THEN
        -- Si es plan de 1 día, vence ese mismo día (inicio). Si no, suma los días.
        IF v_dias = 1 THEN
          NEW.fecha_vencimiento := NEW.fecha_inicio;
        ELSE
          NEW.fecha_vencimiento := NEW.fecha_inicio + v_dias;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION public.set_fecha_vencimiento_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_dias INTEGER;
BEGIN
  IF NEW.plan_id IS NOT NULL THEN
    -- Obtener días de duración del plan
    SELECT dias_duracion INTO v_dias
    FROM plans
    WHERE id = NEW.plan_id;

    IF v_dias IS NOT NULL THEN
      -- Si es plan de 1 día, vence ese mismo día.
      IF v_dias = 1 THEN
        NEW.fecha_vencimiento := NEW.fecha_inicio;
      ELSE
        NEW.fecha_vencimiento := NEW.fecha_inicio + v_dias;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 3. Permitir monto_total y monto >= 0 en caso de necesitar renovaciones gratuitas/descuento total
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_monto_total_check;
ALTER TABLE public.sales ADD CONSTRAINT sales_monto_total_check CHECK (monto_total >= 0);

ALTER TABLE public.sale_payments DROP CONSTRAINT IF EXISTS sale_payments_monto_check;
ALTER TABLE public.sale_payments ADD CONSTRAINT sale_payments_monto_check CHECK (monto >= 0);

-- FIN MIGRATION 005
