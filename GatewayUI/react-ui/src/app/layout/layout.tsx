import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from '../../features/login/login';
import { store, useStore } from '../stores/store';
import Sidebar from '../../features/sidebar/sidebar';
import TopNavigation from '../../features/top-navigation/top-navigation';
import ExploreScreen from '../../features/explore-screen/explore-screen';
import RegisterPage from '../../features/register/register';
import LearnScreen from '../../features/learn-screen/learn-screen';
import CreateExperiments from '../../features/create-experiments-screen/create-experiments';

const Layout: React.FC = () => {
  const location = useLocation();
  const isLoggedIn = store.userStore.isLoggedIn;
  const showNavBar = location.pathname !== '/login' && location.pathname !== '/register';

  return (
    <div className="flex flex-col min-h-screen">
      {showNavBar && <TopNavigation />}
      <div className="flex flex-grow overflow-hidden">
        {/* {isLoggedIn && <Sidebar />} */}
		{showNavBar && <Sidebar />}
        <div className="flex-grow overflow-auto">
          <Routes>
            <Route path="/" element={<ExploreScreen />} />
            <Route path="/login" element={<LoginPage />} />
			<Route path="/register" element={<RegisterPage />} />
            {isLoggedIn ? (
              <>
                <Route path="/explore" element={<ExploreScreen />} />
                <Route path="/learn" element={<LearnScreen />} />
                <Route path="/experiments" element={<CreateExperiments />} />

                {/* <Route path="/dashboard" element={<Dashboard />} /> */}
                {/* More authenticated routes as needed */}
              </>
            ) : (
              <Route path="*" element={<Navigate to="/login" replace />} />
            )}
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default observer(Layout);