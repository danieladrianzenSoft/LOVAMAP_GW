import React from 'react';
import { Tab, TabList, TabGroup } from '@headlessui/react'
import { NavLink } from 'react-router-dom';
import { useStore } from '../../app/stores/store';
import { observer } from 'mobx-react-lite';
import logo from '../../../src/LOVAMAP_logo.png';

const SideBar: React.FC = () => {

	const {commonStore} = useStore();
	const {setActiveTab, activeTab} = commonStore;

	return (
		<TabGroup vertical selectedIndex={activeTab} onChange={setActiveTab}>
			<TabList className="fixed top-0 left-0 h-full w-52
		 	flex flex-col bg-white shadow-lg
		 	z-20">
				<NavLink to="/">
					<img
						className="mx-auto w-40 mb-6 ml-1 mt-2"
						src={logo}
						alt="logo"
					/>					
				</NavLink>
				
				<Tab as={NavLink} to='/'>
					{({ selected }) => (
						<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
							{/* {selected && 
								<ActiveTabMarker />
							} */}
							{/* <SideBarIcon icon={<VscGraph size="26"/>} text='Markets'/> */}
							<p>Explore scaffolds</p>
						</div>		
					)}
				</Tab>
				{/* <SideBarDivider /> */}
				<Tab as={NavLink} to='/learn'>
					{({ selected }) => (
						<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
							{/* {selected && 
								<ActiveTabMarker />
							} */}
							<p >Learn</p>
							{/* <SideBarIcon icon={<BsFillLightningFill size="24"/>} text='Transactions'/> */}
						</div>
					)}
				</Tab>
				<Tab as={NavLink} to='/experiments'>
					{({ selected }) => (
						<div className={selected ? "sidebar-tab-selected" : "sidebar-tab"}>
							{/* {selected && 
								<ActiveTabMarker />
							} */}
							<p>Create Experiments</p>
							{/* <SideBarIcon icon={<FaFire size="24"/>} text='Dashboard'/> */}
						</div>
					)}
				</Tab>
				
				{/* <SideBarDivider /> */}
			</TabList>
		</TabGroup>
	)
}

// const ActiveTabMarker = () => {
// 	return (
// 		<div className="z-10 absolute w-1 p-2 m-2 border-l-4 
// 		border-orange-600 h-12 ml-0 dark:border-white 
// 		transition-all duration-200 ease-linear">
// 		</div> 
// 	)
// }

export default observer(SideBar)