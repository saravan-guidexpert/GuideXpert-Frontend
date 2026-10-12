import { useState, useEffect, useCallback, useMemo } from 'react';
import { FiCopy, FiSave, FiRefreshCw, FiTrash2, FiInstagram } from 'react-icons/fi';
import {
  createInfluencerLink,
  deleteInfluencerLink,
  getInfluencerLinks,
  updateInfluencerLink,
  getStoredToken,
} from '../../utils/adminApi';
import { useAuth } from '../../hooks/useAuth';
import TableSkeleton from '../UI/TableSkeleton';
import CopyToSheetsModal from './CopyToSheetsModal';
import {
  PLATFORMS,
  DEFAULT_CAMPAIGN,
  LINKS_SORT_OPTIONS,
  LINKS_COPY_FIELDS,
  normalizeInstagramHandle,
  ensureAbsoluteUtmUrl,
} from '../../constants/influencerAdminConstants';

function formatDate(value) {
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

function normalizeInfluencerName(name) {
  if (name == null || typeof name !== 'string') return '';
  return name.trim().toLowerCase();
}

function formatCost(value) {
  if (value == null || value === '' || (typeof value === 'number' && Number.isNaN(value))) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `₹ ${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatCostPerLead(value) {
  if (value == null || (typeof value === 'number' && Number.isNaN(value))) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `₹ ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getLinkCellValue(link, key) {
  if (key === 'utmLink') return ensureAbsoluteUtmUrl(link.utmLink);
  const v = link[key];
  if (key === 'createdAt' || key === 'latestLeadAt') return v ? formatDate(v) : '';
  if (key === 'cost') return formatCost(v);
  if (key === 'costPerLead') return formatCostPerLead(v);
  if (v == null || v === '') return '';
  return String(v);
}

const cardClass = 'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden';
const sectionHeaderClass = 'px-6 py-4 border-b border-gray-200 bg-gray-50/80 border-l-4 border-l-primary-navy';

/**
 * Generate UTM link + saved influencer links (shared by Influencer Tracking and Create page).
 * @param {{ onLinksMutated?: () => void, onLinksUpdated?: (links: object[]) => void, onAfterSave?: (name: string, platform: string) => void, onOpenInfluencerDetail?: (name: string, platform: string) => void, showInstagramQuickAdd?: boolean, initialPlatformFilter?: string }} props
 */
export default function InfluencerLinkCreationWorkspace({
  onLinksMutated,
  onLinksUpdated,
  onAfterSave,
  onOpenInfluencerDetail,
  showInstagramQuickAdd = false,
  initialPlatformFilter = '',
}) {
  const { logout } = useAuth();
  const token = getStoredToken();

  const [form, setForm] = useState({
    influencerName: '',
    platform: 'Instagram',
    campaign: DEFAULT_CAMPAIGN,
    cost: '',
  });
  const [generatedLink, setGeneratedLink] = useState(null);
  const [linkError, setLinkError] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [savedLinks, setSavedLinks] = useState([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [linksError, setLinksError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [copiedLinkId, setCopiedLinkId] = useState(null);
  const [savedLinksSearch, setSavedLinksSearch] = useState('');
  const [savedLinksPlatform, setSavedLinksPlatform] = useState(() => initialPlatformFilter || '');
  const [linksSort, setLinksSort] = useState('date-desc');
  const [linksPage, setLinksPage] = useState(1);
  const linksPerPage = 10;
  const [selectedLinkIds, setSelectedLinkIds] = useState(new Set());
  const [linkToDelete, setLinkToDelete] = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [viewAllLinks, setViewAllLinks] = useState(false);
  const [copyLinksModalOpen, setCopyLinksModalOpen] = useState(false);

  const [editingCostLinkId, setEditingCostLinkId] = useState(null);
  const [editingCostValue, setEditingCostValue] = useState('');
  const [costUpdateLoading, setCostUpdateLoading] = useState(false);

  const [igHandle, setIgHandle] = useState('');
  const [igUtmLabel, setIgUtmLabel] = useState('');
  const [igCampaign, setIgCampaign] = useState(DEFAULT_CAMPAIGN);
  const [igCost, setIgCost] = useState('');
  const [igQuickSaving, setIgQuickSaving] = useState(false);
  const [igQuickError, setIgQuickError] = useState('');
  const [igQuickSuccess, setIgQuickSuccess] = useState('');
  const [igQuickLink, setIgQuickLink] = useState('');

  const fetchLinks = useCallback(() => {
    setLinksLoading(true);
    setLinksError('');
    getInfluencerLinks(token, { linkTarget: 'registration' }).then((result) => {
      if (!result.success) {
        if (result.status === 401) {
          logout();
          window.location.href = '/admin/login';
          return;
        }
        setLinksError(result.message || 'Failed to load links');
        setLinksLoading(false);
        return;
      }
      const list = result.data?.data ?? [];
      setSavedLinks(list);
      setLinksLoading(false);
      onLinksUpdated?.(list);
    });
  }, [token, logout, onLinksUpdated]);

  useEffect(() => {
    const t = setTimeout(() => fetchLinks(), 0);
    return () => clearTimeout(t);
  }, [fetchLinks]);

  useEffect(() => {
    const onFocus = () => {
      fetchLinks();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchLinks]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setLinkError('');
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLinkError('');
    if (!form.influencerName.trim()) {
      setLinkError('Influencer name is required.');
      return;
    }
    setLinkLoading(true);
    setGeneratedLink(null);
    const result = await createInfluencerLink(
      {
        influencerName: form.influencerName.trim(),
        platform: form.platform,
        campaign: form.campaign.trim() || DEFAULT_CAMPAIGN,
      },
      false,
      token
    );
    setLinkLoading(false);
    if (!result.success) {
      if (result.status === 401) {
        logout();
        window.location.href = '/admin/login';
        return;
      }
      setLinkError(result.message || 'Failed to generate link');
      return;
    }
    setGeneratedLink(ensureAbsoluteUtmUrl(result.data?.data?.utmLink ?? null));
  };

  const handleCopy = (url, id) => {
    const toCopy = ensureAbsoluteUtmUrl(url || generatedLink);
    if (!toCopy) return;
    navigator.clipboard.writeText(toCopy).then(() => {
      if (id) {
        setCopiedLinkId(id);
        setTimeout(() => setCopiedLinkId(null), 2000);
      } else {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      }
    });
  };

  const handleSave = async () => {
    if (!form.influencerName.trim()) return;
    setSaveLoading(true);
    setLinkError('');
    const payload = {
      influencerName: form.influencerName.trim(),
      platform: form.platform,
      campaign: form.campaign.trim() || DEFAULT_CAMPAIGN,
    };
    const costTrimmed = typeof form.cost === 'string' ? form.cost.trim() : '';
    if (costTrimmed !== '') {
      const costNum = Number(costTrimmed);
      if (!Number.isNaN(costNum) && costNum >= 0) payload.cost = costNum;
    }
    const result = await createInfluencerLink(payload, true, token);
    setSaveLoading(false);
    if (!result.success) {
      if (result.status === 401) {
        logout();
        window.location.href = '/admin/login';
        return;
      }
      setLinkError(result.message || 'Failed to save link');
      return;
    }
    setGeneratedLink(ensureAbsoluteUtmUrl(result.data?.data?.utmLink ?? generatedLink));
    fetchLinks();
    onLinksMutated?.();
    onAfterSave?.(form.influencerName.trim(), form.platform);
  };

  const handleInstagramQuickSave = async (alsoCopy) => {
    setIgQuickError('');
    setIgQuickSuccess('');
    const handle = normalizeInstagramHandle(igHandle);
    if (!handle) {
      setIgQuickError('Enter an Instagram handle (for example @username or instagram.com/username).');
      return;
    }
    const influencerName = igUtmLabel.trim() || handle;
    setIgQuickSaving(true);
    setIgQuickLink('');
    const payload = {
      influencerName,
      platform: 'Instagram',
      campaign: (igCampaign || '').trim() || DEFAULT_CAMPAIGN,
    };
    const costTrimmed = typeof igCost === 'string' ? igCost.trim() : String(igCost ?? '').trim();
    if (costTrimmed !== '') {
      const costNum = Number(costTrimmed);
      if (!Number.isNaN(costNum) && costNum >= 0) payload.cost = costNum;
    }
    const result = await createInfluencerLink(payload, true, token);
    setIgQuickSaving(false);
    if (!result.success) {
      if (result.status === 401) {
        logout();
        window.location.href = '/admin/login';
        return;
      }
      setIgQuickError(result.message || 'Failed to save link');
      return;
    }
    const utm = ensureAbsoluteUtmUrl(result.data?.data?.utmLink ?? '');
    setIgQuickLink(utm);
    setForm((prev) => ({
      ...prev,
      influencerName,
      platform: 'Instagram',
      campaign: (igCampaign || '').trim() || DEFAULT_CAMPAIGN,
      cost: igCost,
    }));
    setGeneratedLink(utm || null);
    fetchLinks();
    onLinksMutated?.();
    onAfterSave?.(influencerName, 'Instagram');
    setIgQuickSuccess(`Saved to the list. Form leads use utm_content="${influencerName}" when visitors use this link.`);
    if (alsoCopy && utm) {
      navigator.clipboard.writeText(utm).then(() => {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!linkToDelete?.id) {
      setLinkToDelete(null);
      return;
    }
    setDeletingId(linkToDelete.id);
    setLinksError('');
    const result = await deleteInfluencerLink(linkToDelete.id, token);
    setDeletingId(null);
    setLinkToDelete(null);
    if (!result.success) {
      if (result.status === 401) {
        logout();
        window.location.href = '/admin/login';
        return;
      }
      setLinksError(result.message || 'Failed to delete link');
      return;
    }
    fetchLinks();
    onLinksMutated?.();
  };

  const handleBulkDeleteConfirm = async () => {
    const ids = Array.from(selectedLinkIds);
    if (ids.length === 0) {
      setBulkDeleteConfirm(false);
      return;
    }
    setLinksError('');
    for (const id of ids) {
      await deleteInfluencerLink(id, token);
    }
    setSelectedLinkIds(new Set());
    setBulkDeleteConfirm(false);
    fetchLinks();
    onLinksMutated?.();
  };

  const toggleSelectLink = (id) => {
    setSelectedLinkIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllLinks = () => {
    if (selectedLinkIds.size === paginatedLinks.length) {
      setSelectedLinkIds(new Set());
    } else {
      setSelectedLinkIds(new Set(paginatedLinks.map((l) => l.id)));
    }
  };

  const startEditCost = (link) => {
    setLinkError('');
    setEditingCostLinkId(link.id);
    setEditingCostValue(link.cost != null && link.cost !== '' ? String(link.cost) : '');
  };

  const cancelEditCost = () => {
    setEditingCostLinkId(null);
    setEditingCostValue('');
  };

  const saveEditCost = async () => {
    if (editingCostLinkId == null) return;
    const trimmed = editingCostValue.trim();
    const costPayload = trimmed === '' ? null : (() => {
      const n = Number(trimmed);
      return !Number.isNaN(n) && n >= 0 ? n : null;
    })();
    if (costPayload === undefined) return;
    setCostUpdateLoading(true);
    const result = await updateInfluencerLink(editingCostLinkId, { cost: costPayload }, token);
    setCostUpdateLoading(false);
    if (result.success) {
      setEditingCostLinkId(null);
      setEditingCostValue('');
      fetchLinks();
      onLinksMutated?.();
    } else {
      setLinksError(result.message || 'Failed to update cost');
    }
  };

  const filteredSavedLinks = useMemo(() => {
    let list = savedLinks;
    const q = savedLinksSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (l) =>
          (l.influencerName || '').toLowerCase().includes(q) ||
          (l.campaign || '').toLowerCase().includes(q)
      );
    }
    if (savedLinksPlatform) {
      list = list.filter((l) => l.platform === savedLinksPlatform);
    }
    if (linksSort === 'date-desc') list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (linksSort === 'date-asc') list = [...list].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (linksSort === 'name-asc') list = [...list].sort((a, b) => (a.influencerName || '').localeCompare(b.influencerName || ''));
    else if (linksSort === 'name-desc') list = [...list].sort((a, b) => (b.influencerName || '').localeCompare(a.influencerName || ''));
    else if (linksSort === 'platform') list = [...list].sort((a, b) => (a.platform || '').localeCompare(b.platform || ''));
    return list;
  }, [savedLinks, savedLinksSearch, savedLinksPlatform, linksSort]);

  const paginatedLinks = useMemo(() => {
    if (viewAllLinks) return filteredSavedLinks;
    const start = (linksPage - 1) * linksPerPage;
    return filteredSavedLinks.slice(start, start + linksPerPage);
  }, [viewAllLinks, filteredSavedLinks, linksPage, linksPerPage]);

  const linksToCopy = filteredSavedLinks;
  const linksTotalPages = Math.max(1, Math.ceil(filteredSavedLinks.length / linksPerPage));

  const exportLinksCsv = () => {
    const headers = ['Influencer', 'Platform', 'Campaign', 'UTM Link', 'Date created', 'Leads', 'Cost', 'Cost per lead', 'Latest lead'];
    const rows = filteredSavedLinks.map((l) => [
      l.influencerName ?? '',
      l.platform ?? '',
      l.campaign ?? '',
      l.utmLink ? ensureAbsoluteUtmUrl(l.utmLink) : '',
      l.createdAt ? formatDate(l.createdAt) : '',
      l.leadCount ?? 0,
      l.cost != null ? String(l.cost) : '',
      l.costPerLead != null ? String(l.costPerLead) : '',
      l.latestLeadAt ? formatDate(l.latestLeadAt) : '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `influencer-links-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {showInstagramQuickAdd && (
        <section className={cardClass}>
          <div className={`${sectionHeaderClass} py-2 sm:py-3`}>
            <h2 className="text-base font-semibold text-gray-800 inline-flex items-center gap-2">
              <FiInstagram className="w-5 h-5 text-pink-600 shrink-0" aria-hidden />
              Add Instagram influencer to the list
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Platform is set to Instagram (<span className="font-mono text-xs">utm_source=instagram</span>,{' '}
              <span className="font-mono text-xs">utm_medium=influencer</span>). The tracking name becomes{' '}
              <span className="font-mono text-xs">utm_content</span> and must match what you filter in Lead Funnel for form submissions.
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="igHandle" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Instagram handle
                </label>
                <input
                  id="igHandle"
                  type="text"
                  value={igHandle}
                  onChange={(e) => {
                    setIgHandle(e.target.value);
                    setIgQuickError('');
                  }}
                  placeholder="@username or instagram.com/username"
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="igUtmLabel" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tracking name (utm_content)
                </label>
                <input
                  id="igUtmLabel"
                  type="text"
                  value={igUtmLabel}
                  onChange={(e) => {
                    setIgUtmLabel(e.target.value);
                    setIgQuickError('');
                  }}
                  placeholder="Leave blank to use handle without @"
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none"
                />
                <p className="text-xs text-gray-500 mt-0.5">Registration form leads attach to this value.</p>
              </div>
              <div>
                <label htmlFor="igCampaign" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Campaign name
                </label>
                <input
                  id="igCampaign"
                  type="text"
                  value={igCampaign}
                  onChange={(e) => setIgCampaign(e.target.value)}
                  placeholder={DEFAULT_CAMPAIGN}
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none"
                />
              </div>
              <div>
                <label htmlFor="igCost" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Cost (₹)
                </label>
                <input
                  id="igCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={igCost}
                  onChange={(e) => setIgCost(e.target.value)}
                  placeholder="Optional"
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none"
                />
              </div>
            </div>
            {igQuickError && (
              <p className="text-sm text-red-600" role="alert">
                {igQuickError}
              </p>
            )}
            {igQuickSuccess && (
              <p className="text-sm text-green-700" role="status">
                {igQuickSuccess}
              </p>
            )}
            {igQuickLink && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs break-all font-mono text-gray-800">
                {igQuickLink}
                <button
                  type="button"
                  onClick={() => handleCopy(igQuickLink, null)}
                  className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                >
                  <FiCopy className="w-3.5 h-3.5" />
                  Copy link
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={igQuickSaving}
                onClick={() => handleInstagramQuickSave(false)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-navy hover:bg-primary-navy/90 focus:ring-2 focus:ring-primary-navy focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {igQuickSaving ? 'Saving…' : 'Save to list'}
              </button>
              <button
                type="button"
                disabled={igQuickSaving}
                onClick={() => handleInstagramQuickSave(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 disabled:opacity-50 disabled:pointer-events-none"
              >
                {igQuickSaving ? 'Saving…' : 'Save and copy link'}
              </button>
            </div>
          </div>
        </section>
      )}
      <section className={cardClass}>
        <div className={`${sectionHeaderClass} py-2 sm:py-3`}>
          <h2 className="text-base font-semibold text-gray-800">Generate UTM Link</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Create a unique registration link. Copy to share or Save to store below.
          </p>
        </div>
        <form onSubmit={handleGenerate} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label htmlFor="influencerName" className="block text-sm font-medium text-gray-700 mb-1.5">Influencer Name</label>
              <input
                id="influencerName"
                name="influencerName"
                type="text"
                value={form.influencerName}
                onChange={handleFormChange}
                placeholder="e.g. John Doe"
                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none"
              />
            </div>
            <div>
              <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-1.5">Platform</label>
              <select
                id="platform"
                name="platform"
                value={form.platform}
                onChange={handleFormChange}
                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none bg-white"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="campaign" className="block text-sm font-medium text-gray-700 mb-1.5">Campaign Name</label>
              <input
                id="campaign"
                name="campaign"
                type="text"
                value={form.campaign}
                onChange={handleFormChange}
                placeholder={DEFAULT_CAMPAIGN}
                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none"
              />
            </div>
            <div>
              <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-1.5">Cost (₹)</label>
              <input
                id="cost"
                name="cost"
                type="number"
                min="0"
                step="0.01"
                value={form.cost}
                onChange={handleFormChange}
                placeholder="Optional"
                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none"
              />
              <p className="text-xs text-gray-500 mt-0.5">Optional; used for cost per lead when saving.</p>
            </div>
          </div>
          {linkError && <p className="text-sm text-red-600" role="alert">{linkError}</p>}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={linkLoading || !form.influencerName.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-navy hover:bg-primary-navy/90 focus:ring-2 focus:ring-primary-navy focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {linkLoading ? 'Generating…' : 'Generate Link'}
            </button>
            {generatedLink && (
              <>
                <button type="button" onClick={() => handleCopy(null)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300">
                  <FiCopy className="w-4 h-4" />{copyFeedback ? 'Copied' : 'Copy'}
                </button>
                <button type="button" onClick={handleSave} disabled={saveLoading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-navy hover:bg-primary-navy/90 disabled:opacity-50">
                  <FiSave className="w-4 h-4" />{saveLoading ? 'Saving…' : 'Save to list'}
                </button>
              </>
            )}
          </div>
          {generatedLink && (
            <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-1">Generated link</p>
              <p className="text-sm text-gray-800 break-all font-mono">{generatedLink}</p>
            </div>
          )}
        </form>
      </section>

      <section className={cardClass}>
        <div className={`${sectionHeaderClass} flex flex-wrap items-center justify-between gap-4`}>
          <div>
            <h2 className="text-base font-semibold text-gray-800">Saved Influencer Links</h2>
            <p className="text-sm text-gray-500 mt-0.5">Links saved for reuse. Leads column shows count per link. Search, filter, export or bulk delete.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={fetchLinks} disabled={linksLoading} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-50" title="Refresh">
              <FiRefreshCw className={`w-5 h-5 ${linksLoading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={exportLinksCsv} disabled={filteredSavedLinks.length === 0} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50">
              Export CSV
            </button>
          </div>
        </div>
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Search by influencer or campaign"
            value={savedLinksSearch}
            onChange={(e) => { setSavedLinksSearch(e.target.value); setLinksPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-56 focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none"
          />
          <select
            value={savedLinksPlatform}
            onChange={(e) => { setSavedLinksPlatform(e.target.value); setLinksPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none bg-white"
          >
            <option value="">All platforms</option>
            {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select
            value={linksSort}
            onChange={(e) => setLinksSort(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-navy/30 outline-none bg-white"
          >
            {LINKS_SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700 ml-2 pl-2 border-l border-gray-200">
            <input
              type="checkbox"
              checked={viewAllLinks}
              onChange={(e) => {
                setViewAllLinks(e.target.checked);
                if (!e.target.checked) setLinksPage(1);
              }}
              className="rounded border-gray-300 text-primary-blue-500 focus:ring-primary-blue-500"
              aria-label="View all links in one list"
            />
            View all
          </label>
          <button
            type="button"
            onClick={() => setCopyLinksModalOpen(true)}
            className="inline-flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            aria-label="Copy to sheets"
          >
            <FiCopy className="w-4 h-4" /> Copy
          </button>
          {(savedLinksSearch || savedLinksPlatform) && (
            <span className="text-sm text-gray-500 self-center">Showing {filteredSavedLinks.length} of {savedLinks.length} links</span>
          )}
          {selectedLinkIds.size > 0 && (
            <button
              type="button"
              onClick={() => setBulkDeleteConfirm(true)}
              className="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Delete selected ({selectedLinkIds.size})
            </button>
          )}
        </div>
        {linksLoading ? (
          <div className="px-6 py-8"><TableSkeleton rows={8} cols={11} /></div>
        ) : linksError ? (
          <div className="px-6 py-6"><p className="text-red-600 text-sm" role="alert">{linksError}</p></div>
        ) : filteredSavedLinks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 text-sm">No saved links yet.</p>
            <p className="text-gray-400 text-xs mt-1">Generate and save a link above to see it here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 w-10">
                      <input
                        type="checkbox"
                        checked={paginatedLinks.length > 0 && selectedLinkIds.size === paginatedLinks.length}
                        onChange={toggleSelectAllLinks}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Influencer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Platform</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Campaign</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">UTM Link</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date created</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Leads</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Cost</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Cost per lead</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Latest lead</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedLinks.map((link, i) => (
                    <tr key={link.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60 hover:bg-primary-blue-50/30'}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedLinkIds.has(link.id)}
                          onChange={() => toggleSelectLink(link.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          {onOpenInfluencerDetail ? (
                            <button
                              type="button"
                              onClick={() => onOpenInfluencerDetail(link.influencerName, link.platform)}
                              className="font-medium text-gray-900 hover:text-primary-navy hover:underline text-left"
                            >
                              {link.influencerName}
                            </button>
                          ) : (
                            <span className="font-medium text-gray-900">{link.influencerName}</span>
                          )}
                          {(() => {
                            const sameNameCount = savedLinks.filter(
                              (l) => normalizeInfluencerName(l.influencerName) === normalizeInfluencerName(link.influencerName)
                            ).length;
                            if (sameNameCount > 1) {
                              return (
                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {sameNameCount} links
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{link.platform}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{link.campaign}</td>
                      <td className="px-6 py-3 text-sm max-w-[200px]">
                        {(() => {
                          const safeLink = ensureAbsoluteUtmUrl(link.utmLink);
                          return (
                            <a href={safeLink} target="_blank" rel="noopener noreferrer" title={safeLink} className="text-primary-navy hover:underline truncate block font-mono text-xs">
                              {safeLink}
                            </a>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">{formatDate(link.createdAt)}</td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">{link.leadCount ?? 0}</td>
                      <td className="px-6 py-3 text-sm text-gray-600 text-right">
                        {editingCostLinkId === link.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editingCostValue}
                              onChange={(e) => setEditingCostValue(e.target.value)}
                              className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                              aria-label="Cost"
                            />
                            <button type="button" onClick={saveEditCost} disabled={costUpdateLoading} className="text-xs px-2 py-1 rounded bg-primary-navy text-white hover:bg-primary-navy/90 disabled:opacity-50">Save</button>
                            <button type="button" onClick={cancelEditCost} disabled={costUpdateLoading} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-gray-700">{formatCost(link.cost)}</span>
                            <button type="button" onClick={() => startEditCost(link)} className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400">
                              Edit cost
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600 text-right">{formatCostPerLead(link.costPerLead)}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{link.latestLeadAt ? formatDate(link.latestLeadAt) : '—'}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setLinkToDelete(link)}
                          disabled={deletingId === link.id}
                          className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Delete link"
                          aria-label="Delete link"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
              {viewAllLinks ? (
                <p className="text-sm text-gray-500">
                  Showing all {filteredSavedLinks.length} links
                </p>
              ) : linksTotalPages > 1 ? (
                <>
                  <p className="text-sm text-gray-500">Page {linksPage} of {linksTotalPages}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setLinksPage((p) => Math.max(1, p - 1))} disabled={linksPage <= 1} className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50">Previous</button>
                    <button type="button" onClick={() => setLinksPage((p) => Math.min(linksTotalPages, p + 1))} disabled={linksPage >= linksTotalPages} className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50">Next</button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">Page {linksPage} of {linksTotalPages}</p>
              )}
            </div>
          </>
        )}
      </section>

      <CopyToSheetsModal
        fields={LINKS_COPY_FIELDS}
        records={linksToCopy}
        getCellValue={getLinkCellValue}
        open={copyLinksModalOpen}
        onClose={() => setCopyLinksModalOpen(false)}
        recordLabel="links"
      />

      {linkToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-semibold text-gray-800">Delete link?</h3>
            <p className="text-sm text-gray-600 mt-2">Delete the link for &quot;{linkToDelete.influencerName}&quot;? This cannot be undone.</p>
            <div className="flex gap-3 mt-6 justify-end">
              <button type="button" onClick={() => setLinkToDelete(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleDeleteConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-semibold text-gray-800">Delete selected links?</h3>
            <p className="text-sm text-gray-600 mt-2">Delete {selectedLinkIds.size} link(s)? This cannot be undone.</p>
            <div className="flex gap-3 mt-6 justify-end">
              <button type="button" onClick={() => setBulkDeleteConfirm(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleBulkDeleteConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700">Delete all</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
