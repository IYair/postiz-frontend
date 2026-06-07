# Command Palette — Design Spec

**Fecha:** 2026-06-06
**Repo:** postiz-frontend (+ cambio menor en postiz-backend)
**Estado:** Aprobado, pendiente de plan de implementación

## Objetivo

Agregar un command palette (estilo ⌘K) al frontend de Postiz que dé acceso
rápido a las funciones más usadas: navegación entre secciones, crear post,
cambiar la vista del calendario, conectar una red social, abrir el agente,
ir a medios, configurar el proveedor de IA y buscar posts programados.

## Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Librería | `cmdk` (headless, ~3kb). Theming 100% con tokens Tailwind de Postiz. |
| Trigger | Atajo global ⌘K (Mac) / Ctrl+K (Win) vía `react-hotkeys-hook` **+** botón visible en `top.menu.tsx` con hint `⌘K`. |
| Buscar posts | Búsqueda global vía API (`GET /posts/list?search=`). Requiere agregar param `search` al backend. |
| Abrir post | Resultado navega a `/launches?open=<group>`; el calendario lee el param y abre el editor existente. |

## Arquitectura

Montaje único en el layout global (no por página).

- **`command-palette.context.tsx`** — `CommandPaletteProvider` + hook
  `useCommandPalette()` que expone `{ open, setOpen, toggle }`. Estado de
  apertura vive aquí para que tanto el atajo como el botón del top menu puedan
  abrirlo.
- **`command-palette.tsx`** — UI con `cmdk`. Renderiza el overlay/modal,
  el input de búsqueda, los grupos y los items. Escucha ⌘K/Ctrl+K. Cierra con
  Esc o click en backdrop.
- **`commands.ts`** — registry data-driven. Cada comando:
  `{ id, group, label, icon?, keywords, perform(ctx) }`. Builders que reciben
  el contexto (router, openModal, setFilters, addProvider, pathname) y devuelven
  la lista de comandos aplicables.

### Dependencia nueva

`cmdk` en `apps/frontend/package.json`.

## Registry de comandos (v1)

**Navegación** (siempre disponibles, `router.push`):
- Calendar → `/launches`
- Analytics → `/analytics`
- Media → `/media`
- Agents → `/agents`
- Plugs → `/plugs`
- Integrations → `/third-party`
- Billing → `/billing`
- Settings → `/settings`
- Config proveedor IA → ruta/sección de settings de IA del fork

**Acciones** (siempre disponibles):
- Crear post → abre `AddEditModal` (vía `useModals`). Si no hay integraciones,
  dispara `addProvider` en su lugar.
- Conectar red social → `useAddProvider()`. Si el hook requiere contexto no
  disponible globalmente, fallback: navegar a `/third-party`.
- Conversación con agente → `/agents`.

**Vista calendario** (solo registradas cuando `pathname` es `/launches`):
- Día / Semana / Mes / Lista → `setFilters({ display, ... })`
- Ir a hoy → `setFilters` con la fecha actual

**Buscar posts** (dinámico):
- Al teclear (con debounce ~250ms) llama `GET /posts/list?search=<texto>`.
- Resultados se muestran como items con título/fecha.
- Seleccionar → `router.push('/launches?open=<group>')`.

## Cambio backend (búsqueda)

1. `libraries/nestjs-libraries/src/dtos/posts/get.posts.list.dto.ts`: agregar
   campo opcional `search?: string` (`@IsOptional() @IsString()`).
2. Repositorio `getPostsList`: cuando `search` está presente, agregar filtro
   `content`/descripción `contains` (case-insensitive, `mode: 'insensitive'`).
3. El endpoint `GET /posts/list` ya existe; no se agregan rutas nuevas.

## Flujo abrir post

1. Resultado seleccionado → `router.push('/launches?open=<group>')`.
2. La página del calendario (o `calendar.context`) detecta `open` en el effect
   de montaje/cambio de query.
3. Carga el post del grupo y dispara el editor existente (`editPost`).
4. Limpia el query param (`router.replace`) para no re-abrir al refrescar.

## Theming

- cmdk headless estilizado con tokens Postiz:
  fondo `newBgColor`, texto `textColor`, item activo/selección `forth`,
  bordes/separadores `fifth`/`newTextColor/10`.
- Overlay centrado con backdrop, ancho máx ~640px, responsive (full-width en
  mobile). Soporta RTL con utilidades lógicas (`start/end`, `ps/pe`).
- Íconos: reusar los SVG ya presentes en `top.menu.tsx` o `lucide-react`
  (ya instalado). No crear SVGs nuevos.

## Disponibilidad contextual

- Navegación y acciones: en cualquier página.
- Comandos de vista de calendario: solo en `/launches` (se omiten del registry
  si el pathname no coincide).
- Crear post sin integraciones: redirige a conectar proveedor.

## Manejo de errores

- Falla del fetch de búsqueda → estado "sin resultados / error" dentro del
  palette; no se propaga ni rompe la UI.
- Comando cuyo target no existe (ej. ruta IA) → no se registra.

## Testing

- Jest unit:
  - Registry: filtrado por texto/keywords; comandos contextuales aparecen solo
    en `/launches`.
  - `useCommandPalette`: toggle abre/cierra.
  - (Opcional) render del palette con un set de comandos mock.

## Archivos afectados

**Frontend (`apps/frontend`)**
- `src/components/command-palette/command-palette.tsx` (nuevo)
- `src/components/command-palette/command-palette.context.tsx` (nuevo)
- `src/components/command-palette/commands.ts` (nuevo)
- Layout global (montaje del provider + palette)
- `src/components/layout/top.menu.tsx` (botón con hint ⌘K)
- `package.json` (dep `cmdk`)

**Backend (`apps/backend` + libraries)**
- `libraries/nestjs-libraries/src/dtos/posts/get.posts.list.dto.ts` (+`search`)
- Repositorio de posts `getPostsList` (filtro `contains`)

## Fuera de alcance (v2)

- Comandos con sub-páginas/argumentos (ej. elegir red social específica antes
  de conectar).
- Acciones masivas sobre posts desde el palette.
- Historial de comandos recientes / favoritos.
