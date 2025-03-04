import React, { useEffect } from 'react';
import { Tab, TabList, TabGroup } from '@headlessui/react'
import { NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../../app/stores/store';
import { observer } from 'mobx-react-lite';
import logo from '../../../src/LOVAMAP_logo.png';

const SideBar: React.FC = () => {
	const {commonStore, scaffoldGroupStore } = useStore();
	const {setActiveTab, activeTab} = commonStore;
	const {navigateToVisualization} = scaffoldGroupStore;
	const location = useLocation();

	const handleVisualizationClick = () => {
		setActiveTab(1); // Set active tab before navigating
		navigateToVisualization(null); // Navigate with no specific scaffold group
	};

	useEffect(() => {
		if (location.pathname === '/') {
			setActiveTab(0);
		} else if (location.pathname.startsWith('/visualize')) {
			setActiveTab(1);
		} else if (location.pathname === '/learn') {
			setActiveTab(2);
		} else if (location.pathname === '/experiments') {
			setActiveTab(3);
		} else if (location.pathname === '/uploads') {
			setActiveTab(4);
		} else {
			setActiveTab(0);
		}
	}, [location.pathname, setActiveTab]);

	return (
		<div className='sidebar'>
			<TabGroup vertical selectedIndex={activeTab} onChange={setActiveTab}>
				<TabList>
					<NavLink to="/">
						<img
							className="mx-auto w-40 mb-6 ml-1 mt-2"
							src={logo}
							alt="logo"
						/>					
					</NavLink>
					
					<Tab as={NavLink} to='/' className="focus:outline-none">
						{({ selected }) => (
							<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
								{/* {selected && 
									<ActiveTabMarker />
								} */}
								<p>Explore scaffolds</p>
							</div>		
						)}
					</Tab>
					<Tab as={NavLink} to='/visualize' onClick={handleVisualizationClick} className="focus:outline-none">
						{({ selected }) => (
							<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
								{/* {selected && 
									<ActiveTabMarker />
								} */}
								<p>Interact</p>
							</div>		
						)}
					</Tab>
					{/* <SideBarDivider /> */}
					<Tab as={NavLink} to='/learn' className="focus:outline-none">
						{({ selected }) => (
							<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
								{/* {selected && 
									<ActiveTabMarker />
								} */}
								<p >Learn</p>
							</div>
						)}
					</Tab>
					<Tab as={NavLink} to='/experiments' className="focus:outline-none">
						{({ selected }) => (
							<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
								{/* {selected && 
									<ActiveTabMarker />
								} */}
								<p>Create Experiments</p>
							</div>
						)}
					</Tab>
					<Tab as={NavLink} to='/uploads' className="focus:outline-none">
						{({ selected }) => (
							<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
								{/* {selected && 
									<ActiveTabMarker />
								} */}
								<p>Upload</p>
							</div>
						)}
					</Tab>
					{/* <SideBarDivider /> */}
				</TabList>
			</TabGroup>
		</div>
		
	)
}

export default observer(SideBar)