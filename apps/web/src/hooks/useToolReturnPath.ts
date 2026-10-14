import { useLocation } from 'react-router-dom';

export function useToolReturnPath() {
  const { state } = useLocation();
  const returnTo: unknown = state?.returnTo;
  return typeof returnTo === 'string' && /^\/empower(?:\?|$)/.test(returnTo)
    ? returnTo
    : '/empower';
}
