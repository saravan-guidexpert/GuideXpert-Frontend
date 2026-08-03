import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { CounsellorAuthProvider, useCounsellorAuth } from './contexts/CounsellorAuthContext';
import { BdaAuthProvider, useBdaAuth } from './contexts/BdaAuthContext';
import { setBdaToken, setBdaUser } from './utils/bdaApi';
import BdaLogin from './pages/bda/BdaLogin';
import BdaDashboard from './pages/bda/BdaDashboard';
import { WebinarAuthProvider, useWebinarAuth } from './contexts/WebinarAuthContext';
import { StudentAuthProvider } from './contexts/StudentAuthContext';
import WebsiteChatWidget from './components/websiteChat/WebsiteChatWidget';
import RequireStudentAuth from './components/studentAuth/RequireStudentAuth';
import { CounsellorProfileProvider } from './contexts/CounsellorProfileContext';
import { CounsellorTrainingProvider } from './contexts/CounsellorTrainingContext';
import LandingPage from './pages/LandingPage';
import AdminLogin from './pages/AdminLogin';
import MeetingRegistration from './pages/MeetingRegistration';
import IitCounsellingMeet from './pages/IitCounsellingMeet';
import IitCounsellingMeetHindi from './pages/IitCounsellingMeetHindi';
import IitFirstForm from './pages/IitFirstForm';
import CollegeDostForm from './pages/CollegeDostForm';
import CdgxMeet from './pages/CdgxMeet';
import IitSecondForm from './pages/IitSecondForm';
import TrainingMeeting from './pages/TrainingMeeting';
import FeedbackForm from './pages/FeedbackForm';
import TrainingForm from './pages/TrainingForm';
import ProgressCheckInForm from './pages/ProgressCheckInForm';
import IitainSessionFeedbackForm from './pages/IitainSessionFeedbackForm';
import AssessmentForm from './pages/AssessmentForm';
import AssessmentForm2 from './pages/AssessmentForm2';
import AssessmentForm3 from './pages/AssessmentForm3';
import AssessmentForm4 from './pages/AssessmentForm4';
import AssessmentForm5 from './pages/AssessmentForm5';
import AssessmentFormCounsellorTest from './pages/AssessmentFormCounsellorTest';
import AssessmentLayout from './components/Layout/AssessmentLayout';
import AdminLayout from './components/Admin/AdminLayout';
import Overview from './pages/admin/Overview';
import ExecutiveDashboard from './pages/admin/ExecutiveDashboard';
import AlertsDashboard from './pages/admin/AlertsDashboard';
import ReportsDashboard from './pages/admin/ReportsDashboard';
import DemandIntelligenceDashboard from './pages/admin/DemandIntelligenceDashboard';
import PredictionDashboard from './pages/admin/PredictionDashboard';
import FunnelAnalytics from './pages/admin/FunnelAnalytics';
import Leads from './pages/admin/Leads';
import IitCounselling from './pages/admin/IitCounselling';
import IitCounsellingUtm from './pages/admin/IitCounsellingUtm';
import Analytics from './pages/admin/Analytics';
import Slots from './pages/admin/Slots';
import DemoMeetSchedule from './pages/admin/DemoMeetSchedule';
import Export from './pages/admin/Export';
import Settings from './pages/admin/Settings';
import SystemPrompt from './pages/admin/SystemPrompt';
import MeetingAttendance from './pages/admin/MeetingAttendance';
import IitMeetAttendance from './pages/admin/IitMeetAttendance';
import InfluencerTracking from './pages/admin/InfluencerTracking';
import InfluencerCreate from './pages/admin/InfluencerCreate';
import LeadStatus from './pages/admin/LeadStatus';
import AssessmentResults from './pages/admin/AssessmentResults';
import TrainingFeedback from './pages/admin/TrainingFeedback';
import CounsellorSupportRequests from './pages/admin/CounsellorSupportRequests';
import TrainingFormResponses from './pages/admin/TrainingFormResponses';
import CollegeDostFormSubmissions from './pages/admin/CollegeDostFormSubmissions';
import OneOnOneCounselingLeads from './pages/admin/OneOnOneCounselingLeads';
import LeadIntelligenceDashboard from './pages/admin/lead-intelligence/LeadIntelligenceDashboard';
import GuidanceSlotBookings from './pages/admin/GuidanceSlotBookings';
import OneOnOneCounselorsAdmin from './pages/admin/OneOnOneCounselorsAdmin';
import OneOnOneSessionPage from './pages/OneOnOneSessionPage';
import GuidanceBookingConfirmation from './pages/GuidanceBookingConfirmation';
import GuidanceSessionMeet from './pages/GuidanceSessionMeet';
import {
  OneOnOneCounselorAuthProvider,
  useOneOnOneCounselorAuth,
} from './contexts/OneOnOneCounselorAuthContext';
import OneOnOneCounselorLogin from './pages/oneOnOneCounselor/OneOnOneCounselorLogin';
import OneOnOneCounselorLayout from './components/oneOnOneCounselor/OneOnOneCounselorLayout';
import OneOnOneCounselorDashboard from './pages/oneOnOneCounselor/OneOnOneCounselorDashboard';
import OneOnOneCounselorSlots from './pages/oneOnOneCounselor/OneOnOneCounselorSlots';
import OneOnOneCounselorBookings from './pages/oneOnOneCounselor/OneOnOneCounselorBookings';
import OneOnOneCounselorProfile from './pages/oneOnOneCounselor/OneOnOneCounselorProfile';
import Announcements from './pages/admin/Announcements';
import StudentWorkspaceUpdatesAdmin from './pages/admin/StudentWorkspaceUpdatesAdmin';
import StudentTestimonialsAdmin from './pages/admin/StudentTestimonialsAdmin';
import StudentPanelAdminLayout from './pages/admin/student-panel/StudentPanelAdminLayout';
import WebinarProgressAdmin from './pages/admin/WebinarProgress';
import BulkCertificateDownload from './pages/admin/BulkCertificateDownload';
import OsviCalls from './pages/admin/OsviCalls';
import OsviCallsData from './pages/admin/OsviCallsData';
import AiCallsDashboard from './pages/admin/ai-calls/AiCallsDashboard';
import IitAiCallSummary from './pages/admin/ai-calls/IitAiCallSummary';
import PosterDownloads from './pages/admin/PosterDownloads';
import CollegeComparisonsAdmin from './pages/admin/CollegeComparisonsAdmin';
import CertifiedCounsellors from './pages/admin/CertifiedCounsellors';
import CallingTeamDashboard from './pages/admin/callingTeam/CallingTeamDashboard';
import CallingTeamLeads from './pages/admin/callingTeam/CallingTeamLeads';
import CallingTeamBdas from './pages/admin/callingTeam/CallingTeamBdas';
import CallingTeamBdaDetail from './pages/admin/callingTeam/CallingTeamBdaDetail';
import CallingData from './pages/admin/callingData/CallingData';
import PosterAutomationAdminPage from './pages/admin/posters/PosterAutomationAdminPage';
import WhatsAppOpsLayout from './pages/admin/whatsapp-ops/WhatsAppOpsLayout';
import WhatsAppOpsOverview from './pages/admin/whatsapp-ops/WhatsAppOpsOverview';
import WhatsAppOpsCron from './pages/admin/whatsapp-ops/WhatsAppOpsCron';
import WhatsAppOpsRecovery from './pages/admin/whatsapp-ops/WhatsAppOpsRecovery';
import WhatsAppOpsRetries from './pages/admin/whatsapp-ops/WhatsAppOpsRetries';
import WhatsAppOpsWebhooks from './pages/admin/whatsapp-ops/WhatsAppOpsWebhooks';
import WhatsAppOpsFailures from './pages/admin/whatsapp-ops/WhatsAppOpsFailures';
import WhatsAppOpsLogs from './pages/admin/whatsapp-ops/WhatsAppOpsLogs';
import WhatsAppOpsSettings from './pages/admin/whatsapp-ops/WhatsAppOpsSettings';
import PosterPublicPage from './pages/PosterPublicPage';
import CounsellorLogin from './pages/counsellor/CounsellorLogin';
import WebinarLogin from './pages/webinar/WebinarLogin';

