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
  {
    id: 'nav-calendar',
    fallback: 'Calendar',
    href: '/launches',
    keywords: ['calendar', 'launches', 'calendario', 'posts'],
  },
  {
    id: 'nav-analytics',
    fallback: 'Analytics',
    href: '/analytics',
    keywords: ['analytics', 'stats', 'estadisticas'],
  },
  {
    id: 'nav-media',
    fallback: 'Media',
    href: '/media',
    keywords: ['media', 'medios', 'images', 'videos'],
  },
  {
    id: 'nav-agents',
    fallback: 'Agents',
    href: '/agents',
    keywords: ['agent', 'agente', 'ai', 'chat'],
  },
  {
    id: 'nav-plugs',
    fallback: 'Plugs',
    href: '/plugs',
    keywords: ['plugs', 'automation'],
  },
  {
    id: 'nav-integrations',
    fallback: 'Integrations',
    href: '/third-party',
    keywords: ['integrations', 'integraciones', 'apps'],
  },
  {
    id: 'nav-billing',
    fallback: 'Billing',
    href: '/billing',
    keywords: ['billing', 'facturacion', 'subscription'],
  },
  {
    id: 'nav-settings',
    fallback: 'Settings',
    href: '/settings',
    keywords: ['settings', 'configuracion', 'ajustes'],
  },
  {
    id: 'nav-ai-provider',
    fallback: 'AI provider settings',
    href: '/settings',
    keywords: ['ai', 'provider', 'proveedor', 'openai', 'claude', 'gemini', 'modelo'],
  },
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
