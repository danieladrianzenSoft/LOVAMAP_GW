import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import Sidebar from '../../features/sidebar/sidebar';
import { observer } from 'mobx-react-lite';
import ScaffoldGroupUploads from '../../features/scaffold-groups/scaffold-group-uploads';
import Visualization from '../../features/visualization/visualization';

const App: React.FC = () => {
  const { commonStore, userStore } = useStore();

  useEffect(() => {
    if (commonStore.isLoggedIn()) {
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
        <Route path="/" element={<MainLayout />}>
          <Route path="/" element={<ExploreScreen />} />
          <Route path="/visualize" element={<Visualization/>} />
          <Route path="/visualize/:scaffoldId" element={<Visualization/>} />
          <Route path="/learn" element={<LearnScreen />} />
          <Route path="/experiments" element={<CreateExperiments />} />
          <Route path="/uploads" element={<ScaffoldGroupUploads />} />
        </Route>
      </Routes>
    </HistoryRouter>
  );
};

const MainLayout: React.FC = () => {
  const { commonStore } = useStore();
  const isLoggedIn = commonStore.isLoggedIn();

  return (
    <div className="main-layout">
      <TopNavigation />
      <Sidebar />
      <div className="content">
        <Routes>
          <Route path="/" element={<ExploreScreen />} />
          <Route path="/learn" element={<LearnScreen />} />
          <Route path="/visualize" element={<Visualization />} />
          <Route path="/visualize/:scaffoldId" element={<Visualization/>} />
          {isLoggedIn ? (
            <>
              <Route path="/experiments" element={<CreateExperiments />} />
              <Route path="/uploads" element={<ScaffoldGroupUploads />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/login" />} />
          )}
        </Routes>
      </div>
    </div>
  );
};

export default observer(App);