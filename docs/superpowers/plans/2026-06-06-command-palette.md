# Command Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un command palette ⌘K/Ctrl+K al frontend de Postiz con navegación, crear post, vistas de calendario, conectar red social, agente, medios, config IA y búsqueda global de posts.

**Architecture:** Un store zustand global (`useCommandPalette`) controla apertura y un registro de comandos contextuales. La UI (`cmdk`) se monta una vez en `layout.component.tsx`. Los comandos estáticos (navegación/acciones) son funciones puras data-driven; los comandos dependientes del calendario los registra un componente montado dentro del provider del calendario. La búsqueda de posts usa el endpoint `/posts/list` extendido con un parámetro `search`.

**Tech Stack:** Next.js (App Router) + React, `cmdk`, `zustand`, `react-hotkeys-hook` (ya presente), Tailwind con tokens Postiz, NestJS + Prisma (backend).

---

## File Structure

**Frontend (`postiz-frontend/apps/frontend`)**
- `src/components/command-palette/command-palette.store.ts` (nuevo) — store zustand: open + registro de comandos contextuales.
- `src/components/command-palette/commands.ts` (nuevo) — tipos + builders puros de comandos estáticos (navegación/acciones).
- `src/components/command-palette/commands.spec.ts` (nuevo) — tests unitarios de los builders puros.
- `src/components/command-palette/command-palette.tsx` (nuevo) — UI cmdk + hotkey + theming.
- `src/components/command-palette/command-palette.button.tsx` (nuevo) — botón trigger con hint ⌘K.
- `src/components/command-palette/calendar-palette-commands.tsx` (nuevo) — registra comandos del calendario y procesa `?create`/`?open` al montar.
- `src/components/new-layout/layout.component.tsx` (modificar) — montar `<CommandPalette/>` y el botón en la barra superior.
- `src/components/launches/launches.component.tsx` (modificar) — montar `<CalendarPaletteCommands/>` dentro del provider del calendario.
- `package.json` (modificar) — dep `cmdk`.

**Backend (`postiz-backend`)**
- `libraries/nestjs-libraries/src/dtos/posts/get.posts.list.dto.ts` (modificar) — campo `search?`.
- `libraries/nestjs-libraries/src/database/prisma/posts/posts.repository.ts` (modificar) — filtro `content contains`.

---

## Task 1: Agregar dependencia `cmdk`

**Files:**
- Modify: `postiz-frontend/apps/frontend/package.json`

- [x] **Step 1: Instalar cmdk en el workspace del frontend**

Run:
```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend" && pnpm --filter ./apps/frontend add cmdk@1.1.1
```
Expected: `package.json` de `apps/frontend` queda con `"cmdk": "1.1.1"` y `pnpm-lock.yaml` actualizado.

- [x] **Step 2: Verificar instalación**

Run:
```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend" && node -e "console.log(require('./apps/frontend/node_modules/cmdk/package.json').version)"
```
Expected: imprime `1.1.1` (o que el módulo resuelve sin error).

- [ ] **Step 3: Commit**

```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend" && git add apps/frontend/package.json pnpm-lock.yaml && git commit -m "build(frontend): agrega dependencia cmdk para command palette"
```

---

## Task 2: Tipos y builders puros de comandos (TDD)

Lógica pura sin imports `@gitroom/*` para que sea testeable bajo el jest existente (entorno node, imports relativos — igual que `ai.encryption.spec.ts`).

**Files:**
- Create: `postiz-frontend/apps/frontend/src/components/command-palette/commands.ts`
- Test: `postiz-frontend/apps/frontend/src/components/command-palette/commands.spec.ts`

- [x] **Step 1: Escribir el test que falla**

