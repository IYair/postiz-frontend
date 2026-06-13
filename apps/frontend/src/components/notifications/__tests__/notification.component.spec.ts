import { describe, expect, it } from 'vitest';
import { notificationPopupClassName } from '../notification.component';

describe('notification popup layout', () => {
  it('keeps the dropdown inside narrow mobile viewports', () => {
    expect(notificationPopupClassName).toContain('w-[calc(100vw-32px)]');
    expect(notificationPopupClassName).toContain('max-w-[420px]');
    expect(notificationPopupClassName).toContain('sm:w-[420px]');
  });
});
