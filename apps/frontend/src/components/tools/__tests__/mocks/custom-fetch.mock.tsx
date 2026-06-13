export const useFetch = () => () => Promise.resolve({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
export const FetchWrapperComponent = ({ children }: any) => <>{children}</>;