/* Counsellor portal — lazy loaded */
import CounsellorLayout from './components/Counsellor/CounsellorLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import PageSkeleton from './components/UI/PageSkeleton';
const CounsellorDashboard = lazy(() => import('./pages/counsellor/Dashboard'));
const CounsellorStudents = lazy(() => import('./pages/counsellor/Students'));
const CounsellorAdmissions = lazy(() => import('./pages/counsellor/Admissions'));
const CounsellorSessions = lazy(() => import('./pages/counsellor/Sessions'));
const CounsellorMarketing = lazy(() => import('./pages/counsellor/Marketing'));
/* Tools and Certificate loaded eagerly to avoid dynamic import chunk failures */
import CounsellorTools from './pages/counsellor/Tools';
import CounsellorRankPredictorHome from './pages/counsellor/CounsellorRankPredictorHome';
import CounsellorExamPredictor from './pages/counsellor/CounsellorExamPredictor';
import CounsellorCertificate from './pages/counsellor/Certificate';
const CollegePredictorExams = lazy(() => import('./pages/counsellor/CollegePredictorExams'));
const CollegePredictorPredict = lazy(() => import('./pages/counsellor/CollegePredictorPredict'));
import HoliPosterPage from './pages/HoliPosterPage';
import InterPosterPage from './pages/InterPosterPage';
import GxPosterPage from './pages/GxPosterPage';
import SidPosterPage from './pages/SidPosterPage';
import WrongCareerChoicePosterPage from './pages/WrongCareerChoicePosterPage';
import InterResultsPosterPage from './pages/InterResultsPosterPage';
import BtechCsePosterPage from './pages/BtechCsePosterPage';
import JeePosterPage from './pages/JeePosterPage';
const CollegeReferrals = lazy(() => import('./pages/counsellor/CollegeReferrals'));
const CollegeReferralDetail = lazy(() => import('./pages/counsellor/CollegeReferralDetail'));
const AnnouncementsFeed = lazy(() => import('./pages/counsellor/AnnouncementsFeed'));
const CounsellorSettings = lazy(() => import('./pages/counsellor/Settings'));
const CounsellorHelp = lazy(() => import('./pages/counsellor/Help'));
const CounsellorTraining = lazy(() => import('./pages/counsellor/Training'));
const WebinarLayout = lazy(() => import('./pages/webinar/WebinarLayout'));
const WebinarDashboard = lazy(() => import('./pages/webinar/WebinarDashboard'));
const ProgressPage = lazy(() => import('./pages/webinar/ProgressPage'));
const DoubtsPage = lazy(() => import('./pages/webinar/DoubtsPage'));
const ProfilePage = lazy(() => import('./pages/webinar/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/webinar/SettingsPage'));
const CertificatesPage = lazy(() => import('./pages/webinar/CertificatesPage'));
const CertificateViewPage = lazy(() => import('./pages/CertificateViewPage'));
const StudentsDashboard = lazy(() => import('./pages/StudentsDashboard'));
const StudentsWorkspaceLayout = lazy(() => import('./components/studentDashboard/StudentsWorkspaceLayout'));
const IitCounsellingPage = lazy(() => import('./pages/IitCounsellingPage'));
const RankPredictorToolPage = lazy(() => import('./pages/studentsTools/RankPredictorPage'));
const StudentExamPredictorPage = lazy(() => import('./pages/studentsTools/StudentExamPredictorPage'));
const CollegePredictorToolPage = lazy(() => import('./pages/studentsTools/CollegePredictorPage'));
const BranchPredictorToolPage = lazy(() => import('./pages/studentsTools/BranchPredictorPage'));
const CourseFitTestToolPage = lazy(() => import('./pages/studentsTools/CourseFitTestPage'));
const CollegeFitTestToolPage = lazy(() => import('./pages/studentsTools/CollegeFitTestPage'));
const CollegeComparisonToolPage = lazy(() => import('./pages/studentsTools/CollegeComparisonPage'));
const ExamPredictorToolPage = lazy(() => import('./pages/studentsTools/ExamPredictorPage'));
const DeadlineManagerToolPage = lazy(() => import('./pages/studentsTools/DeadlineManagerPage'));
const PredictorsHubPage = lazy(() => import('./pages/studentsTools/PredictorsHubPage'));
const TestsHubPage = lazy(() => import('./pages/studentsTools/TestsHubPage'));
const StudentProfilePage = lazy(() => import('./components/studentAuth/StudentProfilePage'));
const StudentUpdatesPage = lazy(() => import('./pages/studentsTools/StudentUpdatesPage'));
const StudentResourcesPage = lazy(() => import('./pages/studentsTools/StudentResourcesPage'));
import CollegePredictorPage from './pages/CollegePredictorPage';
import RankPredictorHome from './pages/RankPredictorHome';
import ExamPredictor from './pages/ExamPredictor';
import BlogDetails from './pages/BlogDetails';
import BlogsPage from './pages/BlogsPage';
import LegacyBlogRedirect from './pages/LegacyBlogRedirect';
import AdminBlog from './pages/AdminBlog';
import ResourcesAdmin from './pages/admin/ResourcesAdmin';
import FeaturesPage from './pages/FeaturesPage';
import { onAdminUnauthorized, onBdaUnauthorized, onCounsellorUnauthorized, onWebinarUnauthorized } from './utils/authSession';

