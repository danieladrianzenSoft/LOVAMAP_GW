import React from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../../app/stores/store';
import { observer } from 'mobx-react-lite';
import logo from '../../../src/LOVAMAP_logo.png';
import { NAV_CATEGORIES } from './sidebar-nav-config';
import { useExpandedSections } from './use-expanded-sections';
import SidebarSection from './sidebar-section';

const SideBarMain: React.FC = () => {
	const { commonStore, userStore } = useStore();
	const { expanded, toggle } = useExpandedSections();

	const isAdmin = userStore.user?.roles?.includes("administrator") ?? false;
	const closeSidebar = () => commonStore.setSidebarOpen(false);

	return (
		<>
			<div
				className={`fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden transition-opacity duration-300 ${commonStore.isSidebarOpen ? 'block' : 'hidden'}`}
				onClick={closeSidebar}
			/>

			<div
				className={`
					sidebar
					${commonStore.isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
					${commonStore.isSidebarCollapsed ? 'md:hidden' : 'md:translate-x-0'}
				`}
			>
				<div className='flex flex-col justify-between h-full p-2 m-0 overflow-hidden'>
					<div className="flex-1 min-h-0 overflow-y-auto">
						<div className="flex flex-col">
							<NavLink to="/" onClick={closeSidebar}>
								<img className="mx-auto w-40 my-4" src={logo} alt="logo" />
							</NavLink>

							{userStore.isLoggedIn && (
								<>
									<NavLink
										to="/my-scaffolds"
										onClick={closeSidebar}
										className={({ isActive }) =>
											isActive ? "sidebar-tab-sub-selected !pl-2" : "sidebar-tab-sub !pl-2"
										}
									>
										My Scaffolds
									</NavLink>
									<div className="flex items-center justify-center w-full my-4 pl-2 pr-2">
										<hr className="flex-grow border-t border-gray-300" />
									</div>
								</>
							)}

							{NAV_CATEGORIES.map((cat) => {
								if (cat.requireRole && !isAdmin) return null;
								return (
									<SidebarSection
										key={cat.key}
										category={cat}
										isExpanded={expanded.has(cat.key)}
										onToggle={() => toggle(cat.key)}
										onNavigate={closeSidebar}
									/>
								);
							})}
						</div>
					</div>

					<div className="shrink-0 flex items-center justify-center mb-6 px-2">
						<img
							className="h-16 w-auto"
							src="https://res.cloudinary.com/danmkw7ni/image/upload/f_auto,q_auto/MIMC_logo_irilsb"
							alt="Materials in Medicine Center"
						/>
					</div>
				</div>
			</div>
		</>
	)
}

export default observer(SideBarMain);
