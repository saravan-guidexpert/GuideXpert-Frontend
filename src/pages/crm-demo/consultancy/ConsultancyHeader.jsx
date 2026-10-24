import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMoreHorizontal } from 'react-icons/fi';
import { Badge } from '../CrmKit';
import { shortDate } from '../crmFormat';
import { callTone, followTone } from './overviewModel';
import useMatchMedia from './useMatchMedia';

export default function ConsultancyHeader({
  consultancy,
  originalCount,
  overdue,
  urgent,
  saving,
  onSchedule,
  onOpenFollowUp,
  onRemark,
  onStatus,
  onEdit,
  onStudents,
}) {
  const narrow = useMatchMedia('(max-width: 760px)');
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const contact = consultancy.primaryContact;
  const contactLine = contact
    ? [contact.name, contact.phone, contact.email].filter(Boolean).join(' · ')
    : 'No primary contact';
  const secondary = [
    { id: 'remark', label: 'Add remark', onClick: onRemark },
    { id: 'status', label: 'Update status', onClick: onStatus },
    { id: 'edit', label: 'Edit consultancy', onClick: onEdit },
  ];
  if (urgent) secondary.unshift({ id: 'schedule', label: 'Schedule call', onClick: onSchedule });

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onKey(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    function onPointer(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [menuOpen]);

  function runMenu(action) {
    setMenuOpen(false);
    action();
  }

  return (
    <header className="gx-ov-head">
      <div className="gx-ov-id">
        <p className="gx-crumb"><Link to="/crm/consultancies">Consultancies</Link> <span>/</span> {consultancy.name}</p>
        <div className="gx-ov-titlebar">
          <h2 className="gx-ov-title">{consultancy.name}</h2>
          <div className="gx-ov-actions">
            {narrow ? null : secondary.map((item) => (
              <button key={item.id} type="button" className="gx-btn gx-ov-quiet" onClick={item.onClick} disabled={saving}>{item.label}</button>
            ))}
            {narrow ? null : <span className="gx-ov-split" aria-hidden="true" />}
            <button type="button" className="gx-btn" onClick={onStudents}>View referred students</button>
            {urgent ? (
              <button type="button" className="gx-lime" onClick={onOpenFollowUp} disabled={saving}>Open follow-up</button>
            ) : (
              <button type="button" className="gx-lime" onClick={onSchedule} disabled={saving}>Schedule call</button>
            )}
            <div className="gx-ov-menu" ref={menuRef}>
              <button
                type="button"
                className="gx-btn gx-ov-icon"
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <FiMoreHorizontal size={16} aria-hidden="true" />
              </button>
              {menuOpen ? (
                <div className="gx-ov-pop" role="menu" aria-label="More actions">
                  {narrow ? secondary.map((item) => (
                    <button key={item.id} type="button" role="menuitem" onClick={() => runMenu(item.onClick)} disabled={saving}>{item.label}</button>
                  )) : null}
                  <Link role="menuitem" to="/crm/consultancies" onClick={() => setMenuOpen(false)}>Back to consultancies</Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <p className="gx-ov-contact">{contactLine}</p>
        <div className="gx-ov-badges">
          <Badge tone={consultancy.status === 'active' ? 'on' : 'off'}>{consultancy.status === 'active' ? 'Active' : 'Inactive'}</Badge>
          <Badge tone={followTone(consultancy.followUpStatus)}>{consultancy.followUpStatus}</Badge>
          <Badge tone={callTone(consultancy.callingStatus)}>{consultancy.callingStatus || 'No calling status'}</Badge>
          {overdue ? <span className="gx-ov-overdue"><Badge>Overdue</Badge></span> : null}
        </div>
        <ul className="gx-ov-facts">
          <li><span>Owner</span> <strong>{consultancy.ownerName || '—'}</strong></li>
          <li><span>Last contact</span> <strong>{shortDate(consultancy.lastContactAt)}</strong></li>
          <li><span>Next</span> <strong>{shortDate(consultancy.nextFollowUpAt)}</strong></li>
          <li>{originalCount == null ? <strong>—</strong> : <><strong>{originalCount}</strong> <span>{originalCount === 1 ? 'original referral' : 'original referrals'}</span></>}</li>
        </ul>
      </div>
    </header>
  );
}
