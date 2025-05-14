import React from 'react';
import { useStore } from '../../app/stores/store';
import UserDropdown from './user-dropdown';
import { observer } from 'mobx-react-lite';
import history from "../../app/helpers/History";
import { NavLink } from 'react-router-dom';
import logo from '../../../src/LOVAMAP_logo.png';

const TopNavigation: React.FC = () => {
	const {commonStore} = useStore();
	const isLoggedIn = commonStore.isLoggedIn;

	return (
		<div className="top-navigation">
			{/* Left side: Logo + hamburger */}
			{!commonStore.isSidebarOpen && (
				<div className="flex items-center space-x-4">
					{/* Hamburger only on mobile */}
					<button
						className="md:hidden focus:outline-none"
						onClick={() => commonStore.setSidebarOpen(!commonStore.isSidebarOpen)}
					>
					<svg className="h-6 w-6 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
					</button>

					{/* Logo */}
					<NavLink to="/" onClick={() => commonStore.setSidebarOpen(false)}>
						<img className="mx-auto w-32 my-4" src={logo} alt="logo" />
					</NavLink>
				</div>
			)}
			{commonStore.isSidebarOpen && (
				<div></div>
			)}


			{/* Right side: User/Login */}
			<div className="flex items-center space-x-4 mr-0">
				{isLoggedIn ? <UserCircle /> : (
				<button onClick={() => history.push('/login')} className='button-primary'>
					Login
				</button>
				)}
			</div>
		</div>
	)
}

const UserCircle: React.FC = () => {

	return (
		<>
			<UserDropdown/>
		</>
	)
}

export default observer(TopNavigation);