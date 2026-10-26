import { useMemo } from 'react';
import { crmCan } from '../../constants/crmUserAccess';
import { createCrmApiRepository } from '../../utils/crmApiRepository';
import { crmPortalGet, crmPortalSend } from '../../utils/crmSessionApi';
import CrmDemoLayout from '../crm-demo/CrmDemoLayout';
import { useCrmSession } from './useCrmSession';

function request(method, path, params, body) {
  if (method === 'GET') return crmPortalGet(path, params || undefined);
  return crmPortalSend(path, method, body);
}

export default function CrmAppShell() {
  const { user, logout } = useCrmSession();
  const canCorrectReferral = crmCan(user, 'crm.referrals.correct_source');
  const canManageAssignments = crmCan(user, 'crm.roles.manage');
  const client = useMemo(() => createCrmApiRepository({ request, user, canCorrectReferral }), [user, canCorrectReferral]);

  return (
    <CrmDemoLayout
      mode="api"
      basePath="/crm/app"
      client={client}
      sessionUser={user}
      canCorrectReferral={canCorrectReferral}
      canManageAssignments={canManageAssignments}
      superAdminHref={canManageAssignments ? '/crm/admin' : null}
      onSignOut={logout}
    />
  );
}