```ts
// commands.spec.ts
import { buildNavigationCommands, buildActionCommands } from './commands';

const makeCtx = () => {
  const pushed: string[] = [];
  const closed: { count: number } = { count: 0 };
  return {
    ctx: {
      t: (_key: string, fallback: string) => fallback,
      pathname: '/analytics',
      router: { push: (href: string) => pushed.push(href) },
      close: () => {
        closed.count += 1;
      },
      openAddProvider: () => {},
    },
    pushed,
    closed,
  };
};

describe('command builders', () => {
  it('navigation includes Calendar pointing to /launches', () => {
    const { ctx } = makeCtx();
    const cmds = buildNavigationCommands(ctx);
    const calendar = cmds.find((c) => c.id === 'nav-calendar');
    expect(calendar).toBeDefined();
    expect(calendar!.label).toBe('Calendar');
    expect(calendar!.group).toBe('Navigation');
  });

  it('navigation perform pushes the route and closes the palette', async () => {
    const { ctx, pushed, closed } = makeCtx();
    const cmds = buildNavigationCommands(ctx);
    await cmds.find((c) => c.id === 'nav-analytics')!.perform();
    expect(pushed).toEqual(['/analytics']);
    expect(closed.count).toBe(1);
  });

  it('actions include connect-social calling openAddProvider', async () => {
    const pushed: string[] = [];
    let providerOpened = 0;
    const ctx = {
      t: (_k: string, f: string) => f,
      pathname: '/analytics',
      router: { push: (h: string) => pushed.push(h) },
      close: () => {},
      openAddProvider: () => {
        providerOpened += 1;
      },
    };
    const cmds = buildActionCommands(ctx);
    await cmds.find((c) => c.id === 'action-connect-social')!.perform();
    expect(providerOpened).toBe(1);
  });

  it('create-post action navigates to /launches?create=1', async () => {
    const { ctx, pushed } = makeCtx();
    const cmds = buildActionCommands(ctx);
    await cmds.find((c) => c.id === 'action-create-post')!.perform();
    expect(pushed).toEqual(['/launches?create=1']);
  });
});
```

- [ ] **Step 2: Correr el test para verque falla**

Run:
```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend" && npx jest apps/frontend/src/components/command-palette/commands.spec.ts
```
Expected: FAIL — `Cannot find module './commands'`.

- [x] **Step 3: Implementar `commands.ts`**

```ts
// commands.ts
export interface CommandContext {
  t: (key: string, fallback: string) => string;
  pathname: string;
  router: { push: (href: string) => void };
  close: () => void;
  openAddProvider: () => void;
}

export interface Command {
  id: string;
  group: string;
  label: string;
  keywords?: string[];
  perform: () => void | Promise<void>;
}

interface NavItem {
  id: string;
  fallback: string;
  href: string;
  keywords: string[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'nav-calendar', fallback: 'Calendar', href: '/launches', keywords: ['calendar', 'launches', 'calendario', 'posts'] },
  { id: 'nav-analytics', fallback: 'Analytics', href: '/analytics', keywords: ['analytics', 'stats', 'estadisticas'] },
  { id: 'nav-media', fallback: 'Media', href: '/media', keywords: ['media', 'medios', 'images', 'videos'] },
  { id: 'nav-agents', fallback: 'Agents', href: '/agents', keywords: ['agent', 'agente', 'ai', 'chat'] },
  { id: 'nav-plugs', fallback: 'Plugs', href: '/plugs', keywords: ['plugs', 'automation'] },
  { id: 'nav-integrations', fallback: 'Integrations', href: '/third-party', keywords: ['integrations', 'integraciones', 'apps'] },
  { id: 'nav-billing', fallback: 'Billing', href: '/billing', keywords: ['billing', 'facturacion', 'subscription'] },
  { id: 'nav-settings', fallback: 'Settings', href: '/settings', keywords: ['settings', 'configuracion', 'ajustes'] },
  { id: 'nav-ai-provider', fallback: 'AI provider settings', href: '/settings', keywords: ['ai', 'provider', 'proveedor', 'openai', 'claude', 'gemini', 'modelo'] },
];

export function buildNavigationCommands(ctx: CommandContext): Command[] {
  const group = ctx.t('cmd_group_navigation', 'Navigation');
  return NAV_ITEMS.map((item) => ({
    id: item.id,
    group,
    label: ctx.t(`cmd_${item.id}`, item.fallback),
    keywords: item.keywords,
    perform: () => {
      ctx.router.push(item.href);
      ctx.close();
    },
  }));
}

export function buildActionCommands(ctx: CommandContext): Command[] {
  const group = ctx.t('cmd_group_actions', 'Actions');
  return [
    {
      id: 'action-create-post',
      group,
      label: ctx.t('cmd_create_post', 'Create post'),
      keywords: ['create', 'new', 'post', 'crear', 'nuevo', 'publicacion'],
      perform: () => {
        ctx.router.push('/launches?create=1');
        ctx.close();
      },
    },
    {
      id: 'action-connect-social',
      group,
      label: ctx.t('cmd_connect_social', 'Connect a social channel'),
      keywords: ['connect', 'social', 'channel', 'conectar', 'red', 'integration'],
      perform: () => {
        ctx.openAddProvider();
        ctx.close();
      },
    },
    {
      id: 'action-agent-chat',
      group,
      label: ctx.t('cmd_agent_chat', 'Chat with the agent'),
      keywords: ['agent', 'chat', 'conversacion', 'ai'],
      perform: () => {
        ctx.router.push('/agents');
        ctx.close();
      },
    },
  ];
}

export function buildStaticCommands(ctx: CommandContext): Command[] {
  return [...buildNavigationCommands(ctx), ...buildActionCommands(ctx)];
}
```

