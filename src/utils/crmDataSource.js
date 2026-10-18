export function resolveCrmDataMode(env = {}) {
  return env && env.VITE_CRM_DATA_MODE === 'api' ? 'api' : 'demo';
}

/**
 * Standalone /crm always passes mode "demo".
 * API mode is explicit and is not used unless a caller supplies an API client.
 * Any other value, including an empty setting, stays on local demo data.
 */
export function selectCrmClient(mode, clients) {
  if (mode === 'api') {
    if (!clients || !clients.api) {
      throw new Error('Consultancy CRM API mode is not active.');
    }
    return clients.api;
  }
  return clients.demo;
}
