import { useState } from 'react';
import { FiDatabase, FiShield } from 'react-icons/fi';
import { interpretCrmResult } from '../../utils/crmAccess';
import { Badge, Dialog, Notice, PageHeader } from './CrmKit';
import { useCrmDemo } from './useCrmDemo';

export default function SettingsPage() {
  const { client, demoManager, demoRole, refresh, mode } = useCrmDemo();
  const [notice, setNotice] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmingVolume, setConfirmingVolume] = useState(false);
  const role = demoManager ? 'Demo manager' : 'Demo staff';

  async function toggleManager() {
    const result = await Promise.resolve(client.setDemoManager(!demoManager));
    const view = interpretCrmResult(result);
    setNotice({ tone: view.state === 'ok' ? 'success' : 'error', message: view.message });
    if (view.state === 'ok') refresh();
  }

  async function chooseRole(role) {
    const result = await Promise.resolve(client.setDemoRole(role));
    const view = interpretCrmResult(result);
    setNotice({ tone: view.state === 'ok' ? 'success' : 'error', message: view.message });
    if (view.state === 'ok') refresh();
  }

  async function resetDemo() {
    const result = await Promise.resolve(client.resetDemoData());
    const view = interpretCrmResult(result);
    setConfirming(false);
    setNotice({ tone: view.state === 'ok' ? 'success' : 'error', message: view.message });
    if (view.state === 'ok') refresh();
  }

  async function loadVolume() {
    const result = await Promise.resolve(client.loadVolumeData());
    const view = interpretCrmResult(result);
    setConfirmingVolume(false);
    const counts = result && result.data && result.data.counts;
    const message = view.state === 'ok' && counts
      ? `Loaded ${counts.students} fictional students, ${counts.consultancies} consultancies, and ${counts.referrals} referrals in this browser.`
      : view.message;
    setNotice({ tone: view.state === 'ok' ? 'success' : 'error', message });
    if (view.state === 'ok') refresh();
  }

  return (
    <>
      <PageHeader title="Settings" subtitle={mode === 'api' ? 'Signed-in account access. Demo tools do not change server records.' : 'Access and data for this workspace.'} />
      {mode === 'api' ? <div className="gx-notice warning" role="status"><p>Manager, role, reset, and sample-volume controls stay visible so the workspace matches the demo. Using them is rejected. Permissions come from the CRM account.</p></div> : null}
      <Notice notice={notice} />
      <section className="gx-settings" aria-label="Workspace settings">
        <header className="gx-settings-head">
          <h3>Workspace</h3>
          <p>Saved in this browser. Account permissions are unchanged.</p>
        </header>
        <article className="gx-setting">
          <span className="gx-setting-ico" aria-hidden="true"><FiShield size={18} strokeWidth={1.75} /></span>
          <div className="gx-setting-copy">
            <div className="gx-setting-title">
              <h4 id="gx-manager-label">Manager access</h4>
              <Badge tone={demoManager ? 'on' : 'off'}>{demoManager ? 'Manager' : 'Staff'}</Badge>
            </div>
            <p>
              Referral sources can be corrected while this is on. The original consultancy stays on the record.
              Activity is recorded as {role}.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            className={`gx-switch${demoManager ? ' is-on' : ''}`}
            aria-checked={demoManager}
            aria-labelledby="gx-manager-label"
            onClick={toggleManager}
          >
            <span />
          </button>
        </article>
        <article className="gx-setting">
          <span className="gx-setting-ico" aria-hidden="true"><FiShield size={18} strokeWidth={1.75} /></span>
          <div className="gx-setting-copy">
            <div className="gx-setting-title">
              <h4 id="gx-role-label">Directory preview</h4>
              <Badge tone={demoRole === 'super_admin' ? 'on' : 'pending'}>{demoRole === 'super_admin' ? 'Super Admin' : 'Staff'}</Badge>
            </div>
            <p>
              Staff lists consultancies owned by Demo staff. Super Admin lists every consultancy in this browser and can change the owner. The creator stays the same.
              This preview is stored in the browser. It is not sign-in and it does not change account access.
            </p>
            <div className="gx-row-actions">
              <button type="button" className="gx-btn" aria-pressed={demoRole !== 'super_admin'} onClick={() => chooseRole('staff')}>Staff</button>
              <button type="button" className="gx-btn" aria-pressed={demoRole === 'super_admin'} onClick={() => chooseRole('super_admin')}>Super Admin</button>
            </div>
          </div>
        </article>
        <article className="gx-setting">
          <span className="gx-setting-ico" aria-hidden="true"><FiDatabase size={18} strokeWidth={1.75} /></span>
          <div className="gx-setting-copy">
            <div className="gx-setting-title">
              <h4>Workspace data</h4>
            </div>
            <p>
              Load a large fictional workspace, or restore the small starter set.
              Either choice replaces records in this browser. Sign-in details stay as they are.
            </p>
            <div className="gx-row-actions">
              <button type="button" className="gx-btn" onClick={() => setConfirmingVolume(true)}>Load sample volume</button>
              <button type="button" className="gx-btn" onClick={() => setConfirming(true)}>Reset data</button>
            </div>
          </div>
        </article>
      </section>
      {confirmingVolume ? (
        <Dialog title="Load a large sample?" onClose={() => setConfirmingVolume(false)}>
          <p className="gx-help">This replaces the workspace with 800 fictional students, 64 consultancies, referrals, follow-ups, and remarks. Records already in this browser are removed. Sign-in details are left unchanged.</p>
          <button type="button" className="gx-lime" onClick={loadVolume}>Load sample volume</button>
        </Dialog>
      ) : null}
      {confirming ? (
        <Dialog title="Reset workspace data?" onClose={() => setConfirming(false)}>
          <p className="gx-help">This restores the starter records and removes anything added in this browser. Sign-in details are left unchanged.</p>
          <button type="button" className="gx-lime" onClick={resetDemo}>Reset data</button>
        </Dialog>
      ) : null}
    </>
  );
}
