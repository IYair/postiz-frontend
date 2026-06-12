'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { ThreadFinisher } from '@gitroom/frontend/components/new-launch/finisher/thread.finisher';
import { Select } from '@gitroom/react/form/select';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { XDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/x.dto';
import { Input } from '@gitroom/react/form/input';
import { Checkbox } from '@gitroom/react/form/checkbox';

const X_LONG_POST_LIMIT = 25000;
const X_PREMIUM_SUBSCRIPTIONS = ['Basic', 'Premium', 'PremiumPlus'];

const hasXPremiumSubscription = (settings: any) => {
  const subscriptionType = settings?.find?.(
    (p: any) => p?.title === 'Subscription Type'
  )?.value;

  if (typeof subscriptionType === 'string') {
    return X_PREMIUM_SUBSCRIPTIONS.includes(subscriptionType);
  }

  return !!settings?.find?.((p: any) => p?.title === 'Verified')?.value;
};

const whoCanReply = [
  {
    label: 'Everyone',
    value: 'everyone',
  },
  {
    label: 'Accounts you follow',
    value: 'following',
  },
  {
    label: 'Mentioned accounts',
    value: 'mentionedUsers',
  },
  {
    label: 'Subscribers',
    value: 'subscribers',
  },
  {
    label: 'Verified accounts',
    value: 'verified',
  },
];

const SettingsComponent = () => {
  const t = useT();
  const { register, watch, setValue } = useSettings();

  return (
    <>
      <Select
        label={t(
          'label_who_can_reply_to_this_post',
          'Who can reply to this post?'
        )}
        className="mb-5"
        hideErrors={true}
        {...register('who_can_reply_post', {
          value: 'everyone',
        })}
      >
        {whoCanReply.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>

      <Input
        label={
          'Post to a community, URL (Ex: https://x.com/i/communities/1493446837214187523)'
        }
        {...register('community')}
      />

      <div className="mt-5 flex flex-col gap-[10px]">
        <Checkbox
          label={t('label_made_with_ai', 'Made with AI')}
          {...register('made_with_ai')}
        />
        <Checkbox
          label={t('label_paid_partnership', 'Paid partnership')}
          {...register('paid_partnership')}
        />
      </div>

      <ThreadFinisher />
    </>
  );
};

export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: SettingsComponent,
  CustomPreviewComponent: undefined,
  dto: XDto,
  maximumCharacters: (settings) => {
    if (hasXPremiumSubscription(settings)) {
      return X_LONG_POST_LIMIT;
    }
    return 280;
  },
});