- [x] **Step 4: Correr el test para verificar que pasa**

Run:
```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend" && npx jest apps/frontend/src/components/command-palette/commands.spec.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend" && git add apps/frontend/src/components/command-palette/commands.ts apps/frontend/src/components/command-palette/commands.spec.ts && git commit -m "feat(command-palette): builders puros de comandos estáticos + tests"
```

---

## Task 3: Store zustand del palette

**Files:**
- Create: `postiz-frontend/apps/frontend/src/components/command-palette/command-palette.store.ts`

- [x] **Step 1: Implementar el store**

Sigue el patrón de `new-modal.tsx` (`create` de zustand). Mantiene apertura y un registro de comandos contextuales por clave (para que el calendario registre/desregistre sus comandos).

```ts
// command-palette.store.ts
import { create } from 'zustand';
import type { Command } from './commands';

interface CommandPaletteState {
  open: boolean;
  contextCommands: Record<string, Command[]>;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  registerCommands: (key: string, commands: Command[]) => void;
  unregisterCommands: (key: string) => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  open: false,
  contextCommands: {},
  setOpen: (open) => set({ open }),
  toggle: () => set((state) => ({ open: !state.open })),
  registerCommands: (key, commands) =>
    set((state) => ({
      contextCommands: { ...state.contextCommands, [key]: commands },
    })),
  unregisterCommands: (key) =>
    set((state) => {
      const next = { ...state.contextCommands };
      delete next[key];
      return { contextCommands: next };
    }),
}));
```

- [x] **Step 2: Verificar typecheck**

Run:
```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend/apps/frontend" && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "command-palette.store" | head
```
Expected: sin líneas (sin errores en el archivo).

- [ ] **Step 3: Commit**

```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend" && git add apps/frontend/src/components/command-palette/command-palette.store.ts && git commit -m "feat(command-palette): store zustand con registro de comandos contextuales"
```

---

## Task 4: UI del palette (cmdk) + hotkey + theming

**Files:**
- Create: `postiz-frontend/apps/frontend/src/components/command-palette/command-palette.tsx`

Notas de APIs ya verificadas:
- `useAddProvider()` (`@gitroom/frontend/components/launches/add.provider.component`) devuelve un callback async que abre el modal de conexión.
- `useT()` (`@gitroom/react/translation/get.transation.service.client`).
- `useFetch()` (`@gitroom/helpers/utils/custom.fetch`) — `fetch(path)` devuelve Response.
- Router: `useRouter`, `usePathname` de `next/navigation`.
- Hotkey: `useHotkeys` de `react-hotkeys-hook`.

- [x] **Step 1: Implementar el componente**

