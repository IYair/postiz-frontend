export default function useSWR(key: any, fetcher?: any, config?: any) {
  return { data: undefined as any, error: undefined as any, isLoading: false, mutate: () => {}, isValidating: false };
}

export const SWRConfig = ({ children }: any) => children;
