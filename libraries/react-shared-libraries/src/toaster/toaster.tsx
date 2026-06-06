'use client';

import { useCallback, useMemo } from 'react';
import { Toaster as SonnerToaster, toast } from 'sonner';

type ToasterType = 'success' | 'warning';

export const Toaster = () => {
  return <SonnerToaster richColors position="top-center" />;
};

export const useToaster = () => {
  const show = useCallback((text: string, type?: ToasterType) => {
    if (type === 'warning') {
      toast.warning(text);
      return;
    }

    toast.success(text);
  }, []);

  return useMemo(() => ({ show }), [show]);
};
