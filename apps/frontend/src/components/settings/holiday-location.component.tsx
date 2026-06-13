'use client';

import React, { useCallback } from 'react';
import { Select } from '@gitroom/react/form/select';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useHolidayCountry } from '@gitroom/frontend/components/tools/holidays/holiday.badge';

const HOLIDAY_COUNTRY_OPTIONS = [
  { value: 'MX', label: 'Mexico' },
  { value: 'US', label: 'United States' },
  { value: 'ES', label: 'Spain' },
  { value: 'CO', label: 'Colombia' },
  { value: 'AR', label: 'Argentina' },
  { value: 'CL', label: 'Chile' },
  { value: 'PE', label: 'Peru' },
  { value: 'BR', label: 'Brazil' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
];

const HolidayLocationComponent = () => {
  const t = useT();
  const [country, setCountry] = useHolidayCountry();

  const changeCountry = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setCountry(event.target.value);
    },
    [setCountry]
  );

  return (
    <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
      <div className="mt-[4px]">
        {t('holiday_location_settings', 'Holiday Location')}
      </div>
      <div className="flex items-center justify-between gap-[24px]">
        <div className="flex flex-col flex-1">
          <div className="text-[14px]">
            {t('holiday_country', 'Holiday country')}
          </div>
          <div className="text-[12px] text-customColor18">
            {t(
              'holiday_country_description',
              "Choose which country's holidays appear in your calendar. This is saved in this browser only."
            )}
          </div>
        </div>
        <div className="w-[220px]">
          <Select
            name="holiday-country"
            label=""
            aria-label={t('holiday_country', 'Holiday country')}
            disableForm={true}
            hideErrors={true}
            value={country}
            onChange={changeCountry}
          >
            {HOLIDAY_COUNTRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
};

export default HolidayLocationComponent;
