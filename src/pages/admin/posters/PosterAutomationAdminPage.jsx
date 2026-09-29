import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  FiSave,
  FiTrash2,
  FiUpload,
  FiImage,
  FiFileText,
  FiAlertCircle,
  FiRefreshCw,
  FiGlobe,
  FiSidebar,
  FiCopy,
  FiCheck,
} from 'react-icons/fi';
import {
  listPosterTemplates,
  createPosterTemplate,
  updatePosterTemplate,
  deletePosterTemplate,
  publishPosterTemplate,
  unpublishPosterTemplate,
  setPosterMarketingFeatured,
} from '../../../utils/adminApi';
import { getDesignFrameSize } from '../../../utils/posterExportDimensions';
import { capturePosterToCanvas } from '../../../utils/posterExportCapture';
import { clearPosterRouteCache } from '../../../components/Posters/usePosterByRoute';
import DashboardLayout from '../../../components/Admin/DashboardLayout';
import PosterEditorCanvas from './PosterEditorCanvas';
import PosterListSidebar from './PosterListSidebar';
import PosterElementToolbar from './PosterElementToolbar';
import { normalizeHexForCss, normalizeOverlayFieldColors } from '../../../utils/posterColor';
import { buildOverlayFieldPayload } from '../../../utils/posterTemplatePayload';
import { trackPosterDownloadBeacon } from '../../../utils/api';
import {
  MAX_POSTER_SVG_BYTES,
  MAX_POSTER_SVG_CHARS,
  formatPosterSvgLimitLabel,
  formatPosterSvgSizeMb,
} from '../../../utils/posterSvgLimits';

function normalizeRouteClient(route) {
  let s = String(route ?? '').trim();
  if (!s) return '/';
  s = s.split('?')[0].split('#')[0];
  if (!s.startsWith('/')) s = `/${s}`;
  return s.toLowerCase();
}

function defaultNameField() {
  return {
    x: 12,
    anchorX: 12,
    anchorType: 'start',
    y: 12,
    textValue: 'Sample name',
    fontSize: 22,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'left',
  };
}

function defaultMobileField() {
  return {
    x: 12,
    anchorX: 12,
    anchorType: 'start',
    y: 24,
    textValue: '98765 43210',
    fontSize: 18,
    color: '#111827',
    fontWeight: '500',
    textAlign: 'left',
  };
}

const AUDIENCE_COPY = {
  counsellor: {
    title: 'Poster automation',
    subtitle:
      'Counsellor poster library only. PRO templates live under PRO’s poster automation and are not listed here.',
    defaultRoute: '/p/my-campaign',
    marketingLabel: 'Counsellor Marketing',
    marketingPath: 'Counsellor → Marketing',
    highlightAction: 'Highlight in counsellor Marketing',
  },
  pro: {
    title: "PRO's poster automation",
    subtitle:
      'PRO poster library only. Counsellor Poster automation templates are a separate library and are not listed here.',
    defaultRoute: '/p/pro-my-campaign',
    marketingLabel: 'PRO Marketing',
    marketingPath: 'PRO → Marketing',
    highlightAction: 'Highlight in PRO Marketing',
  },
};

function posterAudienceOf(poster) {
  return poster?.audience === 'pro' ? 'pro' : 'counsellor';
}

function emptyDraft(audience = 'counsellor') {
  return {
    name: '',
    description: '',
    route: (AUDIENCE_COPY[audience] || AUDIENCE_COPY.counsellor).defaultRoute,
    svgTemplate: '',
    nameField: defaultNameField(),
    mobileField: defaultMobileField(),
    published: false,
    marketingFeatured: false,
    marketingFeaturedAt: null,
  };
}

/** True when upstream does not expose poster admin routes (wrong proxy or old deploy). */
function isPosterAdmin404(res) {
  return Boolean(res && res.success === false && res.status === 404);
}

const POSTER_API_404_SAVE_HINT =
  'The poster API returned 404. Fix the backend/proxy (see the yellow notice above); Save cannot reach the server until then.';

function formatPosterSaveError(res) {
  const code = res?.data?.code;
  let base = res?.message || 'Save failed';
  if (code === 'POSTER_SVG_EMPTY' && Array.isArray(res?.data?.bodyKeys)) {
    base += ` — server: hasSvgKey=${String(res.data.hasSvgKey)}, keys=[${res.data.bodyKeys.join(', ')}]`;
  }
  return code ? `${base} [${code}]` : base;
}

/** Coerce overlay x / y / xEnd / fontSize to 2 decimal places after load. */
function normalizeOverlayFieldNumerics(field) {
  if (!field || typeof field !== 'object') return field;
  const out = { ...field };
  const normalizedAnchorX = Math.round((Number(out.anchorX ?? out.x) || 0) * 100) / 100;
  out.anchorX = normalizedAnchorX;
  out.x = normalizedAnchorX;
  out.anchorType = ['start', 'end', 'center'].includes(out.anchorType) ? out.anchorType : 'start';
  out.y = Math.round((Number(out.y) || 0) * 100) / 100;
  out.textValue = out.textValue != null ? String(out.textValue).slice(0, 500) : '';
  out.fontSize = Math.round((Number(out.fontSize) || 16) * 100) / 100;
  const xe = Number(out.xEnd);
  if (out.xEnd != null && out.xEnd !== '' && Number.isFinite(xe)) {
    out.xEnd = Math.round(xe * 100) / 100;
  } else {
    delete out.xEnd;
  }
  return out;
}

