import { buildActionCommands, buildNavigationCommands } from './commands';

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
