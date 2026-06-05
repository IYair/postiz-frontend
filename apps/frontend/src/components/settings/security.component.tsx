'use client';

import React, { useCallback, useState } from 'react';
import { Input } from '@gitroom/react/form/input';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const SecurityComponent = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    if (password !== repeatPassword) {
      toaster.show(t('passwords_do_not_match', 'Passwords do not match'), 'warning');
      return;
    }

    setSaving(true);
    const response = await fetch('/user/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword,
        password,
        repeatPassword,
      }),
    });
    setSaving(false);

    if (!response.ok) {
      toaster.show(await response.text(), 'warning');
      return;
    }

    setCurrentPassword('');
    setPassword('');
    setRepeatPassword('');
    toaster.show(t('password_updated', 'Password updated'), 'success');
  }, [currentPassword, password, repeatPassword, fetch, toaster, t]);

  const disabled =
    saving ||
    currentPassword.length < 3 ||
    password.length < 8 ||
    repeatPassword.length < 8;

  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">{t('security', 'Security')}</h3>
      <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[16px]">
        <div className="mt-[4px]">
          {t('change_password', 'Change Password')}
        </div>
        <div className="text-[12px] text-customColor18">
          {t(
            'change_password_description',
            'Update the password used to sign in with your email account.'
          )}
        </div>
        <Input
          name="currentPassword"
          label={t('current_password', 'Current password')}
          disableForm={true}
          removeError={true}
          type="password"
          value={currentPassword}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setCurrentPassword(event.target.value)
          }
        />
        <Input
          name="password"
          label={t('new_password', 'New password')}
          disableForm={true}
          removeError={true}
          type="password"
          value={password}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setPassword(event.target.value)
          }
        />
        <Input
          name="repeatPassword"
          label={t('repeat_new_password', 'Repeat new password')}
          disableForm={true}
          removeError={true}
          type="password"
          value={repeatPassword}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setRepeatPassword(event.target.value)
          }
        />
        <div className="flex justify-end">
          <Button onClick={save} loading={saving} disabled={disabled}>
            {t('update_password', 'Update password')}
          </Button>
        </div>
      </div>
    </div>
  );
};