function cloneDraftFromPoster(p) {
  const nameSrc =
    p.nameField && typeof p.nameField === 'object' ? { ...p.nameField } : defaultNameField();
  const mobileSrc =
    p.mobileField && typeof p.mobileField === 'object' ? { ...p.mobileField } : defaultMobileField();
  return {
    name: p.name || '',
    description: p.description != null ? String(p.description) : '',
    route: p.route || '/p/my-campaign',
    svgTemplate: p.svgTemplate == null ? '' : String(p.svgTemplate),
    nameField: normalizeOverlayFieldNumerics(normalizeOverlayFieldColors(nameSrc)),
    mobileField: normalizeOverlayFieldNumerics(normalizeOverlayFieldColors(mobileSrc)),
    published: !!p.published,
    marketingFeatured: !!p.marketingFeatured,
    marketingFeaturedAt: p.marketingFeaturedAt ?? null,
  };
}

/** Stable semantic equality for isDirty (avoids JSON key-order false negatives). */
function normalizeOverlayFieldForCompare(f) {
  if (!f || typeof f !== 'object') {
    return {
      x: 0,
      anchorX: 0,
      anchorType: 'start',
      y: 0,
      textValue: '',
      fontSize: 16,
      color: '#111827',
      fontWeight: '400',
      textAlign: 'left',
    };
  }
  const normalizedAnchorX = Math.round((Number(f.anchorX ?? f.x) || 0) * 1000) / 1000;
  return {
    x: normalizedAnchorX,
    anchorX: normalizedAnchorX,
    anchorType: ['start', 'end', 'center'].includes(f.anchorType) ? String(f.anchorType) : 'start',
    y: Math.round((Number(f.y) || 0) * 1000) / 1000,
    textValue: f.textValue != null ? String(f.textValue) : '',
    fontSize: Math.round((Number(f.fontSize) || 16) * 1000) / 1000,
    color: normalizeHexForCss(f.color),
    fontWeight: String(f.fontWeight ?? '400'),
    textAlign: String(f.textAlign || 'left'),
  };
}

function normalizeNameFieldForCompare(f) {
  const base = normalizeOverlayFieldForCompare(f);
  const xe = Number(f?.xEnd);
  const xEnd =
    Number.isFinite(xe) && xe > base.x ? Math.round(xe * 1000) / 1000 : null;
  return { ...base, xEnd };
}

function posterDraftsEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (String(a.name ?? '').trim() !== String(b.name ?? '').trim()) return false;
  if (String(a.description ?? '').trim() !== String(b.description ?? '').trim()) return false;
  if (normalizeRouteClient(a.route) !== normalizeRouteClient(b.route)) return false;
  if (a.svgTemplate !== b.svgTemplate) return false;
  if (!!a.published !== !!b.published) return false;
  if (!!a.marketingFeatured !== !!b.marketingFeatured) return false;
  const na = normalizeNameFieldForCompare(a.nameField);
  const nb = normalizeNameFieldForCompare(b.nameField);
  const ma = normalizeOverlayFieldForCompare(a.mobileField);
  const mb = normalizeOverlayFieldForCompare(b.mobileField);
  return (
    na.x === nb.x &&
    na.anchorX === nb.anchorX &&
    na.anchorType === nb.anchorType &&
    na.y === nb.y &&
    na.textValue === nb.textValue &&
    na.fontSize === nb.fontSize &&
    na.color === nb.color &&
    na.fontWeight === nb.fontWeight &&
    na.textAlign === nb.textAlign &&
    na.xEnd === nb.xEnd &&
    ma.x === mb.x &&
    ma.anchorX === mb.anchorX &&
    ma.anchorType === mb.anchorType &&
    ma.y === mb.y &&
    ma.textValue === mb.textValue &&
    ma.fontSize === mb.fontSize &&
    ma.color === mb.color &&
    ma.fontWeight === mb.fontWeight &&
    ma.textAlign === mb.textAlign
  );
}

