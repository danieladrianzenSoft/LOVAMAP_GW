import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../app/stores/store';
import { FaUserCircle } from 'react-icons/fa';
import { FiChevronRight, FiPlay, FiCompass, FiBookOpen, FiLogIn, FiUser } from 'react-icons/fi';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import History from '../../app/helpers/History';
import logo from '../../LOVAMAP_logo.png';

const NAV_LINKS = [
  { to: '/run', label: 'Analyze' },
  { to: '/explore', label: 'Explore' },
  { to: '/learn', label: 'Learn' },
];

const HomeNav: React.FC = () => {
  const { commonStore, userStore } = useStore();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
    <nav
      className={`sticky top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-white'
      }`}
    >
      <div className="px-8 flex items-center h-20">
        {/* Left: Logo */}
        <div className="flex-1 flex items-center">
          <Link to="/" className="flex-shrink-0">
            <img src={logo} alt="LOVAMAP" className="h-14 w-auto" />
          </Link>
        </div>

        {/* Center: Nav links (desktop) */}
        <div className="hidden md:flex items-center gap-12">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className="flex items-center gap-1 text-base font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              <FiChevronRight className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right: Auth */}
        <div className="flex-1 flex items-center justify-end">
          {commonStore.isLoggedIn ? (
            <div className="relative">
              <Menu>
                <MenuButton className="focus:outline-none">
                  <FaUserCircle
                    size={24}
                    className="text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
                  />
                </MenuButton>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <MenuItems className="absolute right-0 mt-2 w-40 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <MenuItem>
                      {() => (
                        <button
                          className="dropdown-menu-item group"
                          onClick={() => History.push('/jobs')}
                        >
                          My Jobs
                        </button>
                      )}
                    </MenuItem>
                    <MenuItem>
                      {() => (
                        <button
                          className="dropdown-menu-item group"
                          onClick={() => History.push('/settings')}
                        >
                          Settings
                        </button>
                      )}
                    </MenuItem>
                    <MenuItem>
                      {() => (
                        <button
                          className="dropdown-menu-item group"
                          onClick={() => userStore.logout()}
                        >
                          Logout
                        </button>
                      )}
                    </MenuItem>
                  </MenuItems>
                </Transition>
              </Menu>
            </div>
          ) : (
            <Link
              to="/login"
              className="text-base font-medium px-5 py-2 rounded-md bg-gray-700 text-white hover:bg-gray-800 transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>

    {/* Mobile bottom tab bar */}
    <div className="fixed bottom-0 left-0 w-full z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-center justify-around h-16">
        <Link to="/run" className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors">
          <FiPlay className="w-5 h-5" />
          <span className="text-xs font-medium">Analyze</span>
        </Link>
        <Link to="/explore" className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors">
          <FiCompass className="w-5 h-5" />
          <span className="text-xs font-medium">Explore</span>
        </Link>
        <Link to="/learn" className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors">
          <FiBookOpen className="w-5 h-5" />
          <span className="text-xs font-medium">Learn</span>
        </Link>
        {commonStore.isLoggedIn ? (
          <Link to="/settings" className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors">
            <FiUser className="w-5 h-5" />
            <span className="text-xs font-medium">Account</span>
          </Link>
        ) : (
          <Link to="/login" className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors">
            <FiLogIn className="w-5 h-5" />
            <span className="text-xs font-medium">Login</span>
          </Link>
        )}
      </div>
    </div>
    </>
  );
};

export default observer(HomeNav);
