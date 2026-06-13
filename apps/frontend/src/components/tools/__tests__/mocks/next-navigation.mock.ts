export function useSearchParams() {
  return new URLSearchParams();
}

export function useRouter() {
  return { push: () => {}, replace: () => {} };
}

export function usePathname() {
  return '/';
}
