-- ============================================================================
-- ENERGYM - Migration 003: Fix vista, POS system, sesiones de caja
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- SECCIÓN 1: AGREGAR fecha_nacimiento A MEMBERS
-- ============================================================================

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

-- ============================================================================
-- SECCIÓN 2: FIX VISTA - DROP y recrear con nuevos campos
-- (CASCADE borra vistas dependientes, las recreamos después)
-- ============================================================================

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
  public.calculate_membership_status(m.fecha_vencimiento) AS estado,
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

-- ============================================================================
-- SECCIÓN 3: SESIONES DE CAJA (register_sessions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.register_sessions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  opened_by     UUID NOT NULL REFERENCES auth.users(id),
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  initial_cash  DECIMAL(10,2) NOT NULL DEFAULT 0,
  closed_by     UUID REFERENCES auth.users(id),
  closed_at     TIMESTAMPTZ,
  final_cash    DECIMAL(10,2),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.register_sessions IS 'Sesiones de caja: abrir y cerrar';

ALTER TABLE public.register_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "register_sessions_select" ON public.register_sessions
  FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "register_sessions_insert" ON public.register_sessions
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "register_sessions_update" ON public.register_sessions
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============================================================================
-- SECCIÓN 4: VENTAS (sales)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sales (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id           UUID REFERENCES public.members(id) ON DELETE SET NULL,
  plan_id             UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  concepto            TEXT NOT NULL CHECK (concepto IN (
                        'nueva_membresia', 'renovacion', 'producto', 'otro'
                      )),
  descripcion         TEXT NOT NULL,
  monto_total         DECIMAL(10,2) NOT NULL CHECK (monto_total > 0),
  register_session_id UUID REFERENCES public.register_sessions(id) ON DELETE SET NULL,
  created_by          UUID NOT NULL REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.sales IS 'Ventas del gimnasio: membresías, productos, etc.';

CREATE INDEX IF NOT EXISTS idx_sales_member ON public.sales(member_id);
CREATE INDEX IF NOT EXISTS idx_sales_session ON public.sales(register_session_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_concepto ON public.sales(concepto);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_select" ON public.sales
  FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "sales_insert" ON public.sales
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "sales_update" ON public.sales
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- SECCIÓN 5: PAGOS POR VENTA (sale_payments) — métodos de pago mixtos
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sale_payments (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id   UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  metodo    TEXT NOT NULL CHECK (metodo IN ('efectivo', 'tarjeta', 'transferencia')),
  monto     DECIMAL(10,2) NOT NULL CHECK (monto > 0)
);

COMMENT ON TABLE public.sale_payments IS 'Métodos de pago por venta. Una venta puede tener múltiples pagos.';

CREATE INDEX IF NOT EXISTS idx_sale_payments_sale ON public.sale_payments(sale_id);

ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_payments_select" ON public.sale_payments
  FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "sale_payments_insert" ON public.sale_payments
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());

-- ============================================================================
-- SECCIÓN 6: MANTENER TABLA transactions PARA GASTOS GENERALES
-- (solo si no existe ya)
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

-- Habilitar RLS si no está habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'transactions' AND rowsecurity = true
  ) THEN
    ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Crear policies solo si no existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Transactions select policy') THEN
    CREATE POLICY "Transactions select policy" ON public.transactions FOR SELECT TO authenticated USING (public.is_staff());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Transactions insert policy') THEN
    CREATE POLICY "Transactions insert policy" ON public.transactions FOR INSERT TO authenticated WITH CHECK (public.is_staff());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Transactions update policy') THEN
    CREATE POLICY "Transactions update policy" ON public.transactions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Transactions delete policy') THEN
    CREATE POLICY "Transactions delete policy" ON public.transactions FOR DELETE TO authenticated USING (public.is_admin());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_tipo ON public.transactions(tipo);
CREATE INDEX IF NOT EXISTS idx_transactions_fecha ON public.transactions(fecha);

-- ============================================================================
-- FIN DE MIGRATION 003
-- ============================================================================
