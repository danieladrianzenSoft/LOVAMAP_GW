import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiSun, FiMoon, FiGrid, FiShare2, FiTable, FiMessageSquare } from 'react-icons/fi';
import { DarkModeProvider } from '../hooks/useDarkMode';

const navItems = [
	{ path: '/', label: 'Dashboard', icon: FiGrid },
	{ path: '/graph', label: 'Graph Explorer', icon: FiShare2 },
	{ path: '/table', label: 'Table View', icon: FiTable },
	{ path: '/query', label: 'Query', icon: FiMessageSquare },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const location = useLocation();
	const [darkMode, setDarkMode] = useState(() => {
		if (typeof window !== 'undefined') {
			return localStorage.getItem('kb-dark-mode') === 'true' ||
				(!localStorage.getItem('kb-dark-mode') && window.matchMedia('(prefers-color-scheme: dark)').matches);
		}
		return false;
	});

	useEffect(() => {
		document.documentElement.classList.toggle('dark', darkMode);
		localStorage.setItem('kb-dark-mode', String(darkMode));
	}, [darkMode]);

	return (
		<DarkModeProvider value={darkMode}>
		<div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors overflow-hidden">
			{/* Institutional logos banner */}
			<div className="w-full bg-[#061957]">
				<div className="flex items-center justify-between px-8 py-2.5">
					<img
						src="https://res.cloudinary.com/danmkw7ni/image/upload/f_auto,q_auto/Duke_Pratt_School_of_Engineering_logo_WHITE_fnt3om"
						alt="Duke Pratt School of Engineering"
						className="h-5 md:h-7 w-auto"
					/>
					<div className="flex items-center gap-2">
						<img
							src="https://res.cloudinary.com/danmkw7ni/image/upload/f_auto,q_auto/MIMC_logo_WHITE_o7gbjl"
							alt="Materials in Medicine Center"
							className="h-8 md:h-11 w-auto"
						/>
						<div className="text-white" style={{ fontFamily: "'Barlow', sans-serif", lineHeight: '1.1' }}>
							<div className="text-[13px] md:text-[15px] font-medium tracking-wide uppercase">Materials in</div>
							<div className="text-[13px] md:text-[15px] font-medium tracking-wide uppercase">Medicine Center</div>
						</div>
					</div>
				</div>
			</div>

			<nav className="w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
				<div className="px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-14">
						<div className="flex items-center gap-6">
							<Link to="/" className="flex items-center">
								<img
									src="https://res.cloudinary.com/danmkw7ni/image/upload/f_auto,q_auto/MIMC_logo_irilsb"
									alt="LOVAMAP Knowledge Base"
									className="h-9 w-auto"
								/>
							</Link>
							<div className="hidden sm:flex items-center gap-1">
								{navItems.map(({ path, label, icon: Icon }) => {
									const active = location.pathname === path;
									return (
										<Link
											key={path}
											to={path}
											className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
												active
													? 'bg-kb-100 dark:bg-kb-900/30 text-kb-700 dark:text-kb-300'
													: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
											}`}
										>
											<Icon size={16} />
											{label}
										</Link>
									);
								})}
							</div>
						</div>
						<button
							onClick={() => setDarkMode(!darkMode)}
							className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
							aria-label="Toggle dark mode"
						>
							{darkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
						</button>
					</div>
				</div>
			</nav>

			{/* Mobile nav */}
			<div className="sm:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-2 py-1 flex gap-1">
				{navItems.map(({ path, label, icon: Icon }) => {
					const active = location.pathname === path;
					return (
						<Link
							key={path}
							to={path}
							className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
								active
									? 'bg-kb-100 dark:bg-kb-900/30 text-kb-700 dark:text-kb-300'
									: 'text-gray-500 dark:text-gray-400'
							}`}
						>
							<Icon size={14} />
							{label}
						</Link>
					);
				})}
			</div>

			<main className="flex-1 overflow-auto">{children}</main>
		</div>
		</DarkModeProvider>
	);
};

export default Layout;
