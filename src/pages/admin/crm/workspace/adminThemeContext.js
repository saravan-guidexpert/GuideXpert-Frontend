import { createContext, useContext } from 'react';

export const AdminThemeContext = createContext('light');

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}
