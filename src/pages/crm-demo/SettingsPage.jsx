import { useState } from 'react';
import { FiDatabase, FiShield } from 'react-icons/fi';
import { interpretCrmResult } from '../../utils/crmAccess';
import { Badge, Dialog, Notice, PageHeader } from './CrmKit';
import { useCrmDemo } from './useCrmDemo';

export default function SettingsPage() {
  const { client, demoManager, refresh } = useCrmDemo();
  const [notice, setNotice] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const role = demoManager ? 'Demo manager' : 'Demo staff';

  async function toggleManager() {
    const result = await Promise.resolve(client.setDemoManager(!demoManager));
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

  return (
    <>
      <PageHeader title="Settings" subtitle="Access and data for this workspace." />
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
          <span className="gx-setting-ico" aria-hidden="true"><FiDatabase size={18} strokeWidth={1.75} /></span>
          <div className="gx-setting-copy">
            <div className="gx-setting-title">
              <h4>Workspace data</h4>
            </div>
            <p>
              Restore the starter consultancies, students, referrals, and activity.
              Records added in this browser are removed. Sign-in details stay as they are.
            </p>
          </div>
          <button type="button" className="gx-btn" onClick={() => setConfirming(true)}>Reset data</button>
        </article>
      </section>
      {confirming ? (
        <Dialog title="Reset workspace data?" onClose={() => setConfirming(false)}>
          <p className="gx-help">This restores the starter records and removes anything added in this browser. Sign-in details are left unchanged.</p>
          <button type="button" className="gx-lime" onClick={resetDemo}>Reset data</button>
        </Dialog>
      ) : null}
    </>
  );
}
