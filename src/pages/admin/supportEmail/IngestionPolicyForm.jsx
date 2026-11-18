import { useState } from 'react';
import { createIngestionPolicy, updateIngestionPolicy } from '../../../utils/adminApi';
import { ERROR_COPY, singleTestErrorCopy } from './supportEmailFormat';
import { ACTIVATION_TIME_ZONE, formatActivationLocal, parseActivationInput } from './activationTime';

const MAILBOX = 'support@niatindia.com';

function currentLocal(policy) {
  if (!policy || !policy.activationAt) return '';
  if (policy.activationLocal) return policy.activationLocal;
  return formatActivationLocal(new Date(policy.activationAt));
}

export default function IngestionPolicyForm({ policy, onSaved }) {
  const [activationAt, setActivationAt] = useState('');
  const [approved, setApproved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const exists = Boolean(policy);
  const preview = parseActivationInput(activationAt);
  const ready = Boolean(preview) && approved && !saving;
  const configuredName = policy && policy.configuredBy && policy.configuredBy.name;

  async function finish(result, message) {
    setSaving(false);
    if (!result.success) {
      setError(singleTestErrorCopy(result.message || ERROR_COPY));
      return;
    }
    setApproved(false);
    setActivationAt('');
    setSaved(message);
    if (onSaved) onSaved(result.data.policy);
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!ready || !preview) return;
    const boundaryChange = exists && policy.activationAt && new Date(policy.activationAt).getTime() !== preview.getTime();
    if (boundaryChange) {
      const previous = currentLocal(policy);
      const next = formatActivationLocal(preview);
      const confirmed = window.confirm(`Change the activation boundary from ${previous} to ${next}? Messages received before the new time will be rejected.`);
      if (!confirmed) return;
    }
    setSaving(true);
    setError('');
    setSaved('');
    const payload = {
      mailbox: MAILBOX,
      activationAt,
      timeZone: ACTIVATION_TIME_ZONE,
      approveActivation: true,
      ...(boundaryChange ? { confirmBoundaryChange: true } : {}),
    };
    const result = exists ? await updateIngestionPolicy(payload) : await createIngestionPolicy(payload);
    await finish(result, exists ? 'Activation time saved. Processing was not enabled and no mailbox was read.' : 'Activation time saved. The policy stays disabled and no mailbox was read.');
  }

  async function onProcessing(nextEnabled) {
    if (!exists || saving) return;
    const verb = nextEnabled ? 'enable' : 'disable';
    if (!window.confirm(`This will ${verb} email processing for ${MAILBOX}. The activation time stays unchanged.`)) return;
    setSaving(true);
    setError('');
    setSaved('');
    const result = await updateIngestionPolicy({ mailbox: MAILBOX, enabled: nextEnabled });
    await finish(result, nextEnabled ? 'Processing enabled. The activation time was not changed.' : 'Processing disabled. The activation time was not changed.');
  }

  return (
    <form className="mt-3 grid gap-2" onSubmit={onSubmit} aria-label="Ingestion settings">
      <p className="font-medium text-slate-900">Ingestion settings</p>
      <p className="text-slate-600">Mailbox {MAILBOX}. Saving an activation time does not enable email processing.</p>
      <p className="text-slate-700">
        Policy status: {exists ? (policy.enabled ? 'enabled' : 'disabled') : 'not configured'}.
        {exists && policy.activationAt
          ? ` Activation ${currentLocal(policy)} (${policy.activationTimeZone || ACTIVATION_TIME_ZONE}), stored as ${new Date(policy.activationAt).toISOString()}.`
          : ' Activation time is not configured.'}
      </p>
      {exists && (
        <p className="text-slate-700">
          Configured by {configuredName || 'Not recorded'}{policy.activationApprovedAt ? ` at ${new Date(policy.activationApprovedAt).toISOString()}` : ''}.
        </p>
      )}
      <label className="grid gap-1">
        Activation time ({ACTIVATION_TIME_ZONE})
        <input
          type="datetime-local"
          aria-label="Activation time"
          value={activationAt}
          onChange={(event) => setActivationAt(event.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1"
        />
      </label>
      <p className="text-slate-700">
        {preview
          ? `Selected ${formatActivationLocal(preview)} (${ACTIVATION_TIME_ZONE}), stored as ${preview.toISOString()}.`
          : 'Select a date and time. The current time is not used as a default.'}
      </p>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />
        I approve this activation time. Messages received earlier will be rejected.
      </label>
      <button type="submit" disabled={!ready} className="w-fit rounded-md bg-slate-900 px-3 py-1.5 text-white disabled:bg-slate-300">
        {saving ? 'Saving activation time' : 'Save activation time'}
      </button>
      {exists && (
        <button
          type="button"
          className="w-fit rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
          disabled={saving}
          onClick={() => onProcessing(policy.enabled !== true)}
        >
          {policy.enabled ? 'Disable email processing' : 'Enable email processing'}
        </button>
      )}
      {error && <p className="text-red-700" role="alert">{error}</p>}
      {saved && <p className="text-green-800" role="status">{saved}</p>}
    </form>
  );
}
