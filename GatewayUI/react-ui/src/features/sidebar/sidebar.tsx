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
								{/* <SideBarIcon icon={<VscGraph size="26"/>} text='Markets'/> */}
								<p>Explore scaffolds</p>
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
								{/* <SideBarIcon icon={<BsFillLightningFill size="24"/>} text='Transactions'/> */}
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
								{/* <SideBarIcon icon={<FaFire size="24"/>} text='Dashboard'/> */}
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