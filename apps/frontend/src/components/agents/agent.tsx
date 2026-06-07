'use client';

import React, {
  createContext,
  FC,
  useCallback,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import clsx from 'clsx';
import useCookie from 'react-use-cookie';
import useSWR from 'swr';
import { orderBy } from 'lodash';
import { SVGLine } from '@gitroom/frontend/components/launches/launches.component';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useWaitForClass } from '@gitroom/helpers/utils/use.wait.for.class';
import { MultiMediaComponent } from '@gitroom/frontend/components/media/media.component';
import { Integration } from '@prisma/client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const MediaPortal: FC<{
  media: { path: string; id: string }[];
  value: string;
  setMedia: (event: {
    target: {
      name: string;
      value?: {
        id: string;
        path: string;
        alt?: string;
        thumbnail?: string;
        thumbnailTimestamp?: number;
      }[];
    };
  }) => void;
}> = ({ media, setMedia, value }) => {
  const waitForClass = useWaitForClass('copilotKitMessages');
  const t = useT();
  if (!waitForClass) return null;
  return (
    <div className="agent-media-portal whitespace-nowrap editor rm-bg">
      <MultiMediaComponent
        allData={[{ content: value }]}
        text={value}
        label={t('attachments', 'Attachments')}
        description=""
        value={media}
        dummy={false}
        name="image"
        onChange={setMedia}
        onOpen={() => {}}
        onClose={() => {}}
      />
    </div>
  );
};

