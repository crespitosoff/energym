-- Ejecutar en Supabase SQL Editor

-- 1. Tabla para roles de usuario
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'asistente', 'cliente')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Función para obtener rol del usuario actual (en schema public, NO auth)
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS TEXT AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 3. Tabla de planes
CREATE TABLE IF NOT EXISTS plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  dias_duracion INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de miembros
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  fecha_inicio DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_members_plan ON members(plan_id);
CREATE INDEX IF NOT EXISTS idx_members_vencimiento ON members(fecha_vencimiento);

-- 6. Habilitar RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 7. Políticas para plans
CREATE POLICY "Planes visibles para todos" ON plans
  FOR SELECT USING (true);

-- 8. Políticas para members (usando public.get_user_role)
CREATE POLICY "Miembros visibles para autenticados" ON members
  FOR SELECT USING (public.get_user_role() IS NOT NULL);

CREATE POLICY "Admins pueden crear miembros" ON members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'asistente')
    )
  );

CREATE POLICY "Admins pueden actualizar miembros" ON members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'asistente')
    )
  );

-- 9. Políticas para user_roles
CREATE POLICY "Usuarios ven su rol" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

-- 10. Insertar planes básicos
INSERT INTO plans (nombre, dias_duracion) VALUES
  ('Mensual', 30),
  ('Trimestral', 90),
  ('Semestral', 180),
  ('Anual', 365)
ON CONFLICT DO NOTHING;