```tsx
// command-palette.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Command as Cmdk } from 'cmdk';
import { useHotkeys } from 'react-hotkeys-hook';
import { useRouter, usePathname } from 'next/navigation';
import { useCommandPaletteStore } from './command-palette.store';
import { buildStaticCommands, type Command } from './commands';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useAddProvider } from '@gitroom/frontend/components/launches/add.provider.component';

interface PostResult {
  id: string;
  group: string;
  content: string;
  publishDate: string;
}

export const CommandPalette = () => {
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const toggle = useCommandPaletteStore((s) => s.toggle);
  const contextCommands = useCommandPaletteStore((s) => s.contextCommands);

  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const fetch = useFetch();
  const openAddProvider = useAddProvider();

  const [search, setSearch] = useState('');
  const [postResults, setPostResults] = useState<PostResult[]>([]);

  // ⌘K / Ctrl+K toggles the palette globally.
  useHotkeys(
    'mod+k',
    (e) => {
      e.preventDefault();
      toggle();
    },
    { enableOnFormTags: true, preventDefault: true },
    [toggle]
  );

  const close = useCallback(() => setOpen(false), [setOpen]);

  const staticCommands = useMemo<Command[]>(
    () =>
      buildStaticCommands({
        t,
        pathname: pathname || '',
        router: { push: (href) => router.push(href) },
        close,
        openAddProvider: () => {
          void openAddProvider();
        },
      }),
    [t, pathname, router, close, openAddProvider]
  );

  const ctxCommandList = useMemo<Command[]>(
    () => Object.values(contextCommands).flat(),
    [contextCommands]
  );

  // Reset transient state whenever the palette closes.
  useEffect(() => {
    if (!open) {
      setSearch('');
      setPostResults([]);
    }
  }, [open]);

  // Debounced global post search.
  useEffect(() => {
    if (!open) return;
    const term = search.trim();
    if (term.length < 2) {
      setPostResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/posts/list?search=${encodeURIComponent(term)}&limit=8`
        );
        const data = await res.json();
        setPostResults(Array.isArray(data?.posts) ? data.posts : []);
      } catch {
        setPostResults([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [search, open, fetch]);

  const openPost = useCallback(
    (group: string) => {
      router.push(`/launches?open=${encodeURIComponent(group)}`);
      close();
    },
    [router, close]
  );

  // Group static + contextual commands by their group label.
  const grouped = useMemo(() => {
    const all = [...staticCommands, ...ctxCommandList];
    const map = new Map<string, Command[]>();
    for (const cmd of all) {
      const list = map.get(cmd.group) || [];
      list.push(cmd);
      map.set(cmd.group, list);
    }
    return Array.from(map.entries());
  }, [staticCommands, ctxCommandList]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center bg-black/60 p-[16px] pt-[12vh]"
      onClick={close}
    >
      <Cmdk
        label={t('command_palette', 'Command palette')}
        shouldFilter={true}
        className="w-full max-w-[640px] overflow-hidden rounded-[12px] bg-newBgColor text-textColor shadow-2xl ring-1 ring-newTextColor/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-newTextColor/10 px-[16px]">
          <Cmdk.Input
            autoFocus
            value={search}
            onValueChange={setSearch}
            placeholder={t('command_palette_placeholder', 'Type a command or search…')}
            className="h-[52px] w-full bg-transparent text-[15px] text-textColor outline-none placeholder:text-textColor/40"
          />
        </div>
        <Cmdk.List className="max-h-[60vh] overflow-y-auto p-[8px] scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor">
          <Cmdk.Empty className="px-[12px] py-[16px] text-[13px] text-textColor/50">
            {t('command_palette_empty', 'No results found.')}
          </Cmdk.Empty>

          {grouped.map(([group, cmds]) => (
            <Cmdk.Group
              key={group}
              heading={group}
              className="px-[8px] py-[6px] text-[11px] uppercase tracking-wide text-textColor/40 [&_[cmdk-group-items]]:mt-[4px]"
            >
              {cmds.map((cmd) => (
                <Cmdk.Item
                  key={cmd.id}
                  value={`${cmd.label} ${(cmd.keywords || []).join(' ')}`}
                  onSelect={() => {
                    void cmd.perform();
                  }}
                  className="flex cursor-pointer items-center gap-[10px] rounded-[8px] px-[12px] py-[10px] text-[14px] text-textColor data-[selected=true]:bg-forth data-[selected=true]:text-white"
                >
                  {cmd.label}
                </Cmdk.Item>
              ))}
            </Cmdk.Group>
          ))}

          {postResults.length > 0 && (
            <Cmdk.Group
              heading={t('cmd_group_posts', 'Posts')}
              className="px-[8px] py-[6px] text-[11px] uppercase tracking-wide text-textColor/40"
            >
              {postResults.map((post) => (
                <Cmdk.Item
                  key={post.id}
                  value={`post-${post.id} ${post.content}`}
                  onSelect={() => openPost(post.group)}
                  className="flex cursor-pointer flex-col gap-[2px] rounded-[8px] px-[12px] py-[10px] text-[14px] text-textColor data-[selected=true]:bg-forth data-[selected=true]:text-white"
                >
                  <span className="line-clamp-1">
                    {post.content?.replace(/<[^>]+>/g, '').slice(0, 80) ||
                      t('untitled_post', 'Untitled post')}
                  </span>
                </Cmdk.Item>
              ))}
            </Cmdk.Group>
          )}
        </Cmdk.List>
      </Cmdk>
    </div>
  );
};
```

- [x] **Step 2: Verificar typecheck**

Run:
```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend/apps/frontend" && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "command-palette.tsx" | head
```
Expected: sin líneas. Si aparece error por `enableOnFormTags`/firma de `useHotkeys`, ajustar a la firma instalada de `react-hotkeys-hook` (revisar `apps/frontend/src/components/layout/new-modal.tsx` para ver el uso existente).

- [ ] **Step 3: Commit**

```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend" && git add apps/frontend/src/components/command-palette/command-palette.tsx && git commit -m "feat(command-palette): UI cmdk con hotkey, theming Postiz y búsqueda de posts"
```

---

## Task 5: Botón trigger con hint ⌘K

**Files:**
- Create: `postiz-frontend/apps/frontend/src/components/command-palette/command-palette.button.tsx`

- [x] **Step 1: Implementar el botón**

```tsx
// command-palette.button.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useCommandPaletteStore } from './command-palette.store';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const CommandPaletteButton = () => {
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const t = useT();
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(
      typeof navigator !== 'undefined' &&
        /Mac|iPhone|iPad/.test(navigator.platform)
    );
  }, []);

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={t('open_command_palette', 'Open command palette')}
      className="hidden lg:flex items-center gap-[8px] rounded-[8px] border border-newTextColor/10 bg-newBgColorInner px-[10px] h-[36px] text-textColor/60 hover:text-textColor hover:border-newTextColor/20"
    >
      <Search className="size-4" aria-hidden="true" />
      <span className="text-[13px]">{t('search', 'Search')}</span>
      <span className="ms-[6px] rounded-[5px] border border-newTextColor/15 px-[6px] py-[1px] text-[11px] text-textColor/50">
        {isMac ? '⌘K' : 'Ctrl K'}
      </span>
    </button>
  );
};
```

- [x] **Step 2: Verificar typecheck**

Run:
```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend/apps/frontend" && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "command-palette.button" | head
```
Expected: sin líneas.

- [ ] **Step 3: Commit**

```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend" && git add apps/frontend/src/components/command-palette/command-palette.button.tsx && git commit -m "feat(command-palette): botón trigger con hint ⌘K"
```

---

## Task 6: Montar palette y botón en el layout global

**Files:**
- Modify: `postiz-frontend/apps/frontend/src/components/new-layout/layout.component.tsx`

- [x] **Step 1: Agregar imports**

Cerca del resto de imports (después de la línea `import { useIsMobile } ...`):
```tsx
import { CommandPalette } from '@gitroom/frontend/components/command-palette/command-palette';
import { CommandPaletteButton } from '@gitroom/frontend/components/command-palette/command-palette.button';
```

- [x] **Step 2: Montar `<CommandPalette/>` junto a los otros componentes globales**

En el bloque que ya monta `<ShowMediaBoxModal />`, `<ShowLinkedinCompany />`, etc. (dentro de `<CheckPayment ...>`), agregar:
```tsx
            <ShowMediaBoxModal />
            <ShowLinkedinCompany />
            <MediaSettingsLayout />
            <ShowPostSelector />
            <PreConditionComponent />
            <NewSubscription />
            <ContinueProvider />
            <CommandPalette />