export const AgentList: FC<{ onChange: (arr: any[]) => void }> = ({
  onChange,
}) => {
  const fetch = useFetch();
  const t = useT();
  const [selected, setSelected] = useState<Integration[]>([]);

  const load = useCallback(async () => {
    return (await (await fetch('/integrations/list')).json()).integrations;
  }, []);

  const [collapseMenu, setCollapseMenu] = useCookie('collapseMenu', '0');

  const { data } = useSWR('integrations', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    fallbackData: [],
  });

  const setIntegration = useCallback(
    (integration: Integration) => () => {
      if (selected.some((p) => p.id === integration.id)) {
        onChange(selected.filter((p) => p.id !== integration.id));
        setSelected(selected.filter((p) => p.id !== integration.id));
      } else {
        onChange([...selected, integration]);
        setSelected([...selected, integration]);
      }
    },
    [selected]
  );

  const sortedIntegrations = useMemo(() => {
    return orderBy(
      data || [],
      ['type', 'disabled', 'identifier'],
      ['desc', 'asc', 'asc']
    );
  }, [data]);

  return (
    <aside
      className={clsx(
        'agent-panel agent-channels trz hidden lg:flex flex-col transition-all relative',
        collapseMenu === '1' ? 'group sidebar w-[88px]' : 'w-[280px]'
      )}
    >
      <div className="absolute top-0 start-0 w-full h-full p-[14px] overflow-auto scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor">
        <div className="agent-panel-tabs group-[.sidebar]:justify-center">
          <div className="agent-panel-tab agent-panel-tab-active group-[.sidebar]:w-[42px] group-[.sidebar]:px-0 group-[.sidebar]:justify-center">
            <span className="agent-panel-tab-dot" />
            <span className="group-[.sidebar]:hidden">Chat</span>
          </div>
          <div className="agent-panel-tab group-[.sidebar]:hidden">
            {t('channels', 'Channels')}
          </div>
        </div>
        <div className="flex items-center mt-[20px] mb-[14px]">
          <div className="group-[.sidebar]:hidden flex-1">
            <h2 className="text-[13px] uppercase tracking-[0.18em] text-textItemBlur font-[600]">
              {t('select_channels', 'Select Channels')}
            </h2>
            <div className="text-[12px] text-textItemBlur/80 mt-[4px]">
              {selected.length
                ? `${selected.length} ${t('selected', 'selected')}`
                : t('choose_context_for_agent', 'Choose agent context')}
            </div>
          </div>
          <div
            onClick={() => setCollapseMenu(collapseMenu === '1' ? '0' : '1')}
            className="agent-collapse-button group-[.sidebar]:rotate-[180deg] group-[.sidebar]:mx-auto"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="7"
              height="13"
              viewBox="0 0 7 13"
              fill="none"
            >
              <path
                d="M6 11.5L1 6.5L6 1.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <div className={clsx('flex flex-col gap-[6px]')}>
          {sortedIntegrations.map((integration) => (
            <div
              onClick={setIntegration(integration)}
              key={integration.id}
              className={clsx(
                'agent-channel-row flex gap-[12px] items-center group/profile justify-center cursor-pointer',
                selected.some((p) => p.id === integration.id) &&
                  'agent-channel-row-active',
                !selected.some((p) => p.id === integration.id) &&
                  'agent-channel-row-muted'
              )}
            >
              <div
                className={clsx(
                  'relative rounded-full flex justify-center items-center gap-[6px]',
                  integration.disabled && 'opacity-50'
                )}
              >
                {(integration.inBetweenSteps || integration.refreshNeeded) && (
                  <div className="absolute start-0 top-0 w-[39px] h-[46px] cursor-pointer">
                    <div className="bg-red-500 w-[15px] h-[15px] rounded-full start-0 -top-[5px] absolute z-[200] text-[10px] flex justify-center items-center">
                      !
                    </div>
                    <div className="bg-primary/60 w-[39px] h-[46px] start-0 top-0 absolute rounded-full z-[199]" />
                  </div>
                )}
                <div className="agent-channel-line h-full w-[4px] -ms-[12px] rounded-s-[3px] opacity-0 group-hover/profile:opacity-100 transition-opacity">
                  <SVGLine />
                </div>
                <ImageWithFallback
                  fallbackSrc={`/icons/platforms/${integration.identifier}.png`}
                  src={integration.picture}
                  className="rounded-[10px]"
                  alt={integration.identifier}
                  width={36}
                  height={36}
                />
                <SafeImage
                  src={`/icons/platforms/${integration.identifier}.png`}
                  className="rounded-[7px] absolute z-10 bottom-[3px] -end-[5px] border border-fifth"
                  alt={integration.identifier}
                  width={18.41}
                  height={18.41}
                />
              </div>
              <div
                className={clsx(
                  'flex-1 whitespace-nowrap text-ellipsis overflow-hidden group-[.sidebar]:hidden text-[14px]',
                  integration.disabled && 'opacity-50'
                )}
              >
                {integration.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export const PropertiesContext = createContext<{ properties: any[] }>({
  properties: [],
});
export const Agent: FC<{ children: ReactNode }> = ({ children }) => {
  const [properties, setProperties] = useState<any[]>([]);

  return (
    <PropertiesContext.Provider value={{ properties }}>
      <div className="agent-shell flex flex-1 min-w-0 w-full">
        <AgentList onChange={setProperties} />
        <div className="agent-stage flex flex-1 min-w-0">{children}</div>
        <Threads />
      </div>
    </PropertiesContext.Provider>
  );
};

const Threads: FC = () => {
  const fetch = useFetch();
  const t = useT();
  const threads = useCallback(async () => {
    return (await fetch('/copilot/list')).json();
  }, []);
  const { id } = useParams<{ id: string }>();

  const { data } = useSWR('threads', threads);

  return (
    <aside className="agent-panel agent-threads trz hidden xl:flex flex-col gap-[15px] transition-all relative w-[280px]">
      <div className="absolute top-0 start-0 w-full h-full p-[14px] overflow-auto scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor">
        <div className="agent-recents-header">
          <span>{t('recents', 'Recents')}</span>
        </div>
        <div className="mb-[16px] justify-center flex group-[.sidebar]:pb-[15px]">
          <Link
            href={`/agents`}
            className="agent-new-chat text-white whitespace-nowrap flex-1 group-[.sidebar]:p-0 min-h-[44px] max-h-[44px] flex justify-center items-center gap-[8px] outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="21"
              height="20"
              viewBox="0 0 21 20"
              fill="none"
              className="min-w-[21px] min-h-[20px]"
            >
              <path
                d="M10.5001 4.16699V15.8337M4.66675 10.0003H16.3334"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex-1 text-start text-[14px] group-[.sidebar]:hidden">
              {t('start_a_new_chat', 'Start a new chat')}
            </div>
          </Link>
        </div>
        <div className="flex flex-col gap-[2px]">
          {data?.threads?.map((p: any) => (
            <Link
              className={clsx(
                'agent-thread-link overflow-ellipsis overflow-hidden whitespace-nowrap cursor-pointer',
                p.id === id && 'agent-thread-link-active'
              )}
              href={`/agents/${p.id}`}
              key={p.id}
            >
              {p.title}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
};
