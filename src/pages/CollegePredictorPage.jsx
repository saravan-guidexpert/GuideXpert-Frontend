import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle } from 'react-icons/fi';
import { getPredictedCollegesPublic } from '../utils/api';
import {
  ENTRANCE_EXAMS,
  getEntranceExamMeta,
  filterCollegesForApEamcetPredictor,
  apEamcetPredictorDisplayTotal,
  RESERVATION_CATEGORIES,
  BRANCH_CODES,
  SORT_ORDER_OPTIONS,
  DISTRICTS,
  rankToCutoff,
  JEE_RESERVATION_OPTIONS,
  getJeeReservationCategoryCodes,
  mapKeamBranchCodesForApi,
  filterCollegesForKeamDistrictPredictor,
  filterCollegesForWbjeeDistrictPredictor,
  getWbjeeReservationCategoryCode,
  WBJEE_CATEGORY_OPTIONS,
} from '../constants/collegePredictorOptions';
import { getDistrictOptionsForNativeState } from '../constants/mhtCetOptions';
import {
  JeeCombinedPredictorForm,
  TneaPredictorForm,
  KeamPredictorForm,
  WbjeePredictorForm,
  CollegeCard,
} from '../components/Counsellor/CollegePredictor';
import { formatPredictorClientError } from '../utils/collegePredictorErrors';

const ADMISSION_CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'HK', label: 'Hyderabad-Karnataka (HK)' },
  { value: 'AU', label: 'Andhra University (AU)' },
  { value: 'SVU', label: 'Sri Venkateswara University (SVU)' },
];

const PAGE_SIZE = 10;

/** Same EAMCET-style result cards as counsellor predictor ([examCardConfig] green). */
const RESULT_CARD_ACCENT = 'green';

const ERROR_MESSAGES = {
  INVALID_ENTRANCE_EXAM_NAME_ENUM:
    'This exam is not enabled on the predictor service yet, or the exam name is invalid. Try again later or contact support.',
  INVALID_ADMISSION_CATEGORY_NAME_ENUM: 'Invalid admission category. Please select a valid option.',
  INVALID_BRANCH_CODES: 'One or more branch codes are invalid.',
  INVALID_RESERVATION_CATEGORY_CODE: 'Invalid reservation category. Please select a valid option.',
  INVALID_CUTOFF_RANGE: 'Invalid cutoff range. Minimum must be less than or equal to maximum.',
  INVALID_INPUT_FORMAT: 'Please check your inputs (e.g. non-negative numbers for cutoff, offset, limit).',
  SERVICE_UNAVAILABLE: 'Predictor service is temporarily unavailable. Please try again later.',
  UPSTREAM_ERROR: 'The predictor service returned an error. Please try again.',
};

function getErrorMessage(errData, fallbackMessage) {
  return formatPredictorClientError(ERROR_MESSAGES, errData, fallbackMessage, { preferResponseFirst: true });
}

function getPublicFilterSnapshot(f) {
  return JSON.stringify({
    entrance_exam_name_enum: f.entrance_exam_name_enum,
    admission_category_name_enum: f.admission_category_name_enum,
    reservation_category_code: f.reservation_category_code,
    cutoff_from: f.cutoff_from,
    cutoff_to: f.cutoff_to,
    branch_codes: [...(f.branch_codes || [])].sort(),
    districts: [...(f.districts || [])].sort(),
    sort_order: f.sort_order,
  });
}

function emptyJeeSlotPublic() {
  return {
    colleges: [],
    total: 0,
    offset: 0,
    admissionCategoryName: '',
    error: null,
  };
}

function parsePositiveIntRankPublic(s) {
  const n = Number(s);
  if (s === '' || Number.isNaN(n) || n < 1 || !Number.isInteger(n)) return null;
  return n;
}

function getJeePublicFilterSnapshot(j) {
  return JSON.stringify({
    rankMain: j.rankMain,
    rankAdvanced: j.rankAdvanced,
    admission_category_name_enum: j.admission_category_name_enum,
    reservation_category_codes: [...(j.reservation_category_codes || [])].sort(),
    branch_codes: [...(j.branch_codes || [])].sort(),
    branchMode: j.branchMode,
    sort_order: j.sort_order,
    gender: j.gender,
  });
}

function initialTneaPublicForm(defaultReservation) {
  return {
    rank: '',
    reservation_category_codes: defaultReservation ? [defaultReservation] : [],
    districtMode: 'all',
    districts: [],
    branchMode: 'all',
    branch_codes: [],
    sort_order: 'ASC',
    native_state: '',
    native_district: '',
  };
}

function getTneaPublicFilterSnapshot(t) {
  return JSON.stringify({
    rank: t.rank,
    reservation_category_codes: [...(t.reservation_category_codes || [])].sort(),
    districts: [...(t.districts || [])].sort(),
    districtMode: t.districtMode,
    branch_codes: [...(t.branch_codes || [])].sort(),
    branchMode: t.branchMode,
    sort_order: t.sort_order,
    native_state: t.native_state,
    native_district: t.native_district,
  });
}

function initialKeamPublicForm(defaultReservation) {
  return initialTneaPublicForm(defaultReservation);
}

function getKeamPublicFilterSnapshot(t) {
  return getTneaPublicFilterSnapshot(t);
}

function initialWbjeePublicForm(defaultCategory) {
  const cat = defaultCategory || 'OPEN';
  return {
    rankWbjee: '',
    rankJeeMain: '',
    reservation_category_codes: [cat],
    quota: 'all_india',
    current_state: '',
    current_district: '',
    branchMode: 'all',
    branch_codes: [],
    sort_order: 'ASC',
    admission_category_name_enum: 'DEFAULT',
  };
}

function getWbjeePublicFilterSnapshot(w) {
  return JSON.stringify({
    rankWbjee: w.rankWbjee,
    rankJeeMain: w.rankJeeMain,
    reservation_category_codes: [...(w.reservation_category_codes || [])].sort(),
    quota: w.quota,
    current_state: w.current_state,
    current_district: w.current_district,
    branch_codes: [...(w.branch_codes || [])].sort(),
    branchMode: w.branchMode,
    sort_order: w.sort_order,
  });
}

const initialCollegeForm = {
  entrance_exam_name_enum: '',
  admission_category_name_enum: 'GENERAL',
  cutoff_from: '',
  cutoff_to: '',
  reservation_category_code: '1G',
  branch_codes: [],
  districts: [],
  sort_order: 'ASC',
};