```

- [x] **Step 3: Agregar el botón en la barra superior**

En la barra sticky (`<div className="sticky top-0 z-40 flex bg-newBgColorInner h-[56px] lg:h-[80px] ...">`, alrededor de la línea 198), insertar `<CommandPaletteButton />` antes de `<StreakComponent />`:
```tsx
                            <CommandPaletteButton />
                            <StreakComponent />
```
(Mantener el resto igual. El botón ya trae `hidden lg:flex`, así que no aparece en mobile; el atajo ⌘K sí funciona en cualquier viewport.)

- [x] **Step 4: Verificar typecheck**

Run:
```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend/apps/frontend" && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "layout.component" | head
```
Expected: sin líneas.

- [ ] **Step 5: Verificación manual**

Run:
```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend" && pnpm run dev:frontend
```
En el navegador (logueado): pulsar ⌘K (Mac) / Ctrl+K → abre el palette. Escribir "Analytics" → seleccionar → navega a `/analytics`. Esc → cierra. El botón "Search ⌘K" aparece en la barra superior en desktop.

- [ ] **Step 6: Commit**

```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend" && git add apps/frontend/src/components/new-layout/layout.component.tsx && git commit -m "feat(command-palette): monta palette y botón en el layout global"
```

---

## Task 7: Backend — parámetro `search` en la lista de posts

**Files:**
- Modify: `postiz-backend/libraries/nestjs-libraries/src/dtos/posts/get.posts.list.dto.ts`
- Modify: `postiz-backend/libraries/nestjs-libraries/src/database/prisma/posts/posts.repository.ts:223-276`

- [x] **Step 1: Agregar `search` al DTO**

En `get.posts.list.dto.ts`, dentro de `class GetPostsListDto`, agregar tras el campo `state`:
```ts
  @IsOptional()
  @IsString()
  search?: string;
