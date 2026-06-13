import { describe, expect, it } from 'vitest';
import {
  getNotificationTone,
  getNotificationVisual,
  notificationPopupClassName,
} from '../notification.component';

describe('notification popup layout', () => {
  it('keeps the dropdown inside narrow mobile viewports', () => {
    expect(notificationPopupClassName).toContain('w-[calc(100vw-32px)]');
    expect(notificationPopupClassName).toContain('max-w-[420px]');
    expect(notificationPopupClassName).toContain('sm:w-[420px]');
  });
});

describe('notification visual fallback', () => {
  it('infers error notifications from failure copy', () => {
    const notification = {
      createdAt: '2026-06-13T00:00:00.000Z',
      content: 'An error occurred while posting on facebook: Unknown Error',
    };

    expect(getNotificationTone(notification)).toBe('fail');
    expect(getNotificationVisual(notification, false)).toMatchObject({
      label: '!',
      title: 'Error',
    });
  });

  it('infers action-required notifications from reconnect copy', () => {
    const notification = {
      createdAt: '2026-06-13T00:00:00.000Z',
      content:
        'Could not refresh your facebook channel. Please go back to the system and connect it again',
    };

    expect(getNotificationTone(notification)).toBe('info');
    expect(getNotificationVisual(notification, false)).toMatchObject({
      label: 'i',
      title: 'Action required',
    });
  });

  it('uses a post fallback for published notifications without image', () => {
    const notification = {
      createdAt: '2026-06-13T00:00:00.000Z',
      content: 'Your post has been published on Facebook',
    };

    expect(getNotificationTone(notification)).toBe('success');
    expect(getNotificationVisual(notification, false)).toMatchObject({
      label: 'P',
      title: 'Post published',
    });
  });

  it('keeps image notifications labelled as regular notifications', () => {
    const notification = {
      createdAt: '2026-06-13T00:00:00.000Z',
      content: 'Your post has been published on Facebook',
      image: 'post.jpg',
    };

    expect(getNotificationVisual(notification, true)).toMatchObject({
      title: 'Notification',
    });
  });
});
