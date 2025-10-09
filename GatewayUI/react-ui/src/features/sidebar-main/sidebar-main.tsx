import React, { useEffect } from 'react';
import { Tab, TabList, TabGroup } from '@headlessui/react'
import { NavLink, useLocation, matchPath } from 'react-router-dom';
import { useStore } from '../../app/stores/store';
import { observer } from 'mobx-react-lite';
import logo from '../../../src/LOVAMAP_logo.png';

const SideBarMain: React.FC = () => {
	const {commonStore, userStore } = useStore();
	const {setActiveTab, activeTab} = commonStore;
	const location = useLocation();
	
	const isAdmin = userStore.user?.roles?.includes("administrator") ?? false;

	const handleVisualizationClick = () => {
		setActiveTab(0); // Set active tab before navigating
		commonStore.setSidebarOpen(false); 
	};

	useEffect(() => {
		const p = location.pathname;

		if (p === '/' || matchPath('/visualize/*', p)) {
			setActiveTab(0);
		} else if (matchPath('/explore/*', p)) {
			setActiveTab(1);
		} else if (matchPath('/data/*', p)) {
			setActiveTab(2);
		} else if (matchPath('/learn/*', p)) {
			setActiveTab(3);
		} else if (matchPath('/descriptor-calculator/*', p)) {
			setActiveTab(4);
		} else if (matchPath('/experiments/*', p)) {
			setActiveTab(5);
		} else if (matchPath('/jobs/*', p)) {
			setActiveTab(6);
		} else if (matchPath('/publications/*', p)) {
			setActiveTab(7);
		} else if (matchPath('/uploads', p)) {
			setActiveTab(8);
		} else if (matchPath('/admin/*', p)) {
			setActiveTab(9);
		} else {
			setActiveTab(0);
		}
	}, [location.pathname, setActiveTab]);

	return (
		<>
			{/* Backdrop for mobile */}
			<div
				className={`fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden transition-opacity duration-300 ${commonStore.isSidebarOpen ? 'block' : 'hidden'}`}
				onClick={() => commonStore.setSidebarOpen(false)}
			></div>
			<div
				className={`
					sidebar
					${commonStore.isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
					md:translate-x-0
				`}
			>
				<div className='flex flex-col justify-between h-full p-2 m-0'>
					<TabGroup vertical selectedIndex={activeTab} onChange={setActiveTab}>
						<TabList className="flex flex-col">
							<NavLink to="/" onClick={() => commonStore.setSidebarOpen(false)}>
								<img className="mx-auto w-40 my-4" src={logo} alt="logo" />
							</NavLink>

							<Tab as={NavLink} to='/visualize' onClick={handleVisualizationClick} className="focus:outline-none">
							{({ selected }) => (
								<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
								<p>Interact</p>
								</div>
							)}
							</Tab>
							<Tab as={NavLink} to='/explore' onClick={() => commonStore.setSidebarOpen(false)} className="focus:outline-none">
							{({ selected }) => (
								<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
								<p>Explore scaffolds</p>
								</div>
							)}
							</Tab>
							<Tab as={NavLink} to='/data' onClick={() => commonStore.setSidebarOpen(false)} className="focus:outline-none">
							{({ selected }) => (
								<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
								<p>Explore data</p>
								</div>
							)}
							</Tab>
							<Tab as={NavLink} to='/learn' onClick={() => commonStore.setSidebarOpen(false)} className="focus:outline-none">
							{({ selected }) => (
								<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
								<p>Learn</p>
								</div>
							)}
							</Tab>
							<Tab as={NavLink} to='/descriptor-calculator' onClick={() => commonStore.setSidebarOpen(false)} className="focus:outline-none">
							{({ selected }) => (
								<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
								<p>Calculate</p>
								</div>
							)}
							</Tab>
							<Tab as={NavLink} to='/experiments' onClick={() => commonStore.setSidebarOpen(false)} className="focus:outline-none">
							{({ selected }) => (
								<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
								<p>Download Data</p>
								</div>
							)}
							</Tab>
							<Tab as={NavLink} to='/jobs' onClick={() => commonStore.setSidebarOpen(false)} className="focus:outline-none">
							{({ selected }) => (
								<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
								<p>Run LOVAMAP</p>
								</div>
							)}
							</Tab>
							<Tab as={NavLink} to='/publications' onClick={() => commonStore.setSidebarOpen(false)} className="focus:outline-none">
							{({ selected }) => (
								<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
								<p>Publications</p>
								</div>
							)}
							</Tab>
							{isAdmin && (
								<>
									<div className="flex items-center justify-center w-full my-4 pl-2 pr-2 italic">
										<hr className="flex-grow border-t border-gray-300" />
										<span className="px-3 text-sm text-gray-300 whitespace-nowrap">Admin</span>
										<hr className="flex-grow border-t border-gray-300" />
									</div>
									<Tab as={NavLink} to='/uploads' onClick={() => commonStore.setSidebarOpen(false)} className="focus:outline-none">
										{({ selected }) => (
										<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
											<p>Upload Scaffolds</p>
										</div>
										)}
									</Tab>
									<Tab as={NavLink} to='/admin' onClick={() => commonStore.setSidebarOpen(false)} className="focus:outline-none">
										{({ selected }) => (
										<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
											<p>Utilities</p>
										</div>
										)}
									</Tab>
								</>

							)}
						</TabList>
					</TabGroup>
					<div className="shrink-0 text-center mb-6">
						<p className="text-xs font-semibold tracking-wide text-gray-500 leading-tight mb-2 px-2">
							Materials in<br />Medicine Center
						</p>
						<img
							className="mx-auto w-20 h-auto mt-2"
							src="/Duke-Pratt-Logo.png"
							alt="dukelogo"
						/>
					</div>
				</div>
			</div>
		</>
	)
}

export default observer(SideBarMain)