```
(Verificar que `IsOptional` e `IsString` ya estén importados de `class-validator`; en el archivo ya se usan para `customer`.)

- [x] **Step 2: Aplicar el filtro en el repositorio**

En `posts.repository.ts`, dentro de `getPostsList`, modificar la construcción de `where` para (a) buscar por contenido y (b) no limitar a fechas futuras cuando hay búsqueda.

Reemplazar el bloque del `publishDate` (líneas ~258-262):
```ts
      // Published posts were already posted (publishDate in the past), so fetch
      // all of them; everything else stays upcoming. Ordering handles the rest.
      ...(stateFilter === 'published'
        ? {}
        : { publishDate: { gte: dayjs.utc().toDate() } }),
```
por:
```ts
      // When searching, look across all dates; otherwise keep the upcoming-only
      // window for non-published states.
      ...(query.search
        ? {}
        : stateFilter === 'published'
        ? {}
        : { publishDate: { gte: dayjs.utc().toDate() } }),
      ...(query.search
        ? { content: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
```

- [x] **Step 3: Verificar typecheck del backend**

Run:
```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-backend" && npx tsc --noEmit -p libraries/nestjs-libraries/tsconfig.lib.json 2>&1 | grep -E "posts.repository|get.posts.list" | head
```
Expected: sin líneas. (Si no existe ese tsconfig, usar `npx tsc --noEmit -p tsconfig.json` desde la raíz del backend y filtrar igual.)

- [ ] **Step 4: Verificación manual (curl)**

Con el backend corriendo y un token válido (ver memoria `postiz-scheduling-guide`):
```bash
curl -s "$POSTIZ_API/posts/list?search=hola&limit=5" -H "Authorization: $POSTIZ_TOKEN" | head -c 400
```
Expected: JSON `{ posts: [...], total, page }` con posts cuyo `content` contiene "hola" (case-insensitive).

- [ ] **Step 5: Commit**

```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-backend" && git add libraries/nestjs-libraries/src/dtos/posts/get.posts.list.dto.ts libraries/nestjs-libraries/src/database/prisma/posts/posts.repository.ts && git commit -m "feat(posts): búsqueda por contenido en GET /posts/list"
```

---

## Task 8: Comandos del calendario + manejo de `?create` y `?open`

Registra los comandos contextuales del calendario (vistas, ir a hoy) y procesa los query params `create`/`open` al montar la página del calendario (que viene de otra ruta) o ejecuta acciones directas si ya está montado.

**Files:**
- Create: `postiz-frontend/apps/frontend/src/components/launches/calendar-palette-commands.tsx`
- Modify: `postiz-frontend/apps/frontend/src/components/launches/launches.component.tsx`

Notas verificadas:
- `useCalendar()` expone `setFilters`, `customer`, `integrations`, `sets`, `reloadCalendarView`.
- `setFilters({ startDate, endDate, display, customer })`, `display ∈ 'day'|'week'|'month'|'list'`.
- Crear post: lógica en `new.post.tsx` (`createAPost`) — requiere `integrations`, `sets`, `reloadCalendarView`, `useModals`, `useFetch`, `/posts/find-slot`.
- Abrir grupo: endpoint `GET /posts/group/:group` (existe). El editor se abre con `AddEditModal`.
- `getDateRange(display, referenceDate)` se exporta desde `calendar.context`? Verificar; si no se exporta, replicar el cálculo con `newDayjs()` como en `MonthView`.

- [x] **Step 1: Implementar `calendar-palette-commands.tsx`**

```tsx
// calendar-palette-commands.tsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import { useCommandPaletteStore } from '@gitroom/frontend/components/command-palette/command-palette.store';
import type { Command } from '@gitroom/frontend/components/command-palette/commands';

const VIEWS: Array<{ id: string; display: 'day' | 'week' | 'month' | 'list'; fallback: string }> = [
  { id: 'view-day', display: 'day', fallback: 'Day view' },
  { id: 'view-week', display: 'week', fallback: 'Week view' },
  { id: 'view-month', display: 'month', fallback: 'Month view' },
  { id: 'view-list', display: 'list', fallback: 'List view' },
];

const rangeFor = (display: 'day' | 'week' | 'month' | 'list') => {
  const d = newDayjs();
  if (display === 'day') {
    return { startDate: d.format('YYYY-MM-DD'), endDate: d.format('YYYY-MM-DD') };
  }
  if (display === 'month') {
    return {
      startDate: d.startOf('month').format('YYYY-MM-DD'),
      endDate: d.endOf('month').format('YYYY-MM-DD'),
    };
  }
  // week + list use the iso week window
  return {
    startDate: d.startOf('isoWeek').format('YYYY-MM-DD'),
    endDate: d.endOf('isoWeek').format('YYYY-MM-DD'),
  };
};

export const CalendarPaletteCommands = () => {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fetch = useFetch();
  const modal = useModals();
  const { setFilters, customer, integrations, reloadCalendarView } = useCalendar();
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const registerCommands = useCommandPaletteStore((s) => s.registerCommands);
  const unregisterCommands = useCommandPaletteStore((s) => s.unregisterCommands);
  const processedParam = useRef(false);

  const openCreate = useMemo(
    () => async () => {
      const date = (await (await fetch('/posts/find-slot')).json()).date;
      modal.openModal({
        id: 'add-edit-modal',
        closeOnClickOutside: false,
        removeLayout: true,
        closeOnEscape: false,
        withCloseButton: false,
        askClose: true,
        fullScreen: true,
        classNames: { modal: 'w-[100%] max-w-[1400px] text-textColor' },
        children: (
          <AddEditModal
            allIntegrations={integrations.map((p: any) => ({ ...p }))}
            integrations={integrations}
            mutate={reloadCalendarView}
            date={dayjs.utc(date).local()}
            reopenModal={() => ({})}
          />
        ),
        size: '80%',
        title: ``,
      });
    },
    [integrations, fetch, modal, reloadCalendarView]
  );

  const openGroup = useMemo(
    () => async (group: string) => {
      const posts = await (await fetch(`/posts/group/${group}`)).json();
      const first = Array.isArray(posts) ? posts[0] : posts;
      if (!first) return;
      modal.openModal({
        id: 'add-edit-modal',
        closeOnClickOutside: false,
        removeLayout: true,
        closeOnEscape: false,
        withCloseButton: false,
        askClose: true,
        fullScreen: true,
        classNames: { modal: 'w-[100%] max-w-[1400px] text-textColor' },
        children: (
          <AddEditModal
            allIntegrations={integrations.map((p: any) => ({ ...p }))}
            integrations={integrations}
            mutate={reloadCalendarView}
            date={dayjs.utc(first.publishDate).local()}
            {...{ group }}
            reopenModal={() => ({})}
          />
        ),
        size: '80%',
        title: ``,
      });
    },
    [integrations, fetch, modal, reloadCalendarView]
  );

  // Register calendar-only commands while this page is mounted.
  useEffect(() => {
    const group = t('cmd_group_calendar', 'Calendar view');
    const viewCommands: Command[] = VIEWS.map((v) => ({
      id: v.id,
      group,
      label: t(`cmd_${v.id}`, v.fallback),
      keywords: ['view', 'vista', v.display],
      perform: () => {
        const range = rangeFor(v.display);
        setFilters({ ...range, display: v.display, customer: customer ?? null });
        setOpen(false);
      },
    }));
    viewCommands.push({
      id: 'view-today',
      group,
      label: t('cmd_view_today', 'Go to today'),
      keywords: ['today', 'hoy', 'now'],
      perform: () => {
        const range = rangeFor('day');
        setFilters({ ...range, display: 'day', customer: customer ?? null });
        setOpen(false);
      },
    });
    registerCommands('calendar', viewCommands);
    return () => unregisterCommands('calendar');
  }, [t, setFilters, customer, registerCommands, unregisterCommands, setOpen]);

  // Handle ?create=1 / ?open=<group> coming from the palette on another route.
  useEffect(() => {
    if (processedParam.current) return;
    const create = searchParams.get('create');
    const openParam = searchParams.get('open');
    if (!create && !openParam) return;
    processedParam.current = true;
    // Clean the URL so refresh doesn't re-trigger.
    router.replace('/launches');
    if (create) {
      void openCreate();
    } else if (openParam) {
      void openGroup(openParam);
    }
  }, [searchParams, router, openCreate, openGroup]);

  return null;
};
```

- [x] **Step 2: Montar el componente dentro del provider del calendario**

En `launches.component.tsx`, dentro del JSX que está envuelto por `CalendarWeekProvider` (donde vive `<NewPost />` y el calendario), agregar `<CalendarPaletteCommands />`. Import al inicio:
```tsx
import { CalendarPaletteCommands } from '@gitroom/frontend/components/launches/calendar-palette-commands';
```
Y en el render, justo dentro del árbol del provider (por ejemplo junto al bloque que renderiza el calendario):
```tsx
        <CalendarPaletteCommands />
```
(Debe quedar como descendiente de `CalendarWeekProvider` para que `useCalendar()` funcione. Si el provider está en otro componente padre, montarlo ahí.)

- [x] **Step 3: Verificar typecheck**

Run:
```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend/apps/frontend" && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "calendar-palette-commands|launches.component" | head
```
Expected: sin líneas. Si `AddEditModal` rechaza la prop `group`, revisar su firma en `new-launch/add.edit.modal.tsx` y pasar la prop correcta para precargar un grupo existente (p.ej. `existing`/`postId`); ajustar `openGroup` en consecuencia.

- [ ] **Step 4: Verificación manual**

Con `pnpm run dev:frontend`:
1. En `/analytics`, ⌘K → "Crear post" → navega a `/launches`, abre el modal de creación, y la URL queda limpia (`/launches`).
2. En `/launches`, ⌘K → aparecen "Day/Week/Month/List view" y "Go to today"; seleccionarlas cambia la vista.
3. ⌘K → escribir parte del contenido de un post → aparece en grupo "Posts" → seleccionar → abre ese post en el editor.

- [ ] **Step 5: Commit**

```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend" && git add apps/frontend/src/components/launches/calendar-palette-commands.tsx apps/frontend/src/components/launches/launches.component.tsx && git commit -m "feat(command-palette): comandos de calendario y manejo de create/open por query param"
```

---

## Task 9: Verificación final e integración

- [x] **Step 1: Typecheck completo del frontend**

Run:
```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend/apps/frontend" && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"
```
Expected: `0`.

- [x] **Step 2: Tests unitarios**

Run:
```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend" && npx jest apps/frontend/src/components/command-palette/commands.spec.ts
```
Expected: PASS.

- [ ] **Step 3: Checklist manual de aceptación**

- ⌘K / Ctrl+K abre y cierra (Esc, click backdrop, re-toggle).
- Botón "Search ⌘K" visible en desktop, oculto en mobile.
- Navegación: Calendar, Analytics, Media, Agents, Plugs, Integrations, Billing, Settings, Config IA funcionan.
- Crear post desde dentro y fuera de `/launches`.
- Conectar red social abre el flujo de proveedor.
- Conversación con agente navega a `/agents`.
- Vistas de calendario + "Ir a hoy" solo aparecen en `/launches` y funcionan.
- Buscar posts: resultados aparecen, seleccionar abre el post.
- Tema oscuro y claro: contraste correcto (selección con `forth`).

- [ ] **Step 4: Push a main (ambos repos)**

```bash
cd "/Users/yairchan/Proyectos/Social Media/postiz-frontend" && git push origin main
cd "/Users/yairchan/Proyectos/Social Media/postiz-backend" && git push origin main
```

---

## Notas / riesgos conocidos

- **`AddEditModal` prop para abrir grupo existente:** la forma exacta de precargar un post existente (`group`/`existing`/`postId`) debe confirmarse leyendo `new-launch/add.edit.modal.tsx` en la Task 8; el plan deja el punto marcado.
- **Ruta de "Config IA":** v1 navega a `/settings` (la config vive en `settings/ai-provider.component.tsx`). Si se quiere anclar a la sección, agregar un `id` al componente y usar `/settings#ai-provider`.
- **Sin infra de RTL/jsdom:** sólo se testean unitariamente los builders puros (`commands.spec.ts`); la UI se valida manualmente.
- **`react-hotkeys-hook` firma:** confirmar la firma instalada (ver `new-modal.tsx`); ajustar el `useHotkeys('mod+k', ...)` si difiere.
