'use client';

import { FC } from 'react';
import { SuggestList } from './username.generator';

export const BioGenerator: FC<{ network: string }> = ({ network }) => (
  <SuggestList toolKey="bios" network={network} />
);
