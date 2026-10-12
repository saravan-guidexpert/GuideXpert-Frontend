import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCopy, FiRefreshCw, FiSave, FiTrash2 } from 'react-icons/fi';
import {
  createSalesAnalyticsSavedUtmLink,
  deleteSalesAnalyticsSavedUtmLink,
  getSalesAnalyticsSavedUtmLinks,
  getStoredToken,
} from '../../utils/adminApi';
import { useAuth } from '../../hooks/useAuth';
import TableSkeleton from '../UI/TableSkeleton';
import {
  PLATFORMS,
  DEFAULT_CAMPAIGN,
  PLATFORM_TO_UTM_SOURCE,
  DEFAULT_REGISTRATION_PAGE_URL,
  ensureAbsoluteUtmUrl,
} from '../../constants/influencerAdminConstants';

const DEFAULT_REGISTER_BASE = (
  import.meta.env.VITE_REGISTRATION_BASE_URL || DEFAULT_REGISTRATION_PAGE_URL
).trim();

function buildRegistrationShareUrl(baseUrl, { utm_source, utm_medium, utm_campaign, utm_content }) {
  const base = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!base) return '';
  const p = new URLSearchParams();
  if (String(utm_source || '').trim()) p.set('utm_source', String(utm_source).trim());
  if (String(utm_medium || '').trim()) p.set('utm_medium', String(utm_medium).trim());
  if (String(utm_campaign || '').trim()) p.set('utm_campaign', String(utm_campaign).trim());
  if (String(utm_content || '').trim()) p.set('utm_content', String(utm_content).trim());
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

function mapCreateToRow(saved) {
  if (!saved || typeof saved !== 'object') return null;
  const id = saved.id != null ? String(saved.id) : (saved._id != null ? String(saved._id) : '');
  if (!id) return null;
  return {
    id,
    influencerName: saved.influencerName,
    platform: saved.platform,
    campaign: saved.campaign,
    utmLink: saved.utmLink,
    cost: saved.cost ?? null,
    createdAt: saved.createdAt,
  };
}

function formatSavedDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCost(value) {
  if (value == null || value === '' || (typeof value === 'number' && Number.isNaN(value))) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `₹ ${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const cardClass = 'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden';
const sectionHeaderClass = 'px-6 py-4 border-b border-gray-200 bg-gray-50/80 border-l-4 border-l-primary-navy';

export default function SalesAnalyticsUtmSection() {
  const { logout } = useAuth();
  const [influencerName, setInfluencerName] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [campaign, setCampaign] = useState(DEFAULT_CAMPAIGN);
  const [cost, setCost] = useState('');
  const [formError, setFormError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [copyFlash, setCopyFlash] = useState(false);

  const [rows, setRows] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [listHint, setListHint] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const previewLink = useMemo(() => {
    const name = influencerName.trim();
    if (!name) return '';
    const utmSource = PLATFORM_TO_UTM_SOURCE[platform] || String(platform || '').toLowerCase();
    const camp = (campaign || '').trim() || DEFAULT_CAMPAIGN;
    return buildRegistrationShareUrl(DEFAULT_REGISTER_BASE, {
      utm_source: utmSource,
      utm_medium: 'influencer',
      utm_campaign: camp,
      utm_content: name,
    });
  }, [influencerName, platform, campaign]);

  const fetchList = useCallback(() => {
    const t = getStoredToken();
    setListLoading(true);
    setListError('');
    setListHint('');
    getSalesAnalyticsSavedUtmLinks(t).then((result) => {
      setListLoading(false);
      if (!result.success) {
        if (result.status === 401) {
          logout();
          window.location.href = '/admin/login';
          return;
        }
        const msg = String(result.message || '').toLowerCase();
        const missing =
          result.status === 404 &&
          (msg === 'not found' || msg.includes('submission not found'));
        if (missing) {
          setListHint(
            'This list could not load from the server. Deploy the latest API or point your dev proxy at a local backend on port 5000.',
          );
          return;
        }
        setListError(result.message || 'Failed to load saved links');
        setRows([]);
        return;
      }
      const body = result.data;
      const list = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
      setRows(list);
    });
  }, [logout]);

  useEffect(() => {
    const id = window.setTimeout(() => fetchList(), 0);
    return () => window.clearTimeout(id);
  }, [fetchList]);

  const handleSave = async () => {
    setFormError('');
    setSaveSuccess('');
    if (!influencerName.trim()) {
      setFormError('Influencer name is required.');
      return;
    }
    const t = getStoredToken();
    setSaveLoading(true);
    const payload = {
      influencerName: influencerName.trim(),
      platform,
      campaign: (campaign || '').trim() || DEFAULT_CAMPAIGN,
    };
    const costTrimmed = typeof cost === 'string' ? cost.trim() : '';
    if (costTrimmed !== '') {
      const costNum = Number(costTrimmed);
      if (!Number.isNaN(costNum) && costNum >= 0) payload.cost = costNum;
    }
    const result = await createSalesAnalyticsSavedUtmLink(payload, t);
    setSaveLoading(false);
    if (!result.success) {
      if (result.status === 401) {
        logout();
        window.location.href = '/admin/login';
        return;
      }
      setFormError(result.message || 'Failed to save');
      return;
    }
    const body = result.data;
    const saved = body?.data != null && typeof body.data === 'object' ? body.data : body;
    const row = mapCreateToRow(saved);
    if (!row) {
      setFormError('Unexpected response from server.');
      return;
    }
    setSaveSuccess('Saved to this list (Analytics only—not Influencer / UTM Tracking).');
    setRows((prev) => {
      const idStr = String(row.id);
      return [row, ...prev.filter((r) => String(r.id) !== idStr)];
    });
  };

  const handleDelete = async (id) => {
    if (!id || !window.confirm('Delete this saved link from the Analytics list?')) return;
    const t = getStoredToken();
    setDeletingId(id);
    setListError('');
    const result = await deleteSalesAnalyticsSavedUtmLink(id, t);
    setDeletingId(null);
    if (!result.success) {
      if (result.status === 401) {
        logout();
        window.location.href = '/admin/login';
        return;
      }
      setListError(result.message || 'Failed to delete');
      return;
    }
    setRows((prev) => prev.filter((r) => String(r.id) !== String(id)));
  };

  const handleCopyPreview = () => {
    if (!previewLink) return;
    navigator.clipboard.writeText(previewLink).then(() => {
      setCopyFlash(true);
      setTimeout(() => setCopyFlash(false), 2000);
    });
  };

  return (
    <div className={cardClass}>
      <div className={sectionHeaderClass}>
        <h2 className="text-base font-semibold text-gray-800">Generate UTM link</h2>
        <p className="text-sm text-gray-500 mt-1">
          Registration links for this page only. Saved names appear below and are{' '}
          <span className="font-medium text-gray-700">not</span> added to Influencer / UTM Tracking.
        </p>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label htmlFor="sa-influencer-name" className="block text-sm font-medium text-gray-700 mb-1.5">Influencer name</label>
            <input
              id="sa-influencer-name"
              type="text"
              value={influencerName}
              onChange={(e) => { setInfluencerName(e.target.value); setFormError(''); setSaveSuccess(''); }}
              placeholder="e.g. John Doe"
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none"
            />
          </div>
          <div>
            <label htmlFor="sa-platform" className="block text-sm font-medium text-gray-700 mb-1.5">Platform</label>
            <select
              id="sa-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm bg-white focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none"
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sa-campaign" className="block text-sm font-medium text-gray-700 mb-1.5">Campaign name</label>
            <input
              id="sa-campaign"
              type="text"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder={DEFAULT_CAMPAIGN}
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none"
            />
          </div>
          <div>
            <label htmlFor="sa-cost" className="block text-sm font-medium text-gray-700 mb-1.5">Cost (₹)</label>
            <input
              id="sa-cost"
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="Optional"
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none"
            />
            <p className="text-xs text-gray-500 mt-0.5">Optional.</p>
          </div>
        </div>

        {formError ? <p className="text-sm text-red-600" role="alert">{formError}</p> : null}
        {saveSuccess ? <p className="text-sm text-green-700" role="status">{saveSuccess}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saveLoading || !influencerName.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-navy hover:bg-primary-navy/90 disabled:opacity-50"
          >
            <FiSave className="w-4 h-4" aria-hidden />
            {saveLoading ? 'Saving…' : 'Save to list'}
          </button>
          <button
            type="button"
            onClick={handleCopyPreview}
            disabled={!previewLink}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 hover:bg-gray-200 disabled:opacity-50"
          >
            <FiCopy className="w-4 h-4" aria-hidden />
            {copyFlash ? 'Copied' : 'Copy link'}
          </button>
        </div>

        {previewLink ? (
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-1">Link preview</p>
            <p className="text-sm text-gray-800 break-all font-mono">{previewLink}</p>
          </div>
        ) : null}
      </div>

      <div className="border-t border-gray-200 px-6 py-5 bg-gray-50/40">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Saved on Analytics (this page)</h3>
            <p className="text-xs text-gray-500 mt-0.5">Separate database list from Influencer / UTM Tracking.</p>
          </div>
          <button
            type="button"
            onClick={fetchList}
            disabled={listLoading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${listLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        </div>
        {listError ? <p className="text-sm text-red-600 mb-3" role="alert">{listError}</p> : null}
        {listHint ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3" role="status">{listHint}</p>
        ) : null}
        {listLoading ? (
          <div className="py-6"><TableSkeleton rows={4} cols={7} /></div>
        ) : rows.length === 0 ? (
          listHint ? null : (
            <p className="text-sm text-gray-500 py-4">No saved names yet. Fill the form and use Save to list.</p>
          )
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Influencer</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Platform</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Campaign</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Link</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Cost</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={String(row.id)} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[140px] truncate" title={row.influencerName}>{row.influencerName}</td>
                    <td className="px-4 py-3 text-gray-700">{row.platform}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate" title={row.campaign}>{row.campaign}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[min(280px,40vw)] truncate font-mono text-xs" title={row.utmLink}>{row.utmLink}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatCost(row.cost)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatSavedDate(row.createdAt)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => row.utmLink && navigator.clipboard.writeText(row.utmLink)}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 mr-1"
                        title="Copy link"
                        aria-label="Copy link"
                      >
                        <FiCopy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        disabled={deletingId === row.id}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                        title="Delete"
                        aria-label="Delete"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
