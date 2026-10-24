import { useEffect, useId, useRef, useState } from 'react';
import { FiMail, FiMoreHorizontal, FiPhone, FiPlus } from 'react-icons/fi';
import { SearchField } from '../CrmKit';
import { useCrmDemo } from '../useCrmDemo';
import {
  contactInitials,
  contactStatusLabel,
  formatContactPhone,
  visibleContacts,
  validateContactDraft,
} from './contactsModel';
import './consultancyContacts.css';

const EMPTY_DRAFT = { name: '', phone: '', email: '', role: '' };

function ContactDialog({ title, description, onClose, children }) {
  const titleId = useId();
  const descriptionId = useId();
  const cardRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    cardRef.current?.focus();
    function onKey(event) {
      if (event.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div
      className="gx-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="gx-modal-card gx-ct-dialog"
      >
        <h3 id={titleId}>{title}</h3>
        <p id={descriptionId} className="gx-help">{description}</p>
        {children}
      </div>
    </div>
  );
}

function ContactActions({ name, status, open, disabled, onOpenChange, onEdit, onActivate, onDeactivate }) {
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const onOpenChangeRef = useRef(onOpenChange);
  const active = status === 'active';
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);
  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    function onKey(event) {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onOpenChangeRef.current(false);
      triggerRef.current?.focus();
    }
    function onPointer(event) {
      if (!rootRef.current?.contains(event.target)) onOpenChangeRef.current(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  function onMenuKey(event) {
    const buttons = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
    const index = buttons.indexOf(document.activeElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
      buttons[(next + buttons.length) % buttons.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      buttons[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      buttons[buttons.length - 1]?.focus();
    } else if (event.key === 'Tab') {
      onOpenChange(false);
    }
  }

  return (
    <div className="gx-ct-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="gx-btn gx-ct-more"
        aria-label={`Actions for ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => onOpenChange(!open)}
      >
        <FiMoreHorizontal size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div ref={menuRef} className="gx-ct-pop" role="menu" aria-label={`Actions for ${name}`} onKeyDown={onMenuKey}>
          <button type="button" role="menuitem" onClick={onEdit}>Edit</button>
          {active ? (
            <button type="button" role="menuitem" className="is-danger" onClick={onDeactivate}>Deactivate</button>
          ) : (
            <button type="button" role="menuitem" onClick={onActivate}>Activate</button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ContactFields({ draft, errors, disabled, onChange }) {
  return (
    <>
      <label>
        <span className="gx-ct-label">Name <abbr className="gx-ct-req" title="required">*</abbr></span>
        <input
          value={draft.name}
          aria-required="true"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'gx-ct-name-error' : undefined}
          autoComplete="name"
          maxLength={200}
          disabled={disabled}
          onChange={(event) => onChange('name', event.target.value)}
        />
        {errors.name ? <span id="gx-ct-name-error" className="gx-ct-err" role="alert">{errors.name}</span> : null}
      </label>
      <div className="gx-ct-field">
        <span className="gx-ct-label">Phone or email <abbr className="gx-ct-req" title="required">*</abbr></span>
        <label>
          <span className="gx-ct-label">Phone</span>
          <input
            value={draft.phone}
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby="gx-ct-reach"
            maxLength={20}
            disabled={disabled}
            onChange={(event) => onChange('phone', event.target.value)}
          />
          {errors.phone ? <span className="gx-ct-err" role="alert">{errors.phone}</span> : null}
        </label>
        <label>
          <span className="gx-ct-label">Email</span>
          <input
            value={draft.email}
            inputMode="email"
            autoComplete="email"
            aria-describedby="gx-ct-reach"
            disabled={disabled}
            onChange={(event) => onChange('email', event.target.value)}
          />
        </label>
        <p id="gx-ct-reach" className={errors.contact ? 'gx-ct-err' : 'gx-ct-hint'} role={errors.contact ? 'alert' : undefined}>
          {errors.contact || 'A mobile number or an email address is required.'}
        </p>
      </div>
      <label>
        <span className="gx-ct-label">Role</span>
        <input
          value={draft.role}
          autoComplete="organization-title"
          maxLength={80}
          disabled={disabled}
          onChange={(event) => onChange('role', event.target.value)}
        />
      </label>
    </>
  );
}

export default function ConsultancyContacts({
  consultancyId,
  contactsLoad,
  primaryContactId,
  saving,
  run,
  onRetry,
}) {
  const { client } = useCrmDemo();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [kind, setKind] = useState('all');
  const [openMenuId, setOpenMenuId] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [pendingId, setPendingId] = useState('');

  const pending = !contactsLoad || contactsLoad.pending === true || contactsLoad.ok == null;
  const failed = Boolean(contactsLoad && contactsLoad.ok === false);
  const contacts = contactsLoad?.ok && Array.isArray(contactsLoad.items) ? contactsLoad.items : [];
  const total = contactsLoad?.ok ? contacts.length : null;
  const filtering = Boolean(query.trim()) || status !== 'all' || kind !== 'all';
  const visible = visibleContacts(contacts, { query, status, kind, primaryId: primaryContactId });

  function resetDraft(next = EMPTY_DRAFT) {
    setDraft(next);
    setErrors({});
    setFormError('');
  }

  function openAdd() {
    setOpenMenuId('');
    setEditing(null);
    setConfirming(null);
    resetDraft();
    setAdding(true);
  }

  function openEdit(row) {
    setOpenMenuId('');
    setAdding(false);
    setConfirming(null);
    setEditing(row);
    resetDraft({
      name: row.name || '',
      phone: row.phone || '',
      email: row.email || '',
      role: row.role || '',
    });
  }

  function closeEditor() {
    if (saving) return;
    setAdding(false);
    setEditing(null);
    resetDraft();
  }

  function setField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, contact: key === 'phone' || key === 'email' ? undefined : current.contact }));
    setFormError('');
  }

  async function commit(contactId, action) {
    setPendingId(contactId);
    try {
      return await run(action);
    } finally {
      setPendingId('');
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    const checked = validateContactDraft(draft);
    setErrors(checked.errors);
    setFormError('');
    if (!checked.ok) return;
    const view = await commit(editing?.id || 'new', () => (
      editing
        ? client.updateContact(consultancyId, editing.id, checked.value)
        : client.createContact(consultancyId, checked.value)
    ));
    if (view?.state === 'ok') {
      setAdding(false);
      setEditing(null);
      resetDraft();
      return;
    }
    setFormError(view?.message || 'Could not save this contact.');
  }

  async function onActivate(row) {
    setOpenMenuId('');
    await commit(row.id, () => client.updateContact(consultancyId, row.id, { status: 'active' }));
  }

  function askDeactivate(row) {
    setOpenMenuId('');
    setActionError('');
    setConfirming(row);
  }

  async function onConfirmDeactivate() {
    if (!confirming) return;
    const view = await commit(confirming.id, () => client.deactivateContact(consultancyId, confirming.id));
    if (view?.state === 'ok') {
      setConfirming(null);
      setActionError('');
      return;
    }
    setActionError(view?.message || 'Could not deactivate this contact.');
  }

  const editorOpen = adding || Boolean(editing);
  const editorTitle = editing ? 'Edit contact' : 'Add contact';
  const editorCopy = editing
    ? 'Update this person’s name, role, and how the consultancy can be reached.'
    : 'Add someone the consultancy can be reached through.';

  return (
    <section className="gx-card gx-contacts" aria-busy={pending || Boolean(pendingId)}>
      <header className="gx-ct-head">
        <div className="gx-ct-heading">
          <h3>Contacts</h3>
          <p className="gx-ct-sub">Manage consultancy contacts and communication details.</p>
        </div>
        <div className="gx-ct-head-actions">
          {total == null ? null : (
            <p className="gx-ct-count" aria-live="polite">{total} {total === 1 ? 'contact' : 'contacts'}</p>
          )}
          <button type="button" className="gx-lime gx-ct-add" onClick={openAdd} disabled={saving}>
            <FiPlus size={15} aria-hidden="true" />
            Add contact
          </button>
        </div>
      </header>

      {pending ? (
        <div className="gx-ct-loading" role="status">
          <span className="gx-sr">Loading contacts</span>
          <div className="gx-ct-skel" />
          <div className="gx-ct-skel" />
        </div>
      ) : null}

      {failed ? (
        <div className="gx-ct-state" role="alert">
          <h4>Contacts could not be loaded</h4>
          <p>{contactsLoad.message || 'The contact list did not come back. Try again.'}</p>
          <button type="button" className="gx-btn" onClick={onRetry}>Retry</button>
        </div>
      ) : null}

      {!pending && !failed && total === 0 ? (
        <div className="gx-ct-state">
          <h4>No contacts yet</h4>
          <p>Add a person, a phone number or an email before the next call.</p>
          <button type="button" className="gx-lime" onClick={openAdd} disabled={saving}>
            <FiPlus size={15} aria-hidden="true" />
            Add contact
          </button>
        </div>
      ) : null}

      {!pending && !failed && total > 0 ? (
        <>
          <div className="gx-ct-tools">
            <SearchField value={query} onChange={setQuery} label="Search name, email or phone" />
            <select className="gx-select" aria-label="Contact status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select className="gx-select" aria-label="Primary contact" value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="all">All contacts</option>
              <option value="primary">Primary contact</option>
              <option value="other">Other contacts</option>
            </select>
          </div>
          {filtering ? <p className="gx-ct-meta" aria-live="polite">Showing {visible.length} of {total}</p> : null}
          {visible.length === 0 ? (
            <div className="gx-ct-state">
              <h4>No matching contacts</h4>
              <p>Nothing in this consultancy matches the current search or filters.</p>
              <button type="button" className="gx-btn" onClick={() => { setQuery(''); setStatus('all'); setKind('all'); }}>Clear filters</button>
            </div>
          ) : (
            <ul className="gx-ct-list">
              {visible.map((row) => {
                const primary = Boolean(primaryContactId) && row.id === primaryContactId;
                const active = row.status === 'active';
                const channels = [
                  row.phone ? { id: 'phone', icon: FiPhone, label: 'Phone', text: formatContactPhone(row.phone), full: String(row.phone) } : null,
                  row.email ? { id: 'email', icon: FiMail, label: 'Email', text: row.email, full: row.email } : null,
                ].filter(Boolean);
                return (
                  <li
                    key={row.id}
                    className={`gx-ct-card${primary ? ' is-primary' : ''}${active ? '' : ' is-inactive'}${openMenuId === row.id ? ' is-open' : ''}`}
                    aria-busy={pendingId === row.id}
                  >
                    <div className="gx-ct-id">
                      <span className="gx-ct-avatar" aria-hidden="true">{contactInitials(row.name)}</span>
                      <div className="gx-ct-id-copy">
                        <div className="gx-ct-name-row">
                          <h4 className="gx-ct-name" title={row.name}>{row.name}</h4>
                          {primary ? <span className="gx-ct-primary">Primary</span> : null}
                        </div>
                        {row.role ? <p className="gx-ct-role">{row.role}</p> : null}
                      </div>
                    </div>
                    <div className="gx-ct-channels">
                      {channels.length === 0 ? <p className="gx-ct-missing">No phone or email</p> : channels.map((channel) => {
                        const Icon = channel.icon;
                        return (
                          <p key={channel.id} className="gx-ct-channel" title={channel.full}>
                            <Icon size={15} aria-hidden="true" />
                            <span className="gx-sr">{channel.label}</span>
                            <span>{channel.text}</span>
                          </p>
                        );
                      })}
                    </div>
                    <div className="gx-ct-aside">
                      {pendingId === row.id ? <span className="gx-ct-pending">Updating…</span> : null}
                      <span className={`gx-ct-status${active ? ' is-active' : ' is-inactive'}`}>
                        <i aria-hidden="true" />
                        {contactStatusLabel(row.status)}
                      </span>
                      <ContactActions
                        name={row.name}
                        status={row.status}
                        open={openMenuId === row.id}
                        disabled={saving}
                        onOpenChange={(next) => setOpenMenuId(next ? row.id : '')}
                        onEdit={() => openEdit(row)}
                        onActivate={() => onActivate(row)}
                        onDeactivate={() => askDeactivate(row)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}

      {editorOpen ? (
        <ContactDialog title={editorTitle} description={editorCopy} onClose={closeEditor}>
          <form className="gx-ct-form" noValidate onSubmit={onSubmit}>
            {formError ? <p className="gx-ct-form-error" role="alert">{formError}</p> : null}
            <ContactFields draft={draft} errors={errors} disabled={saving} onChange={setField} />
            <div className="gx-ct-foot">
              <button type="button" className="gx-btn" onClick={closeEditor} disabled={saving}>Cancel</button>
              <button type="submit" className="gx-lime" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Save contact'}</button>
            </div>
          </form>
        </ContactDialog>
      ) : null}

      {confirming ? (
        <ContactDialog
          title="Deactivate contact"
          description={`${confirming.name} stays in the history and can be activated again.`}
          onClose={() => { if (!saving) { setConfirming(null); setActionError(''); } }}
        >
          {actionError ? <p className="gx-ct-form-error" role="alert">{actionError}</p> : null}
          <div className="gx-ct-foot">
            <button type="button" className="gx-btn" onClick={() => { setConfirming(null); setActionError(''); }} disabled={saving}>Cancel</button>
            <button type="button" className="gx-ct-danger" onClick={onConfirmDeactivate} disabled={saving}>{saving ? 'Deactivating…' : 'Deactivate'}</button>
          </div>
        </ContactDialog>
      ) : null}
    </section>
  );
}
