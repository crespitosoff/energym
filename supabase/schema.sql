-- ============================================================================
-- ENERGYM - Schema de Base de Datos Seguro
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- SECCION 1: EXTENSIONES NECESARIAS
-- ============================================================================

-- Extension para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECCION 2: TABLAS PRINCIPALES
-- ============================================================================

-- 2.1 Tabla para roles de usuario
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'asistente', 'cliente')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

COMMENT ON TABLE user_roles IS 'Asignacion de roles a usuarios autenticados';
COMMENT ON COLUMN user_roles.role IS 'admin: acceso total, asistente: CRUD members, cliente: solo propio registro';

-- 2.2 Tabla de planes
CREATE TABLE IF NOT EXISTS plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  dias_duracion INTEGER NOT NULL CHECK (dias_duracion > 0),
  precio DECIMAL(10,2) DEFAULT 0.00,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE plans IS 'Planes de membresia disponibles';
COMMENT ON COLUMN plans.dias_duracion IS 'Duracion del plan en dias';

-- 2.3 Tabla de miembros
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefono TEXT,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  fecha_inicio DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE members IS 'Miembros registrados en el gimnasio';
COMMENT ON COLUMN members.activo IS 'Indica si el miembro esta activo (no eliminado)';

-- 2.4 Tabla de auditoria
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES auth.users(id),
  user_role TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'Registro de auditoria para acciones criticas';

-- ============================================================================
-- SECCION 3: INDICES DE RENDIMIENTO
-- ============================================================================

-- Indices para members
CREATE INDEX IF NOT EXISTS idx_members_plan ON members(plan_id);
CREATE INDEX IF NOT EXISTS idx_members_vencimiento ON members(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_activo ON members(activo);
CREATE INDEX IF NOT EXISTS idx_members_fecha_inicio ON members(fecha_inicio);

-- Indices para user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Indices para audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);

-- ============================================================================
-- SECCION 4: FUNCIONES AUXILIARES
-- ============================================================================

-- 4.1 Funcion para obtener rol del usuario actual (en schema public, NO auth)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_role() IS 'Retorna el rol del usuario autenticado actual';

-- 4.2 Funcion para verificar si es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() = 'admin';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 4.3 Funcion para verificar si es asistente o admin
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('admin', 'asistente');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 4.4 Funcion para calcular estado de membresia
CREATE OR REPLACE FUNCTION public.calculate_membership_status(p_fecha_vencimiento DATE)
RETURNS TEXT AS $$
BEGIN
  IF p_fecha_vencimiento < CURRENT_DATE THEN
    RETURN 'vencido';
  ELSIF p_fecha_vencimiento <= CURRENT_DATE + INTERVAL '7 days' THEN
    RETURN 'por_vencer';
  ELSE
    RETURN 'activo';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- 4.5 Funcion para actualizar timestamp updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECCION 5: TRIGGERS DE ACTUALIZACION AUTOMATICA
-- ============================================================================

-- 5.1 Trigger para actualizar user_roles.updated_at
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5.2 Trigger para actualizar plans.updated_at
DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5.3 Trigger para actualizar members.updated_at
DROP TRIGGER IF EXISTS update_members_updated_at ON members;
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5.4 Trigger para actualizar fecha_vencimiento cuando cambia el plan
CREATE OR REPLACE FUNCTION public.update_fecha_vencimiento_on_plan_change()
RETURNS TRIGGER AS $$
DECLARE
  v_dias INTEGER;
BEGIN
  -- Solo si cambio el plan_id
  IF NEW.plan_id IS DISTINCT FROM OLD.plan_id AND NEW.plan_id IS NOT NULL THEN
    -- Obtener dias de duracion del nuevo plan
    SELECT dias_duracion INTO v_dias
    FROM plans
    WHERE id = NEW.plan_id;

    IF v_dias IS NOT NULL THEN
      -- Recalcular fecha de vencimiento desde la fecha_inicio
      NEW.fecha_vencimiento := NEW.fecha_inicio + v_dias;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_fecha_vencimiento ON members;
CREATE TRIGGER trigger_update_fecha_vencimiento
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fecha_vencimiento_on_plan_change();

-- 5.5 Trigger para setear fecha_vencimiento en INSERT
CREATE OR REPLACE FUNCTION public.set_fecha_vencimiento_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_dias INTEGER;
BEGIN
  IF NEW.plan_id IS NOT NULL THEN
    -- Obtener dias de duracion del plan
    SELECT dias_duracion INTO v_dias
    FROM plans
    WHERE id = NEW.plan_id;

    IF v_dias IS NOT NULL THEN
      NEW.fecha_vencimiento := NEW.fecha_inicio + v_dias;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_fecha_vencimiento ON members;
