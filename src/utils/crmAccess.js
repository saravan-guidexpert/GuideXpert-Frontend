export const CRM_SECTION_KEY = 'consultancy-crm';
export const CRM_MANAGER_SECTION_KEY = 'consultancy-crm-manager';

export function canAccessConsultancyCrm(user) {
  if (!user) return false;
  if (user.isSuperAdmin === true) return true;
  return Array.isArray(user.sectionAccess) && user.sectionAccess.includes(CRM_SECTION_KEY);
}

export function canCorrectCrmReferralSource(user) {
  if (!user) return false;
  if (user.isSuperAdmin === true) return true;
  const access = Array.isArray(user.sectionAccess) ? user.sectionAccess : [];
  return access.includes(CRM_SECTION_KEY) && access.includes(CRM_MANAGER_SECTION_KEY);
}

export function canCorrectReferralSource(user) {
  return canCorrectCrmReferralSource(user);
}

export function crmResultMessage(result) {
  return interpretCrmResult(result).message;
}

export function interpretCrmResult(result, options = {}) {
  if (!result) return { state: 'error', message: 'No response from the server.' };
  if (result.status === 401) {
    return { state: 'unauthorized', message: result.message || 'Sign in again to continue.' };
  }
  if (result.status === 403 || result.code === 'section_forbidden' || result.code === 'referral_source_immutable') {
    return { state: 'forbidden', message: result.message || 'You do not have access to this Consultancy CRM action.' };
  }
  if (result.status === 404) {
    return { state: 'notfound', message: result.message || 'That record was not found.' };
  }
  if (result.status === 409) {
    return {
      state: 'conflict',
      message: result.message || 'This conflicts with an existing record.',
      code: result.code || null,
      data: result.data,
    };
  }
  if (result.status === 400) {
    return { state: 'validation', message: result.message || 'Check the form and try again.', code: result.code || null };
  }
  if (!result.success) {
    return { state: 'error', message: result.message || 'The request failed.' };
  }
  if (options.expectList === true && Array.isArray(result.data?.items) && result.data.items.length === 0) {
    return { state: 'empty', message: options.emptyMessage || 'Nothing to show yet.', data: result.data };
  }
  return { state: 'ok', message: result.message || '', data: result.data };
}
