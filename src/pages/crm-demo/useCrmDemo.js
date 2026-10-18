import { createContext, useContext } from 'react';

export const CrmDemoContext = createContext(null);

export function useCrmDemo() {
  const value = useContext(CrmDemoContext);
  if (!value) throw new Error('CRM demo pages must render inside /crm.');
  return value;
}
