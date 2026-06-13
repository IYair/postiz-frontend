'use client';

import { DragEvent, FC, KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import { ExistingDataContextProvider } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import {
  KANBAN_COLUMNS,
  canDragPost,
  getKanbanTransition,
  getDefaultScheduleDate,
  KanbanTransition,
} from './kanban.helpers';
import { expandPostsList } from '@gitroom/helpers/utils/posts.list.minify';

dayjs.extend(utc);

const PAGE_SIZE = 20;

const COLUMN_DESCRIPTIONS: Record<string, string> = {
  draft: 'Ideas and posts being edited',
  scheduled: 'Waiting for publish time',
  published: 'Already sent to channels',
  error: 'Needs attention or retry',
};

const STATE_BADGES: Record<string, string> = {
  DRAFT: 'Draft',
  QUEUE: 'Scheduled',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  ERROR: 'Error',
};

const SOCIAL_LABELS: Record<string, string> = {
  x: 'X',
  twitter: 'X',
  linkedin: 'in',
  facebook: 'f',
  instagram: 'ig',
  threads: '@',
  youtube: 'YT',
  tiktok: 'TT',
  pinterest: 'p',
  reddit: 'r',
  bluesky: 'b',
  mastodon: 'm',
};

const getSocialLabel = (post: any): string => {
  const values = [
    post?.integration?.providerIdentifier,
    post?.integration?.provider,
    post?.integration?.identifier,
    post?.integration?.type,
    post?.integration?.name,
  ];

  const value = values
    .find((item) => typeof item === 'string' && item.trim())
    ?.toLowerCase();

  if (!value) return '';

  const key = Object.keys(SOCIAL_LABELS).find((item) => value.includes(item));
  return key ? SOCIAL_LABELS[key] : '';
};

const getPlainContent = (content?: string): string =>
  (content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ||
  'No content';

const TransitionModal: FC<{
  group: string;
  post: any;
  transition: KanbanTransition;
  onDone: () => void;
  close: () => void;
}> = ({ group, post, transition, onDone, close }) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const [value, setValue] = useState(
    transition.requiresDate
      ? dayjs(getDefaultScheduleDate(post)).format('YYYY-MM-DDTHH:mm')
      : ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(async () => {
    if (transition.requiresDate) {
      const chosen = dayjs(value);
      if (!chosen.isValid() || chosen.isBefore(dayjs())) {
        toaster.show('Please choose a future date', 'warning');
        return;
      }
    }

    setIsSaving(true);
    try {
      const body: any = {
        target: transition.target,
      };
      if (transition.requiresDate) {
        body.date = dayjs(value).utc().format('YYYY-MM-DDTHH:mm:ss');
      }

      const response = await fetch(`/posts/group/${group}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to update status');
      }

      toaster.show(transition.title, 'success');
      onDone();
      close();
    } catch (err) {
      toaster.show(
        typeof err === 'string' ? err : 'Failed to update status',
        'warning'
      );
    } finally {
      setIsSaving(false);
    }
  }, [group, transition, value, fetch, onDone, close, toaster]);

  return (
    <div className="flex flex-col gap-[18px] text-textColor">
      <div className="flex flex-col gap-[6px]">
        <div className="text-[18px] font-[700]">{transition.title}</div>
        <div className="text-[14px] leading-[1.5] text-newTextColor/70">
          {transition.description}
        </div>
      </div>
      {transition.requiresDate && (
        <label className="flex flex-col gap-[8px] text-[13px] text-newTextColor/70">
          Publish date
          <input
            type="datetime-local"
            className="h-[44px] bg-newColColor rounded-[8px] px-[12px] text-textColor outline-none border border-newTextColor/10 focus:border-[#612BD3]"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
      )}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-[10px]">
        <button
          type="button"
          onClick={close}
          className="h-[40px] px-[18px] rounded-[8px] bg-newColColor text-textColor border border-newTextColor/10 hover:border-newTextColor/20"
        >
          Cancel
        </button>
        <Button onClick={save} loading={isSaving} className="rounded-[8px]">
          {transition.submitLabel}
        </Button>
      </div>
    </div>
  );
};

export const Column: FC<{ column: (typeof KANBAN_COLUMNS)[number] }> = ({ column }) => {
  const fetch = useFetch();
  const modals = useModals();
  const toaster = useToaster();
  const { integrations, reloadCalendarView } = useCalendar();

  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);

  const { data, mutate, isLoading } = useSWR(
    `/posts/list?state=${column.state}&limit=${PAGE_SIZE}&page=${page}&allDates=true&refresh=${refresh}`,
    async (url: string) => expandPostsList(await (await fetch(url)).json()),
    { revalidateOnFocus: false }
  );

  const [loadedPosts, setLoadedPosts] = useState<any[]>(data?.posts || []);

  const total: number = data?.total ?? 0;
  const hasMore: boolean = data?.hasMore ?? false;
  const isInitialLoading = isLoading && !loadedPosts.length;

  useEffect(() => {
    if (!data?.posts) return;
    setLoadedPosts((current) => {
      const next = page === 0 ? data.posts : [...current, ...data.posts];
      return Array.from(new Map(next.map((post: any) => [post.id, post])).values());
    });
  }, [data?.posts, page]);

  const refreshColumn = useCallback(() => {
    setLoadedPosts([]);
    setPage(0);
    setRefresh((value) => value + 1);
    mutate();
    reloadCalendarView();
  }, [mutate, reloadCalendarView]);

  const createAction = useMemo<'draft' | 'schedule' | 'now'>(() => {
    if (column.state === 'scheduled') return 'schedule';
    if (column.state === 'published') return 'now';
    return 'draft';
  }, [column.state]);

  const createDate = useMemo(() => {
    if (column.state === 'scheduled') return dayjs().add(1, 'hour');
    return dayjs();
  }, [column.state]);

  const openCreate = useCallback(() => {
    modals.openModal({
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
          allIntegrations={integrations.map((p) => ({ ...p }))}
          integrations={integrations.slice(0).map((p) => ({ ...p }))}
          mutate={refreshColumn}
          date={createDate}
          forcedPostAction={createAction}
          reopenModal={() => ({})}
        />
      ),
      size: '80%',
    });
  }, [createAction, createDate, integrations, modals, refreshColumn]);

  const openEdit = useCallback(
    async (post: any) => {
      try {
        const data = await (await fetch(`/posts/group/${post.group}`)).json();
        const publishDate = dayjs.utc(data.posts[0]?.publishDate).local();

        modals.openModal({
          id: 'add-edit-modal',
          closeOnClickOutside: false,
          removeLayout: true,
          closeOnEscape: false,
          withCloseButton: false,
          askClose: true,
          fullScreen: true,
          classNames: { modal: 'w-[100%] max-w-[1400px] text-textColor' },
          children: (
            <ExistingDataContextProvider value={data}>
              <AddEditModal
                allIntegrations={integrations.map((p) => ({ ...p }))}
                integrations={integrations
                  .slice(0)
                  .filter((f) => f.id === data.integration)
                  .map((p) => ({
                    ...p,
                    picture: data.integrationPicture,
                  }))}
                mutate={refreshColumn}
                date={publishDate}
                reopenModal={() => openEdit(post)}
              />
            </ExistingDataContextProvider>
          ),
          size: '80%',
        });
      } catch (err) {
        toaster.show(
          typeof err === 'string' ? err : 'Failed to load post for editing',
          'warning'
        );
      }
    },
    [fetch, integrations, modals, refreshColumn, toaster]
  );

  const openTransition = useCallback(
    (post: any, targetColumn: string) => {
      const transition = getKanbanTransition(post.state, targetColumn as any);
      if (transition.kind === 'invalid') {
        toaster.show(transition.description || 'Move not allowed', 'warning');
        return;
      }
      if (transition.kind === 'noop') {
        return;
      }
      modals.openModal({
        title: transition.title,
        withCloseButton: true,
        children: (close: () => void) => (
          <TransitionModal
            group={post.group}
            post={post}
            transition={transition}
            onDone={refreshColumn}
            close={close}
          />
        ),
      });
    },
    [modals, refreshColumn, toaster]
  );

  const onCardKeyDown = useCallback(
    (post: any) => (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openEdit(post);
      }
    },
    [openEdit]
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      let post: any;
      try {
        post = JSON.parse(raw);
      } catch {
        return;
      }
      if (!post?.group || !post?.state) return;
      openTransition(post, column.state);
    },
    [column.state, openTransition]
  );

  return (
    <div
      className="group/column flex-1 min-w-[300px] sm:min-w-[320px] bg-newBgColorInner rounded-[14px] p-[12px] flex flex-col gap-[12px] max-h-[calc(100vh-180px)] border border-newTextColor/5 transition-colors hover:border-newTextColor/10"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      aria-label={`${column.label} column`}
    >
      <div className="flex justify-between items-start gap-[10px]">
        <div className="flex flex-col gap-[2px] min-w-0">
          <span className="font-bold text-[15px] text-textColor">{column.label}</span>
          <span className="text-[12px] leading-[1.35] text-newTextColor/55 truncate">
            {COLUMN_DESCRIPTIONS[column.state]}
          </span>
        </div>
        <span className="min-w-[28px] h-[24px] px-[8px] rounded-full bg-newColColor border border-newTextColor/10 text-[12px] text-newTextColor/70 flex items-center justify-center">
          {total || 0}
        </span>
      </div>
      <button
        onClick={openCreate}
        className="border border-dashed border-newTextColor/15 rounded-[12px] min-h-[64px] text-newTextColor/60 hover:text-white hover:border-[#612BD3] hover:bg-[#612BD3]/10 focus:outline-none focus:border-[#612BD3] transition-colors flex flex-col items-center justify-center gap-[4px]"
        title={column.state === 'error' ? 'Create draft to fix' : `Create ${column.label}`}
      >
        <span className="text-[24px] leading-[20px]">+</span>
        <span className="text-[12px]">
          {column.state === 'error' ? 'Create draft' : `Create ${column.label}`}
        </span>
      </button>
      <div className="flex flex-col gap-[8px] overflow-y-auto scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner pe-[2px]">
        {loadedPosts.map((post) => {
          const socialLabel = getSocialLabel(post);
          const stateLabel = STATE_BADGES[post.state] || post.state;
          const canDrag = canDragPost(post.state);

          return (
            <div
              key={post.id}
              draggable={canDrag}
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  'application/json',
                  JSON.stringify({
                    group: post.group,
                    state: post.state,
                    publishDate: post.publishDate,
                  })
                );
              }}
              onClick={() => openEdit(post)}
              onKeyDown={onCardKeyDown(post)}
              tabIndex={0}
              role="button"
              aria-label={`Post by ${post.integration?.name || 'unknown'} in ${post.state} state`}
              className={
                'group/card bg-newColColor rounded-[12px] p-[12px] text-[13px] flex flex-col gap-[10px] border border-newTextColor/5 transition-all outline-none hover:border-[#612BD3]/40 hover:bg-newTextColor/[0.03] focus:border-[#612BD3] focus:ring-1 focus:ring-[#612BD3]/60 ' +
                (canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer')
              }
            >
              <div className="flex items-center justify-between gap-[10px] min-w-0">
                <div className="flex items-center gap-[9px] min-w-0">
                  <div className="relative w-[28px] h-[28px] shrink-0">
                    {post.integration?.picture ? (
                      <img
                        src={post.integration.picture}
                        className="w-[28px] h-[28px] rounded-full object-cover border border-newTextColor/10"
                        alt=""
                      />
                    ) : (
                      <div className="w-[28px] h-[28px] rounded-full bg-newBgColorInner border border-newTextColor/10" />
                    )}
                    {socialLabel && (
                      <span
                        className="absolute -bottom-[3px] -end-[3px] min-w-[15px] h-[15px] px-[3px] rounded-full bg-newBgColorInner border border-newTextColor/15 text-[8px] font-[800] leading-none text-white flex items-center justify-center"
                        aria-label={`Social network ${socialLabel}`}
                      >
                        {socialLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-[600] text-textColor truncate">
                      {post.integration?.name || 'Unknown channel'}
                    </span>
                    <span className="text-[11px] text-newTextColor/45">
                      {canDrag ? 'Drag to move' : 'Published'}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-newTextColor/10 bg-newBgColorInner px-[8px] py-[3px] text-[11px] text-newTextColor/70">
                  {stateLabel}
                </span>
              </div>
              <div className="line-clamp-4 leading-[1.5] text-[13px] text-textColor/90">
                {getPlainContent(post.content)}
              </div>
              {post.publishDate && (
                <div className="flex items-center justify-between gap-[8px] border-t border-newTextColor/5 pt-[9px] text-[12px] text-newTextColor/55">
                  <span>{post.state === 'PUBLISHED' ? 'Published' : 'Publish date'}</span>
                  <span>{dayjs.utc(post.publishDate).local().format('DD MMM YYYY HH:mm')}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {hasMore && (
        <Button onClick={() => setPage((value) => value + 1)}>
          Load more
        </Button>
      )}
      {isInitialLoading && (
        <div className="rounded-[10px] border border-newTextColor/5 p-[16px] text-[13px] text-newTextColor/50 text-center">
          Loading...
        </div>
      )}
      {!isInitialLoading && !loadedPosts.length && !hasMore && (
        <div className="rounded-[10px] border border-newTextColor/5 p-[16px] text-[13px] text-newTextColor/50 text-center">
          No posts yet
        </div>
      )}
    </div>
  );
};

export const KanbanView: FC = () => {
  useCalendar();
  return (
    <div className="flex gap-[14px] items-start overflow-x-auto p-[4px] pb-[10px] scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner">
      {KANBAN_COLUMNS.map((c) => (
        <Column key={c.state} column={c} />
      ))}
    </div>
  );
};