CREATE TRIGGER trigger_set_fecha_vencimiento
  BEFORE INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_fecha_vencimiento_on_insert();

-- ============================================================================
-- SECCION 6: TRIGGER PARA ASIGNAR ROL POR DEFECTO
-- ============================================================================

-- 6.1 Funcion para asignar rol 'cliente' a nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cliente');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6.2 Trigger en auth.users (se ejecuta una sola vez)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SECCION 7: TRIGGERS DE AUDITORIA
-- ============================================================================

-- 7.1 Funcion generica de auditoria
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_old_values JSONB := NULL;
  v_new_values JSONB := NULL;
  v_user_role TEXT;
BEGIN
  -- Obtener rol del usuario
  v_user_role := public.get_user_role();

  IF TG_OP = 'DELETE' THEN
    v_old_values := to_jsonb(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'INSERT' THEN
    v_new_values := to_jsonb(NEW);
  END IF;

  INSERT INTO public.audit_log (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    user_role
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    v_old_values,
    v_new_values,
    auth.uid(),
    v_user_role
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.2 Triggers de auditoria para members
DROP TRIGGER IF EXISTS audit_members_insert ON members;
CREATE TRIGGER audit_members_insert
  AFTER INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_members_update ON members;
CREATE TRIGGER audit_members_update
  AFTER UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_members_delete ON members;
CREATE TRIGGER audit_members_delete
  AFTER DELETE ON members
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_func();

-- 7.3 Triggers de auditoria para user_roles
DROP TRIGGER IF EXISTS audit_user_roles_insert ON user_roles;
CREATE TRIGGER audit_user_roles_insert
  AFTER INSERT ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_user_roles_update ON user_roles;
CREATE TRIGGER audit_user_roles_update
  AFTER UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_user_roles_delete ON user_roles;
CREATE TRIGGER audit_user_roles_delete
  AFTER DELETE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_func();

-- ============================================================================
-- SECCION 8: VISTAS UTILES
-- ============================================================================

-- 8.1 Vista de miembros con estado calculado
CREATE OR REPLACE VIEW public.members_with_status AS
SELECT
  m.id,
  m.nombre,
  m.apellido,
  m.email,
  m.telefono,
  m.plan_id,
  p.nombre AS plan_nombre,
  p.dias_duracion AS plan_dias,
  m.fecha_inicio,
  m.fecha_vencimiento,
  public.calculate_membership_status(m.fecha_vencimiento) AS estado,
  m.activo,
  m.created_at,
  m.updated_at,
  m.created_by,
  m.updated_by
FROM public.members m
LEFT JOIN public.plans p ON m.plan_id = p.id;

COMMENT ON VIEW public.members_with_status IS 'Vista de miembros con estado calculado: activo, por_vencer, vencido';

-- 8.2 Vista de miembros activos (no vencidos)
CREATE OR REPLACE VIEW public.active_members AS
SELECT
  id,
  nombre,
  apellido,
  email,
  telefono,
  plan_id,
  plan_nombre,
  plan_dias,
  fecha_inicio,
  fecha_vencimiento,
  estado
FROM public.members_with_status
WHERE activo = true
  AND fecha_vencimiento >= CURRENT_DATE;

COMMENT ON VIEW public.active_members IS 'Vista de miembros activos con membresia vigente';

-- 8.3 Vista de miembros proximos a vencer (7 dias)
CREATE OR REPLACE VIEW public.members_expiring_soon AS
SELECT
  id,
  nombre,
  apellido,
  email,
  telefono,
  plan_nombre,
  fecha_vencimiento,
  fecha_vencimiento - CURRENT_DATE AS dias_restantes
FROM public.members_with_status
WHERE activo = true
  AND estado = 'por_vencer'
ORDER BY fecha_vencimiento ASC;

COMMENT ON VIEW public.members_expiring_soon IS 'Vista de miembros que vencen en los proximos 7 dias';

-- ============================================================================
-- SECCION 9: HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECCION 10: POLITICAS RLS PARA plans
-- ============================================================================

-- Eliminar politicas existentes primero
DROP POLICY IF EXISTS "Planes visibles para todos" ON plans;
DROP POLICY IF EXISTS "Admins pueden crear planes" ON plans;
DROP POLICY IF EXISTS "Admins pueden actualizar planes" ON plans;
DROP POLICY IF EXISTS "Admins pueden eliminar planes" ON plans;

-- SELECT: Todos los autenticados pueden ver planes
CREATE POLICY "Planes visibles para autenticados" ON plans
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Solo admins pueden crear planes
CREATE POLICY "Admins pueden crear planes" ON plans
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- UPDATE: Solo admins pueden actualizar planes
CREATE POLICY "Admins pueden actualizar planes" ON plans
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: Solo admins pueden eliminar planes
CREATE POLICY "Admins pueden eliminar planes" ON plans
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- SECCION 11: POLITICAS RLS PARA members
-- ============================================================================

-- Eliminar politicas existentes primero
DROP POLICY IF EXISTS "Miembros visibles para autenticados" ON members;
DROP POLICY IF EXISTS "Admins pueden crear miembros" ON members;
DROP POLICY IF EXISTS "Admins pueden actualizar miembros" ON members;
DROP POLICY IF EXISTS "Admins pueden eliminar miembros" ON members;

-- SELECT:
-- - Admin y Asistente: pueden ver todos
-- - Cliente: solo puede ver su propio registro
CREATE POLICY "Members select policy" ON members
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff()
    OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- INSERT: Solo admin y asistente pueden crear miembros
CREATE POLICY "Members insert policy" ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());

-- UPDATE: Solo admin y asistente pueden actualizar miembros
CREATE POLICY "Members update policy" ON members
  FOR UPDATE
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- DELETE: Solo admin puede eliminar miembros (soft delete preferido)
CREATE POLICY "Members delete policy" ON members
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- SECCION 12: POLITICAS RLS PARA user_roles
-- ============================================================================

-- Eliminar politicas existentes primero
DROP POLICY IF EXISTS "Usuarios ven su rol" ON user_roles;

-- SELECT:
-- - Admin: puede ver todos
-- - Otros: solo pueden ver su propio rol
CREATE POLICY "User roles select policy" ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR
    user_id = auth.uid()
  );

