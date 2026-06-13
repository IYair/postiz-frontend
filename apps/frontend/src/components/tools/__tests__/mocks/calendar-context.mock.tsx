import React from 'react';

export const useCalendar = () => ({
  integrations: [] as any[],
  reloadCalendarView: () => {},
});

export const CalendarContext = React.createContext({});

export const CalendarWeekProvider = ({ children }: any) => <>{children}</>;
