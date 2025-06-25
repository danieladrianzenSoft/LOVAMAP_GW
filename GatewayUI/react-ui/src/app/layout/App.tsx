import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useStore } from '../stores/store';
import HistoryRouter from '../helpers/HistoryRouter';
import history from '../helpers/History';
import LoginPage from '../../features/login/login';
import RegisterPage from '../../features/register/register';
import ExploreScreen from '../../features/explore-screen/explore-screen';
import LearnScreen from '../../features/learn-screen/learn-screen';
import CreateExperiments from '../../features/create-experiments-screen/create-experiments';
import TopNavigation from '../../features/top-navigation/top-navigation';
import SideBarMain from '../../features/sidebar-main/sidebar-main';
import { observer } from 'mobx-react-lite';
import ScaffoldGroupUploads from '../../features/scaffold-groups/scaffold-group-uploads';
import Visualization from '../../features/visualization/visualization';
import History from '../helpers/History';
import RunJob from '../../features/jobs/run-job';
import ScreenshotViewer from '../../features/visualization/screenshot-viewer';
// import AdminBatchThumbnailGenerator from '../../features/admin/admin-batch-thumbnail-generator';
import ResetPasswordForm from '../../features/user/reset-password';
import ForgotPasswordForm from '../../features/user/forgot-password';
import ConfirmEmailPage from '../../features/user/confirm-email';
import EmailNotConfirmed from '../../features/user/email-not-confirmed';
import SettingsScreen from '../../features/settings-screen/settings-screen';
import AdminUtilities from '../../features/admin/admin-utilities';
import DescriptorCalculator from '../../features/descriptors/descriptor-calculator';
import { ExploreData } from '../../features/explore-data/explore-data';
// import SideBarMain from '../../features/sidebar-main/sidebar-main';

const App: React.FC = () => {
  const { commonStore, userStore } = useStore();

  useEffect(() => {
    if (commonStore.isLoggedIn) {
      userStore.getCurrentUser().catch(() => {
        commonStore.setToken(null);
      });
    }
  }, [commonStore, userStore]);

  return (
    <HistoryRouter history={history}>
      <Toaster
        position="bottom-right"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#333',
          },
          success: {
            iconTheme: {
              primary: '#000',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/confirm-email" element={<ConfirmEmailPage />} />
        <Route path="/email-not-confirmed" element={<EmailNotConfirmed />} />
        <Route path="/reset-password" element={<ResetPasswordForm />} />
        <Route path="/forgot-password" element={<ForgotPasswordForm />} />  
        <Route path="/*" element={<MainLayout />} />
      </Routes>
    </HistoryRouter>
  );
};

const MainLayout: React.FC = observer(() => {
  // const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="main-layout">
      <TopNavigation />
      <SideBarMain />
      <div className="content">
        <Routes>
          <Route path="/" element={<Visualization />} />
          <Route path="/visualize" element={<Visualization />} />
          <Route path="/visualize/:scaffoldId" element={<Visualization />} />
          <Route path="/learn" element={<LearnScreen />} />
          <Route path="/explore" element={<ExploreScreen />} />
          <Route path="/data" element={<ExploreData />} />
          <Route path="/data/:scaffoldGroupId" element={<ExploreData />} />
          <Route path="/descriptor-calculator" element={<DescriptorCalculator />} />
          <Route path="/experiments" element={<ProtectedRoute element={<CreateExperiments />} />} />
          <Route path="/uploads" element={<ProtectedRoute element={<ScaffoldGroupUploads />} />} />
          <Route path="/jobs" element={<ProtectedRoute element={<RunJob />} />} />
          <Route path="/screenshots/:scaffoldId" element={<ProtectedRoute requiredRole="administrator" element={<ScreenshotViewer />} />} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="administrator" element={<AdminUtilities />} />}/>
          <Route path="/settings" element={<ProtectedRoute element={<SettingsScreen />} />}/>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
});

const ProtectedRoute = observer(({ element, requiredRole }: { element: JSX.Element, requiredRole?: string }) => {
  const { commonStore, userStore } = useStore();
  const isLoggedIn = commonStore.isLoggedIn;
  const userRoles = userStore.user?.roles || [];
  const location = useLocation();

  useEffect(() => {
    if (!isLoggedIn) {
      const redirectPath = encodeURIComponent(location.pathname);
      History.push(`/login?redirect=${redirectPath}`);
    }
  }, [isLoggedIn, location.pathname]);

  const isAuthorized = !requiredRole || userRoles.includes(requiredRole);

  return isLoggedIn && isAuthorized ? element : null;
});

export default observer(App);