export default function CollegePredictorPage() {
  const [form, setForm] = useState(initialCollegeForm);
  const examMetaPublic = useMemo(() => getEntranceExamMeta(form.entrance_exam_name_enum), [form.entrance_exam_name_enum]);
  const reservationOptsPublic = useMemo(
    () => (examMetaPublic?.reservationOptions?.length ? examMetaPublic.reservationOptions : RESERVATION_CATEGORIES),
    [examMetaPublic]
  );
  const districtOptsPublic = useMemo(() => {
    const meta = examMetaPublic;
    const byAdm = meta?.districtOptionsByAdmission;
    if (byAdm && form.admission_category_name_enum) {
      const list = byAdm[form.admission_category_name_enum];
      if (Array.isArray(list) && list.length > 0) return list;
    }
    return meta?.districtOptions?.length ? meta.districtOptions : DISTRICTS;
  }, [examMetaPublic, form.admission_category_name_enum]);
  const admissionOptsPublic = useMemo(
    () => (examMetaPublic?.admissionCategories?.length ? examMetaPublic.admissionCategories : ADMISSION_CATEGORIES),
    [examMetaPublic]
  );

  useEffect(() => {
    const meta = getEntranceExamMeta(form.entrance_exam_name_enum);
    if (!form.entrance_exam_name_enum || !meta) return;
    setForm((prev) => ({
      ...prev,
      admission_category_name_enum: meta.admissionCategories?.[0]?.value ?? prev.admission_category_name_enum,
      reservation_category_code: meta.defaultReservationCode ?? prev.reservation_category_code,
      districts: [],
    }));
    if (form.entrance_exam_name_enum === 'TNEA') {
      setTneaPublicForm(initialTneaPublicForm(meta.defaultReservationCode));
      lastSuccessfulTneaPublicSnapshotRef.current = null;
      hasSuccessfulTneaPublicPredictionRef.current = false;
    }
    if (form.entrance_exam_name_enum === 'KEAM') {
      setKeamPublicForm(initialKeamPublicForm(meta.defaultReservationCode));
      lastSuccessfulKeamPublicSnapshotRef.current = null;
      hasSuccessfulKeamPublicPredictionRef.current = false;
    }
    if (form.entrance_exam_name_enum === 'WBJEE') {
      setWbjeePublicForm(initialWbjeePublicForm(meta.defaultReservationCode));
      lastSuccessfulWbjeePublicSnapshotRef.current = null;
      hasSuccessfulWbjeePublicPredictionRef.current = false;
    }
  }, [form.entrance_exam_name_enum]);

  /** AP EAMCET: AU vs SVU use different district codes — clear invalid chip selections when region changes. */
  useEffect(() => {
    if (form.entrance_exam_name_enum !== 'AP_EAMCET') return;
    const meta = getEntranceExamMeta('AP_EAMCET');
    const byAdm = meta?.districtOptionsByAdmission;
    if (!byAdm) return;
    const valid = new Set((byAdm[form.admission_category_name_enum] || []).map((o) => o.value));
    setForm((prev) => {
      const next = prev.districts.filter((d) => valid.has(d));
      if (next.length === prev.districts.length) return prev;
      return { ...prev, districts: next };
    });
  }, [form.entrance_exam_name_enum, form.admission_category_name_enum]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [offset, setOffset] = useState(0);
  const lastSuccessfulPublicSnapshotRef = useRef(null);
  const lastSuccessfulJeePublicSnapshotRef = useRef(null);
  const hasSuccessfulJeePublicPredictionRef = useRef(false);

  const isJeePublic = form.entrance_exam_name_enum === 'JEE';
  const isTneaPublic = form.entrance_exam_name_enum === 'TNEA';
  const isKeamPublic = form.entrance_exam_name_enum === 'KEAM';
  const isWbjeePublic = form.entrance_exam_name_enum === 'WBJEE';
  const examComingSoon = Boolean(examMetaPublic && examMetaPublic.supported === false);

  const [jeePublicForm, setJeePublicForm] = useState({
    rankMain: '',
    rankAdvanced: '',
    reservation_category_codes: ['OPEN'],
    branchMode: 'all',
    branch_codes: [],
    sort_order: 'ASC',
    admission_category_name_enum: 'DEFAULT',
    gender: '',
  });
  const [jeePublicSlots, setJeePublicSlots] = useState({
    main: emptyJeeSlotPublic(),
    advanced: emptyJeeSlotPublic(),
  });
  const [jeePublicActiveTab, setJeePublicActiveTab] = useState('main');
  const [jeePublicHadMain, setJeePublicHadMain] = useState(false);
  const [jeePublicHadAdvanced, setJeePublicHadAdvanced] = useState(false);
  const [jeePublicSearched, setJeePublicSearched] = useState(false);

  const [tneaPublicForm, setTneaPublicForm] = useState(() =>
    initialTneaPublicForm(getEntranceExamMeta('TNEA')?.defaultReservationCode)
  );
  const lastSuccessfulTneaPublicSnapshotRef = useRef(null);
  const hasSuccessfulTneaPublicPredictionRef = useRef(false);

  const [keamPublicForm, setKeamPublicForm] = useState(() =>
    initialKeamPublicForm(getEntranceExamMeta('KEAM')?.defaultReservationCode)
  );
  const lastSuccessfulKeamPublicSnapshotRef = useRef(null);
  const hasSuccessfulKeamPublicPredictionRef = useRef(false);

  const [wbjeePublicForm, setWbjeePublicForm] = useState(() =>
    initialWbjeePublicForm(getEntranceExamMeta('WBJEE')?.defaultReservationCode)
  );
  const lastSuccessfulWbjeePublicSnapshotRef = useRef(null);
  const hasSuccessfulWbjeePublicPredictionRef = useRef(false);

  useEffect(() => {
    const jeeMeta = getEntranceExamMeta('JEE');
    if (form.entrance_exam_name_enum !== 'JEE' || jeeMeta?.supported === false) {
      setJeePublicSlots({ main: emptyJeeSlotPublic(), advanced: emptyJeeSlotPublic() });
      setJeePublicHadMain(false);
      setJeePublicHadAdvanced(false);
      setJeePublicSearched(false);
      lastSuccessfulJeePublicSnapshotRef.current = null;
      hasSuccessfulJeePublicPredictionRef.current = false;
      return;
    }
    setJeePublicForm((prev) => ({
      ...prev,
      reservation_category_codes: jeeMeta?.defaultReservationCode
        ? [jeeMeta.defaultReservationCode]
        : ['OPEN'],
      admission_category_name_enum: jeeMeta?.admissionCategories?.[0]?.value ?? 'DEFAULT',
    }));
  }, [form.entrance_exam_name_enum]);

  const updateForm = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const toggleBranchMulti = useCallback((field, value) => {
    setForm((prev) => {
      const arr = prev[field] || [];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [field]: next };
    });
    setError(null);
  }, []);

  const validateJeePublic = useCallback(() => {
    const rm = parsePositiveIntRankPublic(jeePublicForm.rankMain);
    const ra = parsePositiveIntRankPublic(jeePublicForm.rankAdvanced);
    if (rm === null && ra === null) {
      return 'Enter at least one valid rank (JEE Main and/or JEE Advanced).';
    }
    const res = jeePublicForm.reservation_category_codes?.[0];
    if (!res || !String(res).trim()) return 'Please select a category.';
    if (!jeePublicForm.gender) {
      return 'Please select a gender (required for JEE category expansion).';
    }
    if (
      jeePublicForm.branchMode === 'specific' &&
      (!jeePublicForm.branch_codes || jeePublicForm.branch_codes.length === 0)
    ) {
      return 'Select at least one branch, or choose “All branches”.';
    }
    return null;
  }, [jeePublicForm]);

  const validateTneaPublic = useCallback(() => {
    const rank = Number(tneaPublicForm.rank);
    if (tneaPublicForm.rank === '' || Number.isNaN(rank) || rank < 1 || !Number.isInteger(rank)) {
      return 'Please enter a valid positive integer for your TNEA rank.';
    }
    if (!tneaPublicForm.reservation_category_codes?.length) {
      return 'Please select a category.';
    }
    if (tneaPublicForm.branchMode === 'specific' && (!tneaPublicForm.branch_codes || tneaPublicForm.branch_codes.length === 0)) {
      return 'Select at least one branch, or choose “All branches”.';
    }
    if (tneaPublicForm.districtMode === 'specific' && (!tneaPublicForm.districts || tneaPublicForm.districts.length === 0)) {
      return 'Select at least one Tamil Nadu district, or choose “All Districts”.';
    }
    if (!tneaPublicForm.native_state || !tneaPublicForm.native_district) {
      return 'Please select native state and current district.';
    }
    const allowed = new Set(
      getDistrictOptionsForNativeState(tneaPublicForm.native_state).map((o) => o.value)
    );
    if (!allowed.has(tneaPublicForm.native_district)) {
      return 'Select a district that belongs to your native state.';
    }
    return null;
  }, [tneaPublicForm]);

  const validateKeamPublic = useCallback(() => {
    const rank = Number(keamPublicForm.rank);
    if (keamPublicForm.rank === '' || Number.isNaN(rank) || rank < 1 || !Number.isInteger(rank)) {
      return 'Please enter a valid positive integer for your KEAM rank.';
    }
    if (!keamPublicForm.reservation_category_codes?.length) {
      return 'Please select a category.';
    }
    if (keamPublicForm.branchMode === 'specific' && (!keamPublicForm.branch_codes || keamPublicForm.branch_codes.length === 0)) {
      return 'Select at least one branch, or choose “All branches”.';
    }
    if (keamPublicForm.districtMode === 'specific' && (!keamPublicForm.districts || keamPublicForm.districts.length === 0)) {
      return 'Select at least one Kerala district, or choose “All Districts”.';
    }
    if (!keamPublicForm.native_state || !keamPublicForm.native_district) {
      return 'Please select native state and current district.';
    }
    const allowed = new Set(
      getDistrictOptionsForNativeState(keamPublicForm.native_state).map((o) => o.value)
    );
    if (!allowed.has(keamPublicForm.native_district)) {
      return 'Select a district that belongs to your native state.';
    }
    return null;
  }, [keamPublicForm]);

  const validateWbjeePublic = useCallback(() => {
    const rw = parsePositiveIntRankPublic(wbjeePublicForm.rankWbjee);
    const rj = parsePositiveIntRankPublic(wbjeePublicForm.rankJeeMain);
    if (rw === null && rj === null) {
      return 'Enter at least one valid rank (WBJEE and/or JEE Main).';
    }
    const base = wbjeePublicForm.reservation_category_codes?.[0];
    if (!base || !String(base).trim()) {
      return 'Please select a category.';
    }
    if (!wbjeePublicForm.quota) {
      return 'Please select a quota (All India or Home State).';
    }
    const resCode = getWbjeeReservationCategoryCode(base, wbjeePublicForm.quota);
    if (!resCode) {
      return 'This category applies to Home State (West Bengal) quota only. Switch quota or category.';
    }
    if (wbjeePublicForm.branchMode === 'specific' && (!wbjeePublicForm.branch_codes || wbjeePublicForm.branch_codes.length === 0)) {
      return 'Select at least one branch, or choose “All branches”.';
    }
    if (!wbjeePublicForm.current_state || !wbjeePublicForm.current_district) {
      return 'Please select state and district.';
    }
    const allowed = new Set(
      getDistrictOptionsForNativeState(wbjeePublicForm.current_state).map((o) => o.value)
    );
    if (!allowed.has(wbjeePublicForm.current_district)) {
      return 'Select a district that belongs to the selected state.';
    }
    return null;
  }, [wbjeePublicForm]);

  const fetchTneaPublicColleges = useCallback(
    async (pageOffset, append) => {
      const validationError = validateTneaPublic();
      if (validationError) {
        setError(validationError);
        return;
      }
      setLoading(true);
      setError(null);
      const [cutoffFrom, cutoffTo] = rankToCutoff(Number(tneaPublicForm.rank));
      const resCodes =
        tneaPublicForm.reservation_category_codes?.length > 0
          ? tneaPublicForm.reservation_category_codes
          : ['OC'];
      const branch_codes =
        tneaPublicForm.branchMode === 'specific' && tneaPublicForm.branch_codes?.length > 0
          ? tneaPublicForm.branch_codes
          : [];
      const districts =
        tneaPublicForm.districtMode === 'specific' && tneaPublicForm.districts?.length > 0
          ? tneaPublicForm.districts
          : [];

      const payload = {
        offset: pageOffset,
        limit: PAGE_SIZE,
        exam: 'TNEA',
        entrance_exam_name_enum: 'TNEA',
        admission_category_name_enum: 'DEFAULT',
        cutoff_from: cutoffFrom,
        cutoff_to: cutoffTo,
        reservation_category_codes: resCodes,
        sort_order: String(tneaPublicForm.sort_order ?? 'ASC'),
        branch_codes,
        districts,
      };

      const res = await getPredictedCollegesPublic(payload);
      setLoading(false);

      if (!res.success) {
        const errData = res.data || {};
        setError(getErrorMessage(errData, res.message));
        if (!append) {
          setResult(null);
          lastSuccessfulTneaPublicSnapshotRef.current = null;
          hasSuccessfulTneaPublicPredictionRef.current = false;
        }
        return;
      }

      const data = res.data;
      const rawColleges = data.colleges || [];
      if (!append) {
        lastSuccessfulTneaPublicSnapshotRef.current = getTneaPublicFilterSnapshot(tneaPublicForm);
        hasSuccessfulTneaPublicPredictionRef.current = true;
        setResult({ ...data, colleges: rawColleges });
        setOffset(pageOffset);
        return;
      }
      setResult((prev) => {
        if (!prev) return { ...data, colleges: rawColleges };
        return {
          ...data,
          colleges: [...(prev.colleges || []), ...rawColleges],
          total_no_of_colleges: data.total_no_of_colleges ?? prev.total_no_of_colleges,
        };
      });
      setOffset(pageOffset);
    },
    [tneaPublicForm, validateTneaPublic]
  );

  const handleTneaPublicPredict = useCallback(async () => {
    const v = validateTneaPublic();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setResult(null);
    setOffset(0);
    await fetchTneaPublicColleges(0, false);
  }, [validateTneaPublic, fetchTneaPublicColleges]);

  const fetchKeamPublicColleges = useCallback(
    async (pageOffset, append) => {
      const validationError = validateKeamPublic();
      if (validationError) {
        setError(validationError);
        return;
      }
      setLoading(true);
      setError(null);
      const [cutoffFrom, cutoffTo] = rankToCutoff(Number(keamPublicForm.rank));
      const meta = getEntranceExamMeta('KEAM');
      const resCodes =
        keamPublicForm.reservation_category_codes?.length > 0
          ? keamPublicForm.reservation_category_codes
          : meta?.defaultReservationCode
            ? [meta.defaultReservationCode]
            : ['SM'];
      const branch_codes = mapKeamBranchCodesForApi(
        keamPublicForm.branchMode === 'specific' && keamPublicForm.branch_codes?.length > 0
          ? keamPublicForm.branch_codes
          : []
      );
      // Match counsellor: upstream KEAM district filter returns 0 rows when district_enum is empty — filter client-side.
      const districts = [];

      const payload = {
        offset: pageOffset,
        limit: PAGE_SIZE,
        exam: 'KEAM',
        entrance_exam_name_enum: 'KEAM',
        admission_category_name_enum: 'DEFAULT',
        cutoff_from: cutoffFrom,
        cutoff_to: cutoffTo,
        reservation_category_codes: resCodes,
        sort_order: String(keamPublicForm.sort_order ?? 'ASC'),
        branch_codes,
        districts,
      };

      const res = await getPredictedCollegesPublic(payload);
      setLoading(false);

      if (!res.success) {
        const errData = res.data || {};
        setError(getErrorMessage(errData, res.message));
        if (!append) {
          setResult(null);
          lastSuccessfulKeamPublicSnapshotRef.current = null;
          hasSuccessfulKeamPublicPredictionRef.current = false;
        }
        return;
      }

      const data = res.data;
      const rawColleges = data.colleges || [];
      if (!append) {
        lastSuccessfulKeamPublicSnapshotRef.current = getKeamPublicFilterSnapshot(keamPublicForm);
        hasSuccessfulKeamPublicPredictionRef.current = true;
        setResult({ ...data, colleges: rawColleges });
        setOffset(pageOffset);
        return;
      }
      setResult((prev) => {
        if (!prev) return { ...data, colleges: rawColleges };
        return {
          ...data,
          colleges: [...(prev.colleges || []), ...rawColleges],
          total_no_of_colleges: data.total_no_of_colleges ?? prev.total_no_of_colleges,
        };
      });
      setOffset(pageOffset);
    },
    [keamPublicForm, validateKeamPublic]
  );

  const handleKeamPublicPredict = useCallback(async () => {
    const v = validateKeamPublic();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setResult(null);
    setOffset(0);
    await fetchKeamPublicColleges(0, false);
  }, [validateKeamPublic, fetchKeamPublicColleges]);

  const fetchWbjeePublicColleges = useCallback(
    async (pageOffset, append) => {
      const validationError = validateWbjeePublic();
      if (validationError) {
        setError(validationError);
        return;
      }
      setLoading(true);
      setError(null);
      const rw = parsePositiveIntRankPublic(wbjeePublicForm.rankWbjee);
      const rj = parsePositiveIntRankPublic(wbjeePublicForm.rankJeeMain);
      const rankNum = rw ?? rj;
      const [cutoffFrom, cutoffTo] = rankToCutoff(rankNum);
      const meta = getEntranceExamMeta('WBJEE');
      const apiExam = meta?.wbjeeApiExam ?? meta?.apiValue ?? 'WBJEE_2024';
      const base = wbjeePublicForm.reservation_category_codes?.[0];
      const resCode = getWbjeeReservationCategoryCode(base, wbjeePublicForm.quota);
      const branch_codes =
        wbjeePublicForm.branchMode === 'specific' && wbjeePublicForm.branch_codes?.length > 0
          ? wbjeePublicForm.branch_codes
          : [];
      // Same as counsellor: empty districts avoids strict upstream filter that often returns no rows.
      const districts = [];

      const payload = {
        offset: pageOffset,
        limit: PAGE_SIZE,
        exam: 'WBJEE',
        entrance_exam_name_enum: apiExam,
        admission_category_name_enum: 'DEFAULT',
        cutoff_from: cutoffFrom,
        cutoff_to: cutoffTo,
        reservation_category_codes: resCode ? [resCode] : [],
        sort_order: String(wbjeePublicForm.sort_order ?? 'ASC'),
        branch_codes,
        districts,
      };

      const res = await getPredictedCollegesPublic(payload);
      setLoading(false);

      if (!res.success) {
        const errData = res.data || {};
        setError(getErrorMessage(errData, res.message));
        if (!append) {
          setResult(null);
          lastSuccessfulWbjeePublicSnapshotRef.current = null;
          hasSuccessfulWbjeePublicPredictionRef.current = false;
        }
        return;
      }

      const data = res.data;
      const rawColleges = data.colleges || [];
      if (!append) {
        lastSuccessfulWbjeePublicSnapshotRef.current = getWbjeePublicFilterSnapshot(wbjeePublicForm);
        hasSuccessfulWbjeePublicPredictionRef.current = true;
        setResult({ ...data, colleges: rawColleges });
        setOffset(pageOffset);
        return;
      }
      setResult((prev) => {
        if (!prev) return { ...data, colleges: rawColleges };
        return {
          ...data,
          colleges: [...(prev.colleges || []), ...rawColleges],
          total_no_of_colleges: data.total_no_of_colleges ?? prev.total_no_of_colleges,
        };
      });
      setOffset(pageOffset);
    },
    [wbjeePublicForm, validateWbjeePublic]
  );

  const handleWbjeePublicPredict = useCallback(async () => {
    const v = validateWbjeePublic();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setResult(null);
    setOffset(0);
    await fetchWbjeePublicColleges(0, false);
  }, [validateWbjeePublic, fetchWbjeePublicColleges]);

  const fetchJeePublicSlot = useCallback(async (slot, pageOffset, append, formSnapshot) => {
    const meta = getEntranceExamMeta('JEE');
    const rankStr = slot === 'main' ? formSnapshot.rankMain : formSnapshot.rankAdvanced;
    const rankNum = parsePositiveIntRankPublic(rankStr);
    if (rankNum === null) return { ok: false, skipped: true };

    const apiExam =
      slot === 'main'
        ? meta?.jeeMainApiExam ?? 'JEE_MAIN'
        : meta?.jeeAdvancedApiExam ?? 'JEE_ADVANCED';
    const [cutoffFrom, cutoffTo] = rankToCutoff(rankNum);
    const baseCategory =
      formSnapshot.reservation_category_codes?.[0] || 'OPEN';
    const gender = formSnapshot.gender || 'male';
    const resCodes = getJeeReservationCategoryCodes(apiExam, gender, baseCategory);

    const payload = {
      offset: pageOffset,
      limit: PAGE_SIZE,
      exam: apiExam,
      entrance_exam_name_enum: apiExam,
      admission_category_name_enum: 'DEFAULT',
      cutoff_from: cutoffFrom,
      cutoff_to: cutoffTo,
      reservation_category_codes: resCodes,
      sort_order: String(formSnapshot.sort_order ?? 'ASC'),
      branch_codes:
        formSnapshot.branchMode === 'specific' && formSnapshot.branch_codes?.length > 0
          ? formSnapshot.branch_codes
          : [],
      districts: [],
    };

    const res = await getPredictedCollegesPublic(payload);

    if (!res.success) {
      const errData = res.data || {};
      const msg = getErrorMessage(errData, res.message);
      setJeePublicSlots((prev) => ({
        ...prev,
        [slot]: append
          ? { ...prev[slot], error: msg }
          : { ...emptyJeeSlotPublic(), error: msg },
      }));
      return { ok: false, skipped: false };
    }

    const data = res.data;
    const rawList = data.colleges || [];
    setJeePublicSlots((prev) => {
      const cur = prev[slot];
      const nextList = append ? [...cur.colleges, ...rawList] : rawList;
      const rawTotal = data.total_no_of_colleges ?? 0;
      return {
        ...prev,
        [slot]: {
          colleges: nextList,
          total: rawTotal,
          offset: pageOffset,
          admissionCategoryName: data.admission_category_name || '',
          error: null,
        },
      };
    });
    return { ok: true, skipped: false };
  }, []);

  const handleJeePublicPredictClick = useCallback(async () => {
    const v = validateJeePublic();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setResult(null);
    setJeePublicSearched(true);
    setLoading(true);
    const hasM = parsePositiveIntRankPublic(jeePublicForm.rankMain) !== null;
    const hasA = parsePositiveIntRankPublic(jeePublicForm.rankAdvanced) !== null;
    setJeePublicHadMain(hasM);
    setJeePublicHadAdvanced(hasA);
    setJeePublicActiveTab(hasM ? 'main' : 'advanced');
    if (!hasM) setJeePublicSlots((p) => ({ ...p, main: emptyJeeSlotPublic() }));
    if (!hasA) setJeePublicSlots((p) => ({ ...p, advanced: emptyJeeSlotPublic() }));
    const snap = { ...jeePublicForm };
    const tasks = [];
    if (hasM) tasks.push(fetchJeePublicSlot('main', 0, false, snap));
    if (hasA) tasks.push(fetchJeePublicSlot('advanced', 0, false, snap));
    const results = await Promise.all(tasks);
    const anyOk = results.some((r) => r && r.ok);
    setLoading(false);
    if (anyOk) {
      hasSuccessfulJeePublicPredictionRef.current = true;
      lastSuccessfulJeePublicSnapshotRef.current = getJeePublicFilterSnapshot(snap);
    } else {
      hasSuccessfulJeePublicPredictionRef.current = false;
      lastSuccessfulJeePublicSnapshotRef.current = null;
    }
  }, [jeePublicForm, validateJeePublic, fetchJeePublicSlot]);

  const handleJeePublicLoadMore = useCallback(async () => {
    const slot = jeePublicActiveTab;
    const cur = jeePublicSlots[slot];
    if (!cur || cur.colleges.length >= cur.total) return;
    setLoading(true);
    const nextOff = cur.offset + PAGE_SIZE;
    await fetchJeePublicSlot(slot, nextOff, true, jeePublicForm);
    setLoading(false);
  }, [jeePublicActiveTab, jeePublicSlots, jeePublicForm, fetchJeePublicSlot]);

  const fetchColleges = useCallback(
    async (pageOffset = 0, append = false) => {
      const examValue = form.entrance_exam_name_enum != null && String(form.entrance_exam_name_enum).trim() !== '' ? String(form.entrance_exam_name_enum).trim() : '';
      if (!examValue) {
        setError('Please select an entrance exam.');
        return;
      }
      if (examValue === 'JEE') {
        setError('Use the Predict Colleges button on the JEE form.');
        return;
      }
      if (examValue === 'TNEA') {
        setError('Use Predict Colleges on the TNEA form.');
        return;
      }
      if (examValue === 'KEAM') {
        setError('Use Predict Colleges on the KEAM form.');
        return;
      }
      if (examValue === 'WBJEE') {
        setError('Use Predict Colleges on the WBJEE form.');
        return;
      }
      const rawFrom = form.cutoff_from;
      const rawTo = form.cutoff_to;
      if (rawFrom === '' || rawTo === '') {
        setError('Please enter both cutoff from and cutoff to.');
        return;
      }
      const cutoffFrom = parseInt(Number(rawFrom), 10);
      const cutoffTo = parseInt(Number(rawTo), 10);
      if (!Number.isInteger(cutoffFrom) || cutoffFrom < 0 || !Number.isInteger(cutoffTo) || cutoffTo < 0) {
        setError('Cutoff from and cutoff to must be non-negative integers.');
        return;
      }
      if (cutoffFrom >= cutoffTo) {
        setError('Cutoff to must be greater than cutoff from.');
        return;
      }
      setLoading(true);
      setError(null);
      const examMeta = getEntranceExamMeta(examValue);
      const apiExam = examMeta?.apiValue ?? examValue;
      const resDefault = examMeta?.defaultReservationCode ?? '1G';
      const resCode = String(form.reservation_category_code ?? resDefault).trim();
      const payload = {
        offset: pageOffset,
        limit: PAGE_SIZE,
        exam: apiExam,
        entrance_exam_name_enum: apiExam,
        admission_category_name_enum: String(form.admission_category_name_enum ?? 'GENERAL'),
        cutoff_from: cutoffFrom,
        cutoff_to: cutoffTo,
        reservation_category_codes: [resCode],
        sort_order: String(form.sort_order ?? 'ASC'),
      };
      payload.branch_codes =
        Array.isArray(form.branch_codes) && form.branch_codes.length > 0 ? form.branch_codes : [];
      payload.districts =
        Array.isArray(form.districts) && form.districts.length > 0 ? form.districts : [];

      if (import.meta.env.DEV) {
        console.log('[College Predictor] Request payload:', { ...payload, entrance_exam_name_enum: payload.entrance_exam_name_enum });
      }
      const res = await getPredictedCollegesPublic(payload);

      setLoading(false);
      if (!res.success) {
        const errData = res.data || {};
        if (import.meta.env.DEV) {
          console.warn('[College Predictor] API error:', res.status, errData);
        }
        setError(getErrorMessage(errData, res.message));
        if (!append) {
          setResult(null);
          lastSuccessfulPublicSnapshotRef.current = null;
        }
        return;
      }
      const data = res.data;
      const isApEamcet = apiExam === 'AP_EAMCET';
      const rawColleges = data.colleges || [];
      const collegesForUi = isApEamcet ? filterCollegesForApEamcetPredictor(rawColleges) : rawColleges;
      const totalForUi = isApEamcet
        ? apEamcetPredictorDisplayTotal(data.total_no_of_colleges ?? 0)
        : data.total_no_of_colleges ?? 0;
      const dataForUi = { ...data, colleges: collegesForUi, total_no_of_colleges: totalForUi };
      if (!append) {
        lastSuccessfulPublicSnapshotRef.current = getPublicFilterSnapshot(form);
      }
      if (append && result) {
        setResult((prev) => ({
          ...dataForUi,
          colleges: [...(prev.colleges || []), ...collegesForUi],
          total_no_of_colleges: totalForUi,
        }));
      } else {
        setResult(dataForUi);
      }
      setOffset(pageOffset);
    },
    [form, result]
  );

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (form.entrance_exam_name_enum === 'JEE') return;
      if (form.entrance_exam_name_enum === 'TNEA') return;
      if (form.entrance_exam_name_enum === 'KEAM') return;
      if (form.entrance_exam_name_enum === 'WBJEE') return;
      setResult(null);
      fetchColleges(0, false);
    },
    [fetchColleges, form.entrance_exam_name_enum]
  );

  const handleLoadMore = useCallback(() => {
    if (form.entrance_exam_name_enum === 'JEE' && getEntranceExamMeta('JEE')?.supported !== false) {
      handleJeePublicLoadMore();
      return;
    }
    if (form.entrance_exam_name_enum === 'TNEA') {
      const nextOffset = offset + PAGE_SIZE;
      fetchTneaPublicColleges(nextOffset, true);
      return;
    }
    if (form.entrance_exam_name_enum === 'KEAM') {
      const nextOffset = offset + PAGE_SIZE;
      fetchKeamPublicColleges(nextOffset, true);
      return;
    }
    if (form.entrance_exam_name_enum === 'WBJEE') {
      const nextOffset = offset + PAGE_SIZE;
      fetchWbjeePublicColleges(nextOffset, true);
      return;
    }
    const nextOffset = offset + PAGE_SIZE;
    fetchColleges(nextOffset, true);
  }, [
    form.entrance_exam_name_enum,
    offset,
    fetchColleges,
    handleJeePublicLoadMore,
    fetchTneaPublicColleges,
    fetchKeamPublicColleges,
    fetchWbjeePublicColleges,
  ]);

  useEffect(() => {
    if (form.entrance_exam_name_enum !== 'JEE' || getEntranceExamMeta('JEE')?.supported === false) return;
    if (!hasSuccessfulJeePublicPredictionRef.current) return;
    if (validateJeePublic()) return;
    const current = getJeePublicFilterSnapshot(jeePublicForm);
    if (lastSuccessfulJeePublicSnapshotRef.current === current) return;
    const hasM = parsePositiveIntRankPublic(jeePublicForm.rankMain) !== null;
    const hasA = parsePositiveIntRankPublic(jeePublicForm.rankAdvanced) !== null;
    setJeePublicHadMain(hasM);
    setJeePublicHadAdvanced(hasA);
    (async () => {
      setLoading(true);
      setError(null);
      if (!hasM) setJeePublicSlots((p) => ({ ...p, main: emptyJeeSlotPublic() }));
      if (!hasA) setJeePublicSlots((p) => ({ ...p, advanced: emptyJeeSlotPublic() }));
      const snap = { ...jeePublicForm };
      const tasks = [];
      if (hasM) tasks.push(fetchJeePublicSlot('main', 0, false, snap));
      if (hasA) tasks.push(fetchJeePublicSlot('advanced', 0, false, snap));
      const results = await Promise.all(tasks);
      const anyOk = results.some((r) => r && r.ok);
      setLoading(false);
      if (anyOk) {
        lastSuccessfulJeePublicSnapshotRef.current = getJeePublicFilterSnapshot(snap);
        hasSuccessfulJeePublicPredictionRef.current = true;
      }
    })();
  }, [jeePublicForm, form.entrance_exam_name_enum, validateJeePublic, fetchJeePublicSlot]);

  const total = result?.total_no_of_colleges ?? 0;
  const loaded = result?.colleges?.length ?? 0;
  const hasMore = loaded < total;

  const nonJeePublicCollegesDisplayed = useMemo(() => {
    const list = result?.colleges;
    if (!list) return [];
    if (isKeamPublic) {
      if (keamPublicForm.districtMode !== 'specific' || !keamPublicForm.districts?.length) {
        return list;
      }
      return filterCollegesForKeamDistrictPredictor(list, keamPublicForm.districts);
    }
    if (isWbjeePublic) {
      if (!wbjeePublicForm.current_district) {
        return list;
      }
      const filtered = filterCollegesForWbjeeDistrictPredictor(list, [wbjeePublicForm.current_district]);
      // Upstream rows often miss district fields; avoid empty UI when filter text does not match.
      return filtered.length > 0 ? filtered : list;
    }
    return list;
  }, [
    result?.colleges,
    isKeamPublic,
    isWbjeePublic,
    keamPublicForm.districtMode,
    keamPublicForm.districts,
    wbjeePublicForm.current_district,
  ]);

  const activeJeePublicSlot = jeePublicSlots[jeePublicActiveTab === 'main' ? 'main' : 'advanced'];
  const jeePublicLoaded = activeJeePublicSlot?.colleges?.length ?? 0;
  const jeePublicTotal = activeJeePublicSlot?.total ?? 0;
  const jeePublicHasMore = jeePublicLoaded < jeePublicTotal;
  const jeePublicPageTitle = getEntranceExamMeta('JEE')?.predictorPageTitle ?? 'JEE Main and JEE Advanced College Predictor';
  const jeeBannerErrors = [...new Set([jeePublicSlots.main?.error, jeePublicSlots.advanced?.error].filter(Boolean))];

  const publicResultsUseClientLocationFilter = useMemo(
    () =>
      (isKeamPublic &&
        keamPublicForm.districtMode === 'specific' &&
        keamPublicForm.districts?.length > 0) ||
      (isWbjeePublic && Boolean(wbjeePublicForm.current_district)),
    [
      isKeamPublic,
      isWbjeePublic,
      keamPublicForm.districtMode,
      keamPublicForm.districts,
      wbjeePublicForm.current_district,
    ]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
          <h1 className="text-lg font-bold text-gray-900 sm:text-xl">College Predictor</h1>
          <Link
            to="/become-counsellor"
            className="inline-flex min-h-10 shrink-0 items-center text-sm font-medium text-primary-navy hover:underline sm:self-auto"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto min-w-0 max-w-4xl px-4 py-6 sm:py-8">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4 sm:p-6">
            <p className="text-sm text-gray-600 mb-4">
              {examComingSoon
                ? `${examMetaPublic.label} college prediction is coming soon. Choose another exam below, or check back later.`
                : isJeePublic
                  ? (examMetaPublic?.predictorPageSubtitle ?? 'JEE Main and Advanced prediction with national categories.')
                  : isTneaPublic
                    ? (examMetaPublic?.predictorPageSubtitle ??
                      'Tamil Nadu engineering admissions — rank, category, and filters.')
                    : isKeamPublic
                      ? (examMetaPublic?.predictorPageSubtitle ??
                        'Kerala professional admissions — rank, category, and filters.')
                      : isWbjeePublic
                        ? (examMetaPublic?.predictorPageSubtitle ??
                          'West Bengal engineering admissions — WBJEE and/or JEE Main rank, category, and quota.')
                        : 'Find colleges by entrance exam, cutoff range, reservation category, and optional branch or district filters.'}
            </p>
            <div className="space-y-4">
              {!examComingSoon && (
                <p className="text-xs text-gray-500 mb-2">
                  Fields marked with <span className="text-red-500">*</span> are required.
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entrance exam <span className="text-red-500">*</span>
                </label>
                <select
                  name="entrance_exam_name_enum"
                  value={form.entrance_exam_name_enum ?? ''}
                  onChange={(e) => updateForm('entrance_exam_name_enum', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-navy focus:border-primary-navy"
                >
                  <option value="">Select exam</option>
                  {ENTRANCE_EXAMS.map((o) => (
                    <option key={o.value} value={o.value} disabled={o.supported === false}>
                      {o.label}{o.supported === false ? ' — Coming soon' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {examComingSoon ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-5 py-10 text-center">
                  <p className="text-base font-semibold text-gray-900">{examMetaPublic.label}</p>
                  <p className="mt-2 text-sm text-gray-600">
                    JEE Main and JEE Advanced college prediction is coming soon.
                  </p>
                </div>
              ) : isJeePublic ? (
                <JeeCombinedPredictorForm
                  asForm={false}
                  values={jeePublicForm}
                  onChange={setJeePublicForm}
                  onSubmit={handleJeePublicPredictClick}
                  loading={loading}
                  accentKey="purple"
                  reservationOptions={examMetaPublic?.reservationOptions ?? JEE_RESERVATION_OPTIONS}
                  reservationFieldLabel={examMetaPublic?.reservationFieldLabel ?? 'Select a Category'}
                />
              ) : isTneaPublic ? (
                <TneaPredictorForm
                  asForm={false}
                  values={tneaPublicForm}
                  onChange={setTneaPublicForm}
                  onSubmit={handleTneaPublicPredict}
                  loading={loading}
                  accentKey={examMetaPublic?.accent ?? 'orange'}
                  reservationOptions={examMetaPublic?.reservationOptions}
                  districtOptions={examMetaPublic?.districtOptions}
                />
              ) : isKeamPublic ? (
                <KeamPredictorForm
                  asForm={false}
                  values={keamPublicForm}
                  onChange={setKeamPublicForm}
                  onSubmit={handleKeamPublicPredict}
                  loading={loading}
                  accentKey={examMetaPublic?.accent ?? 'teal'}
                  reservationOptions={examMetaPublic?.reservationOptions}
                  districtOptions={examMetaPublic?.districtOptions}
                />
              ) : isWbjeePublic ? (
                <WbjeePredictorForm
                  asForm={false}
                  values={wbjeePublicForm}
                  onChange={setWbjeePublicForm}
                  onSubmit={handleWbjeePublicPredict}
                  loading={loading}
                  accentKey={examMetaPublic?.accent ?? 'sky'}
                  categoryOptions={examMetaPublic?.reservationOptions ?? WBJEE_CATEGORY_OPTIONS}
                />
              ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {!examMetaPublic?.hideAdmissionField && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {examMetaPublic?.admissionFieldLabel ?? 'Admission category'} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.admission_category_name_enum}
                      onChange={(e) => updateForm('admission_category_name_enum', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-navy focus:border-primary-navy"
                    >
                      {admissionOptsPublic.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {examMetaPublic?.reservationFieldLabel ?? 'Reservation category'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.reservation_category_code}
                    onChange={(e) => updateForm('reservation_category_code', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-navy focus:border-primary-navy"
                  >
                    {reservationOptsPublic.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cutoff from (min) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.cutoff_from}
                    onChange={(e) => updateForm('cutoff_from', e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-navy focus:border-primary-navy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cutoff to (max) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.cutoff_to}
                    onChange={(e) => updateForm('cutoff_to', e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-navy focus:border-primary-navy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort by cutoff (optional)</label>
                  <select
                    value={form.sort_order}
                    onChange={(e) => updateForm('sort_order', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-navy focus:border-primary-navy"
                  >
                    {SORT_ORDER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch codes (optional)</label>
                  <div className="flex max-h-[min(40vh,16rem)] flex-wrap gap-2 overflow-y-auto rounded-lg border border-gray-100 p-2 sm:max-h-none sm:overflow-visible sm:border-0 sm:p-0">
                    {BRANCH_CODES.map((o) => (
                      <label key={o.value} className="inline-flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={form.branch_codes.includes(o.value)}
                          onChange={() => toggleBranchMulti('branch_codes', o.value)}
                          className="rounded border-gray-300 text-primary-navy focus:ring-primary-navy"
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Districts (optional)</label>
                  {examMetaPublic?.districtSelectionHint && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-2">
                      {examMetaPublic.districtSelectionHint}
                    </p>
                  )}
                  <div className="flex max-h-[min(40vh,16rem)] flex-wrap gap-2 overflow-y-auto rounded-lg border border-gray-100 p-2 sm:max-h-none sm:overflow-visible sm:border-0 sm:p-0">
                    {districtOptsPublic.map((o) => (
                      <label key={o.value} className="inline-flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={form.districts.includes(o.value)}
                          onChange={() => toggleBranchMulti('districts', o.value)}
                          className="rounded border-gray-300 text-primary-navy focus:ring-primary-navy"
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-primary-navy px-4 py-2 text-sm font-semibold text-white hover:bg-primary-navy/90 disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Get colleges'}
                </button>
              </div>
            </form>
              )}
            </div>
            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {jeeBannerErrors.length > 0 && isJeePublic && getEntranceExamMeta('JEE')?.supported !== false && jeePublicSearched && !loading && (
            <div className="px-6 pt-4">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                <FiAlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Predictor service note</p>
                  {jeeBannerErrors.map((msg) => (
                    <p key={msg} className="mt-1">{msg}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isJeePublic && getEntranceExamMeta('JEE')?.supported !== false && jeePublicSearched && (
            <div className="bg-gray-50 p-4 sm:p-6 border-t border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-2">{jeePublicPageTitle}</h2>
              {(jeePublicHadMain || jeePublicHadAdvanced) && (
                <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2 mb-4">
                  {jeePublicHadMain && (
                    <button
                      type="button"
                      onClick={() => setJeePublicActiveTab('main')}
                      className={`px-3 py-1.5 text-sm font-semibold rounded-t border-b-2 transition-colors ${
                        jeePublicActiveTab === 'main'
                          ? 'border-violet-600 text-violet-900'
                          : 'text-gray-500 border-transparent hover:text-gray-700'
                      }`}
                    >
                      JEE Main
                    </button>
                  )}
                  {jeePublicHadAdvanced && (
                    <button
                      type="button"
                      onClick={() => setJeePublicActiveTab('advanced')}
                      className={`px-3 py-1.5 text-sm font-semibold rounded-t border-b-2 transition-colors ${
                        jeePublicActiveTab === 'advanced'
                          ? 'border-violet-600 text-violet-900'
                          : 'text-gray-500 border-transparent hover:text-gray-700'
                      }`}
                    >
                      JEE Advanced
                    </button>
                  )}
                </div>
              )}
              {activeJeePublicSlot?.error && (
                <p className="text-sm text-gray-700 mb-4">{activeJeePublicSlot.error}</p>
              )}
              {!activeJeePublicSlot?.error && (
                <p className="text-sm text-gray-600 mb-4">
                  {activeJeePublicSlot?.admissionCategoryName && (
                    <span className="font-medium">{activeJeePublicSlot.admissionCategoryName}</span>
                  )}
                  {activeJeePublicSlot?.admissionCategoryName ? ' — ' : null}
                  Showing {jeePublicLoaded} of {jeePublicTotal} colleges
                </p>
              )}
              <div className="space-y-4">
                {(activeJeePublicSlot?.colleges || []).map((college, idx) => (
                  <CollegeCard
                    key={`jee-${jeePublicActiveTab}-${college.college_id}`}
                    college={college}
                    accentKey={RESULT_CARD_ACCENT}
                    index={idx + 1}
                  />
                ))}
              </div>
              {jeePublicHasMore && !activeJeePublicSlot?.error && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="rounded-lg bg-primary-navy px-4 py-2 text-sm font-semibold text-white hover:bg-primary-navy/90 disabled:opacity-50"
                  >
                    {loading ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
          )}

          {result && !isJeePublic && (
            <div className="bg-gray-50 p-4 sm:p-6">
              {result._demo && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  Showing demo data. Configure <code className="bg-amber-100/80 px-1 rounded">NW_PREDICTORS_ACCESS_TOKEN</code> in the backend to load real colleges.
                </div>
              )}
              <p className="text-sm text-gray-600 mb-4">
                {result.admission_category_name && (
                  <span className="font-medium">{result.admission_category_name}</span>
                )}
                {' — '}
                {publicResultsUseClientLocationFilter
                  ? `Showing ${nonJeePublicCollegesDisplayed.length} colleges matching your filters (${loaded} loaded from server, ${total} reported total)`
                  : `Showing ${loaded} of ${total} colleges`}
              </p>
              <div className="space-y-4">
                {nonJeePublicCollegesDisplayed.map((college, idx) => (
                  <CollegeCard
                    key={college.college_id}
                    college={college}
                    accentKey={RESULT_CARD_ACCENT}
                    index={idx + 1}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="rounded-lg bg-primary-navy px-4 py-2 text-sm font-semibold text-white hover:bg-primary-navy/90 disabled:opacity-50"
                  >
                    {loading ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
