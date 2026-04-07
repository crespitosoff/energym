---
name: Arquitectura del Sistema
description: Arquitectura completa del sistema de gestión de gimnasio
type: project
---

## Arquitectura General - Sistema Energym

### Stack Tecnológico
- **Frontend**: Next.js 16 (App Router) + Tailwind CSS + TypeScript
- **Backend**: Supabase Edge Functions (serverless)
- **Base de datos**: PostgreSQL (Supabase)
- **Autenticación**: Supabase Auth
- **Despliegue**: Vercel

### Estructura de Carpetas
```
/app
  /(auth)
    /login/page.tsx
    /register/page.tsx
  /(dashboard)
    /layout.tsx          # Protegido por auth
    /page.tsx            # Dashboard principal
    /miembros/
      /page.tsx          # Lista miembros
      /nuevo/page.tsx    # Crear miembro
      /[id]/page.tsx     # Editar miembro
    /planes/page.tsx     # Gestión planes
  /api/
    /members/route.ts    # API miembros
    /plans/route.ts      # API planes
/components
  /ui/                   # Componentes base
  /members/              # Componentes de miembros
  /layout/               # Layout components
/lib
  /supabase.ts           # Cliente Supabase
  /auth.ts               # Helpers de auth
  /utils.ts              # Utilidades
/types
  /index.ts              # Tipos TypeScript
/supabase
  /migrations/           # Migraciones SQL
  /functions/            # Edge Functions
```

### Modelo de Datos
```
users (Supabase Auth)
  └── user_roles (rol: admin | asistente | cliente)
  └── members (miembros del gimnasio)
        └── plans (planes de membresía)
```

### RBAC
- **Admin**: Acceso completo (CRUD miembros, planes, usuarios)
- **Asistente**: Gestión de miembros (CRUD), ver planes
- **Cliente**: Solo ver su propia información

### Flujo de Autenticación
1. Usuario se registra/login → Supabase Auth
2. Trigger asigna rol automáticamente
3. Middleware verifica sesión en rutas protegidas
4. RLS en BD filtra datos según rol

### Priorización MVP
**Fase 1 (Actual)**: Core funcional
- Autenticación básica ✓
- CRUD miembros ✓
- Lista de planes ✓
- Dashboard con estados

**Fase 2**: RBAC completo
- Middleware de protección
- Políticas RLS estrictas
- Panel de admin

**Fase 3**: Notificaciones
- Edge Functions para vencimientos
- Email/SMS integration
- Dashboard de notificaciones

**Why:** Arquitectura modular que permite desarrollo incremental sin reescritura.
**How to apply:** Cada nuevo feature debe seguir esta estructura y respetar las fases.