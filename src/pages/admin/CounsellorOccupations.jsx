import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bar, BarChart, Tooltip, XAxis, YAxis } from 'recharts';
import {
  getCounsellorOccupations,
  getCounsellorOccupationCategories,
  getStoredToken,
} from '../../utils/adminApi';
import { useAuth } from '../../hooks/useAuth';
import {
  FiBriefcase,
  FiUsers,
  FiSearch,
  FiSliders,
  FiChevronLeft,
  FiChevronRight,
  FiAlertCircle,
  FiInbox,
  FiCopy,
  FiFileText,
  FiCheckCircle,
  FiLayers,
  FiMinusCircle,
  FiChevronDown,
  FiX,
} from 'react-icons/fi';
import CopyToSheetsModal from '../../components/Admin/CopyToSheetsModal';
import ChartContainer from '../../components/Admin/ChartContainer';
import AdminChartFrame from '../../components/Admin/AdminChartFrame';
import { ADMIN_VIEW_ALL_LIMIT } from '../../constants/adminListLimits';
import { fetchAllPaginatedRows } from '../../utils/adminPagedFetch';

const CHIP_LIMIT = 16;

const FUNNEL_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'form_submitted', label: 'Form submitted' },
  { value: 'otp_verified', label: 'OTP verified' },
  { value: 'slot_booked', label: 'Slot booked' },
  { value: 'demo_attended', label: 'Demo attended' },
  { value: 'assessment_written', label: 'Assessment written' },
  { value: 'activation_filled', label: 'Activation filled' },
];

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { dateStyle: 'short' }) + ' ' + date.toLocaleTimeString('en-IN', { timeStyle: 'short' });
}

const COPY_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'occupationCategory', label: 'Occupation' },
  { key: 'occupationRaw', label: 'Raw occupation' },
  { key: 'funnelStatusLabel', label: 'Status' },
  { key: 'source', label: 'Source' },
  { key: 'email', label: 'Email' },
  { key: 'createdAt', label: 'Created' },
];

function getOccupationCellValue(row, key) {
  const v = row[key];
  if (key === 'createdAt') return v ? formatDate(v) : '';
  if (v == null || v === '') return '';
  return String(v);
}

function sourceBadgeClass(sourceKey) {
  if (sourceKey === 'both') return 'bg-emerald-100 text-emerald-800';
  if (sourceKey === 'activation') return 'bg-indigo-100 text-indigo-800';
  return 'bg-sky-100 text-sky-800';
}

