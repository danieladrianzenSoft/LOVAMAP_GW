import React, { useEffect } from 'react';
import { Tab, TabList, TabGroup } from '@headlessui/react'
import { NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../../app/stores/store';
import { observer } from 'mobx-react-lite';
import logo from '../../../src/LOVAMAP_logo.png';

interface SidebarProps {
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
  }

const SideBar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
	const {commonStore, userStore } = useStore();
	const {setActiveTab, activeTab} = commonStore;
	const location = useLocation();
	
	const isAdmin = userStore.user?.roles?.includes("administrator") ?? false;

	const handleVisualizationClick = () => {
		setActiveTab(0); // Set active tab before navigating
		setIsOpen(false); 
	};

	useEffect(() => {
		if (location.pathname === '/' || location.pathname.startsWith('/visualize')) {
			setActiveTab(0);
		} else if (location.pathname === '/explore') {
			setActiveTab(1);
		} else if (location.pathname === '/learn') {
			setActiveTab(2);
		} else if (location.pathname === '/experiments') {
			setActiveTab(3);
		} else if (location.pathname === '/jobs') {
			setActiveTab(4);
		} else if (location.pathname === '/uploads') {
			setActiveTab(5);
		} else if (location.pathname.startsWith('/admin')) {
			setActiveTab(6);
		} else {
			setActiveTab(0);
		}
	}, [location.pathname, setActiveTab]);

	return (
		<>
			{/* Backdrop for mobile */}
			<div
				className={`fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'block' : 'hidden'}`}
				onClick={() => setIsOpen(false)}
			></div>
			<div
				className={`
					sidebar
					${isOpen ? 'translate-x-0' : '-translate-x-full'}
					md:translate-x-0
				`}
			>
				<div className='flex flex-col justify-between h-full p-0 m-0'>
					<TabGroup vertical selectedIndex={activeTab} onChange={setActiveTab}>
						<TabList className="flex flex-col">
							<NavLink to="/" onClick={() => setIsOpen(false)}>
								<img className="mx-auto w-40 my-4" src={logo} alt="logo" />
							</NavLink>

							<Tab as={NavLink} to='/visualize' onClick={handleVisualizationClick} className="focus:outline-none">
							{({ selected }) => (
								<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
								<p>Interact</p>
								</div>
							)}
							</Tab>
							<Tab as={NavLink} to='/explore' onClick={() => setIsOpen(false)} className="focus:outline-none">
							{({ selected }) => (
								<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
								<p>Explore scaffolds</p>
								</div>
							)}
							</Tab>
							<Tab as={NavLink} to='/learn' onClick={() => setIsOpen(false)} className="focus:outline-none">
							{({ selected }) => (
								<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
								<p>Learn</p>
								</div>
							)}
							</Tab>
							<Tab as={NavLink} to='/experiments' onClick={() => setIsOpen(false)} className="focus:outline-none">
							{({ selected }) => (
								<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
								<p>Customize downloads</p>
								</div>
							)}
							</Tab>
							<Tab as={NavLink} to='/jobs' onClick={() => setIsOpen(false)} className="focus:outline-none">
							{({ selected }) => (
								<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
								<p>Run LOVAMAP</p>
								</div>
							)}
							</Tab>
							{isAdmin && (
								<>
									<Tab as={NavLink} to='/uploads' onClick={() => setIsOpen(false)} className="focus:outline-none">
										{({ selected }) => (
										<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
											<p>Upload</p>
										</div>
										)}
									</Tab>
									<Tab as={NavLink} to='/admin' onClick={() => setIsOpen(false)} className="focus:outline-none">
										{({ selected }) => (
										<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
											<p>Admin utilities</p>
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

export default observer(SideBar)