function ProtectedAdmin({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

function ProtectedCounsellor({ children }) {
  const { isAuthenticated } = useCounsellorAuth();
  if (!isAuthenticated) {
    return <Navigate to="/counsellor/login" replace />;
  }
  return children;
}

function ProtectedBda({ children }) {
  const { isAuthenticated } = useBdaAuth();
  if (!isAuthenticated) {
    return <Navigate to="/bda/login" replace />;
  }
  return children;
}

function ProtectedOneOnOneCounselor({ children }) {
  const { isAuthenticated } = useOneOnOneCounselorAuth();
  if (!isAuthenticated) {
    return <Navigate to="/one-on-one-counselor/login" replace />;
  }
  return children;
}

function ProtectedWebinar({ children }) {
  const { isAuthenticated } = useWebinarAuth();
  if (!isAuthenticated) {
    return <Navigate to="/webinar/login" replace />;
  }
  return children;
}

function SessionExpiryRedirects() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout: adminLogout } = useAuth();
  const { logout: webinarLogout } = useWebinarAuth();
  const { logout: counsellorLogout } = useCounsellorAuth();
  useEffect(() => {
    const offAdmin = onAdminUnauthorized(() => {
      adminLogout();
      if (!location.pathname.startsWith('/admin/login')) {
        navigate('/admin/login', { replace: true });
      }
    });
    const offWebinar = onWebinarUnauthorized(() => {
      webinarLogout();
      if (!location.pathname.startsWith('/webinar/login')) {
        navigate('/webinar/login', { replace: true });
      }
    });
    const offCounsellor = onCounsellorUnauthorized(() => {
      counsellorLogout();
      if (!location.pathname.startsWith('/counsellor/login')) {
        navigate('/counsellor/login', { replace: true });
      }
    });
    const offBda = onBdaUnauthorized(() => {
      setBdaToken(null);
      setBdaUser(null);
      if (!location.pathname.startsWith('/bda/login')) {
        navigate('/bda/login', { replace: true });
      }
    });
    return () => {
      offAdmin();
      offWebinar();
      offCounsellor();
      offBda();
    };
  }, [adminLogout, counsellorLogout, webinarLogout, location.pathname, navigate]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CounsellorAuthProvider>
          <WebinarAuthProvider>
            <StudentAuthProvider>
            <SessionExpiryRedirects />
            <WebsiteChatWidget />
            <Routes>
          <Route path="/become-counsellor" element={<LandingPage />} />
          <Route path="/register" element={<Navigate to="/become-counsellor" replace />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/meet" element={<MeetingRegistration />} />
          <Route path="/meet1" element={<MeetingRegistration redirectMeetUrl="https://meet.google.com/ryt-wtjh-gep" />} />
          <Route path="/meet2" element={<MeetingRegistration redirectMeetUrl="https://meet.google.com/izo-wyts-sas" />} />
          <Route
            path="/orientation"
            element={
              <MeetingRegistration
                variant="orientation"
                redirectMeetUrl="https://meet.google.com/nbe-nsfu-pns"
              />
            }
          />
          <Route path="/iitcounsellingmeet" element={<IitCounsellingMeet />} />
          <Route path="/iitcounsellingmeethindi" element={<IitCounsellingMeetHindi />} />
          <Route path="/iitfirstform" element={<IitFirstForm />} />
          <Route path="/Iitfirstform" element={<IitFirstForm />} />
          <Route path="/collegedost" element={<CollegeDostForm />} />
          <Route path="/cdgxmeet" element={<CdgxMeet />} />
          <Route path="/iitsecondform" element={<IitSecondForm />} />
          <Route path="/Iitsecondform" element={<IitSecondForm />} />
          <Route path="/training" element={<TrainingMeeting />} />
          <Route path="/counsellor-poster" element={<Suspense fallback={<div className="min-h-screen"><PageSkeleton /></div>}><CounsellorCertificate /></Suspense>} />
          <Route path="/holiposter" element={<HoliPosterPage />} />
          <Route path="/interposter" element={<InterPosterPage />} />
          <Route path="/gx-poster" element={<GxPosterPage />} />
          <Route path="/sid-poster" element={<SidPosterPage />} />
          <Route path="/wrong-career-choice" element={<WrongCareerChoicePosterPage />} />
          <Route path="/inter-results-poster" element={<InterResultsPosterPage />} />
          <Route path="/btechcse-poster" element={<BtechCsePosterPage />} />
          <Route path="/jee-poster" element={<JeePosterPage />} />
          <Route path="/certificate/:id" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-pulse text-gray-500">Loading...</div></div>}><CertificateViewPage /></Suspense>} />
          <Route path="/collegepredictor" element={<CollegePredictorPage />} />
          <Route path="/rank-predictor" element={<RankPredictorHome />} />
          <Route path="/rank-predictor/:examId" element={<ExamPredictor />} />
          <Route
            path="/iit-counselling"
            element={
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white"><div className="animate-pulse text-sm font-medium">Loading counselling form…</div></div>}>
                <IitCounsellingPage />
              </Suspense>
            }
          />
          <Route path="/one-on-one-session" element={<OneOnOneSessionPage />} />
          <Route path="/guidance-booking-confirmation" element={<GuidanceBookingConfirmation />} />
          <Route path="/guidance-session-meet" element={<GuidanceSessionMeet />} />
          <Route
            element={
              <Suspense
                fallback={
                  <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
                    <div className="animate-pulse text-sm font-medium">Loading…</div>
                  </div>
                }
              >
                <StudentsWorkspaceLayout />
              </Suspense>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500"><div className="animate-pulse text-sm font-medium">Loading…</div></div>}>
                  <StudentsDashboard />
                </Suspense>
              }
            />
            <Route path="students">
            <Route index element={<Navigate to="/" replace />} />
            <Route
              path="rank-predictor"
              element={
                <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500"><div className="animate-pulse text-sm font-medium">Loading…</div></div>}>
                  <RankPredictorToolPage />
                </Suspense>
              }
            />
            <Route
              path="rank-predictor/:examId"
              element={
                <RequireStudentAuth title="Login to use Rank Predictor">
                  <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500"><div className="animate-pulse text-sm font-medium">Loading…</div></div>}>
                    <StudentExamPredictorPage />
                  </Suspense>
                </RequireStudentAuth>
              }
            />
            <Route
              path="predictors"
              element={
                <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500"><div className="animate-pulse text-sm font-medium">Loading…</div></div>}>
                  <PredictorsHubPage />
                </Suspense>
              }
            />
            <Route
              path="tests"
              element={
                <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500"><div className="animate-pulse text-sm font-medium">Loading…</div></div>}>
                  <TestsHubPage />
                </Suspense>
              }
            />
            <Route
              path="profile"
              element={
                <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500"><div className="animate-pulse text-sm font-medium">Loading…</div></div>}>
                  <StudentProfilePage />
                </Suspense>
              }
            />
            <Route
              path="updates"
              element={
                <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500"><div className="animate-pulse text-sm font-medium">Loading…</div></div>}>
                  <StudentUpdatesPage />
                </Suspense>
              }
            />
            <Route
              path="resources"
              element={
                <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500"><div className="animate-pulse text-sm font-medium">Loading…</div></div>}>
                  <StudentResourcesPage />
                </Suspense>
              }
            />
            <Route
              path="college-predictor"
              element={
                <RequireStudentAuth title="Login to use College Predictor">
                  <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500"><div className="animate-pulse text-sm font-medium">Loading…</div></div>}>
                    <CollegePredictorToolPage />
                  </Suspense>
                </RequireStudentAuth>
              }
            />
            <Route
              path="branch-predictor"
              element={
                <RequireStudentAuth title="Login to use Branch Predictor">
                  <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500"><div className="animate-pulse text-sm font-medium">Loading…</div></div>}>
                    <BranchPredictorToolPage />
                  </Suspense>
                </RequireStudentAuth>
              }
            />
            <Route
              path="course-fit-test"
              element={
                <RequireStudentAuth title="Login to take Course Fit Test">
                  <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500"><div className="animate-pulse text-sm font-medium">Loading…</div></div>}>
                    <CourseFitTestToolPage />
                  </Suspense>
                </RequireStudentAuth>
              }
            />
            <Route
              path="college-fit-test"
              element={
                <RequireStudentAuth title="Login to take College Fit Test">
                  <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500"><div className="animate-pulse text-sm font-medium">Loading…</div></div>}>
                    <CollegeFitTestToolPage />
                  </Suspense>
                </RequireStudentAuth>
              }
            />
            <Route
              path="college-comparison"
              element={
                <RequireStudentAuth title="Login to compare colleges">
                  <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500"><div className="animate-pulse text-sm font-medium">Loading…</div></div>}>
                    <CollegeComparisonToolPage />
                  </Suspense>
                </RequireStudentAuth>
              }
            />
            <Route
              path="exam-predictor"
              element={
                <RequireStudentAuth title="Login to use Exam Predictor">
                  <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500"><div className="animate-pulse text-sm font-medium">Loading…</div></div>}>
                    <ExamPredictorToolPage />
                  </Suspense>
                </RequireStudentAuth>
              }
            />
            <Route
              path="deadline-manager"
              element={
                <RequireStudentAuth title="Login to use Deadline Manager">
                  <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500"><div className="animate-pulse text-sm font-medium">Loading…</div></div>}>
                    <DeadlineManagerToolPage />
                  </Suspense>
                </RequireStudentAuth>
              }
            />
            </Route>
          </Route>
          <Route path="/blogs" element={<BlogsPage />} />
          <Route path="/blogs/:id" element={<BlogDetails />} />
          <Route path="/blog" element={<Navigate to="/blogs" replace />} />
          <Route path="/blog/:id" element={<LegacyBlogRedirect />} />
          <Route path="/webinar/login" element={<WebinarLogin />} />
          <Route path="/webinar" element={<ProtectedWebinar><Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-pulse text-gray-500">Loading...</div></div>}><WebinarLayout /></Suspense></ProtectedWebinar>}>
            <Route index element={<Suspense fallback={<div className="p-4 animate-pulse text-gray-500">Loading...</div>}><WebinarDashboard /></Suspense>} />
            <Route path="progress" element={<Suspense fallback={<div className="p-4 animate-pulse text-gray-500">Loading...</div>}><ProgressPage /></Suspense>} />
            <Route path="doubts" element={<Suspense fallback={<div className="p-4 animate-pulse text-gray-500">Loading...</div>}><DoubtsPage /></Suspense>} />
            <Route path="profile" element={<Suspense fallback={<div className="p-4 animate-pulse text-gray-500">Loading...</div>}><ProfilePage /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<div className="p-4 animate-pulse text-gray-500">Loading...</div>}><SettingsPage /></Suspense>} />
            <Route path="certificates" element={<Suspense fallback={<div className="p-4 animate-pulse text-gray-500">Loading...</div>}><CertificatesPage /></Suspense>} />
          </Route>
          <Route path="/activationform" element={<FeedbackForm />} />
          <Route path="/training-form" element={<TrainingForm />} />
          <Route path="/progress-check-in" element={<ProgressCheckInForm />} />
          <Route path="/iitain-session-feedback" element={<IitainSessionFeedbackForm />} />
          <Route path="/assessment" element={<AssessmentForm />} />
          <Route path="/assessment-2" element={<AssessmentForm2 />} />
          <Route path="/assessment-3" element={<AssessmentForm3 />} />
          <Route path="/assessment-4" element={<AssessmentForm4 />} />
          <Route path="/assessment-5" element={<AssessmentForm5 />} />
          <Route path="/assessment-career-dna" element={<AssessmentLayout hideNavAndFooter><AssessmentFormCounsellorTest type="career-dna" /></AssessmentLayout>} />
          <Route path="/assessment-course-fit" element={<AssessmentLayout hideNavAndFooter><AssessmentFormCounsellorTest type="course-fit" /></AssessmentLayout>} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedAdmin>
                <AdminLayout />
              </ProtectedAdmin>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Overview />} />
            <Route path="executive-dashboard" element={<ExecutiveDashboard />} />
            <Route path="analytics/alerts" element={<AlertsDashboard />} />
            <Route path="analytics/reports" element={<ReportsDashboard />} />
            <Route path="analytics/demand" element={<DemandIntelligenceDashboard />} />
            <Route path="analytics/predictions" element={<PredictionDashboard />} />
            <Route path="funnel-analytics" element={<FunnelAnalytics />} />
            <Route path="certified-counsellors" element={<CertifiedCounsellors />} />
            <Route path="leads" element={<Leads />} />
            <Route path="iit-counselling" element={<IitCounselling />} />
            <Route path="iit-counselling-utm" element={<IitCounsellingUtm />} />
            <Route path="calling-team" element={<CallingTeamDashboard />} />
            <Route path="calling-team/leads" element={<CallingTeamLeads />} />
            <Route path="calling-team/bdas" element={<CallingTeamBdas />} />
            <Route path="calling-team/bdas/:id" element={<CallingTeamBdaDetail />} />
            <Route path="calling-data" element={<CallingData />} />
            <Route path="organic-rank-leads" element={<Leads organicOnly />} />
            <Route path="student-workspace-leads" element={<Leads studentWorkspaceOnly />} />
            <Route path="lead-status" element={<LeadStatus />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="slots" element={<Slots />} />
            <Route path="demo-meet-schedule" element={<DemoMeetSchedule />} />
            <Route path="export" element={<Export />} />
            <Route path="settings" element={<Settings />} />
            <Route path="system-prompt" element={<SystemPrompt />} />
            <Route path="meeting-attendance" element={<MeetingAttendance />} />
            <Route path="iit-meet-attendance" element={<IitMeetAttendance />} />
            <Route path="training-feedback" element={<TrainingFeedback />} />
            <Route path="counsellor-support-requests" element={<CounsellorSupportRequests />} />
            <Route path="training-form-responses" element={<TrainingFormResponses />} />
            <Route path="college-dost" element={<CollegeDostFormSubmissions />} />
            <Route path="one-on-one-counseling" element={<OneOnOneCounselingLeads />} />
            <Route path="lead-intelligence" element={<LeadIntelligenceDashboard />} />
            <Route path="guidance-slot-bookings" element={<GuidanceSlotBookings />} />
            <Route path="one-on-one-counselors" element={<OneOnOneCounselorsAdmin />} />
            <Route path="influencer-create" element={<InfluencerCreate />} />
            <Route path="influencer-tracking" element={<InfluencerTracking />} />
            <Route path="poster-downloads" element={<PosterDownloads />} />
            <Route path="college-comparisons" element={<CollegeComparisonsAdmin />} />
            <Route path="posters" element={<PosterAutomationAdminPage />} />
            <Route path="assessment-results" element={<AssessmentResults />} />
            <Route path="assessment-2-results" element={<Navigate to="/admin/assessment-results?type=2" replace />} />
            <Route path="assessment-3-results" element={<Navigate to="/admin/assessment-results?type=3" replace />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="student-workspace-updates" element={<Navigate to="/admin/student-panel/updates" replace />} />
            <Route path="student-testimonials" element={<Navigate to="/admin/student-panel/testimonials" replace />} />
            <Route path="student-panel" element={<StudentPanelAdminLayout />}>
              <Route index element={<Navigate to="updates" replace />} />
              <Route path="updates" element={<StudentWorkspaceUpdatesAdmin />} />
              <Route path="testimonials" element={<StudentTestimonialsAdmin />} />
            </Route>
            <Route path="webinar-progress" element={<WebinarProgressAdmin />} />
            <Route path="bulk-certificates" element={<BulkCertificateDownload />} />
            <Route path="blogs" element={<AdminBlog />} />
            <Route path="resources" element={<ResourcesAdmin />} />
            <Route path="osvi-calls" element={<OsviCalls />} />
            <Route path="osvi-calls-data" element={<OsviCallsData />} />
            <Route path="ai-calls" element={<AiCallsDashboard />} />
            <Route path="iit-ai-calls-summary" element={<IitAiCallSummary />} />
            <Route path="whatsapp-ops" element={<WhatsAppOpsLayout />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<WhatsAppOpsOverview />} />
              <Route path="cron" element={<WhatsAppOpsCron />} />
              <Route path="messages" element={<WhatsAppOpsRecovery />} />
              <Route path="retries" element={<WhatsAppOpsRetries />} />
              <Route path="webhooks" element={<WhatsAppOpsWebhooks />} />
              <Route path="failures" element={<WhatsAppOpsFailures />} />
              <Route path="logs" element={<WhatsAppOpsLogs />} />
              <Route path="settings" element={<WhatsAppOpsSettings />} />
            </Route>
          </Route>

          {/* BDA Portal */}
          <Route
            path="/bda/login"
            element={
              <BdaAuthProvider>
                <BdaLogin />
              </BdaAuthProvider>
            }
          />
          <Route
            path="/bda/dashboard"
            element={
              <BdaAuthProvider>
                <ProtectedBda>
                  <BdaDashboard />
                </ProtectedBda>
              </BdaAuthProvider>
            }
          />
          <Route path="/bda" element={<Navigate to="/bda/dashboard" replace />} />

          {/* One-on-One Counselor Portal (IITian / mentor) */}
          <Route
            path="/one-on-one-counselor/login"
            element={
              <OneOnOneCounselorAuthProvider>
                <OneOnOneCounselorLogin />
              </OneOnOneCounselorAuthProvider>
            }
          />
          <Route
            path="/one-on-one-counselor"
            element={
              <OneOnOneCounselorAuthProvider>
                <ProtectedOneOnOneCounselor>
                  <OneOnOneCounselorLayout />
                </ProtectedOneOnOneCounselor>
              </OneOnOneCounselorAuthProvider>
            }
          >
            <Route index element={<Navigate to="/one-on-one-counselor/dashboard" replace />} />
            <Route path="dashboard" element={<OneOnOneCounselorDashboard />} />
            <Route path="slots" element={<OneOnOneCounselorSlots />} />
            <Route path="bookings" element={<OneOnOneCounselorBookings />} />
            <Route path="profile" element={<OneOnOneCounselorProfile />} />
          </Route>

          {/* Counsellor Portal */}
          <Route path="/counsellor/login" element={<CounsellorLogin />} />
          <Route
            path="/counsellor-support"
            element={
              <ErrorBoundary>
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-pulse text-gray-500">Loading...</div></div>}>
                  <CounsellorHelp />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route path="/counsellor" element={<ProtectedCounsellor><CounsellorProfileProvider><CounsellorTrainingProvider><CounsellorLayout /></CounsellorTrainingProvider></CounsellorProfileProvider></ProtectedCounsellor>}>
            <Route index element={<Navigate to="/counsellor/dashboard" replace />} />
            <Route path="dashboard" element={<ErrorBoundary><Suspense fallback={<div className="h-64 flex items-center justify-center p-4"><PageSkeleton /></div>}><CounsellorDashboard /></Suspense></ErrorBoundary>} />
            <Route path="students" element={<ErrorBoundary><Suspense fallback={<div className="h-64 flex items-center justify-center p-4"><PageSkeleton /></div>}><CounsellorStudents /></Suspense></ErrorBoundary>} />
            <Route path="admissions" element={<ErrorBoundary><Suspense fallback={<div className="h-64 flex items-center justify-center p-4"><PageSkeleton /></div>}><CounsellorAdmissions /></Suspense></ErrorBoundary>} />
            <Route path="sessions" element={<ErrorBoundary><Suspense fallback={<div className="h-64 flex items-center justify-center p-4"><PageSkeleton /></div>}><CounsellorSessions /></Suspense></ErrorBoundary>} />
            <Route path="tools" element={<ErrorBoundary><CounsellorTools /></ErrorBoundary>} />
            <Route path="tools/rank-predictor" element={<ErrorBoundary><CounsellorRankPredictorHome /></ErrorBoundary>} />
            <Route path="tools/rank-predictor/:examId" element={<ErrorBoundary><CounsellorExamPredictor /></ErrorBoundary>} />
            <Route path="tools/college-predictor" element={<ErrorBoundary><Suspense fallback={<div className="h-64 flex items-center justify-center p-4"><PageSkeleton /></div>}><CollegePredictorExams /></Suspense></ErrorBoundary>} />
            <Route path="tools/college-predictor/:exam" element={<ErrorBoundary><Suspense fallback={<div className="h-64 flex items-center justify-center p-4"><PageSkeleton /></div>}><CollegePredictorPredict /></Suspense></ErrorBoundary>} />
            <Route path="marketing" element={<ErrorBoundary><Suspense fallback={<div className="h-64 flex items-center justify-center p-4"><PageSkeleton /></div>}><CounsellorMarketing /></Suspense></ErrorBoundary>} />
            <Route path="certificate" element={<ErrorBoundary><CounsellorCertificate /></ErrorBoundary>} />
            <Route path="college-referrals" element={<ErrorBoundary><Suspense fallback={<div className="h-64 flex items-center justify-center p-4"><PageSkeleton /></div>}><CollegeReferrals /></Suspense></ErrorBoundary>} />
            <Route path="college-referrals/:collegeSlug" element={<ErrorBoundary><Suspense fallback={<div className="h-64 flex items-center justify-center p-4"><PageSkeleton /></div>}><CollegeReferralDetail /></Suspense></ErrorBoundary>} />
            <Route path="know-about-colleges" element={<ErrorBoundary><Suspense fallback={<div className="h-64 flex items-center justify-center p-4"><PageSkeleton /></div>}><CollegeReferrals /></Suspense></ErrorBoundary>} />
            <Route path="know-about-colleges/:collegeSlug" element={<ErrorBoundary><Suspense fallback={<div className="h-64 flex items-center justify-center p-4"><PageSkeleton /></div>}><CollegeReferralDetail /></Suspense></ErrorBoundary>} />
            <Route path="announcements-feed" element={<ErrorBoundary><Suspense fallback={<div className="h-64 flex items-center justify-center p-4"><PageSkeleton /></div>}><AnnouncementsFeed /></Suspense></ErrorBoundary>} />
            <Route path="training" element={<ErrorBoundary><Suspense fallback={<div className="h-64 flex items-center justify-center p-4"><PageSkeleton /></div>}><CounsellorTraining /></Suspense></ErrorBoundary>} />
            <Route path="settings" element={<ErrorBoundary><Suspense fallback={<div className="h-64 flex items-center justify-center p-4"><PageSkeleton /></div>}><CounsellorSettings /></Suspense></ErrorBoundary>} />
          </Route>

          <Route path="/p/*" element={<PosterPublicPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </StudentAuthProvider>
          </WebinarAuthProvider>
        </CounsellorAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
