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
	const {commonStore, scaffoldGroupStore, userStore } = useStore();
	const {setActiveTab, activeTab} = commonStore;
	const {navigateToVisualization} = scaffoldGroupStore;
	const location = useLocation();
	
	const isAdmin = userStore.user?.roles?.includes("administrator") ?? false;

	const handleVisualizationClick = () => {
		setActiveTab(0); // Set active tab before navigating
		navigateToVisualization(null); // Navigate with no specific scaffold group
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
		} else if (location.pathname === '/uploads') {
			setActiveTab(4);
		} else if (location.pathname.startsWith('/admin')) {
			setActiveTab(5);
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
						<p>Create Experiments</p>
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
							<Tab as={NavLink} to='/admin/batch-thumbnails' onClick={() => setIsOpen(false)} className="focus:outline-none">
								{({ selected }) => (
								<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
									<p>Admin Utilities</p>
								</div>
								)}
							</Tab>
						</>

					)}
				</TabList>
				</TabGroup>
			</div>
		</>
		// <div className={`
		// 	fixed z-50 top-0 left-0 h-full w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out
		// 	${isOpen ? 'translate-x-0' : '-translate-x-full'} 
		// 	md:translate-x-0 md:relative md:z-auto
		//   `}>
		// 	<TabGroup vertical selectedIndex={activeTab} onChange={setActiveTab}>
		// 		<TabList>
		// 			<NavLink to="/">
		// 				<img
		// 					className="mx-auto w-40 mb-6 ml-1 mt-2"
		// 					src={logo}
		// 					alt="logo"
		// 				/>					
		// 			</NavLink>
		// 			<Tab as={NavLink} to='/visualize' onClick={handleVisualizationClick} className="focus:outline-none">
		// 				{({ selected }) => (
		// 					<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
		// 						{/* {selected && 
		// 							<ActiveTabMarker />
		// 						} */}
		// 						<p>Interact</p>
		// 					</div>		
		// 				)}
		// 			</Tab>
		// 			<Tab as={NavLink} to='/explore' className="focus:outline-none">
		// 				{({ selected }) => (
		// 					<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
		// 						{/* {selected && 
		// 							<ActiveTabMarker />
		// 						} */}
		// 						<p>Explore scaffolds</p>
		// 					</div>		
		// 				)}
		// 			</Tab>
		// 			{/* <SideBarDivider /> */}
		// 			<Tab as={NavLink} to='/learn' className="focus:outline-none">
		// 				{({ selected }) => (
		// 					<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
		// 						{/* {selected && 
		// 							<ActiveTabMarker />
		// 						} */}
		// 						<p >Learn</p>
		// 					</div>
		// 				)}
		// 			</Tab>
		// 			<Tab as={NavLink} to='/experiments' className="focus:outline-none">
		// 				{({ selected }) => (
		// 					<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
		// 						{/* {selected && 
		// 							<ActiveTabMarker />
		// 						} */}
		// 						<p>Create Experiments</p>
		// 					</div>
		// 				)}
		// 			</Tab>
		// 			{isAdmin && 
		// 				<Tab as={NavLink} to='/uploads' className="focus:outline-none" >
		// 					{({ selected }) => (
		// 						<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
		// 							{/* {selected && 
		// 								<ActiveTabMarker />
		// 							} */}
		// 							<p>Upload</p>
		// 						</div>
		// 					)}
		// 				</Tab>
		// 			}
		// 			{/* <SideBarDivider /> */}
		// 		</TabList>
		// 	</TabGroup>
		// </div>
		
	)
}

export default observer(SideBar)