import { Navigate } from 'react-router-dom';
import { crmCan } from '../../constants/crmUserAccess';
import { useCrmSession } from './useCrmSession';

export default function CrmAppIndex() {
  const { user } = useCrmSession();
  if (crmCan(user, 'crm.roles.manage')) return <Navigate to="/crm/app/overview" replace />;
  if (crmCan(user, 'crm.students.read')) return <Navigate to="/crm/app/students" replace />;
  if (crmCan(user, 'crm.consultancies.read')) return <Navigate to="/crm/app/consultancy-records" replace />;
  if (crmCan(user, 'crm.referrals.read')) return <Navigate to="/crm/app/referrals" replace />;
  return (
    <section>
      <h2 className="gx-title">Signed in</h2>
      <p>This account has no CRM sections assigned.</p>
    </section>
  );
}
