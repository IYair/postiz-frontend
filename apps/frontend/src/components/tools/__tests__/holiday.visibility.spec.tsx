import React, { act } from 'react';
import dayjs from 'dayjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import {
  areHolidaysVisible,
  getHolidayCountry,
  HOLIDAY_COUNTRY_CHANGE_EVENT,
  HOLIDAY_COUNTRY_STORAGE_KEY,
  HOLIDAY_VISIBILITY_CHANGE_EVENT,
  setHolidayCountry,
  setHolidaysVisible,
  useHolidayCountry,
  useHolidayVisibility,
  useHolidays,
} from '@gitroom/frontend/components/tools/holidays/holiday.badge';

const swrCalls = vi.hoisted(() => [] as Array<string | null>);

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('swr', () => ({
  default: (key: string | null) => {
    swrCalls.push(key);
    return { data: [] };
  },
}));

vi.mock('@gitroom/helpers/utils/custom.fetch', () => ({
  useFetch: () => vi.fn(),
}));

vi.mock('@gitroom/frontend/components/layout/new-modal', () => ({
  useModals: () => ({ openModal: vi.fn() }),
}));

vi.mock('@gitroom/react/toaster/toaster', () => ({
  useToaster: () => ({ show: vi.fn() }),
}));

vi.mock('@gitroom/react/form/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

const Probe = () => {
  useHolidays(dayjs('2026-06-13'));
  return null;
};

let setHolidayVisibility: ((visible: boolean) => void) | undefined;

const ToggleProbe = () => {
  const [, setVisibility] = useHolidayVisibility();
  setHolidayVisibility = setVisibility;
  useHolidays(dayjs('2026-06-13'));
  return null;
};

const VisibilityProbe = () => {
  const [visible] = useHolidayVisibility();
  return <span>{visible ? 'visible' : 'hidden'}</span>;
};

let setCountryFromHook: ((country: string) => void) | undefined;

const CountryProbe = () => {
  const [, setCountry] = useHolidayCountry();
  setCountryFromHook = setCountry;
  useHolidays(dayjs('2026-06-13'));
  return null;
};

const CountrySnapshotProbe = () => {
  const [country] = useHolidayCountry();
  return <span>{country}</span>;
};

describe('holiday visibility preference', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    swrCalls.length = 0;
    setHolidayVisibility = undefined;
    setCountryFromHook = undefined;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    localStorage.clear();
    swrCalls.length = 0;
    setHolidayVisibility = undefined;
    setCountryFromHook = undefined;
    vi.restoreAllMocks();
  });

  it('shows holidays by default when no preference is stored', () => {
    expect(areHolidaysVisible()).toBe(true);

    act(() => {
      root.render(<Probe />);
    });

    expect(swrCalls.at(-1)).toBe('/tools/holidays?month=6&year=2026&country=MX');
  });

  it('persists disabled holidays and prevents the holiday request', () => {
    setHolidaysVisible(false);

    expect(areHolidaysVisible()).toBe(false);
    expect(localStorage.getItem('show-holidays')).toBe('false');

    act(() => {
      root.render(<Probe />);
    });

    expect(swrCalls.at(-1)).toBeNull();
  });

  it('allows callers to toggle the stored visibility value repeatedly', () => {
    expect(areHolidaysVisible()).toBe(true);

    setHolidaysVisible(false);
    expect(areHolidaysVisible()).toBe(false);
    expect(localStorage.getItem('show-holidays')).toBe('false');

    setHolidaysVisible(true);
    expect(areHolidaysVisible()).toBe(true);
    expect(localStorage.getItem('show-holidays')).toBe('true');
  });

  it('migrates legacy hidden holiday preferences to the visible storage key', () => {
    localStorage.setItem('hide-holidays', 'true');

    expect(areHolidaysVisible()).toBe(false);
    expect(localStorage.getItem('show-holidays')).toBe('false');

    setHolidaysVisible(true);
    expect(localStorage.getItem('show-holidays')).toBe('true');
  });

  it('uses a visible server snapshot to avoid storage-dependent hydration output', () => {
    localStorage.setItem('show-holidays', 'false');

    expect(renderToString(<VisibilityProbe />)).toBe('<span>visible</span>');
  });

  it('notifies mounted holiday hooks when the preference changes', async () => {
    const listener = vi.fn();
    window.addEventListener(HOLIDAY_VISIBILITY_CHANGE_EVENT, listener);

    act(() => {
      root.render(<Probe />);
    });
    expect(swrCalls.at(-1)).toBe('/tools/holidays?month=6&year=2026&country=MX');

    act(() => {
      setHolidaysVisible(false);
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(swrCalls.at(-1)).toBeNull();

    window.removeEventListener(HOLIDAY_VISIBILITY_CHANGE_EVENT, listener);
  });

  it('falls back to showing holidays when storing a disabled preference fails', async () => {
    const listener = vi.fn();
    const storage = window.localStorage;
    window.addEventListener(HOLIDAY_VISIBILITY_CHANGE_EVENT, listener);
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        clear: vi.fn(),
        getItem: vi.fn(() => null),
        setItem: vi.fn(() => {
          throw new Error('storage unavailable');
        }),
      },
    });

    try {
      act(() => {
        root.render(<ToggleProbe />);
      });
      expect(swrCalls.at(-1)).toBe('/tools/holidays?month=6&year=2026&country=MX');

      act(() => {
        setHolidayVisibility?.(false);
      });
      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(areHolidaysVisible()).toBe(true);
      expect(swrCalls.at(-1)).toBe('/tools/holidays?month=6&year=2026&country=MX');
    } finally {
      window.removeEventListener(HOLIDAY_VISIBILITY_CHANGE_EVENT, listener);
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: storage,
      });
    }
  });

  it('uses MX as the default holiday country', () => {
    expect(getHolidayCountry()).toBe('MX');

    act(() => {
      root.render(<Probe />);
    });

    expect(swrCalls.at(-1)).toBe('/tools/holidays?month=6&year=2026&country=MX');
  });

  it('persists selected holiday country and includes it in holiday requests', () => {
    setHolidayCountry('US');

    expect(getHolidayCountry()).toBe('US');
    expect(localStorage.getItem(HOLIDAY_COUNTRY_STORAGE_KEY)).toBe('US');

    act(() => {
      root.render(<Probe />);
    });

    expect(swrCalls.at(-1)).toBe('/tools/holidays?month=6&year=2026&country=US');
  });

  it('notifies mounted holiday hooks when the country changes', async () => {
    const listener = vi.fn();
    window.addEventListener(HOLIDAY_COUNTRY_CHANGE_EVENT, listener);

    act(() => {
      root.render(<CountryProbe />);
    });
    expect(swrCalls.at(-1)).toBe('/tools/holidays?month=6&year=2026&country=MX');

    act(() => {
      setCountryFromHook?.('ES');
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(HOLIDAY_COUNTRY_STORAGE_KEY)).toBe('ES');
    expect(swrCalls.at(-1)).toBe('/tools/holidays?month=6&year=2026&country=ES');

    window.removeEventListener(HOLIDAY_COUNTRY_CHANGE_EVENT, listener);
  });

  it('keeps holiday requests disabled when holidays are hidden even if country changes', async () => {
    setHolidaysVisible(false);

    act(() => {
      root.render(<CountryProbe />);
    });
    expect(swrCalls.at(-1)).toBeNull();

    act(() => {
      setCountryFromHook?.('CO');
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(localStorage.getItem(HOLIDAY_COUNTRY_STORAGE_KEY)).toBe('CO');
    expect(swrCalls.at(-1)).toBeNull();
  });

  it('uses a stable MX server snapshot for holiday country', () => {
    localStorage.setItem(HOLIDAY_COUNTRY_STORAGE_KEY, 'US');

    expect(renderToString(<CountrySnapshotProbe />)).toBe('<span>MX</span>');
  });
});