-- INSERT: Solo admin puede crear roles
CREATE POLICY "User roles insert policy" ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- UPDATE: Solo admin puede actualizar roles
CREATE POLICY "User roles update policy" ON user_roles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: Solo admin puede eliminar roles
CREATE POLICY "User roles delete policy" ON user_roles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- SECCION 13: POLITICAS RLS PARA audit_log
-- ============================================================================

-- SELECT: Solo admins pueden ver el log de auditoria
CREATE POLICY "Audit log select policy" ON audit_log
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- INSERT: Sistema puede insertar automaticamente via trigger
CREATE POLICY "Audit log insert policy" ON audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No se permite UPDATE ni DELETE en audit_log
-- Esto se controla a nivel de aplicacion

-- ============================================================================
-- SECCION 14: DATOS INICIALES
-- ============================================================================

-- Insertar planes basicos (solo si no existen)
INSERT INTO plans (nombre, dias_duracion, precio) VALUES
  ('Mensual', 30, 0.00),
  ('Trimestral', 90, 0.00),
  ('Semestral', 180, 0.00),
  ('Anual', 365, 0.00)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECCION 15: FUNCIONES ADICIONALES PARA LA APLICACION
-- ============================================================================

-- 15.1 Funcion para obtener el ID del miembro asociado al usuario actual
CREATE OR REPLACE FUNCTION public.get_member_id_by_email()
RETURNS UUID AS $$
DECLARE
  v_email TEXT;
  v_member_id UUID;
BEGIN
  -- Obtener email del usuario autenticado
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = auth.uid();

  IF v_email IS NULL THEN
    RETURN NULL;
  END IF;

  -- Buscar miembro con ese email
  SELECT id INTO v_member_id
  FROM members
  WHERE email = v_email
  LIMIT 1;

  RETURN v_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 15.2 Funcion para verificar si un usuario tiene membresia activa
CREATE OR REPLACE FUNCTION public.has_active_membership()
RETURNS BOOLEAN AS $$
DECLARE
  v_member_id UUID;
  v_fecha_vencimiento DATE;
BEGIN
  v_member_id := public.get_member_id_by_email();

  IF v_member_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT fecha_vencimiento INTO v_fecha_vencimiento
  FROM members
  WHERE id = v_member_id AND activo = true;

  IF v_fecha_vencimiento IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN v_fecha_vencimiento >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- SECCION 16: GRANT PERMISOS
-- ============================================================================

-- Asegurar que el rol anonimo y autenticado tengan acceso de lectura
-- a las tablas necesarias
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- FIN DEL SCHEMA
-- ============================================================================