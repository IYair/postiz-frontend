'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Command as Cmdk } from 'cmdk';
import { useHotkeys } from 'react-hotkeys-hook';
import { usePathname, useRouter } from 'next/navigation';
import { useAddProvider } from '@gitroom/frontend/components/launches/add.provider.component';
import { useCommandPaletteStore } from '@gitroom/frontend/components/command-palette/command-palette.store';
import {
  buildStaticCommands,
  type Command,
} from '@gitroom/frontend/components/command-palette/commands';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface PostResult {
  id: string;
  group: string;
  content: string;
  publishDate: string;
  childrenPost?: Array<{ content: string }>;
}

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, '');

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

  useHotkeys(
    'mod+k',
    (event) => {
      event.preventDefault();
      toggle();
    },
    { enableOnFormTags: true, preventDefault: true },
    [toggle]
  );

  useHotkeys(
    'Escape',
    () => {
      if (open) setOpen(false);
    },
    [open, setOpen]
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

  useEffect(() => {
    if (!open) {
      setSearch('');
      setPostResults([]);
    }
  }, [open]);

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

  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const cmd of [...staticCommands, ...ctxCommandList]) {
      const list = map.get(cmd.group) || [];
      list.push(cmd);
      map.set(cmd.group, list);
    }
    return Array.from(map.entries());
  }, [staticCommands, ctxCommandList]);

  const getPostLabel = useCallback(
    (post: PostResult) => {
      const term = search.trim().toLowerCase();
      const contents = [
        post.content,
        ...(post.childrenPost || []).map((p) => p.content),
      ];
      const match = contents.find((content) =>
        stripHtml(content || '').toLowerCase().includes(term)
      );
      return stripHtml(match || post.content || '').slice(0, 120);
    },
    [search]
  );

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
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-newTextColor/10 px-[16px]">
          <Cmdk.Input
            autoFocus
            value={search}
            onValueChange={setSearch}
            placeholder={t(
              'command_palette_placeholder',
              'Type a command or search...'
            )}
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
                  className="flex cursor-pointer items-center gap-[10px] rounded-[8px] px-[12px] py-[10px] text-[14px] normal-case text-textColor data-[selected=true]:bg-forth data-[selected=true]:text-white"
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
                  value={`post-${post.id} ${post.content} ${(post.childrenPost || [])
                    .map((child) => child.content)
                    .join(' ')}`}
                  onSelect={() => openPost(post.group)}
                  className="flex cursor-pointer flex-col gap-[2px] rounded-[8px] px-[12px] py-[10px] text-[14px] normal-case text-textColor data-[selected=true]:bg-forth data-[selected=true]:text-white"
                >
                  <span className="line-clamp-1">
                    {getPostLabel(post) || t('untitled_post', 'Untitled post')}
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
