-- ============================================================================
-- ENERGYM - Migration 002: Nuevos campos y módulo de contabilidad
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- SECCIÓN 1: NUEVOS CAMPOS EN MEMBERS
-- ============================================================================

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

COMMENT ON COLUMN public.members.fecha_nacimiento IS 'Fecha de nacimiento del miembro para cálculo de edad';

-- ============================================================================
-- SECCIÓN 2: TABLA DE TRANSACCIONES CONTABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.transactions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo        TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  categoria   TEXT NOT NULL CHECK (
                categoria IN ('membresia', 'equipamiento', 'arriendo', 'servicios', 'otro')
              ),
  descripcion TEXT NOT NULL,
  monto       DECIMAL(10,2) NOT NULL CHECK (monto > 0),
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  member_id   UUID REFERENCES public.members(id) ON DELETE SET NULL,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.transactions IS 'Registro contable de ingresos y egresos del gimnasio';
COMMENT ON COLUMN public.transactions.tipo IS 'ingreso: dinero que entra, egreso: dinero que sale';
COMMENT ON COLUMN public.transactions.categoria IS 'Categoría de la transacción';
COMMENT ON COLUMN public.transactions.monto IS 'Siempre positivo. El tipo (ingreso/egreso) define el signo';

-- Índices
CREATE INDEX IF NOT EXISTS idx_transactions_tipo ON public.transactions(tipo);
CREATE INDEX IF NOT EXISTS idx_transactions_fecha ON public.transactions(fecha);
CREATE INDEX IF NOT EXISTS idx_transactions_member ON public.transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON public.transactions(created_by);

-- ============================================================================
-- SECCIÓN 3: RLS PARA TRANSACTIONS
-- ============================================================================

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Solo admin y asistente pueden ver transacciones
CREATE POLICY "Transactions select policy" ON public.transactions
  FOR SELECT
  TO authenticated
  USING (public.is_staff());

-- Admin y asistente pueden crear transacciones
CREATE POLICY "Transactions insert policy" ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());

-- Solo admin puede editar transacciones
CREATE POLICY "Transactions update policy" ON public.transactions
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Solo admin puede eliminar transacciones
CREATE POLICY "Transactions delete policy" ON public.transactions
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- SECCIÓN 4: VISTA RESUMEN MENSUAL PARA CONTABILIDAD
-- ============================================================================

CREATE OR REPLACE VIEW public.transactions_monthly_summary AS
SELECT
  DATE_TRUNC('month', fecha) AS mes,
  COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) AS total_ingresos,
  COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0) AS total_egresos,
  COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 0) AS balance,
  COUNT(*) AS num_transacciones
FROM public.transactions
GROUP BY DATE_TRUNC('month', fecha)
ORDER BY mes DESC;

COMMENT ON VIEW public.transactions_monthly_summary IS 'Resumen contable mensual: ingresos, egresos y balance';

-- ============================================================================
-- SECCIÓN 5: TRIGGER — AUTO TRANSACCIÓN AL CREAR MIEMBRO
-- Al insertar un miembro con plan que tiene precio > 0, crear ingreso automático
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_transaction_on_member_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_nombre TEXT;
  v_plan_precio DECIMAL(10,2);
BEGIN
  -- Solo si viene con plan
  IF NEW.plan_id IS NOT NULL THEN
    SELECT nombre, precio
    INTO v_plan_nombre, v_plan_precio
    FROM public.plans
    WHERE id = NEW.plan_id;

    -- Solo si el plan tiene precio
    IF v_plan_precio IS NOT NULL AND v_plan_precio > 0 THEN
      INSERT INTO public.transactions (
        tipo,
        categoria,
        descripcion,
        monto,
        fecha,
        member_id,
        created_by
      ) VALUES (
        'ingreso',
        'membresia',
        'Membresía ' || v_plan_nombre || ' — ' || NEW.nombre || ' ' || NEW.apellido,
        v_plan_precio,
        COALESCE(NEW.fecha_inicio, CURRENT_DATE),
        NEW.id,
        NEW.created_by
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_transaction_on_insert ON public.members;
CREATE TRIGGER trigger_auto_transaction_on_insert
  AFTER INSERT ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_transaction_on_member_insert();

-- ============================================================================
-- SECCIÓN 6: TRIGGER — AUTO TRANSACCIÓN AL RENOVAR SUSCRIPCIÓN
-- Detecta cuando cambia el plan_id o la fecha_vencimiento
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_transaction_on_renewal()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_nombre TEXT;
  v_plan_precio DECIMAL(10,2);
BEGIN
  -- Detectar renovación: cambio en plan_id O extensión de fecha_vencimiento
  IF (NEW.plan_id IS NOT NULL) AND (
    NEW.plan_id IS DISTINCT FROM OLD.plan_id
    OR NEW.fecha_vencimiento > OLD.fecha_vencimiento
  ) THEN
    SELECT nombre, precio
    INTO v_plan_nombre, v_plan_precio
    FROM public.plans
    WHERE id = NEW.plan_id;

    IF v_plan_precio IS NOT NULL AND v_plan_precio > 0 THEN
      INSERT INTO public.transactions (
        tipo,
        categoria,
        descripcion,
        monto,
        fecha,
        member_id,
        created_by
      ) VALUES (
        'ingreso',
        'membresia',
        'Renovación ' || v_plan_nombre || ' — ' || NEW.nombre || ' ' || NEW.apellido,
        v_plan_precio,
        CURRENT_DATE,
        NEW.id,
        NEW.updated_by
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_transaction_on_renewal ON public.members;
CREATE TRIGGER trigger_auto_transaction_on_renewal
  AFTER UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_transaction_on_renewal();

-- ============================================================================
-- SECCIÓN 7: ACTUALIZAR VISTA members_with_status con fecha_nacimiento
-- ============================================================================

CREATE OR REPLACE VIEW public.members_with_status AS
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
  public.calculate_membership_status(m.fecha_vencimiento) AS estado,
  m.activo,
  m.created_at,
  m.updated_at,
  m.created_by,
  m.updated_by,
  -- Días restantes (negativo si ya venció)
  (m.fecha_vencimiento - CURRENT_DATE) AS dias_restantes
FROM public.members m
LEFT JOIN public.plans p ON m.plan_id = p.id;

-- ============================================================================
-- FIN DE MIGRATION 002
-- ============================================================================
