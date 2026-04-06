# Energym - Sistema de Gestión para Gimnasios

## Configuración Rápida

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un nuevo proyecto
2. Copia la URL y la anon key desde Settings > API

### 2. Configurar base de datos

1. Ve a SQL Editor en Supabase
2. Copia y ejecuta el contenido de `supabase/schema.sql`

### 3. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus credenciales de Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 4. Instalar y ejecutar

```bash
npm install
npm run dev
```

### 5. Desplegar en Vercel

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno en Vercel
3. Deploy automático en cada push a main

## Estructura del Proyecto

```
/app
  /login          - Autenticación
  /dashboard      - Lista de miembros
  /miembros/nuevo - Registro de miembros
/lib
  supabase.ts     - Cliente Supabase
/supabase
  schema.sql      - Script de base de datos
```

## MVP Features

- Autenticación con Supabase Auth
- Gestión de miembros (CRUD)
- Planes de membresía
- Control de vencimientos
- Diseño responsive (mobile-first)