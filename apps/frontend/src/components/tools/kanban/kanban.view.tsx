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
    <div className="flex flex-col gap-[12px]">
      {transition.requiresDate && (
        <input
          type="datetime-local"
          className="bg-newColColor rounded-[8px] p-[12px] text-textColor"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      )}
      <Button onClick={save} disabled={isSaving}>
        {transition.submitLabel}
      </Button>
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
      className="flex-1 min-w-[280px] bg-newBgColorInner rounded-[12px] p-[12px] flex flex-col gap-[10px] max-h-[calc(100vh-190px)]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      aria-label={`${column.label} column`}
    >
      <div className="font-bold text-[14px] flex justify-between items-center">
        <span>{column.label}</span>
        <span className="opacity-50">{total || ''}</span>
      </div>
      <button
        onClick={openCreate}
        className="border border-dashed border-newTextColor/20 rounded-[10px] min-h-[58px] text-newTextColor/60 hover:text-white hover:border-[#612BD3] hover:bg-[#612BD3]/10 transition-colors flex flex-col items-center justify-center gap-[2px]"
        title={column.state === 'error' ? 'Create draft to fix' : `Create ${column.label}`}
      >
        <span className="text-[24px] leading-[20px]">+</span>
        <span className="text-[12px]">
          {column.state === 'error' ? 'Create draft' : `Create ${column.label}`}
        </span>
      </button>
      <div className="flex flex-col gap-[8px] overflow-y-auto scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner pe-[2px]">
        {loadedPosts.map((post) => {
          const transitions = KANBAN_COLUMNS.map((c) => ({
            column: c,
            transition: getKanbanTransition(post.state, c.state),
          })).filter(
            ({ transition }) =>
              transition.kind !== 'invalid' && transition.kind !== 'noop'
          );

          return (
            <div
              key={post.id}
              draggable={canDragPost(post.state)}
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
                'bg-newColColor rounded-[10px] p-[12px] text-[13px] flex flex-col gap-[8px] border border-newTextColor/5 ' +
                (canDragPost(post.state) ? 'cursor-grab' : 'cursor-default')
              }
            >
              <div className="flex items-center gap-[8px] min-w-0">
                {post.integration?.picture && (
                  <img
                    src={post.integration.picture}
                    className="w-[22px] h-[22px] rounded-full shrink-0"
                    alt=""
                  />
                )}
                <span className="opacity-80 truncate">{post.integration?.name}</span>
              </div>
              <div className="line-clamp-4 leading-[1.45] text-[13px]">
                {(post.content || '').replace(/<[^>]+>/g, ' ').trim() || 'No content'}
              </div>
              <div className="flex justify-between gap-[8px] opacity-55 text-[12px]">
                <span>{post.state}</span>
                <span>{dayjs.utc(post.publishDate).local().format('DD MMM YYYY HH:mm')}</span>
              </div>
              {transitions.length > 0 && (
                <div className="flex flex-wrap gap-[6px] pt-[4px]">
                  {transitions.map(({ column: targetColumn, transition }) => (
                    <Button
                      key={targetColumn.state}
                      className="text-[11px] py-[4px] px-[8px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        openTransition(post, targetColumn.state);
                      }}
                    >
                      {transition.submitLabel}
                    </Button>
                  ))}
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
    <div className="flex gap-[12px] items-start overflow-x-auto p-[4px]">
      {KANBAN_COLUMNS.map((c) => (
        <Column key={c.state} column={c} />
      ))}
    </div>
  );
};
