import { Outlet } from 'react-router-dom';
import { useCrmSession } from '../../../crm-app/useCrmSession';
import { workspaceRouteDecision } from '../../../../utils/crmWorkspace';
import { AccessNote } from './workspaceUi';

export default function CrmWorkspaceLayout() {
  const { user } = useCrmSession();
  const decision = workspaceRouteDecision(user, 'overview');
  if (decision.state !== 'allowed') return <AccessNote>{decision.message}</AccessNote>;
  return (
    <div className="mx-auto max-w-7xl">
      <Outlet />
    </div>
  );
}