function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`;
}

function formatCount(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

function occupationsForApi(selected, allCategories) {
  if (!Array.isArray(selected) || selected.length === 0) return undefined;
  if (allCategories.length > 0 && selected.length >= allCategories.length) return undefined;
  return selected;
}

function funnelStatusBadgeClass(status) {
  if (status === 'activation_filled') return 'bg-emerald-100 text-emerald-800';
  if (status === 'assessment_written') return 'bg-violet-100 text-violet-800';
  if (status === 'demo_attended') return 'bg-indigo-100 text-indigo-800';
  if (status === 'slot_booked') return 'bg-sky-100 text-sky-800';
  if (status === 'otp_verified') return 'bg-amber-100 text-amber-800';
  if (status === 'form_submitted') return 'bg-slate-100 text-slate-800';
  return 'bg-gray-100 text-gray-600';
}

function OccupationMultiSelect({ categories, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 240 });
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const updateMenuPos = () => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(320, Math.max(rect.width, 240));
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
    if (left < 8) left = 8;
    setMenuPos({ top: rect.bottom + 4, left, width });
  };

  useEffect(() => {
    if (!open) return undefined;
    updateMenuPos();
    const onReposition = () => updateMenuPos();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      const target = event.target;
      if (wrapRef.current && wrapRef.current.contains(target)) return;
      if (menuRef.current && menuRef.current.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = !term
      ? categories
      : categories.filter((item) => String(item.category || '').toLowerCase().includes(term));
    const selectedFirst = [];
    const rest = [];
    for (const item of list) {
      if (selectedSet.has(item.category)) selectedFirst.push(item);
      else rest.push(item);
    }
    return [...selectedFirst, ...rest];
  }, [categories, query, selectedSet]);

  const toggle = (category) => {
    const next = selectedSet.has(category)
      ? selected.filter((item) => item !== category)
      : [...selected, category];
    onChange(next);
  };

  const selectedFilteredCount = filtered.filter((item) => selectedSet.has(item.category)).length;
  const allFilteredSelected = filtered.length > 0 && selectedFilteredCount === filtered.length;
  const someFilteredSelected = selectedFilteredCount > 0 && !allFilteredSelected;

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const remove = new Set(filtered.map((item) => item.category));
      onChange(selected.filter((item) => !remove.has(item)));
      return;
    }
    const next = new Set(selected);
    filtered.forEach((item) => next.add(item.category));
    onChange([...next]);
  };

  const selectAllRef = (node) => {
    if (node) node.indeterminate = someFilteredSelected;
  };

  const label = selected.length === 0 ? 'All occupations' : `${selected.length} selected`;

  return (
    <div ref={wrapRef} className="relative min-w-[200px]">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full min-w-[200px] py-2.5 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#003366]/20 outline-none text-sm bg-white text-left inline-flex items-center justify-between gap-2"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Occupation categories"
      >
        <span className="truncate">{label}</span>
        <FiChevronDown className={`w-4 h-4 shrink-0 text-gray-500 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
            zIndex: 80,
          }}
        >
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search occupations..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#003366]/20"
                aria-label="Search occupation options"
              />
            </div>
          </div>
          {filtered.length > 0 && (
            <label className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-900 border-b border-gray-100 bg-slate-50 cursor-pointer">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAll}
                className="rounded border-gray-300 text-[#003366] focus:ring-[#003366]"
                aria-label="Select all occupations"
              />
              <span className="flex-1">Select all</span>
              <span className="text-xs font-normal text-gray-400 tabular-nums">
                {query.trim()
                  ? `${selectedFilteredCount}/${filtered.length}`
                  : filtered.length.toLocaleString('en-IN')}
              </span>
            </label>
          )}
          <div className="max-h-[min(70vh,420px)] overflow-y-auto py-1" role="listbox" aria-multiselectable="true">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-500">No occupations match.</p>
            ) : (
              filtered.map((item) => {
                const checked = selectedSet.has(item.category);
                return (
                  <label
                    key={item.category}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-800 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(item.category)}
                      className="rounded border-gray-300 text-[#003366] focus:ring-[#003366]"
                    />
                    <span className="truncate flex-1">{item.category}</span>
                    <span className="text-xs text-gray-400 tabular-nums">{item.count}</span>
                  </label>
                );
              })
            )}
          </div>
          <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500">
              {filtered.length === categories.length
                ? `${categories.length.toLocaleString('en-IN')} occupations`
                : `${filtered.length.toLocaleString('en-IN')} of ${categories.length.toLocaleString('en-IN')}`}
            </span>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs font-medium text-[#003366] hover:underline"
              >
                Clear occupations
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const FUNNEL_NODE_META = {
  selected: { label: 'Selected people', parent: null, tone: 'root' },
  form_submitted: { label: 'Form submitted', parent: 'selected', tone: 'yes' },
  form_not_submitted: { label: 'Form not submitted', parent: 'selected', tone: 'no' },
  otp_verified: { label: 'OTP verified', parent: 'form_submitted', tone: 'yes' },
  otp_not_verified: { label: 'OTP not verified', parent: 'form_submitted', tone: 'no' },
  slot_booked: { label: 'Slot booked', parent: 'otp_verified', tone: 'yes' },
  slot_not_booked: { label: 'Slot not booked', parent: 'otp_verified', tone: 'no' },
  demo_attended: { label: 'Demo attended', parent: 'slot_booked', tone: 'yes' },
  demo_not_attended: { label: 'Demo not attended', parent: 'slot_booked', tone: 'no' },
  activation_filled: { label: 'Activation filled', parent: 'demo_attended', tone: 'yes' },
  activation_not_filled: { label: 'Activation not filled', parent: 'demo_attended', tone: 'no' },
};

const TREE_CARD_W = 196;
const TREE_CARD_H = 104;
const TREE_COL_GAP = 80;
const TREE_ROW_GAP = 48;
const TREE_STEM = 22;
const TREE_RADIUS = 10;
const TREE_LEVELS = [
  ['form_submitted', 'form_not_submitted'],
  ['otp_verified', 'otp_not_verified'],
  ['slot_booked', 'slot_not_booked'],
  ['demo_attended', 'demo_not_attended'],
  ['activation_filled', 'activation_not_filled'],
];

function funnelNodePercent(tree, nodeId) {
  const meta = FUNNEL_NODE_META[nodeId];
  const count = Number(tree?.[nodeId] || 0);
  if (!meta?.parent) return count ? 100 : 0;
  const parentCount = Number(tree?.[meta.parent] || 0);
  if (!parentCount) return 0;
  return Math.round((count / parentCount) * 1000) / 10;
}

function branchPath(fromX, midY, toX, toY, radius = TREE_RADIUS) {
  const sign = toX > fromX ? 1 : -1;
  const r = Math.min(radius, Math.abs(toX - fromX) / 2, Math.max(1, toY - midY - 1));
  return `M ${fromX} ${midY} L ${toX - sign * r} ${midY} Q ${toX} ${midY} ${toX} ${midY + r} L ${toX} ${toY}`;
}

function FunnelTreeCard({ nodeId, tree, selectedId, onSelect }) {
  const meta = FUNNEL_NODE_META[nodeId];
  const count = Number(tree?.[nodeId] || 0);
  const pct = funnelNodePercent(tree, nodeId);
  const selected = selectedId === nodeId;
  const disabled = count === 0;
  const tone = meta.tone;
  const isRoot = tone === 'root';
  const isDrop = tone === 'no';
  const filled = selected || (isRoot && !selectedId);
  const barWidth = Math.min(100, Math.max(0, pct));

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(nodeId)}
      aria-pressed={selected}
      aria-label={`${meta.label}, ${formatCount(count)} people, ${formatPercent(pct)} of parent`}
      style={{ width: TREE_CARD_W, height: TREE_CARD_H }}
      className={`relative overflow-hidden text-left rounded-2xl border transition-all duration-150 ${
        filled
          ? 'border-[#003366] bg-[#003366] text-white shadow-md'
          : isDrop
            ? 'border-slate-200 bg-slate-50 text-slate-700 shadow-sm hover:border-slate-300'
            : 'border-slate-200/90 bg-white text-[#003366] shadow-sm hover:border-[#003366]/30 hover:shadow-md'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {!filled && (
        <span className={`absolute inset-y-0 left-0 w-[3px] ${isDrop ? 'bg-slate-300' : 'bg-[#003366]'}`} />
      )}
      <div className={`h-full flex flex-col ${filled ? 'px-4 py-3' : 'pl-4 pr-3.5 py-3'}`}>
        <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] leading-none ${
          filled ? 'text-white/70' : 'text-slate-500'
        }`}>
          {meta.label}
        </p>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className={`text-[26px] leading-none font-semibold tabular-nums tracking-tight ${
            filled ? 'text-white' : isDrop ? 'text-slate-600' : 'text-[#003366]'
          }`}>
            {formatCount(count)}
          </span>
          <span className={`text-[11px] ${filled ? 'text-white/55' : 'text-slate-400'}`}>people</span>
        </div>
        <div className="mt-auto">
          <p className={`text-[11px] tabular-nums mb-1.5 ${filled ? 'text-white/70' : 'text-slate-500'}`}>
            <span className={`font-semibold ${filled ? 'text-white' : isDrop ? 'text-slate-600' : 'text-[#003366]'}`}>
              {formatPercent(pct)}
            </span>
            {' '}{meta.parent ? 'of parent' : 'of filtered set'}
          </p>
          <div className={`h-1 rounded-full overflow-hidden ${filled ? 'bg-white/20' : 'bg-slate-100'}`}>
            <div
              className={`h-full rounded-full ${filled ? 'bg-white' : isDrop ? 'bg-slate-400' : 'bg-[#003366]'}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}

function ConversionTree({ tree, selectedId, onSelect, occupationCount }) {
  const width = TREE_CARD_W * 2 + TREE_COL_GAP;
  const height = TREE_CARD_H + TREE_LEVELS.length * (TREE_ROW_GAP + TREE_CARD_H);
  const leftX = Math.round(TREE_CARD_W / 2);
  const rightX = Math.round(TREE_CARD_W + TREE_COL_GAP + TREE_CARD_W / 2);
  const rootX = Math.round(width / 2);
  const trunk = [];
  const branches = [];
  const joints = [];

  TREE_LEVELS.forEach((_, index) => {
    const childTop = TREE_CARD_H + TREE_ROW_GAP + index * (TREE_CARD_H + TREE_ROW_GAP);
    const fromY = index === 0 ? TREE_CARD_H : childTop - TREE_ROW_GAP;
    const midY = fromY + TREE_STEM;
    if (index === 0) {
      trunk.push(`M ${rootX} ${fromY} L ${rootX} ${midY}`);
      trunk.push(branchPath(rootX, midY, leftX, childTop));
      branches.push(branchPath(rootX, midY, rightX, childTop));
      joints.push({ x: rootX, y: midY });
    } else {
      trunk.push(`M ${leftX} ${fromY} L ${leftX} ${childTop}`);
      branches.push(branchPath(leftX, midY, rightX, childTop));
      joints.push({ x: leftX, y: midY });
    }
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden mb-6">
      <div className="h-1 w-full bg-linear-to-r from-[#003366] to-[#004080]" />
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Conversion of currently filtered people</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {occupationCount.toLocaleString('en-IN')} occupation{occupationCount === 1 ? '' : 's'} selected
          </p>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#003366]" />
            Continued
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Dropped off
          </span>
        </div>
      </div>
      <div className="overflow-x-auto px-6 py-7 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_48%)]">
        <div className="relative mx-auto" style={{ width, height }}>
          <svg
            className="absolute inset-0 pointer-events-none"
            width={width}
            height={height}
            aria-hidden="true"
          >
            {branches.map((d, i) => (
              <path
                key={`b-${i}`}
                d={d}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {trunk.map((d, i) => (
              <path
                key={`t-${i}`}
                d={d}
                fill="none"
                stroke="#003366"
                strokeWidth="2"
                strokeOpacity="0.45"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {joints.map((joint, i) => (
              <circle
                key={`j-${i}`}
                cx={joint.x}
                cy={joint.y}
                r="3.25"
                fill="#fff"
                stroke="#003366"
                strokeWidth="1.5"
                strokeOpacity="0.55"
              />
            ))}
          </svg>
          <div className="absolute" style={{ left: (width - TREE_CARD_W) / 2, top: 0 }}>
            <FunnelTreeCard nodeId="selected" tree={tree} selectedId={selectedId} onSelect={onSelect} />
          </div>
          {TREE_LEVELS.map(([yesId, noId], index) => {
            const top = TREE_CARD_H + TREE_ROW_GAP + index * (TREE_CARD_H + TREE_ROW_GAP);
            return (
              <div key={yesId}>
                <div className="absolute" style={{ left: 0, top }}>
                  <FunnelTreeCard nodeId={yesId} tree={tree} selectedId={selectedId} onSelect={onSelect} />
                </div>
                <div className="absolute" style={{ left: TREE_CARD_W + TREE_COL_GAP, top }}>
                  <FunnelTreeCard nodeId={noId} tree={tree} selectedId={selectedId} onSelect={onSelect} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OccupationPeopleTable({
  records,
  pagination,
  viewAll,
  onPrev,
  onNext,
  emptyMessage,
}) {
  const rows = Array.isArray(records) ? records : [];
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
        <div className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 mb-4">
            <FiInbox className="w-8 h-8" />
          </div>
          <p className="text-gray-500 text-sm">{emptyMessage || 'No people in this group.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[1000px] w-full text-left text-sm">
          <thead>
            <tr className="bg-linear-to-r from-gray-50 to-slate-50 border-b border-gray-200">
              <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Name</th>
              <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Phone</th>
              <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Occupation</th>
              <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Raw occupation</th>
              <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Status</th>
              <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Source</th>
              <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Email</th>
              <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id || row.phone} className="hover:bg-[#003366]/4 transition-colors">
                <td className="px-4 py-3 align-middle font-medium text-gray-900">{row.name || '—'}</td>
                <td className="px-4 py-3 align-middle text-gray-700 whitespace-nowrap font-mono text-xs">{row.phone || '—'}</td>
                <td className="px-4 py-3 align-middle">
                  <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-800">
                    {row.occupationCategory || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle text-gray-600 max-w-[220px] truncate" title={row.occupationRaw || ''}>
                  {row.occupationRaw || '—'}
                </td>
                <td className="px-4 py-3 align-middle">
                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${funnelStatusBadgeClass(row.funnelStatus)}`}>
                    {row.funnelStatusLabel || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle">
                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${sourceBadgeClass(row.sourceKey)}`}>
                    {row.source || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle text-gray-700 max-w-[180px] truncate" title={row.email || ''}>{row.email || '—'}</td>
                <td className="px-4 py-3 align-middle text-gray-500 whitespace-nowrap text-xs">{formatDate(row.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 bg-gray-50/80 border-t border-gray-200">
        {viewAll ? (
          <p className="text-sm text-gray-500">
            {pagination.total > ADMIN_VIEW_ALL_LIMIT
              ? `Showing first ${ADMIN_VIEW_ALL_LIMIT.toLocaleString()} of ${pagination.total} people`
              : `Showing all ${pagination.total} people`}
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Page <span className="font-semibold text-gray-900">{pagination.page}</span> of <span className="font-semibold text-gray-900">{pagination.totalPages}</span>
              <span className="text-gray-500 ml-1">({pagination.total} total)</span>
            </p>
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onPrev}
                  disabled={pagination.page <= 1}
                  className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FiChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  disabled={pagination.page >= pagination.totalPages}
                  className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CounsellorOccupations() {
  const { logout } = useAuth();
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ uniquePeople: 0, applyOnly: 0, activationOnly: 0, both: 0 });
  const [categories, setCategories] = useState([]);
  const [overview, setOverview] = useState({
    uniquePeople: 0,
    distinctOccupations: 0,
    specified: 0,
    notSpecified: 0,
    singletonCategories: 0,
    topCategory: null,
  });
  const [overviewSearch, setOverviewSearch] = useState('');
  const [filters, setFilters] = useState({
    q: '',
    from: '',
    to: '',
    occupations: [],
    source: '',
    status: '',
  });
  const [viewAll, setViewAll] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyRecords, setCopyRecords] = useState([]);
  const [funnelTree, setFunnelTree] = useState(null);
  const [funnelNode, setFunnelNode] = useState('');
  const [nodeRecords, setNodeRecords] = useState([]);
  const [nodePagination, setNodePagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [nodeLoading, setNodeLoading] = useState(false);
  const [nodeError, setNodeError] = useState('');
  const [nodeViewAll, setNodeViewAll] = useState(false);
  const cancelledRef = useRef(false);
  const categoriesCancelledRef = useRef(false);
  const requestIdRef = useRef(0);
  const nodeRequestIdRef = useRef(0);
  const nodeCancelledRef = useRef(false);

  useEffect(() => {
    categoriesCancelledRef.current = false;
    getCounsellorOccupationCategories(
      { from: filters.from || undefined, to: filters.to || undefined },
      getStoredToken()
    ).then((result) => {
      if (categoriesCancelledRef.current) return;
      if (!result.success) return;
      const payload = result.data?.data || result.data || {};
      const list = payload.categories || [];
      setCategories(Array.isArray(list) ? list : []);
      setOverview({
        uniquePeople: payload.uniquePeople ?? 0,
        distinctOccupations: payload.distinctOccupations ?? (Array.isArray(list) ? list.length : 0),
        specified: payload.specified ?? 0,
        notSpecified: payload.notSpecified ?? 0,
        singletonCategories: payload.singletonCategories ?? 0,
        topCategory: payload.topCategory || null,
      });
    });
    return () => { categoriesCancelledRef.current = true; };
  }, [filters.from, filters.to]);

  useEffect(() => {
    cancelledRef.current = false;
    requestIdRef.current += 1;
    const thisRequestId = requestIdRef.current;
    const page = viewAll ? 1 : pagination.page;
    const limit = viewAll ? ADMIN_VIEW_ALL_LIMIT : pagination.limit;
    const params = {
      page,
      limit,
      q: filters.q.trim() || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      occupations: occupationsForApi(filters.occupations, categories),
      source: filters.source || undefined,
      status: filters.status || undefined,
    };
    queueMicrotask(() => {
      if (cancelledRef.current) return;
      setLoading(true);
      setError('');
    });
    getCounsellorOccupations(params, getStoredToken()).then((result) => {
      if (cancelledRef.current) return;
      if (thisRequestId !== requestIdRef.current) return;
      setLoading(false);
      if (!result.success) {
        if (result.status === 401) {
          logout();
          window.location.href = '/admin/login';
          return;
        }
        setRecords([]);
        setFunnelTree(null);
        setError(result.message || 'Failed to load counsellor occupations');
        return;
      }
      const raw = result.data;
      const dataList = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      const paginationData = raw?.pagination ?? { page: 1, limit: 25, total: 0, totalPages: 1 };
      const responseStats = raw?.stats ?? {};
      setRecords(dataList);
      setPagination(paginationData);
      setStats({
        uniquePeople: responseStats.uniquePeople ?? paginationData.total ?? 0,
        applyOnly: responseStats.applyOnly ?? 0,
        activationOnly: responseStats.activationOnly ?? 0,
        both: responseStats.both ?? 0,
      });
      setFunnelTree(
        filters.occupations.length > 0 && responseStats.funnelTree && typeof responseStats.funnelTree === 'object'
          ? responseStats.funnelTree
          : null
      );
    });
    return () => { cancelledRef.current = true; };
  }, [viewAll, pagination.page, pagination.limit, filters.q, filters.from, filters.to, filters.occupations, filters.source, filters.status, categories, logout]);

  useEffect(() => {
    if (!funnelNode || filters.occupations.length === 0) {
      setNodeRecords([]);
      setNodeLoading(false);
      return undefined;
    }
    nodeCancelledRef.current = false;
    nodeRequestIdRef.current += 1;
    const thisRequestId = nodeRequestIdRef.current;
    const page = nodeViewAll ? 1 : nodePagination.page;
    const limit = nodeViewAll ? ADMIN_VIEW_ALL_LIMIT : nodePagination.limit;
    const params = {
      page,
      limit,
      q: filters.q.trim() || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      occupations: occupationsForApi(filters.occupations, categories),
      source: filters.source || undefined,
      status: filters.status || undefined,
      funnelNode,
    };
    queueMicrotask(() => {
      if (nodeCancelledRef.current) return;
      setNodeLoading(true);
      setNodeError('');
    });
    getCounsellorOccupations(params, getStoredToken()).then((result) => {
      if (nodeCancelledRef.current) return;
      if (thisRequestId !== nodeRequestIdRef.current) return;
      setNodeLoading(false);
      if (!result.success) {
        if (result.status === 401) {
          logout();
          window.location.href = '/admin/login';
          return;
        }
        setNodeRecords([]);
        setNodeError(result.message || 'Failed to load people for this step');
        return;
      }
      const raw = result.data;
      const dataList = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      const paginationData = raw?.pagination ?? { page: 1, limit: 25, total: 0, totalPages: 1 };
      setNodeRecords(dataList);
      setNodePagination(paginationData);
    });
    return () => { nodeCancelledRef.current = true; };
  }, [funnelNode, nodeViewAll, nodePagination.page, nodePagination.limit, filters.q, filters.from, filters.to, filters.occupations, filters.source, filters.status, categories, logout]);

  const goToPage = (p) => {
    const next = Math.max(1, Math.min(p, pagination.totalPages));
    setPagination((prev) => ({ ...prev, page: next }));
  };

  const goToNodePage = (p) => {
    const next = Math.max(1, Math.min(p, nodePagination.totalPages));
    setNodePagination((prev) => ({ ...prev, page: next }));
  };

  const resetNodeDrilldown = () => {
    setFunnelNode('');
    setNodeRecords([]);
    setNodeError('');
    setNodeViewAll(false);
    setNodePagination({ page: 1, limit: 25, total: 0, totalPages: 1 });
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
    resetNodeDrilldown();
    if (key === 'occupations') setFunnelTree(null);
  };

  const toggleOccupationChip = (category) => {
    const next = filters.occupations.includes(category)
      ? filters.occupations.filter((item) => item !== category)
      : [...filters.occupations, category];
    handleFilterChange('occupations', next);
  };

  const clearFilters = () => {
    setFilters({ q: '', from: '', to: '', occupations: [], source: '', status: '' });
    setPagination((prev) => ({ ...prev, page: 1 }));
    resetNodeDrilldown();
    setFunnelTree(null);
  };

  const handleViewAllChange = (e) => {
    setViewAll(e.target.checked);
    if (!e.target.checked) setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleNodeViewAllChange = (e) => {
    setNodeViewAll(e.target.checked);
    if (!e.target.checked) setNodePagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFunnelNodeSelect = (nodeId) => {
    const count = Number(funnelTree?.[nodeId] || 0);
    if (!count) return;
    setFunnelNode((prev) => (prev === nodeId ? '' : nodeId));
    setNodePagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = filters.q || filters.from || filters.to || filters.occupations.length > 0 || filters.source || filters.status;
  const visibleChips = categories.slice(0, CHIP_LIMIT);
  const chartData = useMemo(
    () => categories.slice(0, 15).map((item) => ({
      name: item.category,
      count: item.count,
      category: item.category,
    })),
    [categories]
  );
  const breakdownRows = useMemo(() => {
    const term = overviewSearch.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((item) => String(item.category || '').toLowerCase().includes(term));
  }, [categories, overviewSearch]);
  const chartHeight = Math.max(256, chartData.length * 28);

  const listParams = {
    q: filters.q.trim() || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    occupations: occupationsForApi(filters.occupations, categories),
    source: filters.source || undefined,
    status: filters.status || undefined,
  };

  const prepareCopyRecords = async (nodeId) => {
    setCopyLoading(true);
    setError('');
    const result = await fetchAllPaginatedRows((page, limit) =>
      getCounsellorOccupations({
        ...listParams,
        page,
        limit,
        ...(nodeId ? { funnelNode: nodeId } : {}),
      }, getStoredToken())
    );
    setCopyLoading(false);
    if (!result.success) {
      const r = result.result;
      if (r?.status === 401) {
        logout();
        window.location.href = '/admin/login';
        return;
      }
      setError(r?.message || 'Failed to load occupations for copy');
      return;
    }
    setCopyRecords(result.rows || []);
    setCopyModalOpen(true);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-1">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-linear-to-br from-[#003366] to-[#004080] text-white shadow-lg">
            <FiBriefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Counsellors occupations</h1>
            <p className="text-sm text-gray-500 mt-0.5">Unique counsellors from the apply form and activation form, grouped by occupation category</p>
          </div>
        </div>
      </div>

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-linear-to-r from-[#003366] to-[#004080]" />
            <div className="p-5 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#003366]/10 text-[#003366]">
                <FiUsers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Unique people</p>
                <p className="text-2xl font-bold text-gray-900">{stats.uniquePeople}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-sky-500" />
            <div className="p-5 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-sky-50 text-sky-600">
                <FiFileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Apply form only</p>
                <p className="text-2xl font-bold text-gray-900">{stats.applyOnly}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-indigo-500" />
            <div className="p-5 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600">
                <FiFileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Activation form only</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activationOnly}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-emerald-500" />
            <div className="p-5 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600">
                <FiCheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Both forms</p>
                <p className="text-2xl font-bold text-gray-900">{stats.both}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div className="mb-6 space-y-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Occupation mix</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1 w-full bg-slate-500" />
              <div className="p-5 flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-slate-700">
                  <FiLayers className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Distinct occupations</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCount(overview.distinctOccupations)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatCount(overview.singletonCategories)} with 1 person</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1 w-full bg-[#003366]" />
              <div className="p-5 flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#003366]/10 text-[#003366]">
                  <FiBriefcase className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Specified occupation</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCount(overview.specified)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatPercent(overview.uniquePeople ? (overview.specified / overview.uniquePeople) * 100 : 0)} of unique people
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1 w-full bg-amber-500" />
              <div className="p-5 flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 text-amber-600">
                  <FiMinusCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Not specified</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCount(overview.notSpecified)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Empty or placeholder occupation</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => overview.topCategory && toggleOccupationChip(overview.topCategory.category)}
              className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden text-left hover:border-[#003366]/30 transition-colors"
            >
              <div className="h-1 w-full bg-emerald-500" />
              <div className="p-5 flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600">
                  <FiUsers className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-500">Top occupation</p>
                  <p className="text-lg font-bold text-gray-900 truncate" title={overview.topCategory?.category || ''}>
                    {overview.topCategory?.category || '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {overview.topCategory
                      ? `${formatCount(overview.topCategory.count)} people · ${formatPercent(overview.topCategory.percent)}`
                      : 'No data'}
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartContainer
              title="Top occupations"
              subtitle={`Largest ${Math.min(15, chartData.length)} of ${formatCount(overview.distinctOccupations)} occupations · ${formatCount(overview.uniquePeople)} unique people`}
              empty={chartData.length === 0}
              emptyMessage="No occupations in this date range"
            >
              {chartData.length > 0 && (
                <AdminChartFrame height={chartHeight}>
                  <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#64748b" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      tick={{ fontSize: 11 }}
                      stroke="#64748b"
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                      formatter={(value) => [formatCount(value), 'People']}
                    />
                    <Bar
                      dataKey="count"
                      name="People"
                      fill="#003366"
                      radius={[0, 4, 4, 0]}
                      cursor="pointer"
                      onClick={(entry) => {
                        const category = entry?.payload?.category || entry?.category;
                        if (category) toggleOccupationChip(category);
                      }}
                    />
                  </BarChart>
                </AdminChartFrame>
              )}
            </ChartContainer>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden min-w-0">
              <div className="px-5 py-3 border-b border-gray-200 flex flex-wrap items-center gap-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-[#003366]">All occupations</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Click a row to add or remove that occupation in the people filter</p>
                </div>
                <div className="relative ml-auto min-w-[180px] max-w-xs flex-1">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="search"
                    placeholder="Search occupations..."
                    value={overviewSearch}
                    onChange={(e) => setOverviewSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] outline-none text-sm"
                    aria-label="Search occupation breakdown"
                  />
                </div>
              </div>
              <div className="overflow-auto max-h-[420px]">
                <table className="min-w-[640px] w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-2.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Occupation</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-700 text-xs uppercase tracking-wider text-right">People</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-700 text-xs uppercase tracking-wider text-right">Share</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-700 text-xs uppercase tracking-wider text-right">Apply</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-700 text-xs uppercase tracking-wider text-right">Activation</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-700 text-xs uppercase tracking-wider text-right">Both</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {breakdownRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                          No occupations match this search.
                        </td>
                      </tr>
                    ) : (
                      breakdownRows.map((item) => {
                        const active = filters.occupations.includes(item.category);
                        return (
                          <tr
                            key={item.category}
                            className={`cursor-pointer transition-colors ${active ? 'bg-[#003366]/8' : 'hover:bg-[#003366]/4'}`}
                            onClick={() => toggleOccupationChip(item.category)}
                          >
                            <td className="px-4 py-2.5 font-medium text-gray-900">{item.category}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">{formatCount(item.count)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">{formatPercent(item.percent)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{formatCount(item.applyOnly)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{formatCount(item.activationOnly)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{formatCount(item.both)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-500">
                Showing {formatCount(breakdownRows.length)} of {formatCount(categories.length)} occupations
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-lg mb-6">
        <div className="bg-linear-to-r from-gray-50 to-slate-50 px-5 py-3 border-b border-gray-200 flex items-center gap-2 rounded-t-2xl">
          <FiSliders className="w-5 h-5 text-gray-500" />
          <span className="font-semibold text-gray-800">Filters</span>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Search name, phone, email, occupation..."
                value={filters.q}
                onChange={(e) => handleFilterChange('q', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] outline-none text-sm"
                aria-label="Search counsellors"
              />
            </div>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => handleFilterChange('from', e.target.value)}
              className="py-2.5 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#003366]/20 outline-none text-sm min-w-[140px]"
              aria-label="From date"
            />
            <input
              type="date"
              value={filters.to}
              onChange={(e) => handleFilterChange('to', e.target.value)}
              className="py-2.5 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#003366]/20 outline-none text-sm min-w-[140px]"
              aria-label="To date"
            />
            <OccupationMultiSelect
              categories={categories}
              selected={filters.occupations}
              onChange={(next) => handleFilterChange('occupations', next)}
            />
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="py-2.5 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#003366]/20 outline-none text-sm min-w-[180px]"
              aria-label="Funnel status"
            >
              {FUNNEL_STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={filters.source}
              onChange={(e) => handleFilterChange('source', e.target.value)}
              className="py-2.5 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#003366]/20 outline-none text-sm min-w-[160px]"
              aria-label="Source"
            >
              <option value="">All sources</option>
              <option value="apply">Apply form</option>
              <option value="activation">Activation form</option>
              <option value="both">Both</option>
            </select>
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700 ml-2 pl-2 border-l border-gray-200">
              <input
                type="checkbox"
                checked={viewAll}
                onChange={handleViewAllChange}
                className="rounded border-gray-300 text-primary-blue-500 focus:ring-primary-blue-500"
                aria-label="View all counsellors in one list"
              />
              View all
            </label>
            <button
              type="button"
              onClick={() => prepareCopyRecords()}
              disabled={copyLoading}
              className="inline-flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              aria-label="Copy all to sheets"
            >
              <FiCopy className="w-4 h-4" /> {copyLoading ? 'Preparing...' : 'Copy all'}
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="py-2.5 px-4 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>

          {filters.occupations.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {filters.occupations.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleOccupationChip(category)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#003366] text-white"
                  aria-label={`Remove ${category}`}
                >
                  {category}
                  <FiX className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}

          {visibleChips.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {visibleChips.map((item) => {
                const active = filters.occupations.includes(item.category);
                return (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() => toggleOccupationChip(item.category)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-[#003366] text-white border-[#003366]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-[#003366]/40 hover:bg-white'
                    }`}
                    aria-pressed={active}
                  >
                    {item.category}
                    <span className={active ? 'text-white/80' : 'text-slate-500'}>{item.count}</span>
                  </button>
                );
              })}
              {categories.length > CHIP_LIMIT && (
                <span className="inline-flex items-center text-xs text-slate-500 px-2 py-1.5">
                  +{categories.length - CHIP_LIMIT} more in the dropdown
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800" role="alert">
          <FiAlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden mb-6">
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#003366]/10 text-[#003366] mb-4">
              <svg className="animate-spin w-7 h-7" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">Loading occupations…</p>
            <p className="text-sm text-gray-400 mt-1">Please wait</p>
          </div>
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden mb-6">
          <div className="p-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gray-100 text-gray-400 mb-5">
              <FiInbox className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No counsellors found</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              {hasActiveFilters ? 'No people match your filters. Try clearing filters or adjusting dates.' : 'Counsellor occupations will appear here from the apply and activation forms.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 py-2.5 px-5 rounded-xl font-medium text-white bg-[#003366] hover:bg-[#004080] transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <OccupationPeopleTable
            records={records}
            pagination={pagination}
            viewAll={viewAll}
            onPrev={() => goToPage(pagination.page - 1)}
            onNext={() => goToPage(pagination.page + 1)}
          />
        </div>
      )}

      {filters.occupations.length > 0 && funnelTree && (
        <ConversionTree
          tree={funnelTree}
          selectedId={funnelNode}
          onSelect={handleFunnelNodeSelect}
          occupationCount={filters.occupations.length}
        />
      )}

      {filters.occupations.length > 0 && funnelNode && (
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {FUNNEL_NODE_META[funnelNode]?.label || 'Selected step'}
              </h2>
              <p className="text-sm text-gray-500">
                People in this conversion step ({formatCount(funnelTree?.[funnelNode] || nodePagination.total)})
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={nodeViewAll}
                  onChange={handleNodeViewAllChange}
                  className="rounded border-gray-300 text-primary-blue-500 focus:ring-primary-blue-500"
                  aria-label="View all people in this step"
                />
                View all
              </label>
              <button
                type="button"
                onClick={() => prepareCopyRecords(funnelNode)}
                disabled={copyLoading || nodeLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                aria-label="Copy people in this step to sheets"
              >
                <FiCopy className="w-4 h-4" /> {copyLoading ? 'Preparing...' : 'Copy all'}
              </button>
              <button
                type="button"
                onClick={resetNodeDrilldown}
                className="text-sm font-medium text-[#003366] hover:underline"
              >
                Clear step
              </button>
            </div>
          </div>
          {nodeError && (
            <div className="mb-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800" role="alert">
              <FiAlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">{nodeError}</span>
            </div>
          )}
          {nodeLoading ? (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
              <div className="p-12 text-center">
                <p className="text-gray-600 font-medium">Loading people for this step…</p>
              </div>
            </div>
          ) : (
            <OccupationPeopleTable
              records={nodeRecords}
              pagination={nodePagination}
              viewAll={nodeViewAll}
              onPrev={() => goToNodePage(nodePagination.page - 1)}
              onNext={() => goToNodePage(nodePagination.page + 1)}
              emptyMessage="No people in this conversion step."
            />
          )}
        </div>
      )}

      <CopyToSheetsModal
        fields={COPY_FIELDS}
        records={copyRecords}
        getCellValue={getOccupationCellValue}
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        recordLabel="counsellors"
        dedupeByPhoneKey="phone"
        loading={copyLoading}
      />
    </div>
  );
}