function TemplateTokensReference({ previewVariables }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Frontend usage</h3>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        On the site, URLs must use the <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.6875rem]">/p/…</code> prefix (same as this template&apos;s route). Pass real values with{' '}
        <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.6875rem]">DynamicRoutePoster</code> — only{' '}
        <strong className="font-medium text-gray-700">name</strong> and <strong className="font-medium text-gray-700">mobile</strong> are supported.
      </p>
      <dl className="mt-4 space-y-2.5 text-xs">
        <div className="flex justify-between gap-3 border-b border-gray-50 pb-2">
          <dt className="text-gray-600">variables.name</dt>
          <dd className="truncate text-right text-gray-800">{previewVariables.name}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gray-600">variables.mobile</dt>
          <dd className="truncate text-right text-gray-800">{previewVariables.mobile}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function PosterAutomationAdminPage({ audience = 'counsellor' }) {
  const copy = AUDIENCE_COPY[audience] || AUDIENCE_COPY.counsellor;
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [draft, setDraft] = useState(() => emptyDraft(audience));
  const [baseline, setBaseline] = useState(null);
  const [selectedOverlayKey, setSelectedOverlayKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [marketingFeatSaving, setMarketingFeatSaving] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [posterApiMisconfigured, setPosterApiMisconfigured] = useState(false);
  const [saveJustSucceeded, setSaveJustSucceeded] = useState(false);
  const saveOkTimerRef = useRef(null);
  const fileRef = useRef(null);
  const posterExportRef = useRef(null);

  const previewVariables = useMemo(
    () => ({
      name: 'Sample name',
      mobile: '98765 43210',
    }),
    []
  );

  const designFrame = useMemo(() => getDesignFrameSize(draft.svgTemplate), [draft.svgTemplate]);

  const publicUrl = useMemo(() => {
    const path = normalizeRouteClient(draft.route);
    if (typeof window === 'undefined') return path;
    return `${window.location.origin}${path}`;
  }, [draft.route]);

  const loadList = useCallback(async () => {
    setError('');
    const res = await listPosterTemplates(audience);
    if (!res.success) {
      if (isPosterAdmin404(res)) {
        setPosterApiMisconfigured(true);
      }
      setError(res.message || 'Failed to load posters');
      setPosters([]);
      return;
    }
    setPosterApiMisconfigured(false);
    const list = res.data?.posters ?? res.data?.data?.posters;
    const rows = Array.isArray(list) ? list : [];
    setPosters(rows.filter((poster) => posterAudienceOf(poster) === audience));
  }, [audience]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadList();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadList]);

  const triggerSaveOk = useCallback(() => {
    if (saveOkTimerRef.current) clearTimeout(saveOkTimerRef.current);
    setSaveJustSucceeded(true);
    saveOkTimerRef.current = setTimeout(() => {
      setSaveJustSucceeded(false);
      saveOkTimerRef.current = null;
    }, 2000);
  }, []);

  useEffect(
    () => () => {
      if (saveOkTimerRef.current) clearTimeout(saveOkTimerRef.current);
    },
    []
  );

  const isDirty = useMemo(() => {
    if (isNew) return true;
    // No baseline yet (never clicked "New template" or loaded one from the list): compare to empty draft
    // so editing name/route/SVG still marks Unsaved and enables Save.
    if (!baseline) {
      return !posterDraftsEqual(draft, emptyDraft(audience));
    }
    return !posterDraftsEqual(draft, baseline);
  }, [draft, baseline, isNew, audience]);

  const selectPoster = (id) => {
    const p = posters.find((x) => x.id === id);
    if (!p) return;
    setIsNew(false);
    setSelectedId(id);
    const d = cloneDraftFromPoster(p);
    setDraft(d);
    setBaseline(JSON.parse(JSON.stringify(d)));
    setSelectedOverlayKey(null);
  };

  const handleCreate = () => {
    setIsNew(true);
    setSelectedId(null);
    const d = emptyDraft(audience);
    setDraft(d);
    setBaseline(JSON.parse(JSON.stringify(d)));
    setSelectedOverlayKey(null);
  };

  const handleDiscard = () => {
    if (isNew) {
      handleCreate();
      return;
    }
    if (baseline) {
      setDraft(JSON.parse(JSON.stringify(baseline)));
    }
    setSelectedOverlayKey(null);
  };

  /** @returns {Promise<{ success: boolean; id?: string; published?: boolean }>} */
  const handleSave = async () => {
    const routeNorm = normalizeRouteClient(draft.route);
    if (!draft.name.trim()) {
      setError('Name is required.');
      return { success: false };
    }
    if (!routeNorm.startsWith('/p/') || routeNorm.length <= 3) {
      setError('Frontend route must start with /p/ (for example /p/winter-drive) so visitors get a matching public page.');
      return { success: false };
    }
    const svgForCheck = draft.svgTemplate == null ? '' : String(draft.svgTemplate);
    if (!svgForCheck.trim()) {
      setError('Upload an SVG template first.');
      return { success: false };
    }
    if (!/<svg[\s>/]/i.test(svgForCheck)) {
      setError('SVG template must contain an <svg> root.');
      return { success: false };
    }
    let svgNorm = svgForCheck;
    if (svgNorm.charCodeAt(0) === 0xfeff) svgNorm = svgNorm.slice(1);
    svgNorm = svgNorm.trim();
    if (!svgNorm.length) {
      setError('SVG template became empty after normalization. Re-upload the file.');
      return { success: false };
    }
    if (svgNorm.length > MAX_POSTER_SVG_CHARS) {
      setError(
        `SVG template exceeds ${formatPosterSvgLimitLabel()} (${formatPosterSvgSizeMb(svgNorm.length)} MB). Simplify the file or reduce embedded images.`
      );
      return { success: false };
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        name: draft.name.trim(),
        description: String(draft.description ?? '').trim().slice(0, 500),
        route: routeNorm,
        audience,
        svgTemplate: svgNorm,
        nameField: buildOverlayFieldPayload(draft.nameField, 'name'),
        mobileField: buildOverlayFieldPayload(draft.mobileField, 'mobile'),
      };
      try {
        // Create when there is no server row yet (new template, or first-time edits without clicking "New template")
        if (!selectedId) {
          const res = await createPosterTemplate(payload);
          if (!res.success) {
            if (isPosterAdmin404(res)) {
              setPosterApiMisconfigured(true);
              setError(POSTER_API_404_SAVE_HINT);
            } else {
              setError(formatPosterSaveError(res));
            }
            return { success: false };
          }
          const poster = res.data?.poster ?? res.data?.data?.poster;
          if (!poster || typeof poster !== 'object' || !poster.id) {
            setError('Server did not return a saved template. Try again or check the API response.');
            return { success: false };
          }
          clearPosterRouteCache(routeNorm);
          setIsNew(false);
          setSelectedId(poster.id);
          const d = cloneDraftFromPoster(poster);
          setDraft(d);
          setBaseline(JSON.parse(JSON.stringify(d)));
          await loadList();
          triggerSaveOk();
          return { success: true, id: poster.id, published: !!poster.published };
        }
        const res = await updatePosterTemplate(selectedId, payload);
        if (!res.success) {
          if (isPosterAdmin404(res)) {
            setPosterApiMisconfigured(true);
            setError(POSTER_API_404_SAVE_HINT);
          } else {
            setError(formatPosterSaveError(res));
          }
          return { success: false };
        }
        clearPosterRouteCache(routeNorm);
        const updated = res.data?.poster ?? res.data?.data?.poster;
        if (baseline) {
          const prev = normalizeRouteClient(baseline.route);
          if (prev !== routeNorm) clearPosterRouteCache(prev);
        }
        if (updated && typeof updated === 'object' && updated.id) {
          const d = cloneDraftFromPoster(updated);
          setDraft(d);
          setBaseline(JSON.parse(JSON.stringify(d)));
        } else {
          const merged = { ...draft, ...payload, id: selectedId };
          setDraft(merged);
          setBaseline(JSON.parse(JSON.stringify(merged)));
        }
        await loadList();
        triggerSaveOk();
        const pub =
          updated && typeof updated === 'object' && 'published' in updated
            ? !!updated.published
            : !!draft.published;
        return { success: true, id: selectedId, published: pub };
      } catch (err) {
        console.error('[handleSave]', err);
        setError('Save failed unexpectedly. Check the network tab or try again.');
        return { success: false };
      }
    } finally {
      setSaving(false);
    }
  };

  const mergePosterResponse = useCallback((p) => {
    if (!p || typeof p !== 'object') return;
    const d = cloneDraftFromPoster(p);
    setDraft(d);
    setBaseline(JSON.parse(JSON.stringify(d)));
    clearPosterRouteCache(normalizeRouteClient(d.route));
  }, []);

  const handleMarketingFeatured = async (featured) => {
    if (isNew || !selectedId) return;
    if (isDirty) {
      setError('Save or discard your changes before changing the Marketing highlight.');
      return;
    }
    if (!draft.published) {
      setError('Publish the template first.');
      return;
    }
    setMarketingFeatSaving(true);
    setError('');
    try {
      const res = await setPosterMarketingFeatured(selectedId, featured, audience);
      if (!res.success) {
        setError(res.message || 'Could not update counsellor Marketing highlight.');
        return;
      }
      const body = res.data;
      const p = body?.poster ?? body?.data?.poster;
      mergePosterResponse(p);
      await loadList();
    } finally {
      setMarketingFeatSaving(false);
    }
  };

  /**
   * Saves draft when new or dirty, then POST /publish. Publish works even with unsaved edits (auto-saves first).
   * New templates: use Save & publish (same flow — save creates id, then publish).
   */
  const runPublishFlow = async () => {
    if (!routeOkForPublic || !draft.svgTemplate.trim()) {
      setError('Use a /p/… route and upload an SVG before publishing.');
      return;
    }
    setPublishing(true);
    setError('');
    try {
      let id = selectedId;
      let alreadyPublished = !!draft.published;

      if (isNew || isDirty) {
        const saved = await handleSave();
        if (!saved.success) return;
        id = saved.id ?? selectedId;
        alreadyPublished = !!saved.published;
      }

      if (alreadyPublished) {
        await loadList();
        return;
      }

      if (!id) {
        setError('Save the template first to create a record, then publish.');
        return;
      }

      const res = await publishPosterTemplate(id, audience);
      if (!res.success) {
        if (isPosterAdmin404(res)) {
          setPosterApiMisconfigured(true);
          setError(POSTER_API_404_SAVE_HINT);
        } else {
          setError(res.message || res.data?.message || 'Publish failed');
        }
        return;
      }
      const p = res.data?.poster ?? res.data?.data?.poster;
      mergePosterResponse(p);
      await loadList();
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (isNew || !selectedId) return;
    if (isDirty) {
      setError('Save or discard your changes before unpublishing.');
      return;
    }
    setPublishing(true);
    setError('');
    try {
      const res = await unpublishPosterTemplate(selectedId, audience);
      if (!res.success) {
        if (isPosterAdmin404(res)) {
          setPosterApiMisconfigured(true);
          setError(POSTER_API_404_SAVE_HINT);
        } else {
          setError(res.message || res.data?.message || 'Unpublish failed');
        }
        return;
      }
      const p = res.data?.poster ?? res.data?.data?.poster;
      mergePosterResponse(p);
      await loadList();
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (isNew || !selectedId) return;
    if (!window.confirm('Delete this poster configuration?')) return;
    setSaving(true);
    setError('');
    try {
      const routeBefore = normalizeRouteClient(draft.route);
      const res = await deletePosterTemplate(selectedId, audience);
      if (!res.success) {
        const missing = isPosterAdmin404(res);
        if (missing) setPosterApiMisconfigured(true);
        setError(missing ? POSTER_API_404_SAVE_HINT : res.message || 'Delete failed');
        return;
      }
      clearPosterRouteCache(routeBefore);
      setSelectedId(null);
      setIsNew(false);
      setDraft(emptyDraft(audience));
      setBaseline(null);
      setSelectedOverlayKey(null);
      await loadList();
    } finally {
      setSaving(false);
    }
  };

  const copyPublicUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setUrlCopied(true);
      window.setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      setError('Could not copy URL to clipboard.');
    }
  };

  const updateFieldPosition = (key, x, y) => {
    const k = key === 'name' ? 'nameField' : 'mobileField';
    setDraft((d) => ({
      ...d,
      [k]: { ...d[k], x, anchorX: x, y },
    }));
  };

  const onSvgFile = (file) => {
    if (!file) {
      setError('Please choose a file.');
      return;
    }
    if (file.size > MAX_POSTER_SVG_BYTES) {
      setError(
        `SVG file is too large (${formatPosterSvgSizeMb(file.size)} MB). Maximum size is ${formatPosterSvgLimitLabel()}.`
      );
      return;
    }
    const lower = (file.name || '').toLowerCase();
    const mimeOk =
      file.type === 'image/svg+xml' ||
      file.type === 'image/svg' ||
      file.type === '' ||
      file.type === 'application/octet-stream';
    if (!lower.endsWith('.svg') && !mimeOk) {
      setError('Please choose an .svg file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      let text = typeof reader.result === 'string' ? reader.result : '';
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      text = text.trim();
      if (!text.length) {
        setError('SVG file is empty after reading. Try exporting again from your design tool.');
        return;
      }
      if (text.length > MAX_POSTER_SVG_CHARS) {
        setError(
          `SVG markup exceeds ${formatPosterSvgLimitLabel()} (${formatPosterSvgSizeMb(text.length)} MB). Simplify the file or reduce embedded images.`
        );
        return;
      }
      if (!/<svg[\s>/]/i.test(text)) {
        setError('SVG file must contain a root <svg> element.');
        return;
      }
      setDraft((d) => ({ ...d, svgTemplate: text }));
      setError('');
    };
    reader.onerror = () => setError('Failed to read file.');
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) onSvgFile(f);
  };

  const handleExportPng = async () => {
    const node = posterExportRef.current;
    if (!(node instanceof HTMLElement)) return;
    setExporting(true);
    try {
      const canvas = await capturePosterToCanvas(node, {
        width: designFrame.width,
        height: designFrame.height,
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(draft.name || 'poster').replace(/\s+/g, '-').slice(0, 48)}.png`;
      a.click();
      trackPosterDownloadBeacon({
        posterKey: 'automated',
        format: 'png',
        displayName: draft.name || 'poster',
        routeContext: 'admin',
        posterRoute: normalizeRouteClient(draft.route),
      });
    } catch (err) {
      console.error(err);
      setError('PNG export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    const node = posterExportRef.current;
    if (!(node instanceof HTMLElement)) return;
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const canvas = await capturePosterToCanvas(node, {
        width: designFrame.width,
        height: designFrame.height,
      });
      const w = canvas.width;
      const h = canvas.height;
      const pdf = new jsPDF({
        orientation: w > h ? 'landscape' : 'portrait',
        unit: 'px',
        format: [w, h],
      });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
      pdf.save(`${(draft.name || 'poster').replace(/\s+/g, '-').slice(0, 48)}.pdf`);
      trackPosterDownloadBeacon({
        posterKey: 'automated',
        format: 'pdf',
        displayName: draft.name || 'poster',
        routeContext: 'admin',
        posterRoute: normalizeRouteClient(draft.route),
      });
    } catch (err) {
      console.error(err);
      setError('PDF export failed.');
    } finally {
      setExporting(false);
    }
  };

  const routeNorm = normalizeRouteClient(draft.route);
  const routeOkForPublic = routeNorm.startsWith('/p/') && routeNorm.length > 3;
  const publishPrereqsOk = routeOkForPublic && !!draft.svgTemplate.trim();
  /** Existing template, not yet live — Publish saves first when there are unsaved edits. */
  const canPublishPrimary =
    publishPrereqsOk && !isNew && !!selectedId && !draft.published;
  /** Unpublish requires a clean draft so server state matches what you see. */
  const canUnpublishPrimary =
    publishPrereqsOk && !isNew && !!selectedId && !!draft.published && !isDirty;
  const canSaveAndPublish =
    publishPrereqsOk &&
    (isNew || !!selectedId || isDirty) &&
    (isNew || isDirty || !draft.published);

  const saveButtonLabel = useMemo(() => {
    if (saving) return 'Saving…';
    if (saveJustSucceeded) return 'Saved';
    return 'Save template';
  }, [saving, saveJustSucceeded]);

  const saveButtonTitle = useMemo(() => {
    if (saving) return 'Saving…';
    if (publishing) return 'Wait for publishing to finish.';
    if (!isDirty) return 'No changes to save.';
    return 'Save your changes to the server';
  }, [saving, publishing, isDirty]);

  const toolBtn =
    'inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <DashboardLayout
      title={copy.title}
      subtitle={`${copy.subtitle} Design an SVG template, position name and mobile overlays, then Save template. Use Publish (or Save & publish) so the public /p/… page is available for downloads. Unpublish hides the live page.`}
    >
      {posterApiMisconfigured ? (
        <div
          className="mb-4 rounded-2xl border-2 border-amber-400 bg-amber-50 px-4 py-4 text-sm text-amber-950 shadow-sm sm:px-5"
          role="alert"
        >
          <div className="flex gap-3">
            <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
            <div className="min-w-0 space-y-3">
              <div>
                <p className="font-semibold text-amber-950">Poster API not reachable (404)</p>
                <p className="mt-1.5 leading-relaxed text-amber-950/95">
                  The browser calls <code className="rounded bg-amber-100/90 px-1.5 py-0.5 font-mono text-[0.8125rem]">/api/admin/posters</code>.
                  A 404 means the server that received the request does not expose that route yet (common: hosted API not redeployed, or Vite is proxying to the wrong host).
                </p>
              </div>
              <div>
                <p className="font-medium text-amber-950">Local development</p>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed">
                  <li>
                    Run <code className="rounded bg-amber-100/90 px-1 py-0.5 font-mono text-[0.8125rem]">GuideXpert-Backend</code> (MongoDB + env + port you use, e.g. 5000).
                  </li>
                  <li>
                    Copy <code className="rounded bg-amber-100/90 px-1 py-0.5 font-mono text-[0.8125rem]">.env.development.local.example</code> to{' '}
                    <code className="rounded bg-amber-100/90 px-1 py-0.5 font-mono text-[0.8125rem]">.env.development.local</code> and set{' '}
                    <code className="rounded bg-amber-100/90 px-1 py-0.5 font-mono text-[0.8125rem]">VITE_PROXY_TARGET=http://localhost:5000</code> (match your backend port).
                  </li>
                  <li>
                    Restart <code className="rounded bg-amber-100/90 px-1 py-0.5 font-mono text-[0.8125rem]">npm run dev</code> and confirm the terminal line{' '}
                    <code className="rounded bg-amber-100/90 px-1 py-0.5 font-mono text-[0.8125rem]">[vite] dev proxy: /api → …</code> points at your machine.
                  </li>
                  <li className="marker:font-normal">
                    Optionally set <code className="rounded bg-amber-100/90 px-1 py-0.5 font-mono text-[0.8125rem]">VITE_API_URL=http://localhost:5000/api</code> so login and poster calls use the same host (see <code className="rounded bg-amber-100/90 px-1 py-0.5 font-mono text-[0.8125rem]">.env.example</code>).
                  </li>
                </ol>
              </div>
              <p className="leading-relaxed text-amber-950/95">
                <span className="font-medium">Production:</span> deploy the latest backend so{' '}
                <code className="rounded bg-amber-100/90 px-1 py-0.5 font-mono text-[0.8125rem]">GET /api/admin/posters</code> exists on the API host your app uses.
              </p>
              <p className="text-xs text-amber-900/90">
                This notice stays until loading the list succeeds. Use Refresh list after fixing the proxy or deployment.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm">
          <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Something went wrong</p>
            <p className="mt-0.5 text-red-800/90">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="shrink-0 text-xs font-medium text-red-700 underline-offset-2 hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-6">
        <aside className="w-full shrink-0 lg:w-[280px]">
          <PosterListSidebar
            posters={posters}
            selectedId={selectedId}
            isNew={isNew}
            onSelect={selectPoster}
            onCreate={handleCreate}
            disabled={loading || saving || publishing}
            emptyHint={
              audience === 'pro'
                ? 'Create a PRO template here. Counsellor posters stay in Poster automation.'
                : 'Create one to upload an SVG and map it to a route.'
            }
          />
        </aside>

        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm ring-1 ring-black/[0.03]">
            <div className="flex flex-col gap-4 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight text-primary-navy">Template editor</h2>
                  {isDirty ? (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/80">
                      Unsaved
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-slate-600">
                      Saved
                    </span>
                  )}
                  {!isNew && selectedId && draft.published ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-emerald-900 ring-1 ring-emerald-200/80">
                      Live
                    </span>
                  ) : !isNew && selectedId ? (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-slate-600">
                      Draft
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-sm text-gray-600">{draft.name || 'Untitled template'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || publishing || !isDirty}
                  title={saveButtonTitle}
                  aria-label={saveButtonTitle}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <FiSave className="h-4 w-4" aria-hidden />
                  {saveButtonLabel}
                </button>
                {canSaveAndPublish ? (
                  <button
                    type="button"
                    onClick={() => void runPublishFlow()}
                    disabled={saving || publishing || loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {publishing ? 'Publishing…' : 'Save & publish'}
                  </button>
                ) : null}
                {!isNew && selectedId ? (
                  <button
                    type="button"
                    onClick={handleDiscard}
                    disabled={saving || publishing || !isDirty}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Discard
                  </button>
                ) : null}
                {!isNew && selectedId ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving || publishing}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 px-3 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    <FiTrash2 className="h-4 w-4" aria-hidden />
                    Delete
                  </button>
                ) : null}
              </div>
            </div>

                       <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50/90 to-white px-5 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-900/80">Publishing</h3>
                  {isNew || !selectedId ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-emerald-900/80">
                      <strong className="font-semibold text-emerald-950">Save this template</strong> first, then use{' '}
                      <span className="font-medium">Save &amp; publish</span> or <span className="font-medium">Publish</span> below
                      so the public <code className="rounded bg-white/80 px-1 py-0.5 font-mono text-[0.8125rem] text-emerald-950">/p/…</code> URL
                      loads this poster for visitors.
                    </p>
                  ) : (
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      {draft.published
                        ? 'This template is live at your public URL. Unpublish to hide it from the public page.'
                        : 'Publishing saves any pending edits and makes this design available at your public URL.'}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void runPublishFlow()}
                    disabled={saving || publishing || !canPublishPrimary}
                    title={
                      isNew || !selectedId
                        ? 'Save the template first (or use Save & publish)'
                        : !publishPrereqsOk
                          ? 'Use a route starting with /p/ and add an SVG'
                          : draft.published
                            ? 'Already published'
                            : undefined
                    }
                    className="inline-flex min-h-[2.75rem] min-w-[7.5rem] items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {publishing ? 'Publishing…' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleUnpublish()}
                    disabled={saving || publishing || !canUnpublishPrimary}
                    title={
                      isDirty
                        ? 'Save or discard changes before unpublishing'
                        : !draft.published
                          ? 'Nothing to unpublish'
                          : undefined
                    }
                    className="inline-flex min-h-[2.75rem] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {publishing ? 'Updating…' : 'Unpublish'}
                  </button>
                </div>
              </div>
              {!isNew && selectedId && draft.published ? (
                <div className="mt-4 w-full rounded-xl border border-sky-200/90 bg-sky-50/90 px-4 py-3 sm:px-5">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-sky-900/90">
                    {copy.marketingLabel}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                    This published template appears as its own card on{' '}
                    <span className="font-medium text-slate-800">{copy.marketingPath}</span>. You can optionally mark it
                    as highlighted without hiding other published templates.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleMarketingFeatured(true)}
                      disabled={
                        loading ||
                        saving ||
                        publishing ||
                        marketingFeatSaving ||
                        !!draft.marketingFeatured ||
                        isDirty
                      }
                      className="inline-flex items-center justify-center rounded-xl border border-sky-600 bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {draft.marketingFeatured
                        ? 'Highlighted in Marketing'
                        : marketingFeatSaving
                          ? 'Applying…'
                          : copy.highlightAction}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleMarketingFeatured(false)}
                      disabled={
                        loading ||
                        saving ||
                        publishing ||
                        marketingFeatSaving ||
                        !draft.marketingFeatured ||
                        isDirty
                      }
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {marketingFeatSaving ? 'Removing…' : 'Remove Marketing highlight'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/70 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".svg,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onSvgFile(f);
                    e.target.value = '';
                  }}
                />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={loading || saving || publishing} className={toolBtn}>
                  <FiUpload className="h-4 w-4 text-gray-500" aria-hidden />
                  Upload SVG
                </button>
                <span className="text-xs text-gray-500 sm:ml-1">Up to {formatPosterSvgLimitLabel()}</span>
                <button
                  type="button"
                  onClick={handleExportPng}
                  disabled={exporting || !draft.svgTemplate.trim() || loading || publishing}
                  className={toolBtn}
                >
                  <FiImage className="h-4 w-4 text-gray-500" aria-hidden />
                  {exporting ? 'Exporting…' : 'Export PNG'}
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={exporting || !draft.svgTemplate.trim() || loading || publishing}
                  className={toolBtn}
                >
                  <FiFileText className="h-4 w-4 text-gray-500" aria-hidden />
                  {exporting ? 'Exporting…' : 'Export PDF'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => void loadList()}
                disabled={loading || saving || publishing}
                className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-transparent px-2 py-2 text-sm font-medium text-gray-600 hover:bg-white hover:ring-1 hover:ring-gray-200 sm:self-auto"
              >
                <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
                Refresh list
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-6 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-gray-500">Display name</span>
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary-blue-400 focus:outline-none focus:ring-2 focus:ring-primary-blue-400/20"
                    placeholder="e.g. Inter Results Campaign (shown in Counsellor Marketing)"
                  />
                </label>
                <label className="block">
                  <span className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-gray-500">
                    <FiGlobe className="h-3.5 w-3.5" aria-hidden />
                    Frontend route
                  </span>
                  <input
                    value={draft.route}
                    onChange={(e) => setDraft((d) => ({ ...d, route: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-mono text-sm text-gray-900 shadow-sm focus:border-primary-blue-400 focus:outline-none focus:ring-2 focus:ring-primary-blue-400/20"
                    placeholder="/p/winter-drive"
                  />
                  <span className="mt-2 block text-[0.6875rem] text-gray-400">
                    Normalized key:{' '}
                    <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-gray-700">
                      {normalizeRouteClient(draft.route)}
                    </code>
                    {!routeOkForPublic ? (
                      <span className="mt-1 block text-amber-700">Must start with /p/ so it matches the public app route.</span>
                    ) : null}
                  </span>
                </label>
              </div>
              <div className="mb-6">
                <label className="block">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-gray-500">Marketing description</span>
                  <textarea
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                    className="mt-2 min-h-[84px] w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary-blue-400 focus:outline-none focus:ring-2 focus:ring-primary-blue-400/20"
                    placeholder="e.g. Inter results campaign poster with your name and mobile. Download PNG or PDF after eligibility check."
                    maxLength={500}
                  />
                  <span className="mt-1 block text-right text-[0.6875rem] text-gray-400">
                    {String(draft.description ?? '').length}/500
                  </span>
                </label>
              </div>

              {!isNew && selectedId && routeOkForPublic ? (
                <div className="mb-6 rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 sm:px-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">Public page URL</p>
                      <p className="mt-1 truncate font-mono text-sm text-slate-800">{publicUrl}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyPublicUrl()}
                      className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 sm:self-auto"
                    >
                      {urlCopied ? <FiCheck className="h-4 w-4 text-emerald-600" aria-hidden /> : <FiCopy className="h-4 w-4" aria-hidden />}
                      {urlCopied ? 'Copied' : 'Copy URL'}
                    </button>
                  </div>
                  <p className="mt-2 text-[0.6875rem] leading-relaxed text-slate-500">
                    Visitors open this link, enter their mobile, and downloads unlock after a match in Training Feedback.
                  </p>
                </div>
              ) : null}

              {loading ? (
                <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <FiRefreshCw className="h-5 w-5 animate-spin" aria-hidden />
                    Loading…
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-start">
                  <PosterEditorCanvas
                    ref={posterExportRef}
                    svgTemplate={draft.svgTemplate}
                    nameField={draft.nameField}
                    mobileField={draft.mobileField}
                    variables={previewVariables}
                    selectedKey={selectedOverlayKey}
                    onSelectKey={setSelectedOverlayKey}
                    onUpdateFieldPosition={updateFieldPosition}
                    onFileDrop={handleDrop}
                    emptyHint="Drop an SVG here or use Upload SVG"
                  />
                  <div className="min-w-0 space-y-5 lg:sticky lg:top-4 lg:self-start">
                    <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-slate-50/80 to-white p-1 shadow-sm ring-1 ring-black/[0.03]">
                      <div className="rounded-[0.875rem] border border-gray-100/80 bg-white px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-navy/10 text-primary-navy">
                            <FiSidebar className="h-5 w-5" aria-hidden />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Inspector</h3>
                            <p className="text-xs text-gray-500">Name & mobile — position and style</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <PosterElementToolbar
                      nameField={draft.nameField}
                      mobileField={draft.mobileField}
                      onChangeName={(patch) => setDraft((d) => ({ ...d, nameField: { ...d.nameField, ...patch } }))}
                      onChangeMobile={(patch) => setDraft((d) => ({ ...d, mobileField: { ...d.mobileField, ...patch } }))}
                    />
                    <TemplateTokensReference previewVariables={previewVariables} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
