import { useContext } from 'react';
import { CrmSessionContext } from './crmSessionStore';

export function useCrmSession() {
  const value = useContext(CrmSessionContext);
  if (!value) throw new Error('CRM session is unavailable.');
  return value;
}
