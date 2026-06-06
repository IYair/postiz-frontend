'use client';

import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import { useClickAway } from '@uidotdev/usehooks';
import ReactLoading from '@gitroom/frontend/components/layout/loading';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Transition } from '@headlessui/react';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';

type Notification = {
  createdAt: string;
  content: string;
  link?: string | null;
  image?: string | null;
};

const urlRegex =
  /(\bhttps?:\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;

const getNotificationLink = (notification: Notification) => {
  return notification.link || notification.content.match(urlRegex)?.[0];
};

const getNotificationContent = (notification: Notification) => {
  return notification.content
    .replace(urlRegex, '')
    .replace(/\s+at\s*$/i, '')
    .trim();
};

export const ShowNotification: FC<{
  notification: Notification;
  lastReadNotification: string;
}> = (props) => {
  const { notification } = props;
  const t = useT();
  const mediaDirectory = useMediaDirectory();
  const [newNotification] = useState(
    new Date(notification.createdAt) > new Date(props.lastReadNotification)
  );
  const link = getNotificationLink(notification);
  const content = getNotificationContent(notification);
  const image = notification.image?.includes('.mp4')
    ? undefined
    : notification.image;

  return (
    <Transition show={true} appear={true}>
      <div
        className={clsx(
          'pointer-events-auto flex w-full rounded-lg bg-gray-800 shadow-lg outline outline-1 -outline-offset-1 outline-white/10 transition data-[closed]:data-[enter]:translate-y-2 data-[enter]:transform data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-100 data-[enter]:ease-out data-[leave]:ease-in data-[closed]:data-[enter]:sm:translate-x-2 data-[closed]:data-[enter]:sm:translate-y-0',
          newNotification && 'animate-newMessages'
        )}
      >
        <div className="w-0 flex-1 p-4">
          <div className="flex items-start">
            <div className="shrink-0 pt-0.5">
              {image ? (
                <img
                  alt=""
                  src={mediaDirectory.set(image)}
                  className="size-10 rounded-full bg-gray-800 object-cover outline outline-1 -outline-offset-1 outline-white/10"
                />
              ) : (
                <div className="size-10 rounded-full bg-seventh outline outline-1 -outline-offset-1 outline-white/10" />
              )}
            </div>
            <div className="ml-3 w-0 flex-1">
              <p
                className={clsx(
                  'text-sm font-medium text-white',
                  newNotification && 'font-bold'
                )}
              >
                {t('notification_update', 'Notification')}
              </p>
              <p className="mt-1 line-clamp-3 text-sm text-gray-400">
                {content || notification.content}
              </p>
            </div>
          </div>
        </div>
        {link && (
          <div className="flex border-l border-white/10">
            <button
              type="button"
              onClick={() => window.open(link, '_blank', 'noopener,noreferrer')}
              className="flex w-full items-center justify-center rounded-none rounded-r-lg p-4 text-sm font-medium text-indigo-400 hover:text-indigo-300 focus:outline focus:outline-2 focus:outline-indigo-400"
            >
              {t('open', 'Open')}
            </button>
          </div>
        )}
      </div>
    </Transition>
  );
};
export const NotificationOpenComponent = () => {
  const fetch = useFetch();
  const loadNotifications = useCallback(async () => {
    return await (await fetch('/notifications/list')).json();
  }, []);
  const t = useT();

  const { data, isLoading } = useSWR('notifications', loadNotifications);
  return (
    <div
      id="notification-popup"
      className="opacity-0 animate-normalFadeDown mt-[10px] absolute w-[420px] min-h-[200px] top-[100%] end-0 bg-third text-textColor rounded-[16px] flex flex-col border border-tableBorder z-[600]"
    >
      <div
        className={`p-[16px] border-b border-tableBorder font-bold`}
      >
        {t('notifications', 'Notifications')}
      </div>

      <div
        aria-live="assertive"
        className="pointer-events-none flex max-h-[70vh] flex-col space-y-4 overflow-y-auto p-[16px]"
      >
        {isLoading && (
          <div className="flex-1 flex justify-center pt-12">
            <ReactLoading type="spin" color="#fff" width={36} height={36} />
          </div>
        )}
        {!isLoading && !data.notifications.length && (
          <div className="text-center p-[16px] text-textColor flex-1 flex justify-center items-center mt-[20px]">
            {t('no_notifications', 'No notifications')}
          </div>
        )}
        {!isLoading &&
          data.notifications.map(
            (notification: Notification, index: number) => (
              <ShowNotification
                notification={notification}
                lastReadNotification={data.lastReadNotifications}
                key={`notifications_${index}`}
              />
            )
          )}
      </div>
    </div>
  );
};
const NotificationComponent = () => {
  const fetch = useFetch();
  const [show, setShow] = useState(false);
  const loadNotifications = useCallback(async () => {
    return await (await fetch('/notifications')).json();
  }, []);
  const { data, mutate } = useSWR('notifications-list', loadNotifications);
  const changeShow = useCallback(() => {
    mutate(
      {
        ...data,
        total: 0,
      },
      {
        revalidate: false,
      }
    );
    setShow(!show);
  }, [show, data]);
  const ref = useClickAway<HTMLDivElement>(() => setShow(false));
  return (
    <div className="relative cursor-pointer select-none" ref={ref}>
      <div onClick={changeShow}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className="hover:text-newTextColor"
        >
          <path
            d="M14 21H10M18 8C18 6.4087 17.3679 4.88258 16.2427 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.8826 2.63214 7.75738 3.75736C6.63216 4.88258 6.00002 6.4087 6.00002 8C6.00002 11.0902 5.22049 13.206 4.34968 14.6054C3.61515 15.7859 3.24788 16.3761 3.26134 16.5408C3.27626 16.7231 3.31488 16.7926 3.46179 16.9016C3.59448 17 4.19261 17 5.38887 17H18.6112C19.8074 17 20.4056 17 20.5382 16.9016C20.6852 16.7926 20.7238 16.7231 20.7387 16.5408C20.7522 16.3761 20.3849 15.7859 19.6504 14.6054C18.7795 13.206 18 11.0902 18 8Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {data && data.total > 0 && (
            <circle
              cx="17.0625"
              cy="5"
              r="4"
              fill="#FF3EA2"
              stroke="#1A1919"
              strokeWidth="2"
            />
          )}
        </svg>
      </div>
      {show && <NotificationOpenComponent />}
    </div>
  );
};
export default NotificationComponent;
