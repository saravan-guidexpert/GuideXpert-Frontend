import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiUpload,
  FiTrash2,
  FiRadio,
  FiX,
  FiDownload,
  FiFileText,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiUsers,
  FiSearch,
} from 'react-icons/fi';
import {
  getStudentResources,
  getStudentResourceDownloadLogs,
  uploadStudentResourcePdf,
  publishStudentResource,
  unpublishStudentResource,
  deleteStudentResource,
} from '../../utils/adminApi';
import ConfirmDialog from '../../components/Counsellor/ConfirmDialog';

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPhone(phone) {
  const p = String(phone || '').replace(/\D/g, '').slice(-10);
  if (p.length !== 10) return phone || '—';
  return `${p.slice(0, 5)} ${p.slice(5)}`;
}

function exportLeadsCsv(rows) {
  const header = ['Name', 'Phone', 'Resource', 'Downloaded at'];
  const lines = rows.map((row) => [
    row.fullName,
    row.phone,
    row.resourceTitle || '',
    formatDate(row.downloadedAt),
  ]);
  const csv = [header, ...lines]
    .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `resource-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function statusBadge(status) {
  if (status === 'published') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

export default function ResourcesAdmin() {
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState('resources');
  const [list, setList] = useState([]);
  const [logs, setLogs] = useState([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsSearch, setLeadsSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const stats = useMemo(() => {
    const published = list.filter((i) => i.status === 'published').length;
    const drafts = list.filter((i) => i.status === 'draft').length;
    return { total: list.length, published, drafts, leads: leadsTotal };
  }, [list, leadsTotal]);

  const filteredLogs = useMemo(() => {
    const q = leadsSearch.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (log) =>
        log.fullName?.toLowerCase().includes(q) ||
        log.phone?.includes(q.replace(/\D/g, '')) ||
        log.resourceTitle?.toLowerCase().includes(q)
    );
  }, [logs, leadsSearch]);

  const loadResources = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getStudentResources(statusFilter ? { status: statusFilter } : {});
    if (!res.success) {
      setError(res.message || 'Failed to load resources');
      setList([]);
    } else {
      setList(res.data?.data || []);
    }
    setLoading(false);
  }, [statusFilter]);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    const params = { limit: 200 };
    if (resourceFilter) params.resourceId = resourceFilter;
    const res = await getStudentResourceDownloadLogs(params);
    if (res.success) {
      setLogs(res.data?.data?.items || []);
      setLeadsTotal(res.data?.data?.total ?? (res.data?.data?.items || []).length);
    } else {
      setLogs([]);
    }
    setLogsLoading(false);
  }, [resourceFilter]);

  const loadLeadsCount = useCallback(async () => {
    const res = await getStudentResourceDownloadLogs({ limit: 1 });
    if (res.success) {
      setLeadsTotal(res.data?.data?.total ?? 0);
    }
  }, []);

  useEffect(() => {
    loadResources();
    loadLeadsCount();
  }, [loadResources, loadLeadsCount]);

  useEffect(() => {
    if (tab === 'leads') loadLogs();
  }, [tab, loadLogs]);

  const pickFile = (file) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) {
      setError('Only PDF files are supported');
      setSuccess('');
      return;
    }
    setUploadFile(file);
    setError('');
    if (!uploadTitle.trim()) {
      setUploadTitle(file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' '));
    }
  };

  const onUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Please select a PDF file');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    setError('');
    setSuccess('');
    const res = await uploadStudentResourcePdf(uploadFile, {
      title: uploadTitle.trim(),
      description: uploadDescription.trim(),
      onProgress: setUploadProgress,
    });
    setUploading(false);
    if (!res.success) {
      setError(res.message || 'Upload failed');
      return;
    }
    setSuccess('PDF uploaded successfully. Publish it to make it visible to students.');
    setUploadTitle('');
    setUploadDescription('');
    setUploadFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    await loadResources();
  };

  const onPublish = async (id) => {
    const res = await publishStudentResource(id);
    if (!res.success) setError(res.message || 'Failed to publish');
    else {
      setSuccess('Resource published to student portal');
      await loadResources();
    }
  };

  const onUnpublish = async (id) => {
    const res = await unpublishStudentResource(id);
    if (!res.success) setError(res.message || 'Failed to unpublish');
    else await loadResources();
  };

  const onDelete = async (id) => {
    const res = await deleteStudentResource(id);
    if (!res.success) {
      setError(res.message || 'Failed to delete');
      return;
    }
    setDeleteConfirm(null);
    setSuccess('Resource deleted');
    await loadResources();
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_32px_-8px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.04]">
      <div className="h-1 w-full bg-gradient-to-r from-[#f27921] via-amber-500 to-primary-navy" aria-hidden />

      <div className="border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/40 px-5 pb-0 pt-7 sm:px-10 sm:pt-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
              Students workspace
            </span>
            <h1 className="mt-4 text-[1.65rem] font-bold tracking-tight text-slate-900 sm:text-4xl sm:leading-[1.1]">
              Resources
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-[0.9375rem]">
              Upload PDF guides for the student portal. Students verify with OTP before each download.
            </p>
          </div>

          <nav
            className="flex rounded-xl border border-slate-200/70 bg-slate-100/80 p-1.5 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]"
            aria-label="Resources sections"
          >
            <button
              type="button"
              onClick={() => setTab('resources')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                tab === 'resources'
                  ? 'bg-white text-primary-navy shadow-sm ring-1 ring-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload &amp; history
            </button>
            <button
              type="button"
              onClick={() => setTab('leads')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                tab === 'leads'
                  ? 'bg-white text-primary-navy shadow-sm ring-1 ring-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Download leads
              {leadsTotal > 0 ? (
                <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[#f27921]/10 px-1.5 py-0.5 text-[11px] font-bold text-[#f27921]">
                  {leadsTotal}
                </span>
              ) : null}
            </button>
          </nav>
        </div>

        <div className="mt-6 grid gap-3 pb-6 sm:grid-cols-4">
          {[
            { label: 'Total PDFs', value: stats.total },
            { label: 'Published', value: stats.published },
            { label: 'Drafts', value: stats.drafts },
            { label: 'Download leads', value: stats.leads },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-b from-slate-50/95 via-slate-50/90 to-slate-100/50 px-4 py-5 sm:px-8 sm:py-7">
        {error ? (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
        {success ? (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        ) : null}

        {tab === 'resources' ? (
          <div className="space-y-6">
            <form
              onSubmit={onUpload}
              className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm"
            >
              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <FiUpload className="h-4 w-4 text-[#f27921]" />
                  Upload new PDF
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Files up to 10MB upload in one step. Larger files (up to 20MB) use chunked upload automatically.
                </p>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div className="grid gap-5 lg:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Title
                    </span>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. JEE Main 2026 Preparation Guide"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#f27921]/50 focus:ring-2 focus:ring-[#f27921]/20"
                    />
                  </label>
                  <label className="block lg:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Description
                    </span>
                    <textarea
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      rows={3}
                      placeholder="Brief description shown to students on the Resources page"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#f27921]/50 focus:ring-2 focus:ring-[#f27921]/20"
                    />
                  </label>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    pickFile(e.dataTransfer.files?.[0] || null);
                  }}
                  className={`rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
                    dragActive
                      ? 'border-[#f27921] bg-[#fff7f0]'
                      : uploadFile
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
                    <FiFileText className="h-6 w-6 text-[#f27921]" />
                  </div>
                  {uploadFile ? (
                    <>
                      <p className="mt-4 text-sm font-semibold text-slate-900">{uploadFile.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatBytes(uploadFile.size)}</p>
                    </>
                  ) : (
                    <>
                      <p className="mt-4 text-sm font-medium text-slate-800">
                        Drag &amp; drop your PDF here
                      </p>
                      <p className="mt-1 text-xs text-slate-500">or click below to browse</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => pickFile(e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Choose PDF
                  </button>
                </div>

                {uploading ? (
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Uploading…</span>
                      <span>{Math.round(uploadProgress * 100)}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#f27921] to-amber-500 transition-all duration-300"
                        style={{ width: `${Math.round(uploadProgress * 100)}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiUpload className="h-4 w-4" />
                    Upload resource
                  </button>
                  {uploadFile ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-sm font-medium text-slate-500 hover:text-slate-800"
                    >
                      Clear file
                    </button>
                  ) : null}
                </div>
              </div>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Filter</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm"
                >
                  <option value="">All statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <button
                type="button"
                onClick={loadResources}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <FiRefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
              {loading ? (
                <p className="p-8 text-center text-sm text-slate-500">Loading resources…</p>
              ) : list.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <FiFileText className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-600">No resources uploaded yet</p>
                  <p className="mt-1 text-xs text-slate-400">Upload a PDF above to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3.5 font-semibold">Resource</th>
                        <th className="px-5 py-3.5 font-semibold">File</th>
                        <th className="px-5 py-3.5 font-semibold">Status</th>
                        <th className="px-5 py-3.5 font-semibold">Downloads</th>
                        <th className="px-5 py-3.5 font-semibold">Uploaded</th>
                        <th className="px-5 py-3.5 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {list.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60">
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff4eb] text-[#f27921]">
                                <FiFileText className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{item.title}</p>
                                {item.description ? (
                                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.description}</p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            <p className="font-medium">{item.fileName}</p>
                            <p className="text-xs text-slate-400">{formatBytes(item.fileSize)}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${statusBadge(item.status)}`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-medium text-slate-700">{item.downloadCount || 0}</td>
                          <td className="px-5 py-4 text-slate-600">
                            <p>{formatDate(item.createdAt)}</p>
                            {item.createdBy ? <p className="text-xs text-slate-400">{item.createdBy}</p> : null}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              {item.status === 'published' ? (
                                <button
                                  type="button"
                                  onClick={() => onUnpublish(item.id)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  <FiX className="h-3.5 w-3.5" />
                                  Unpublish
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onPublish(item.id)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                                >
                                  <FiRadio className="h-3.5 w-3.5" />
                                  Publish
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(item)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                              >
                                <FiTrash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <FiUsers className="h-4 w-4 text-[#f27921]" />
                    Download leads
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Students who verified OTP and downloaded a PDF — name, phone, and resource.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => exportLeadsCsv(filteredLogs)}
                    disabled={filteredLogs.length === 0}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    <FiDownload className="h-4 w-4" />
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={loadLogs}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    <FiRefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={leadsSearch}
                    onChange={(e) => setLeadsSearch(e.target.value)}
                    placeholder="Search name, phone, resource…"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-300 focus:bg-white"
                  />
                </div>
                <select
                  value={resourceFilter}
                  onChange={(e) => setResourceFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                >
                  <option value="">All resources</option>
                  {list.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
              {logsLoading ? (
                <p className="p-8 text-center text-sm text-slate-500">Loading leads…</p>
              ) : filteredLogs.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <FiUsers className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    {logs.length === 0 ? 'No download leads yet' : 'No leads match your search'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Leads appear here when students download a PDF after OTP verification.
                  </p>
                </div>
              ) : (
                <>
                  <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500">
                    Showing {filteredLogs.length} of {leadsTotal} lead{leadsTotal === 1 ? '' : 's'}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-slate-100 bg-white text-[11px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-5 py-3.5 font-semibold">#</th>
                          <th className="px-5 py-3.5 font-semibold">Student name</th>
                          <th className="px-5 py-3.5 font-semibold">Mobile</th>
                          <th className="px-5 py-3.5 font-semibold">Resource</th>
                          <th className="px-5 py-3.5 font-semibold">Downloaded</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLogs.map((log, index) => (
                          <tr key={log.id} className="hover:bg-slate-50/60">
                            <td className="px-5 py-4 text-xs text-slate-400">{index + 1}</td>
                            <td className="px-5 py-4 font-semibold text-slate-900">{log.fullName}</td>
                            <td className="px-5 py-4">
                              <a
                                href={`tel:+91${log.phone}`}
                                className="font-mono text-sm text-slate-700 hover:text-primary-navy"
                              >
                                {formatPhone(log.phone)}
                              </a>
                            </td>
                            <td className="px-5 py-4 text-slate-600">{log.resourceTitle || '—'}</td>
                            <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                              {formatDate(log.downloadedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteConfirm)}
        title="Delete resource?"
        message={
          deleteConfirm
            ? `Delete "${deleteConfirm.title}"? This removes the PDF permanently.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => deleteConfirm && onDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
